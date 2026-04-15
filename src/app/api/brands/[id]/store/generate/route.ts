import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import { bucketBrandImages, getBusinessType } from '@/lib/brand-images'
import type { Brand, BrandImage } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ---------------------------------------------------------------------------
// File loaders — repo-relative so Next's file-tracing picks them up
// ---------------------------------------------------------------------------

async function loadFile(relativePath: string): Promise<string> {
  return readFile(join(process.cwd(), relativePath), 'utf-8')
}

async function loadJSON<T>(relativePath: string): Promise<T> {
  const raw = await loadFile(relativePath)
  return JSON.parse(raw) as T
}

// ---------------------------------------------------------------------------
// Types — copied from factory, trimmed to what we still use
// ---------------------------------------------------------------------------

interface VariableEntry {
  key: string
  type: string
  section: string
  instructions: string
}

interface ColorVariant {
  name: string
  theme_settings: Record<string, string>
}

interface ImageMapEntry {
  section_id: string
  section_type: string
  block_id: string | null
  block_type: string | null
  setting_id: string
  role: 'hero_background' | 'founder_portrait' | 'lifestyle' | 'product' | 'ugc'
  instructions: string
}

interface ImageAssignment extends ImageMapEntry {
  url: string | null
  source_tag: string | null
}

interface BrandBrief {
  brand_name: string
  one_liner: string
  category: string
  target_audience: string
  brand_vibe?: string[]
  competitors?: string
  differentiators?: string
  primary_color?: string
  secondary_color?: string
  fonts?: string[]
  products?: Array<{ name: string; description?: string | null }>
}

// ---------------------------------------------------------------------------
// Shared helpers — notes parser + brand-member auth
// ---------------------------------------------------------------------------

function parseNotes(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

async function authorizeBrandMember(brandId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, error: 'Unauthorized', status: 401 as const }
  }
  const { data: membership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) {
    return { supabase, user, error: 'Forbidden', status: 403 as const }
  }
  return { supabase, user, error: null, status: 200 as const }
}

// ---------------------------------------------------------------------------
// Step 0 — Image Assignment (rewritten to read from brand_images)
// ---------------------------------------------------------------------------

// Factory's role vocabulary mapped onto Marketing OS brand_image tags.
// `shopify` is first for product slots so Shopify brands get the clean
// /products.json shots over scraped ones. Non-Shopify brands fall through
// to `product` naturally because they have no `shopify`-tagged rows.
const ROLE_TAG_PRIORITY: Record<ImageMapEntry['role'], string[]> = {
  hero_background:  ['lifestyle', 'background', 'ugc', 'seasonal', 'product', 'shopify', 'other'],
  founder_portrait: ['lifestyle', 'ugc', 'seasonal', 'other'],
  lifestyle:        ['lifestyle', 'background', 'ugc', 'seasonal', 'other', 'product', 'shopify'],
  product:          ['shopify', 'product', 'other'],
  ugc:              ['ugc', 'lifestyle', 'seasonal', 'other'],
}

async function assignImages(
  poolImages: Array<{ url: string; tag: string }>
): Promise<ImageAssignment[]> {
  const imageMap = await loadJSON<ImageMapEntry[]>('templates/store/image-map.json')

  const pools: Record<string, string[]> = {}
  for (const img of poolImages) {
    (pools[img.tag] ||= []).push(img.url)
  }
  const used = new Set<string>()

  function takeForRole(role: ImageMapEntry['role']): { url: string; tag: string } | null {
    const priority = ROLE_TAG_PRIORITY[role]
    for (const tag of priority) {
      const bucket = pools[tag]
      if (!bucket) continue
      const pick = bucket.find(u => !used.has(u))
      if (pick) {
        used.add(pick)
        return { url: pick, tag }
      }
    }
    for (const tag of priority) {
      const bucket = pools[tag]
      if (bucket && bucket.length > 0) return { url: bucket[0], tag }
    }
    if (poolImages.length > 0) {
      return { url: poolImages[0].url, tag: poolImages[0].tag }
    }
    return null
  }

  return imageMap.map(entry => {
    const pick = takeForRole(entry.role)
    return { ...entry, url: pick?.url ?? null, source_tag: pick?.tag ?? null }
  })
}

