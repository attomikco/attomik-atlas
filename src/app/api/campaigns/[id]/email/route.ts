import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import { buildMasterEmail, DEFAULT_MASTER_CONFIG, type MasterEmailConfig } from '@/lib/email-master-template'
import { bucketBrandImages, getBusinessType, pickSlotImages } from '@/lib/brand-images'
import type { BrandImage } from '@/types'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Service-role client for public preview reads — the preview page is
// unauthenticated (anonymous funnel visitors), so the user-scoped server
// client can't satisfy RLS on brand_images. The campaign ID in the URL is the
// effective auth token for this public endpoint.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, brand:brands(*)')
    .eq('id', id).single()

  if (!campaign?.brand) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const brand = campaign.brand
  const systemPrompt = buildBrandSystemPrompt(brand)

  const notesData = (() => { try { return JSON.parse(brand.notes || '{}') } catch { return {} } })()
  const savedConfig = notesData?.email_config as MasterEmailConfig | null

  // Fetch images
  const { data: brandImagesData } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at')
  const rows = (brandImagesData || []) as BrandImage[]
  const toUrl = (img: BrandImage) => {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }
  // Smart bucketing — Shopify vs non-Shopify handled by the helper
  const { productImages: bucketProduct, lifestyleImages: bucketLifestyle } =
    bucketBrandImages(rows, getBusinessType(brand))
  const productImages = bucketProduct.map(toUrl)
  const lifestyleImages = bucketLifestyle.map(toUrl)

  const products = (brand.products || []).slice(0, 6)
  const productList = products.map((p: any) => `${p.name}${p.price_range ? ` (${p.price_range})` : ''}: ${p.description || ''}`).join('\n') || 'No products specified'

  const prompt = `The brand voice examples in the system prompt are your style reference — apply that voice to email format specifically. Voice samples you were shown may come from ad copy or landing pages; your job is to carry that same voice into an email hero, a story paragraph, a testimonial, a FAQ answer, etc. without losing it to "email formality".

Generate ALL content for a campaign email for ${brand.name}.

CAMPAIGN:
- Type: ${campaign.goal || 'Brand campaign'}
- Hook: ${campaign.key_message || 'Not specified'}
- Offer: ${campaign.offer || 'Not specified'}
- Angle: ${campaign.angle || 'Not specified'}
- Audience: ${campaign.audience_notes || brand.target_audience || 'General'}

BRAND:
- Website: ${brand.website || 'N/A'}
- Mission: ${brand.mission || 'N/A'}
- Voice: ${brand.brand_voice || 'N/A'}
- Tone: ${brand.tone_keywords?.join(', ') || 'professional'}

PRODUCTS:
${productList}

Every section should be tailored to this campaign. The hero, pillars, story, product feature, callout, testimonials — all should reinforce the campaign hook.

EMAIL FLOW — the 13 content blocks in the order they render, each with its narrative role. Write copy that matches the role, not just the length target.

 1. 01a HERO IMAGE       — light bg. Campaign opener, product shot, lifestyle image. The image speaks for itself; no copy field, but your hero headline below must pick up the tone the image sets.
 2. 01b HERO TEXT        — light bg, airier & conversational. Main campaign message, product intro, brand story opener. The first copy the reader sees — where the email earns the read.
 3. 01c CTA BUTTON       — light bg. The standalone CTA right after the hero. Should feel like the natural next step the hook implies.
 4. 02  PROMO CODE       — light bg, airier. Product launches, seasonal sales, welcome discounts, flash sales, referral rewards. Concrete offer, clear code, specific CTA.
 5. 03  3-PILLAR FEATURE — dark bg, heavier & moodier. Product benefits, brand values, how-it-works (simplified), ingredient highlights. Three distinct value props stacked vertically; each must stand on its own and feel memorable in isolation.
 6. 04  STORY / NOSTALGIA — light bg, airier & conversational. Brand origin, product story, emotional connection, cultural narrative, founder story. No CTA — pure brand story. First-person or tight third-person, sensory detail, specific moments.
 7. 05  PRODUCT FEATURE  — dark bg, heavier & moodier. Hero product spotlight, new product launch, bestseller highlight, featured SKU. productBody1 hooks on the single most compelling benefit; productBody2 goes sensory/experiential or drops social proof.
 8. 11  CALLOUT CARD     — dark bg, heavier & moodier. Brand mission or values statement, key announcement, urgency or limited-time message, bold quote or brand philosophy moment. Exists to visually stand out from surrounding blocks — write it like a pull-quote.
 9. 06  HOW-TO / 3 STEPS — light bg, airier & conversational. Product instructions, recipe steps, onboarding process. These are literal steps the customer takes with the product in hand — NOT brand onboarding or purchase-funnel steps.
10. 07  TESTIMONIALS     — dark bg, heavier & moodier. Social proof, product reviews, trust building. Three reviews from three different kinds of customer with three different angles (taste/experience, quality/craft, ritual/lifestyle). NOT three variations of "I love it".
11. 08  YOU'LL ALSO LOVE — light bg, airier & conversational. Cross-sell, upsell, "complete the collection" moment. Complements to the featured product, not repeats of it.
12. 12  FAQ              — light bg, airier & conversational. Welcome series, post-purchase, product launch — any email where objections need addressing. Each answer addresses a real purchase objection (shipping, returns, how-it-works, differentiation), conversationally.
13. 09  INSTAGRAM GRID   — light bg. End of newsletter exit ramp to social. Short, inviting CTA.

CROSS-FIELD CONSTRAINTS — the output must satisfy these, not just the length targets:
- subjectLine + previewText are a two-part hook. The preview CONTINUES the subject; it must not repeat or rephrase it.
- heroHeadline is punchy (3-7 words). heroBody elaborates. They must NOT rephrase each other — the headline plants the hook, the body deepens it with specifics.
- pillar1, pillar2, pillar3 must be three genuinely distinct value props. If any two could be swapped without changing meaning, they are not distinct enough. Aim for different axes: taste/quality, process/craft, values/ethics, convenience, ritual, durability.
- storyQuote must feel like a line that could be pulled directly from storyBody. If the body is about late-night cooking with a grandmother, the quote should be a moment that plausibly came from that story.
- calloutHeadline must offer a DIFFERENT angle than heroHeadline. If the hero is about comfort, the callout might be about craft or legacy — not a restatement.
- FAQ answers must NOT repeat information already covered in the hero or product feature. FAQ is for friction/objections, not recap.
- promoCode must relate to the brand name or a product (e.g. JOLENE15, MONJITA20, WESAKE10). Do NOT use generic codes like SAVE15, WELCOME10, FIRST15.

PRODUCT GUIDANCE:
- productName should be whichever product in the PRODUCTS list best represents the brand as a flagship. If one is clearly a bestseller or most distinctive, pick that one — do not default to the first product if a different one is more iconic.
- The youllAlsoLove products array should be COMPLEMENTS or alternatives to the featured product, not repeats. If you featured the flagship in block 05, fill youllAlsoLove with the rest of the line or the 2-3 best cross-sells — do NOT include the flagship again.

ICON RULE:
- Do NOT use ANY emoji anywhere in the output. Pillar icons must be single unicode symbols, one of: ✦ ⇢ ✓ ◆ ★ ✧ ♦ ⇪. Pick symbols that fit each pillar's meaning.

Return a COMPLETE JSON object with ALL of these fields. Every field must be filled with real, specific, on-brand content. No placeholder text. No "[Brand Name]" — use "${brand.name}" directly.

{
  "subjectLine": "Inbox subject line, 30-60 chars, matches campaign hook",
  "previewText": "40-90 chars, continues the subject (does not repeat it)",
  "announcementText": "Top banner text, under 40 chars",
  "heroEyebrow": "Eyebrow above hero headline, 2-4 words",
  "heroHeadline": "Punchy 3-7 word hook, matches campaign hook",
  "heroBody": "3 sentences, about 60 words. Elaborates the hook with specifics",
  "heroCta": "CTA button text, 2-4 words",
  "heroCtaUrl": "${brand.website || ''}",
  "promoEyebrow": "Label above promo, 2-3 words",
  "promoDiscount": "${campaign.key_message?.match(/(\d+%)/) ? `${campaign.key_message.match(/(\d+%)/)?.[1]} Off` : '15% Off'}",
  "promoSubtitle": "Subtitle like 'Your First Order'",
  "promoCode": "Brand-specific code in CAPS (see constraint above)",
  "promoExpiry": "Expiry note, e.g. 'First order only · Limited time'",
  "promoCta": "Promo CTA text, 2-4 words",
  "promoCtaUrl": "${brand.website || ''}",
  "pillarsEyebrow": "Label above 3-pillar, 2-4 words",
  "pillarsHeadline": "3-pillar headline, 3-6 words",
  "pillar1Icon": "Single unicode symbol from: ✦ ⇢ ✓ ◆ ★ ✧ ♦ ⇪",
  "pillar1Label": "Pillar 1 label, 2-3 words",
  "pillar1Body": "Pillar 1 body, 1 sentence, specific value prop",
  "pillar2Icon": "Single unicode symbol",
  "pillar2Label": "Pillar 2 label — DIFFERENT axis than pillar 1",
  "pillar2Body": "Pillar 2 body",
  "pillar3Icon": "Single unicode symbol",
  "pillar3Label": "Pillar 3 label — DIFFERENT axis than pillars 1 & 2",
  "pillar3Body": "Pillar 3 body",
  "storyEyebrow": "Label above story, 2-3 words",
  "storyHeadline": "Story headline, 3-7 words",
  "storyBody": "3-4 sentences (60-90 words). Sensory, specific, emotional",
  "storyQuote": "A memorable line that plausibly comes FROM storyBody above",
  "storyQuoteAttribution": "Attribution (founder name or '— ${brand.name}')",
  "storyClosing": "1-2 sentence brand promise that lands the narrative",
  "productBadge": "Badge like 'Best Seller' or campaign-specific",
  "productName": "The flagship product from the PRODUCTS list (not necessarily the first)",
  "productBody1": "1-2 sentences on the single most compelling benefit",
  "productBody2": "1-2 sentences — sensory, experiential, or social proof",
  "productCta": "Product CTA text, 2-4 words",
  "productCtaUrl": "${brand.website || ''}",
  "calloutEyebrow": "Label above callout, 2-3 words",
  "calloutHeadline": "Callout headline, 4-8 words — DIFFERENT angle than heroHeadline",
  "calloutBody": "1-2 sentences supporting the callout",
  "calloutCta": "Callout CTA text, 2-4 words",
  "calloutCtaUrl": "${brand.website || ''}",
  "howToEyebrow": "Label above how-to, 2-4 words",
  "howToHeadline": "How-to headline, 3-5 words",
  "howToSubheadline": "Short subheadline, 1 sentence",
  "step1Label": "Step 1 label, 1-2 words — literal product-use step",
  "step1Body": "Step 1 description, 1 sentence",
  "step2Label": "Step 2 label",
  "step2Body": "Step 2 description",
  "step3Label": "Step 3 label",
  "step3Body": "Step 3 description",
  "howToNote": "Short practical note below the steps",
  "howToCta": "How-to CTA text, 2-4 words",
  "howToCtaUrl": "${brand.website || ''}",
  "testimonialsEyebrow": "Label above testimonials, 2-4 words",
  "testimonialsHeadline": "Testimonials headline, 2-4 words",
  "testimonials": [
    {"quote": "Testimonial 1 — angle A (taste/experience)", "author": "First L."},
    {"quote": "Testimonial 2 — angle B (quality/craft)", "author": "First L."},
    {"quote": "Testimonial 3 — angle C (ritual/lifestyle)", "author": "First L."}
  ],
  "youllAlsoLoveEyebrow": "Label above grid, 2-3 words",
  "youllAlsoLoveHeadline": "Grid headline, 3-5 words",
  "youllAlsoLoveSubheadline": "Optional subheadline, 1 sentence",
  "products": [
    // Do NOT emit an imageUrl field — images come from brand_images at render time.
    ${products.slice(0, 4).map((p: any) => `{"name": "${p.name || ''}", "description": "${(p.description || '').replace(/"/g, '\\"').slice(0, 80)}", "url": "${brand.website || ''}"}`).join(',\n    ')}
  ],
  "faqEyebrow": "Label above FAQ, 2-3 words",
  "faqHeadline": "FAQ headline, 3-5 words",
  "faqItems": [
    {"question": "Shipping or returns objection", "answer": "1-3 sentences, conversational"},
    {"question": "How-it-works / product-use objection", "answer": "1-3 sentences, conversational"},
    {"question": "Differentiation / 'why this brand' objection", "answer": "1-3 sentences, conversational"}
  ],
  "faqCta": "FAQ CTA text, 3-5 words",
  "faqCtaUrl": "${brand.website || ''}",
  "igEyebrow": "Label above IG grid, 2-3 words",
  "igHeadline": "IG section headline, 3-5 words",
  "igHandle": "@${brand.name.toLowerCase().replace(/\s+/g, '')}",
  "igCta": "Follow CTA text, 3-5 words"
}

