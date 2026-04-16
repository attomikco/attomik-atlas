import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { Brand, BrandVoiceExample } from '@/types'
import {
  colors,
  font,
  fontWeight,
  fontSize,
  spacing,
  radius,
  letterSpacing,
  shadow,
} from '@/lib/design-tokens'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface LandingStructuredContent {
  hero?: { headline?: string; subheadline?: string; cta_text?: string }
  problem?: { headline?: string; body?: string }
  solution?: { headline?: string; body?: string }
  benefits?: Array<{ headline?: string; body?: string }>
  social_proof?: { headline?: string; testimonial?: string; attribution?: string; stat?: string }
  faq?: Array<{ question?: string; answer?: string }>
  final_cta?: { headline?: string; body?: string; cta_text?: string }
}

export interface LandingBriefData {
  goal?: string | null
  offer?: string | null
  key_message?: string | null
  angle?: string | null
  campaign_name?: string | null
  audience?: string | null
  /**
   * Pre-drafted section-by-section copy (from the landing-brief generator).
   * When present, Claude treats this as the canonical copy and focuses on
   * layout/design rather than inventing new headlines.
   */
  structured_content?: LandingStructuredContent | null
}

export type LandingDesignTokens = {
  colors: typeof colors
  font: typeof font
  fontWeight: typeof fontWeight
  fontSize: typeof fontSize
  spacing: typeof spacing
  radius: typeof radius
  letterSpacing: typeof letterSpacing
  shadow: typeof shadow
}

export const defaultDesignTokens: LandingDesignTokens = {
  colors,
  font,
  fontWeight,
  fontSize,
  spacing,
  radius,
  letterSpacing,
  shadow,
}

export interface GenerateLandingPageOptions {
  brandData: Brand
  briefData: LandingBriefData
  designTokens?: LandingDesignTokens
  voiceExamples?: BrandVoiceExample[]
  maxTokens?: number
}

export class LandingPageGenerationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'LandingPageGenerationError'
  }
}

function parseFont(f: Brand['font_heading'] | Brand['font_body']): string {
  if (!f) return ''
  if (typeof f === 'string') {
    try {
      const parsed = JSON.parse(f)
      return parsed?.family || ''
    } catch {
      return ''
    }
  }
  return f.family || ''
}

function parseBrandNotes(brand: Brand): Record<string, unknown> {
  if (!brand.notes) return {}
  try {
    return JSON.parse(brand.notes)
  } catch {
    return {}
  }
}