function injectImageAssignments(
  indexJson: Record<string, unknown>,
  assignments: ImageAssignment[]
): Record<string, unknown> {
  const sections = (indexJson.sections || {}) as Record<string, {
    settings?: Record<string, unknown>
    blocks?: Record<string, { settings?: Record<string, unknown> }>
  }>
  for (const a of assignments) {
    if (!a.url) continue
    const section = sections[a.section_id]
    if (!section) continue
    if (a.block_id === null) {
      section.settings = section.settings || {}
      section.settings[a.setting_id] = a.url
    } else {
      const block = section.blocks?.[a.block_id]
      if (!block) continue
      block.settings = block.settings || {}
      block.settings[a.setting_id] = a.url
    }
  }
  return indexJson
}

// ---------------------------------------------------------------------------
// Step 1 — Color System Generation
// ---------------------------------------------------------------------------

const NEUTRAL_LIGHT: Record<string, string> = {
  color_background_body: '#ffffff',
  color_foreground_body: '#1a1a1a',
  color_foreground_body_alt: '#ffffff',
  color_background_primary: '#000000',
  color_foreground_primary: '#ffffff',
  color_background_secondary: '#2c2c2c',
  color_foreground_secondary: '#ffffff',
  color_background_tertiary: '#f5f5f5',
  color_foreground_tertiary: '#1a1a1a',
  color_bar: '#ffffff',
  color_background_overlay: 'linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) 100%)',
}

function mapColorVariants(variants: Record<string, Record<string, string>>): ColorVariant[] {
  const names = ['light', 'dark', 'alt_light', 'alt_dark']
  return names.map(name => {
    const v = variants[name]
    if (!v) return { name, theme_settings: { ...NEUTRAL_LIGHT } }
    return {
      name,
      theme_settings: {
        color_background_body: v.body || '#ffffff',
        color_foreground_body: v.text || '#1a1a1a',
        color_foreground_body_alt: v.alternativeText || '#ffffff',
        color_background_primary: v.primaryBackground || '#000000',
        color_foreground_primary: v.primaryForeground || '#ffffff',
        color_background_secondary: v.secondaryBackground || '#2c2c2c',
        color_foreground_secondary: v.secondaryForeground || '#ffffff',
        color_background_tertiary: v.tertiaryBackground || '#f5f5f5',
        color_foreground_tertiary: v.tertiaryForeground || '#1a1a1a',
        color_bar: v.mobileBar || v.body || '#ffffff',
        color_background_overlay: v.overlayBackground || 'linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) 100%)',
      },
    }
  })
}