Respond with ONLY the JSON object. No markdown, no explanation.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text).join('')
    .replace(/```json|```/g, '').trim()

  let generatedConfig: Partial<MasterEmailConfig>
  try {
    generatedConfig = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Pre-pick orientation-aware hero + product images (same rules as Creative
  // Studio templates). Used as defaults — any saved user assignment wins.
  const [heroPick, productPick] = pickSlotImages(rows, getBusinessType(brand), ['hero', 'product'])
  const heroUrl = heroPick ? toUrl(heroPick) : ''
  const productUrl = productPick ? toUrl(productPick) : ''

  // IG grid backfill — keep user's manual IG images if they set any, otherwise
  // seed all 6 slots from the lifestyle/product pool so the preview never
  // renders empty placeholder tiles.
  const savedIg = Array.isArray(savedConfig?.igImages) ? savedConfig.igImages : []
  const anyIgSet = savedIg.some(url => typeof url === 'string' && url.length > 0)
  const lifestylePool = [...lifestyleImages, ...productImages]
  const igImages: string[] = anyIgSet
    ? [0, 1, 2, 3, 4, 5].map(i => savedIg[i] || lifestylePool[i] || '')
    : [0, 1, 2, 3, 4, 5].map(i => lifestylePool[i] || '')

  // Merge: defaults < generated < saved. Saved user edits always win over AI;
  // AI only fills fields the user hasn't touched.
  const finalConfig: MasterEmailConfig = {
    ...DEFAULT_MASTER_CONFIG,
    ...generatedConfig,
    ...(savedConfig || {}),
    emailColors: savedConfig?.emailColors ?? null,
    enabledBlocks: savedConfig?.enabledBlocks ?? DEFAULT_MASTER_CONFIG.enabledBlocks,
    igImages,
    imageAssignments: {
      ...(savedConfig?.imageAssignments || {}),
      hero: savedConfig?.imageAssignments?.hero || heroUrl,
      product: savedConfig?.imageAssignments?.product || productUrl,
    },
  }

  const logoLight = notesData?.logo_url_light || null
  const brandData = {
    ...brand,
    logo_url_light: logoLight,
    font_heading: typeof brand.font_heading === 'string' ? JSON.parse(brand.font_heading) : brand.font_heading,
    font_body: typeof brand.font_body === 'string' ? JSON.parse(brand.font_body) : brand.font_body,
  }

  const html = buildMasterEmail(brandData, finalConfig, productImages, lifestyleImages)
  const subject = finalConfig.subjectLine || finalConfig.heroHeadline

  await supabase.from('generated_content').insert({
    campaign_id: id,
    brand_id: brand.id,
    type: 'email',
    content: JSON.stringify({ html, subject, config: finalConfig }),
  })

  return NextResponse.json({
    html,
    subject,
    config: finalConfig,
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fast path — return the already-rendered email that POST persisted to
  // generated_content. Previously this handler re-fetched brand + images and
  // re-ran buildMasterEmail on every preview-page mount, which was wasteful
  // (no AI call, but still a cold DB round-trip + full HTML rebuild per load).
  // The POST handler is the single writer; GET just serves what's stored.
  const { data: stored } = await supabaseAdmin
    .from('generated_content')
    .select('content')
    .eq('campaign_id', id)
    .eq('type', 'email')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (stored?.content) {
    try {
      const parsed = JSON.parse(stored.content)
      if (parsed.html) {
        // Staleness check — cached HTML written before the image/palette fixes
        // contains IG placeholders, the old cream fallback bg, or an empty hero
        // url. Fall through to rebuild so the preview picks up fresh content
        // without requiring a manual regenerate.
        const html: string = parsed.html
        const isStale =
          html.includes('placehold.co') ||
          html.includes('#f8f7f4') ||
          html.includes("background-image:url('')")
        if (!isStale) {
          return NextResponse.json({
            html,
            subject: parsed.subject || '',
            config: parsed.config || null,
          })
        }
      }
    } catch {}
  }

  // No cached row — fall through to the saved-config rebuild path so preview
  // still shows something if the campaign was generated on an older flow that
  // didn't persist HTML to generated_content.
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('*, brand:brands(*)')
    .eq('id', id).single()

  if (!campaign?.brand) return NextResponse.json({ html: null })

  const brand = campaign.brand
  const notesData = (() => { try { return JSON.parse(brand.notes || '{}') } catch { return {} } })()
  const savedConfig = notesData?.email_config as MasterEmailConfig | null

  // Fall back to AI generation only when no saved config exists at all.
  if (!savedConfig) return NextResponse.json({ html: null })

  // Fetch images — same pipeline as POST and the dashboard email page.
  const { data: brandImagesData } = await supabaseAdmin
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at')
  const rows = (brandImagesData || []) as BrandImage[]
  const toUrl = (img: BrandImage) => {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabaseAdmin.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }
  const { productImages: bucketProduct, lifestyleImages: bucketLifestyle } =
    bucketBrandImages(rows, getBusinessType(brand))
  const productImages = bucketProduct.map(toUrl)
  const lifestyleImages = bucketLifestyle.map(toUrl)

  // IG grid backfill — saved configs written before the client-side auto-fill
  // ran (or created by older generate routes) have empty igImages. Seed them
  // server-side from the lifestyle/product pool so the preview iframe always
  // shows real images instead of placeholder tiles.
  const savedIg = Array.isArray(savedConfig.igImages) ? savedConfig.igImages : []
  const anyIgSet = savedIg.some(url => typeof url === 'string' && url.length > 0)
  const lifestylePool = [...bucketLifestyle, ...bucketProduct].map(toUrl)
  const igImages: string[] = anyIgSet
    ? [0, 1, 2, 3, 4, 5].map(i => savedIg[i] || lifestylePool[i] || '')
    : [0, 1, 2, 3, 4, 5].map(i => lifestylePool[i] || '')

  // Pre-pick orientation-aware hero + product images (same rules as Creative
  // Studio templates). Used as defaults — any saved user assignment wins.
  const [heroPick, productPick] = pickSlotImages(rows, getBusinessType(brand), ['hero', 'product'])
  const heroUrl = heroPick ? toUrl(heroPick) : ''
  const productUrl = productPick ? toUrl(productPick) : ''

  // Campaign prefills — match the dashboard email page exactly.
  const configWithPrefills: MasterEmailConfig = {
    ...DEFAULT_MASTER_CONFIG,
    ...savedConfig,
    igImages,
    imageAssignments: {
      ...(savedConfig.imageAssignments || {}),
      hero: savedConfig.imageAssignments?.hero || heroUrl,
      product: savedConfig.imageAssignments?.product || productUrl,
    },
    heroHeadline: campaign.key_message || savedConfig.heroHeadline,
    calloutHeadline: campaign.offer || savedConfig.calloutHeadline,
    heroCta: campaign.goal === 'new_product_launch' ? 'Shop Now'
      : campaign.goal === 'limited_offer___sale' ? 'Claim Offer'
      : campaign.goal === 'brand_awareness' ? 'Learn More'
      : savedConfig.heroCta || 'Shop Now',
  }

  const logoLight = notesData?.logo_url_light || null
  const brandData = {
    ...brand,
    logo_url_light: logoLight,
    font_heading: typeof brand.font_heading === 'string' ? JSON.parse(brand.font_heading) : brand.font_heading,
    font_body: typeof brand.font_body === 'string' ? JSON.parse(brand.font_body) : brand.font_body,
  }

  const html = buildMasterEmail(brandData, configWithPrefills, productImages, lifestyleImages)
  const subject = configWithPrefills.subjectLine || configWithPrefills.heroHeadline

  return NextResponse.json({
    html,
    subject,
    config: configWithPrefills,
  })
}