function buildBrandIdentityBlock(brand: Brand): string {
  const notes = parseBrandNotes(brand)
  const businessType = (notes.business_type as string) || 'brand'
  const headingFamily = parseFont(brand.font_heading) || brand.font_primary?.split('|')[0] || ''
  const bodyFamily = parseFont(brand.font_body) || brand.font_secondary || headingFamily

  const personas = brand.customer_personas?.length
    ? brand.customer_personas
        .map(p => {
          const header = `${p.name}${p.age_range ? ` (${p.age_range})` : ''}: ${p.description}`
          const pains = p.pain_points?.length ? `\n    Pain points: ${p.pain_points.join(', ')}` : ''
          return `  - ${header}${pains}`
        })
        .join('\n')
    : ''

  const products = brand.products?.length
    ? brand.products
        .map(p => `  - ${p.name}${p.price_range ? ` [${p.price_range}]` : ''}${p.description ? `: ${p.description}` : ''}`)
        .join('\n')
    : ''

  const competitors = brand.competitors?.length
    ? brand.competitors.map(c => `  - ${c.name}${c.website ? ` (${c.website})` : ''}`).join('\n')
    : ''

  return [
    `BRAND: ${brand.name}${brand.industry ? ` — ${brand.industry}` : ''}`,
    brand.website ? `Website: ${brand.website}` : '',
    `Business type: ${businessType}`,
    brand.mission ? `Mission: ${brand.mission}` : '',
    brand.vision ? `Vision: ${brand.vision}` : '',
    brand.values?.length ? `Values: ${brand.values.join(', ')}` : '',
    brand.target_audience ? `Target audience: ${brand.target_audience}` : '',
    brand.brand_voice ? `Brand voice: ${brand.brand_voice}` : '',
    brand.tone_keywords?.length ? `Tone keywords: ${brand.tone_keywords.join(', ')}` : '',
    brand.avoid_words?.length ? `Never use these words: ${brand.avoid_words.join(', ')}` : '',
    '',
    'BRAND COLORS (use these — do not invent new ones):',
    `  Primary:   ${brand.primary_color || '—'}`,
    `  Secondary: ${brand.secondary_color || '—'}`,
    `  Accent:    ${brand.accent_color || '—'}`,
    '',
    'BRAND FONTS (load from Google Fonts when used):',
    `  Heading: ${headingFamily || 'Barlow'} (fallback: sans-serif)`,
    `  Body:    ${bodyFamily || 'system-ui'} (fallback: sans-serif)`,
    personas ? `\nCUSTOMER PERSONAS:\n${personas}` : '',
    products ? `\nPRODUCTS:\n${products}` : '',
    competitors ? `\nCOMPETITORS (differentiate from these):\n${competitors}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildDesignSystemBlock(tokens: LandingDesignTokens): string {
  return `ATTOMIK DESIGN SYSTEM (hard constraints):

Core palette (use these tokens literally in CSS):
  ink / primary text:   ${tokens.colors.ink}
  paper / page bg:      ${tokens.colors.paper}
  cream / subtle bg:    ${tokens.colors.cream}
  accent (neon green):  ${tokens.colors.accent}
  muted text:           ${tokens.colors.muted}
  border:               ${tokens.colors.border}

Typography:
  Headings: ${tokens.font.heading}, weight ${tokens.fontWeight.heading}, UPPERCASE, tight letter-spacing (${tokens.letterSpacing.snug}).
  Body:     ${tokens.font.mono} for labels/captions, sans-serif for long-form copy, weight ${tokens.fontWeight.normal}.

Spacing scale (px): ${Object.values(tokens.spacing).join(', ')}
Border radius scale (px): ${Object.values(tokens.radius).join(', ')}
Pill radius: ${tokens.radius.pill} (used for all buttons and tags)

Shadow scale:
  soft card:  ${tokens.shadow.card}
  hover:      ${tokens.shadow.cardHover}
  accent btn: ${tokens.shadow.accentBtn}

RULES:
- Prefer inline styles (style="...") over classes for layout and color.
- Never hardcode a color that is not in the brand palette or the design system palette above.
- All primary CTA buttons use the brand accent color (fallback to ${tokens.colors.accent}) with rounded-pill shape.
- Headings MUST use the brand heading font in UPPERCASE at weight ${tokens.fontWeight.heading}.
- Body copy must have line-height 1.5–1.7 and max readable width (~65ch / ~680px).
- Use generous section padding: at least ${tokens.spacing[16]}px vertical on desktop.`
}

function buildSystemPrompt(brand: Brand, tokens: LandingDesignTokens, voiceExamples?: BrandVoiceExample[]): string {
  const voiceBlock = voiceExamples?.length
    ? `\nVOICE REFERENCE:\n${voiceExamples
        .map(e => `  [${e.category}] "${e.content}"${e.notes ? ` — ${e.notes}` : ''}`)
        .join('\n')}`
    : ''

  return `You are a world-class landing page designer and copywriter.
You design high-converting, visually striking, brand-native landing pages for DTC and CPG brands.
You pair a sharp copywriting instinct with a clean, modern, editorial design aesthetic — think The New York Times × Figma × Nike.

${buildBrandIdentityBlock(brand)}
${voiceBlock}

${buildDesignSystemBlock(tokens)}

OUTPUT CONTRACT — read carefully:
- Output a COMPLETE, SELF-CONTAINED HTML document: <!doctype html> through </html>.
- Include ALL required CSS inside a single <style> block in <head>, plus inline styles where helpful.
- Include a <link> to Google Fonts for the brand heading and body fonts.
- Use semantic HTML: <header>, <section>, <article>, <footer>, proper <h1>/<h2> hierarchy.
- Make the page fully responsive with CSS (no JS frameworks). Use CSS grid/flex and @media queries.
- Include every section from the brief: hero, problem, solution, benefits, social proof, FAQ, final CTA.
- Every landing page you generate must feel UNIQUE to this brand — never template-y, never generic.
- Do NOT include any lorem ipsum, placeholder text, or generic stock copy. Every word is brand-native.
- Do NOT include <script> tags, analytics, or external JS.
- Do NOT wrap the output in code fences or markdown. Output raw HTML only.
- Do NOT include any commentary before or after the HTML.

START your response with <!doctype html> and END with </html>. Nothing else.`
}

function buildStructuredContentBlock(content?: LandingStructuredContent | null): string {
  if (!content) return ''
  const lines: string[] = ['', 'PRE-DRAFTED COPY (use this as the canonical copy — you may polish but do not drift from intent):']
  if (content.hero) {
    lines.push('Hero:')
    if (content.hero.headline) lines.push(`  Headline: ${content.hero.headline}`)
    if (content.hero.subheadline) lines.push(`  Subheadline: ${content.hero.subheadline}`)
    if (content.hero.cta_text) lines.push(`  CTA: ${content.hero.cta_text}`)
  }
  if (content.problem) {
    lines.push('Problem:')
    if (content.problem.headline) lines.push(`  Headline: ${content.problem.headline}`)
    if (content.problem.body) lines.push(`  Body: ${content.problem.body}`)
  }
  if (content.solution) {
    lines.push('Solution:')
    if (content.solution.headline) lines.push(`  Headline: ${content.solution.headline}`)
    if (content.solution.body) lines.push(`  Body: ${content.solution.body}`)
  }
  if (content.benefits?.length) {
    lines.push('Benefits:')
    content.benefits.forEach((b, i) => {
      lines.push(`  ${i + 1}. ${b.headline || ''}${b.body ? ` — ${b.body}` : ''}`)
    })
  }
  if (content.social_proof) {
    lines.push('Social proof:')
    if (content.social_proof.headline) lines.push(`  Headline: ${content.social_proof.headline}`)
    if (content.social_proof.testimonial) lines.push(`  Testimonial: "${content.social_proof.testimonial}"`)
    if (content.social_proof.attribution) lines.push(`  Attribution: ${content.social_proof.attribution}`)
    if (content.social_proof.stat) lines.push(`  Stat: ${content.social_proof.stat}`)
  }
  if (content.faq?.length) {
    lines.push('FAQ:')
    content.faq.forEach((f, i) => {
      lines.push(`  Q${i + 1}: ${f.question || ''}`)
      if (f.answer) lines.push(`  A${i + 1}: ${f.answer}`)
    })
  }
  if (content.final_cta) {
    lines.push('Final CTA:')
    if (content.final_cta.headline) lines.push(`  Headline: ${content.final_cta.headline}`)
    if (content.final_cta.body) lines.push(`  Body: ${content.final_cta.body}`)
    if (content.final_cta.cta_text) lines.push(`  CTA: ${content.final_cta.cta_text}`)
  }
  return lines.join('\n')
}

function buildUserPrompt(brief: LandingBriefData, brandName: string): string {
  return `Design and write a complete landing page for ${brandName} based on this campaign brief:

Campaign:    ${brief.campaign_name || 'Untitled campaign'}
Goal:        ${brief.goal || 'Drive conversions'}
Offer:       ${brief.offer || 'Not specified'}
Key message: ${brief.key_message || 'Not specified'}
Angle:       ${brief.angle || 'Not specified'}
Audience:    ${brief.audience || 'Brand target audience'}
${buildStructuredContentBlock(brief.structured_content)}

Requirements:
1. Hero section with a bold headline (brand heading font, uppercase), a sharp subheadline, and a primary CTA button using the brand accent color.
2. Problem section that agitates the pain point in the audience's voice.
3. Solution section that frames the offer as the answer — concrete, specific, not vague.
4. 3 benefits as a clear visual row or grid, each with a short headline + one-sentence body.
5. Social proof: at least one testimonial with attribution plus a hero stat (number + label).
6. FAQ with 3–5 question/answer pairs that preempt real objections to this offer.
7. Final CTA section — urgency or reinforcement copy + the primary CTA repeated.
8. Subtle editorial details: dividers, small accent rules, generous whitespace, tasteful hover states on buttons.

Write copy that ONLY ${brandName} could have written — draw on the brand voice, tone, and mission above. Output the full HTML document now.`
}

export interface LandingPrompts {
  system: string
  user: string
}

export function buildLandingPrompts({
  brandData,
  briefData,
  designTokens = defaultDesignTokens,
  voiceExamples,
}: Omit<GenerateLandingPageOptions, 'maxTokens'>): LandingPrompts {
  if (!brandData?.name) {
    throw new LandingPageGenerationError('brandData.name is required')
  }
  return {
    system: buildSystemPrompt(brandData, designTokens, voiceExamples),
    user: buildUserPrompt(briefData, brandData.name),
  }
}

export function hashLandingPrompts(prompts: LandingPrompts): string {
  return createHash('sha256').update(prompts.system).update('\0').update(prompts.user).digest('hex')
}

export async function generateLandingPageFromPrompts(
  prompts: LandingPrompts,
  maxTokens = 4000,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new LandingPageGenerationError('ANTHROPIC_API_KEY is not set')
  }

  let response: Anthropic.Message
  try {
    response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: prompts.system,
      messages: [{ role: 'user', content: prompts.user }],
    })
  } catch (err) {
    throw new LandingPageGenerationError(
      err instanceof Error ? `Claude API request failed: ${err.message}` : 'Claude API request failed',
      err,
    )
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()

  if (!text) {
    throw new LandingPageGenerationError('Claude returned an empty response')
  }

  const cleaned = text.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const startsOk = cleaned.toLowerCase().startsWith('<!doctype html') || cleaned.toLowerCase().startsWith('<html')
  if (!startsOk) {
    throw new LandingPageGenerationError('Claude response did not contain a valid HTML document')
  }

  return cleaned
}

export async function generateLandingPageHtml(options: GenerateLandingPageOptions): Promise<string> {
  const prompts = buildLandingPrompts(options)
  return generateLandingPageFromPrompts(prompts, options.maxTokens ?? 4000)
}