async function generateColorVariants(primary: string, secondary: string): Promise<ColorVariant[]> {
  const systemPrompt = `You are a color system generator for ecommerce themes. Given a primary brand color and secondary color, generate 4 theme variants. Return ONLY valid JSON — no markdown, no explanation.

Return this exact structure:
{
  "light": {
    "body": "#ffffff",
    "text": "#1a1a1a",
    "alternativeText": "#ffffff",
    "primaryBackground": "<primary color>",
    "primaryForeground": "<contrast text for primary>",
    "secondaryBackground": "<secondary color>",
    "secondaryForeground": "<contrast text for secondary>",
    "tertiaryBackground": "<very light tint of primary>",
    "tertiaryForeground": "#1a1a1a"
  },
  "dark": {
    "body": "#0a0a0a",
    "text": "#f5f5f5",
    "alternativeText": "#0a0a0a",
    "primaryBackground": "<primary color>",
    "primaryForeground": "<contrast text for primary>",
    "secondaryBackground": "<secondary color>",
    "secondaryForeground": "<contrast text for secondary>",
    "tertiaryBackground": "#1a1a1a",
    "tertiaryForeground": "#f5f5f5"
  },
  "alt_light": {
    "body": "<warm off-white derived from primary>",
    "text": "#1a1a1a",
    "alternativeText": "#ffffff",
    "primaryBackground": "<darker shade of primary>",
    "primaryForeground": "#ffffff",
    "secondaryBackground": "<muted secondary>",
    "secondaryForeground": "#ffffff",
    "tertiaryBackground": "<light warm neutral>",
    "tertiaryForeground": "#1a1a1a"
  },
  "alt_dark": {
    "body": "<very dark shade of primary>",
    "text": "#f0f0f0",
    "alternativeText": "#0a0a0a",
    "primaryBackground": "<bright/saturated primary>",
    "primaryForeground": "#0a0a0a",
    "secondaryBackground": "<light secondary>",
    "secondaryForeground": "#0a0a0a",
    "tertiaryBackground": "<dark mid-tone>",
    "tertiaryForeground": "#f0f0f0"
  }
}

Rules:
- All values must be valid hex colors
- Primary and secondary backgrounds must maintain the brand's identity
- Foreground colors must pass WCAG AA contrast against their backgrounds
- Light variants have white/off-white body, dark variants have near-black body
- Tertiary is always a subtle, muted tone — never the brand color at full saturation`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Generate 4 theme color variants for these brand colors:\nPrimary: ${primary}\nSecondary: ${secondary}`,
    }],
  })
  const block = msg.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('No response from color generation')
  let json = block.text.trim()
  if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  return mapColorVariants(JSON.parse(json))
}

function neutralVariantsFallback(primary: string, secondary: string): ColorVariant[] {
  return [
    { name: 'light', theme_settings: { ...NEUTRAL_LIGHT, color_background_primary: primary, color_background_secondary: secondary } },
    { name: 'dark', theme_settings: {
      color_background_body: '#0a0a0a', color_foreground_body: '#f5f5f5',
      color_foreground_body_alt: '#0a0a0a',
      color_background_primary: primary, color_foreground_primary: '#ffffff',
      color_background_secondary: secondary, color_foreground_secondary: '#ffffff',
      color_background_tertiary: '#1a1a1a', color_foreground_tertiary: '#f5f5f5',
      color_bar: '#0a0a0a',
      color_background_overlay: 'linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) 100%)',
    }},
    { name: 'alt_light', theme_settings: { ...NEUTRAL_LIGHT, color_background_primary: primary, color_background_secondary: secondary } },
    { name: 'alt_dark', theme_settings: {
      color_background_body: '#111111', color_foreground_body: '#f0f0f0',
      color_foreground_body_alt: '#111111',
      color_background_primary: primary, color_foreground_primary: '#ffffff',
      color_background_secondary: secondary, color_foreground_secondary: '#ffffff',
      color_background_tertiary: '#1e1e1e', color_foreground_tertiary: '#f0f0f0',
      color_bar: '#111111',
      color_background_overlay: 'linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) 100%)',
    }},
  ]
}

// ---------------------------------------------------------------------------
// Step 2 — Variable Generation
// ---------------------------------------------------------------------------

const GENERATABLE_TYPES = new Set(['text', 'richtext', 'color', 'collection'])

interface CampaignContext {
  goal?: string | null
  offer?: string | null
  angle?: string | null
  key_message?: string | null
}

async function generateVariableValues(
  brief: BrandBrief,
  brand: Brand,
  campaign: CampaignContext | null
): Promise<Record<string, string>> {
  const designRules = await loadFile('templates/store/prompts/design-rules.md')
  const variableMap = await loadJSON<VariableEntry[]>('templates/store/variable-map.json')
  const generatableVars = variableMap.filter(v => GENERATABLE_TYPES.has(v.type))

  let variableBlock = ''
  let currentSection = ''
  for (const v of generatableVars) {
    if (v.section !== currentSection) {
      currentSection = v.section
      variableBlock += `\n### ${v.section}\n`
    }
    variableBlock += `- "${v.key}" (${v.type}): ${v.instructions}\n`
  }

  const productList = brief.products?.length
    ? brief.products.map(p => `${p.name}: ${p.description || 'No description'}`).join('\n')
    : 'No products detected'

  let variantOptionHint = 'Not detected — default to "Size"'
  if (brief.products?.length) {
    const titles = brief.products.map(p => p.name.toLowerCase()).join(' ')
    if (/\d+\s*(oz|ml|g|kg|lb|pack|ct|count)/i.test(titles)) {
      variantOptionHint = 'Likely "Size" (weight/volume variants detected)'
    } else if (/pack|bundle|set/i.test(titles)) {
      variantOptionHint = 'Likely "Pack" (bundle variants detected)'
    } else if (brief.products.length > 2) {
      const firstWords = new Set(brief.products.map(p => p.name.split(/\s+/)[0]))
      if (firstWords.size < brief.products.length) {
        variantOptionHint = 'Likely "Flavor" (flavor variants detected)'
      }
    }
  }

  const campaignBlock = campaign && (campaign.goal || campaign.offer || campaign.angle || campaign.key_message)
    ? `

CAMPAIGN CONTEXT — inject this into every copy field (hero, footer, checklist, perks, etc.):
- Goal: ${campaign.goal || 'Not specified'}
- Offer: ${campaign.offer || 'Not specified'}
- Angle: ${campaign.angle || 'Not specified'}
- Key message: ${campaign.key_message || 'Not specified'}`
    : ''

  // Prepend the Marketing OS brand system prompt so the generator inherits
  // brand voice, tone, avoid_words, competitors, voice examples — the same
  // way Creative Studio and Copy Creator do.
  const systemPrompt = `${buildBrandSystemPrompt(brand)}

---

${designRules}

---

BRAND BRIEF:
- Brand name: ${brief.brand_name}
- Category: ${brief.category}
- One-liner: ${brief.one_liner}
- Target audience: ${brief.target_audience}
- Brand vibe: ${brief.brand_vibe?.join(', ') || 'Not specified'}
- Key differentiators: ${brief.differentiators || 'Not specified'}
- Competitors: ${brief.competitors || 'Not specified'}
- Products: ${productList}
- Variant option hint: ${variantOptionHint}
- Primary color: ${brief.primary_color || 'Not specified'}
- Secondary color: ${brief.secondary_color || 'Not specified'}
- Fonts detected: ${brief.fonts?.join(', ') || 'Not specified'}${campaignBlock}

---

ADDITIONAL GENERATION RULES:

NAVIGATION:
- Nav links should follow CPG brand conventions: Shop, Our Story, Subscribe, Find Us (or Locator), FAQ
- URLs should use standard Shopify paths: /collections/all, /pages/about, /pages/faq, /pages/store-locator
- Keep labels to 1–2 words maximum

ANNOUNCEMENT BAR:
- Always lead with a shipping offer or discount: "Free Shipping On Orders Over $X" or "Subscribe & Save X%"
- Keep it under 60 characters total
- Wrap in <p> tags since it is a richtext field

FOOTER:
- footer_tagline: brand one-liner — distilled version of the hero subhead, under 10 words. Wires into the footer content block's heading.
- footer_about_heading: short content-block section heading (e.g. "About Us", "Our Story"). 2-3 words.
- footer_about_content: richtext in <p> tags — 2-3 sentence brand description that wires into the footer content block's body.
- footer_cta_label: 1-3 word button label for the footer content block (e.g. "Shop All", "Our Story"). Return "" if no CTA is warranted.
- footer_cta_url: Shopify internal URL (shopify://collections/... or shopify://pages/...) for the footer content-block button. Return "" when footer_cta_label is empty.
- footer_instagram_handle: best-guess Instagram handle for the brand, without the leading @. Infer from the brand name: lowercase, strip spaces and punctuation (e.g. "Jolene Coffee" → "jolenecoffee", "Dr. Squatch" → "drsquatch"). Return "" only if you cannot produce any plausible handle.
- footer_richtext_heading: visible main text of the footer Rich Text section — PLAIN TEXT, NO HTML. Format EXACTLY: "Follow us @HANDLE" where HANDLE is footer_instagram_handle (e.g. "Follow us @jolenecoffee"). This field is a plain text setting in the theme schema, so any <a>, <p>, or other markup will be stripped — do not include it. If footer_instagram_handle is "", return "".
- footer_richtext_content: unused — always return "". (Kept as a wired placeholder so we can re-enable a body paragraph later without touching base-footer-group.json.)
- Footer navigation columns (Shop / Company / Support link groups) are Shopify admin linklists — DO NOT generate values for them. They're configured per store in Shopify Admin → Online Store → Navigation.
- Social URLs (footer_instagram_url, footer_tiktok_url, footer_facebook_url): always return "" — client fills these in
- footer_legal_text: generate an appropriate legal disclaimer based on product category:
  - Beverage with alcohol/THC: include age verification and regulatory disclaimer
  - Supplement: include FDA "not intended to diagnose, treat, cure, or prevent any disease" disclaimer
  - Food: include allergen processing facility note
  - General CPG: standard copyright notice with brand name and year
- footer_newsletter_heading: action-oriented, includes specific benefit
- footer_newsletter_content: richtext in <p> tags, mentions exact subscriber perks

PDP BADGE BLOCK:
- pdp_badge_text: short, specific, origin or certification claim — never generic like "Premium Quality"
- pdp_badge_emoji: single emoji that reinforces the claim (🇲🇽 for origin, 🌿 for natural, 🔬 for clinical)
- pdp_badge_bg_color: use the brand primary color
- pdp_badge_font_color: must contrast against bg_color — use #ffffff on dark, #1a1a1a on light

PDP CHECKLIST BLOCK:
- Generate exactly 5 items — each a specific product benefit, not a generic marketing claim
- Start each with a differentiator: ingredient name, certification, or measurable claim
- Item 5 should be quantity/value proof (e.g. "50 servings per bag", "100 glasses per kit")
- pdp_checklist_value_tag: "★ Best Value" or similar with star prefix
- pdp_checklist_value_text: include specific math — quantity, unit count, and per-unit cost
- pdp_checklist_check_color: brand primary color hex

PDP PERKS MARQUEE:
- Subscription-focused benefits only
- Item 1: save percentage (e.g. "Save 15% on every order")
- Item 2: free shipping (e.g. "Free shipping every delivery")
- Item 3: flexibility (e.g. "Cancel or pause anytime")
- Items 4–5: convenience or priority perks
- pdp_perks_header_bg: brand primary or accent color
- pdp_perks_header_text: contrasting text color
- pdp_perks_marquee_bg: "#ffffff" or very light tint
- pdp_perks_marquee_text: "#1a1a1a" or brand body text color

PDP VARIANT CARDS:
- pdp_variant_option_name: infer from scraped product data (use variant option hint above) — "Size", "Pack", or "Flavor"
- pdp_free_shipping_threshold: set to "50" unless product prices suggest a different threshold
- pdp_popular_badge_bg: secondary or accent brand color
- pdp_best_badge_bg: primary brand color

COLOR VARIABLES:
- All color type variables must be valid 7-character hex codes (e.g. "#D4266A")
- Foreground/text colors must pass WCAG AA contrast (4.5:1) against their paired background
- Badge and perks colors should derive from the brand's primary and secondary palette

---

TASK:
Generate values for every variable below. Return ONLY a valid JSON object where each key is the variable name and each value is the generated content. No markdown, no explanation, no preamble.

For image variables: return null
For url variables: return ""
For collection variables: infer the most likely Shopify collection handle from the brand category (e.g. "all-products", "shop", "coffee", "skincare")
For color variables: return a valid hex color string (e.g. "#D4266A")
For richtext variables: return valid HTML (e.g. "<p>Free Shipping On Orders Over $50</p>")

VARIABLES:
${variableBlock}`

  const userMessage = `Generate the complete JSON object now with all ${generatableVars.length} variables filled in. Use "${brief.brand_name}" as the brand name in all copy. For table_headings use "${brief.brand_name}, Everyone Else". All social URL variables must be empty strings.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textBlock = message.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') throw new Error('No response from variable generation')

  if (message.stop_reason !== 'end_turn') {
    console.warn('[store/generate] WARNING: output truncated, stop_reason:', message.stop_reason)
  }

  let json = textBlock.text.trim()
  if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

  if (!json.endsWith('}')) {
    console.warn('[store/generate] JSON appears truncated, attempting repair...')
    const lastQuote = json.lastIndexOf('"')
    const lastComma = json.lastIndexOf(',')
    const cutPoint = Math.max(lastQuote, lastComma)
    if (cutPoint > 0) {
      let repaired = json.substring(0, lastComma > 0 ? lastComma : cutPoint)
      if (!repaired.endsWith('}') && !repaired.endsWith('"')) {
        repaired = repaired.substring(0, repaired.lastIndexOf('"') + 1)
      }
      repaired += '}'
      json = repaired
    }
  }

  return JSON.parse(json) as Record<string, string>
}

// ---------------------------------------------------------------------------
// Step 3 — Template Merge (string substitution)
// ---------------------------------------------------------------------------

function applyValuesToTemplate(templateStr: string, values: Record<string, string>): string {
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`
    if (!templateStr.includes(placeholder)) continue
    if (value === '__NULL__' || value === null) {
      templateStr = templateStr.split(`"${placeholder}"`).join('null')
    } else {
      const escaped = String(value)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
      templateStr = templateStr.split(placeholder).join(escaped)
    }
  }

  const remaining = templateStr.match(/\{\{[^}]+\}\}/g)
  if (remaining) {
    console.warn('[store/generate] Unreplaced variables:', remaining.length, remaining.slice(0, 5))
    for (const match of remaining) {
      const withQuotes = `"${match}"`
      if (templateStr.includes(withQuotes)) {
        templateStr = templateStr.split(withQuotes).join('""')
      }
      templateStr = templateStr.split(match).join('')
    }
  }

  return templateStr
}

interface MergedTemplates {
  index: Record<string, unknown>
  product: Record<string, unknown>
  footerGroup: Record<string, unknown>
}

async function mergeTemplates(values: Record<string, string>): Promise<MergedTemplates> {
  const variableMap = await loadJSON<VariableEntry[]>('templates/store/variable-map.json')
  const imageVars = variableMap.filter(v => v.type === 'image')
  const urlVars = variableMap.filter(v => v.type === 'url')
  for (const v of imageVars) values[v.key] = '__NULL__'
  for (const v of urlVars) {
    if (!values[v.key]) values[v.key] = ''
  }

  const baseTemplate = await loadJSON<Record<string, unknown>>('templates/store/base-template.json')
  const indexStr = applyValuesToTemplate(JSON.stringify(baseTemplate), values)
  const index = JSON.parse(indexStr)

  const basePdp = await loadJSON<Record<string, unknown>>('templates/store/base-pdp.json')
  const pdpStr = applyValuesToTemplate(JSON.stringify(basePdp), values)
  const product = JSON.parse(pdpStr)

  const baseFooter = await loadJSON<Record<string, unknown>>('templates/store/base-footer-group.json')
  const footerStr = applyValuesToTemplate(JSON.stringify(baseFooter), values)
  const footerGroup = JSON.parse(footerStr)

  return { index, product, footerGroup }
}

// ---------------------------------------------------------------------------
// Pipeline helpers — brand-to-brief + brand-images-to-pool
// ---------------------------------------------------------------------------

function buildBriefFromBrand(brand: Brand, notes: Record<string, unknown>): BrandBrief {
  const whatYouDo = typeof notes.what_you_do === 'string' ? notes.what_you_do : ''
  const businessType = typeof notes.business_type === 'string' ? notes.business_type : 'brand'

  const fonts: string[] = []
  const fh = typeof brand.font_heading === 'string' ? (() => { try { return JSON.parse(brand.font_heading as unknown as string) } catch { return null } })() : brand.font_heading
  const fb = typeof brand.font_body === 'string' ? (() => { try { return JSON.parse(brand.font_body as unknown as string) } catch { return null } })() : brand.font_body
  if (fh && typeof fh === 'object' && 'family' in fh && fh.family) fonts.push(String(fh.family))
  if (fb && typeof fb === 'object' && 'family' in fb && fb.family) fonts.push(String(fb.family))

  return {
    brand_name: brand.name,
    one_liner: whatYouDo || brand.default_headline || brand.mission || '',
    category: businessType,
    target_audience: brand.target_audience || '',
    brand_vibe: brand.tone_keywords || [],
    competitors: brand.competitors?.map(c => c.name).join(', ') || '',
    differentiators: brand.values?.join(', ') || '',
    primary_color: brand.primary_color || '#000000',
    secondary_color: brand.secondary_color || '#2c2c2c',
    fonts,
    products: (brand.products || []).map(p => ({ name: p.name, description: p.description })),
  }
}

function buildImagePoolFromBrandImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  images: BrandImage[],
  businessType: ReturnType<typeof getBusinessType>
): Array<{ url: string; tag: string }> {
  // Use bucketBrandImages to get the Marketing OS default ordering (which
  // already handles the Shopify vs non-Shopify tag rules), but return the
  // flat pool with original tags so the factory's role-based round-robin
  // can do its thing.
  const { productImages, lifestyleImages } = bucketBrandImages(images, businessType)
  const toUrl = (img: BrandImage) => {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }
  const pool: Array<{ url: string; tag: string }> = []
  const seen = new Set<string>()
  for (const img of [...productImages, ...lifestyleImages]) {
    const url = toUrl(img)
    if (seen.has(url)) continue
    seen.add(url)
    pool.push({ url, tag: img.tag ?? 'other' })
  }
  return pool
}

// ---------------------------------------------------------------------------
// POST handler — end-to-end pipeline
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: brandId } = await params
  const { supabase, error, status } = await authorizeBrandMember(brandId)
  if (error) return NextResponse.json({ error }, { status })

  let body: { activeCampaignId?: string | null } = {}
  try { body = await request.json() } catch { /* body is optional */ }

  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .maybeSingle()
  if (brandErr || !brand) {
    return NextResponse.json({ error: 'Brand not found', details: brandErr?.message }, { status: 404 })
  }
  const notes = parseNotes(brand.notes)

  // Load brand images in parallel with the campaign lookup. Both branches
  // are wrapped in real Promises via async IIFEs because Supabase query
  // builders return PromiseLike, which Promise.all can't resolve directly.
  const imagesTask = (async () => {
    return supabase
      .from('brand_images')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
  })()

  const campaignTask = (async (): Promise<CampaignContext | null> => {
    if (!body.activeCampaignId) return null
    const { data } = await supabase
      .from('campaigns')
      .select('id, brand_id, goal, offer, angle, key_message')
      .eq('id', body.activeCampaignId)
      .eq('brand_id', brandId)
      .maybeSingle()
    if (!data) return null
    return { goal: data.goal, offer: data.offer, angle: data.angle, key_message: data.key_message }
  })()

  const [imagesRes, campaign] = await Promise.all([imagesTask, campaignTask])
  const brandImages = (imagesRes.data || []) as BrandImage[]

  const brief = buildBriefFromBrand(brand as Brand, notes)
  const primary = brief.primary_color || '#000000'
  const secondary = brief.secondary_color || '#2c2c2c'

  // Build the image pool from brand_images using Marketing OS's tag buckets.
  const imagePool = buildImagePoolFromBrandImages(supabase, brandImages, getBusinessType(brand as Brand))

  try {
    // Step 0 — image assignments
    const assignments = await assignImages(imagePool)

    // Step 1 — color variants (fallback on Claude failure)
    let colorVariants: ColorVariant[]
    try {
      colorVariants = await generateColorVariants(primary, secondary)
    } catch (err) {
      console.error('[store/generate] color variants failed, using fallback:', err)
      colorVariants = neutralVariantsFallback(primary, secondary)
    }

    // Step 2 — variables
    const generatedValues = await generateVariableValues(brief, brand as Brand, campaign)

    // Step 3 — merge
    const { index, product, footerGroup } = await mergeTemplates(generatedValues)

    // Inject image URLs into merged index.json
    const indexJson = injectImageAssignments(index, assignments)

    // Step 4 — assemble color variants over base-settings
    const baseSettings = await loadJSON<Record<string, unknown>>('templates/store/base-settings.json')
    delete baseSettings._comment
    const mergedVariants = colorVariants.map(v => ({
      name: v.name,
      theme_settings: { ...baseSettings, ...v.theme_settings } as Record<string, string>,
    }))

    // Persist — upsert on brand_id
    const row = {
      brand_id: brandId,
      name: 'Default theme',
      color_variants: mergedVariants,
      selected_variant: 0,
      index_json: indexJson,
      product_json: product,
      footer_group_json: footerGroup,
      image_assignments: assignments,
      updated_at: new Date().toISOString(),
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from('store_themes')
      .upsert(row, { onConflict: 'brand_id' })
      .select()
      .single()

    if (upsertErr || !upserted) {
      console.error('[store/generate] upsert error:', upsertErr)
      return NextResponse.json({ error: 'Failed to persist theme', details: upsertErr?.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, theme: upserted })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    console.error('[store/generate] pipeline error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
