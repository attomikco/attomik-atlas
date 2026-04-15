import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, buildBrandSystemPrompt } from '@/lib/anthropic'
import { DEFAULT_MASTER_CONFIG, type MasterEmailConfig } from '@/lib/email-master-template'
import { bucketBrandImages, getBusinessType, pickSlotImages } from '@/lib/brand-images'
import type { BrandImage } from '@/types'

// POST /api/email-templates/[id]/generate
// Body: { brief: string }
// Runs Claude with the brand system prompt + the block-menu instruction and
// writes the returned config into the template row. Returns the updated row.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const brief = (body.brief || '').toString().trim()
  if (!brief) return NextResponse.json({ error: 'brief required' }, { status: 400 })

  const { data: template, error: tErr } = await supabase
    .from('email_templates')
    .select('*, brand:brands(*)')
    .eq('id', id)
    .single()

  if (tErr || !template?.brand) {
    return NextResponse.json({ error: 'Template or brand not found' }, { status: 404 })
  }

  const brand = template.brand
  const systemPrompt = buildBrandSystemPrompt(brand)

  const products = (brand.products || []).slice(0, 6)
  const productList = products.map((p: { name?: string; price_range?: string; description?: string }) =>
    `${p.name || ''}${p.price_range ? ` (${p.price_range})` : ''}: ${p.description || ''}`
  ).join('\n') || 'No products specified'

  const prompt = `You are building a specific email template. Based on the brief below, decide:
1. Which blocks to enable (pick only the blocks that serve this email's goal — not all of them)
2. What copy to write for each enabled block

BLOCK MENU (pick only what fits the brief):
- 01a: Hero Image — always include
- 01b: Hero Text — always include
- 01c: CTA Button — always include
- 02: Promo Code — enable whenever the brief mentions a discount, coupon, code, % off, $ off, free shipping, or any concrete offer
- 03: 3-Pillar Feature — good for welcome/brand intro emails
- 04: Story / Nostalgia — good for brand story, welcome series
- 05: Product Feature — good for product launch, promotion
- 06: How-To — good for post-purchase, product education
- 07: Testimonials — good for welcome, abandoned cart, promotion
- 08: You'll Also Love — good for post-purchase, newsletter
- 09: Instagram Grid — always
- 11: Callout Card — good for abandoned cart, promotion, urgency
- 12: FAQ — good for welcome series, post-purchase

BRIEF:
${brief}

BRAND:
- Name: ${brand.name}
- Website: ${brand.website || 'N/A'}
- Mission: ${brand.mission || 'N/A'}
- Voice: ${brand.brand_voice || 'N/A'}
- Tone: ${brand.tone_keywords?.join(', ') || 'professional'}

PRODUCTS:
${productList}

ICON RULE:
- Do NOT use ANY emoji anywhere in the output. Pillar icons must be single unicode symbols, one of: \u2726 \u21e2 \u2713 \u25c6 \u2605 \u2727 \u2666 \u21ea.

PRODUCT FEATURE BLOCK (05) GUIDANCE:
- If the brand has at least one product in the PRODUCTS list above, include "05" in enabledBlocks for almost every email — Product Feature is the natural place to spotlight a SKU and is rarely wrong to show.
- When "05" is enabled, productName MUST NEVER be empty. Pick a flagship product from PRODUCTS (not always the first — choose the most iconic). productBody1 hooks on the single most compelling benefit (1-2 sentences). productBody2 goes sensory/experiential or drops social proof (1-2 sentences). Both bodies must contain real, specific copy — not generic filler.
- Only omit "05" when PRODUCTS is "No products specified" or when the brief explicitly says no product spotlight.

PROMO BLOCK (02) — BRIEF EXTRACTION RULE:
- Parse the BRIEF for any concrete offer: percent-off ("20% off", "save 25%"), dollar-off ("$10 off"), free shipping, BOGO, free gift, etc.
- If ANY such offer exists in the brief, you MUST enable "02" AND emit all promo fields — never fall back to a generic "15% Off / SAVE15" placeholder.
- promoDiscount must mirror the brief exactly: "20% off" → "20% Off", "25% off" → "25% Off", "$10 off" → "$10 Off", "free shipping" → "Free Shipping".
- promoCode must be brand-specific and reflect the discount value: e.g. if brand is "Jolene" and discount is 20%, use "JOLENE20" (not "SAVE15", "WELCOME10", "FIRST15", or anything generic).
- promoSubtitle, promoEyebrow, promoExpiry, promoCta must all be written fresh for this brief — do NOT reuse "Exclusive Offer / Your First Order / Claim Your Discount" wording unless the brief explicitly calls for it.
- If the brief has NO offer at all, omit "02" from enabledBlocks and leave all promo fields as empty strings.

CROSS-FIELD CONSTRAINTS:
- subjectLine + previewText are a two-part hook. previewText CONTINUES the subject; it must not repeat or rephrase it.
- heroHeadline is punchy (3-7 words). heroBody elaborates with specifics — they must not rephrase each other.
- pillar1/2/3 must be three genuinely distinct value props on different axes.
- calloutHeadline must offer a DIFFERENT angle than heroHeadline.
- FAQ answers must address real purchase objections — not recap hero/product content.

Return a COMPLETE JSON object with the fields below. Use "${brand.name}" directly — never "[Brand Name]" placeholder. Fields for blocks you did NOT enable should be empty strings (or empty arrays for testimonials/products/faqItems). Do NOT include emailColors, imageAssignments, or image URLs — those are handled separately.

{
  "enabledBlocks": ["01a","01b","01c", "..."],
  "subjectLine": "30-60 chars, punchy and specific",
  "previewText": "40-90 chars, continues the subject (does not repeat it)",
  "announcementText": "Top banner text, under 40 chars",
  "heroEyebrow": "2-4 word eyebrow",
  "heroHeadline": "Punchy 3-7 word hook",
  "heroBody": "3 sentences, ~60 words, benefit-focused and specific",
  "heroCta": "2-4 word CTA",
  "heroCtaUrl": "${brand.website || ''}",
  "promoEyebrow": "2-3 word label (only when '02' enabled)",
  "promoDiscount": "Mirrors the brief exactly — e.g. '20% Off' / '$10 Off' / 'Free Shipping'",
  "promoSubtitle": "Subtitle under discount",
  "promoCode": "Brand-specific CAPS code reflecting the discount value",
  "promoExpiry": "Expiry/terms line",
  "promoCta": "2-4 word CTA",
  "promoCtaUrl": "${brand.website || ''}",
  "pillarsEyebrow": "2-4 word label",
  "pillarsHeadline": "3-6 word headline",
  "pillar1Icon": "Single unicode symbol",
  "pillar1Label": "2-3 word label",
  "pillar1Body": "1 sentence, specific value prop",
  "pillar2Icon": "Single unicode symbol",
  "pillar2Label": "2-3 word label — different axis than pillar 1",
  "pillar2Body": "1 sentence",
  "pillar3Icon": "Single unicode symbol",
  "pillar3Label": "2-3 word label — different axis than pillars 1 & 2",
  "pillar3Body": "1 sentence",
  "storyEyebrow": "2-3 word label",
  "storyHeadline": "3-7 word headline",
  "storyBody": "3-4 sentences, sensory and emotional",
  "storyQuote": "A memorable line that plausibly comes FROM storyBody",
  "storyQuoteAttribution": "— Founder name or '— ${brand.name}'",
  "storyClosing": "1-2 sentence brand promise that lands the narrative",
  "productBadge": "'Best Seller' / 'Fan Favorite' / etc.",
  "productName": "Flagship product from PRODUCTS list",
  "productBody1": "1-2 sentences on the single most compelling benefit",
  "productBody2": "1-2 sentences — sensory, experiential, or social proof",
  "productCta": "2-4 word CTA",
  "productCtaUrl": "${brand.website || ''}",
  "calloutEyebrow": "2-3 word label",
  "calloutHeadline": "4-8 word headline — different angle than heroHeadline",
  "calloutBody": "1-2 sentences supporting the callout",
  "calloutCta": "2-4 word CTA",
  "calloutCtaUrl": "${brand.website || ''}",
  "howToEyebrow": "2-4 word label",
  "howToHeadline": "3-5 word headline",
  "howToSubheadline": "1 sentence",
  "step1Label": "1-2 words — literal product-use step",
  "step1Body": "1 sentence",
  "step2Label": "1-2 words",
  "step2Body": "1 sentence",
  "step3Label": "1-2 words",
  "step3Body": "1 sentence",
  "howToNote": "Short practical note",
  "howToCta": "2-4 word CTA",
  "howToCtaUrl": "${brand.website || ''}",
  "testimonialsEyebrow": "2-4 word label",
  "testimonialsHeadline": "2-4 word headline",
  "testimonials": [
    {"quote": "Angle A (taste/experience)", "author": "First L."},
    {"quote": "Angle B (quality/craft)", "author": "First L."},
    {"quote": "Angle C (ritual/lifestyle)", "author": "First L."}
  ],
  "youllAlsoLoveEyebrow": "2-3 word label",
  "youllAlsoLoveHeadline": "3-5 word headline",
  "youllAlsoLoveSubheadline": "1 sentence",
  "products": [
    ${products.slice(0, 4).map((p: { name?: string; description?: string }) => `{"name": "${p.name || ''}", "description": "${(p.description || '').replace(/"/g, '\\"').slice(0, 80)}", "url": "${brand.website || ''}"}`).join(',\n    ')}
  ],
  "faqEyebrow": "2-3 word label",
  "faqHeadline": "3-5 word headline",
  "faqItems": [
    {"question": "Shipping or returns objection", "answer": "1-3 sentences"},
    {"question": "How-it-works / product-use objection", "answer": "1-3 sentences"},
    {"question": "Differentiation / 'why this brand' objection", "answer": "1-3 sentences"}
  ],
  "faqCta": "3-5 word CTA",
  "faqCtaUrl": "${brand.website || ''}",
  "igEyebrow": "2-3 word label",
  "igHeadline": "3-5 word headline",
  "igHandle": "@${brand.name.toLowerCase().replace(/\s+/g, '')}",
  "igUrl": "",
  "igCta": "3-5 word CTA",
  "footerTagline": "Brand tagline, under 50 chars",
  "instagramUrl": ""
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

  // Product Feature (block 05) safety net — mirrors the same guard added to
  // the Brand Hub generator route (/api/email/generate-template). The AI
  // sometimes drops productName / productBody1 / productBody2 even when block
  // 05 is enabled, leaving the editor sidebar showing empty fields. Backfill
  // from the brand's product list so users always see real content to tweak.
  const flagship = (products[0] || {}) as { name?: string; title?: string; description?: string }
  const flagshipName = flagship.name || flagship.title || ''
  const flagshipDescription = flagship.description || ''
  if (typeof generatedConfig.productName !== 'string' || !generatedConfig.productName.trim()) {
    generatedConfig.productName = flagshipName || brand.name
    console.warn('[email-templates generate] productName empty, fell back to', generatedConfig.productName)
  }
  if (typeof generatedConfig.productBody1 !== 'string' || !generatedConfig.productBody1.trim()) {
    generatedConfig.productBody1 = flagshipDescription || `Discover what makes ${brand.name} different.`
  }
  if (typeof generatedConfig.productBody2 !== 'string' || !generatedConfig.productBody2.trim()) {
    generatedConfig.productBody2 = `Made for the way you live — try it for yourself.`
  }
  // If the AI omitted block 05 from enabledBlocks but the brand has a
  // product, force-include it so the populated fields actually render in
  // the preview. Skip when there are zero products.
  if (Array.isArray(generatedConfig.enabledBlocks) && flagshipName) {
    if (!generatedConfig.enabledBlocks.includes('05')) {
      generatedConfig.enabledBlocks = [...generatedConfig.enabledBlocks, '05']
    }
  }

  // Seed from defaults so every required field has a value. Generated copy
  // overrides the defaults. emailColors/imageAssignments are preserved from
  // the existing template row so the user's color/image customizations carry
  // over if they're regenerating copy on an existing template.
  const existingConfig = (template.email_config || {}) as Partial<MasterEmailConfig>

  // Testimonials fallback chain — AI → master template → DEFAULT_MASTER_CONFIG.
  // The AI often returns empty-string testimonials for templates where it
  // doesn't think social proof is the main goal; we never want empty star
  // rows rendering in the preview, so always backfill from a real source.
  const genTestimonials = (generatedConfig.testimonials || []).filter(
    t => (t?.quote || '').trim().length > 0
  )
  let testimonials = genTestimonials
  if (testimonials.length === 0) {
    const { data: masterRow } = await supabase
      .from('email_templates')
      .select('email_config')
      .eq('brand_id', brand.id)
      .eq('type', 'master')
      .maybeSingle()
    const masterConfig = (masterRow?.email_config || {}) as Partial<MasterEmailConfig>
    const masterTestimonials = (masterConfig.testimonials || []).filter(
      t => (t?.quote || '').trim().length > 0
    )
    testimonials = masterTestimonials.length > 0 ? masterTestimonials : DEFAULT_MASTER_CONFIG.testimonials
  }

  // Instagram grid — always seed from the brand's lifestyle images so new
  // templates render a populated IG block instead of placeholder tiles. Uses
  // the same bucketing helper as the email page and preview.
  const { data: brandImagesData } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at', { ascending: false })
  const rows = (brandImagesData || []) as BrandImage[]
  const toUrl = (img: BrandImage) => {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }
  const { lifestyleImages: bucketLifestyle, productImages: bucketProduct } =
    bucketBrandImages(rows, getBusinessType(brand))
  const lifestylePool = [...bucketLifestyle, ...bucketProduct].map(toUrl)
  const igImages: string[] = Array.from({ length: 6 }, (_, i) => lifestylePool[i] || '')

  // Seed hero + product image assignments the same way the newsletter page and
  // the campaign-email route do: pickSlotImages picks orientation-aware defaults
  // from the brand image pool. User edits on the existing template always win —
  // we only fill slots that the stored config left empty. Without this, the
  // AI-generated master template rendered block 01a with url('') whenever the
  // user hadn't manually assigned a hero image in the editor.
  const [heroPick, productPick] = pickSlotImages(rows, getBusinessType(brand), ['hero', 'product'])
  const existingAssignments = existingConfig.imageAssignments || {}
  const imageAssignments = {
    ...existingAssignments,
    hero: existingAssignments.hero || (heroPick ? toUrl(heroPick) : ''),
    product: existingAssignments.product || (productPick ? toUrl(productPick) : ''),
  }

  // Promo block safety net — if '02' is enabled, we must NEVER let
  // DEFAULT_MASTER_CONFIG's "15% Off / SAVE15 / Your First Order / Exclusive
  // Offer" placeholders leak through when the AI returns partial or missing
  // promo fields. The old behavior merged defaults first, so any field the AI
  // omitted silently fell back to the generic "welcome offer" copy — that's
  // exactly what the user reported as "I asked for 20% off but it kept 15%
  // Welcome Offer". Strip the defaults before the merge so the AI output is
  // the only source of promo copy; if the AI still dropped promoDiscount,
  // extract it from the brief via regex so the user's intent survives.
  const defaultsForMerge: Partial<MasterEmailConfig> = { ...DEFAULT_MASTER_CONFIG }
  const wantsPromo = Array.isArray(generatedConfig.enabledBlocks) && generatedConfig.enabledBlocks.includes('02')
  if (wantsPromo) {
    defaultsForMerge.promoEyebrow = ''
    defaultsForMerge.promoDiscount = ''
    defaultsForMerge.promoSubtitle = ''
    defaultsForMerge.promoCode = ''
    defaultsForMerge.promoExpiry = ''
    defaultsForMerge.promoCta = ''
    // Brief-driven fallback for promoDiscount if the AI left it blank.
    const discountFromBrief = (() => {
      const pct = brief.match(/(\d{1,3})\s*%\s*off/i)
      if (pct) return `${pct[1]}% Off`
      const dol = brief.match(/\$\s*(\d{1,4})\s*off/i)
      if (dol) return `$${dol[1]} Off`
      if (/free\s*shipping/i.test(brief)) return 'Free Shipping'
      return ''
    })()
    if (discountFromBrief && (typeof generatedConfig.promoDiscount !== 'string' || !generatedConfig.promoDiscount.trim())) {
      generatedConfig.promoDiscount = discountFromBrief
      console.warn('[email-templates generate] promoDiscount missing, extracted from brief:', discountFromBrief)
    }
    if (typeof generatedConfig.promoCode !== 'string' || !generatedConfig.promoCode.trim()) {
      const digits = (generatedConfig.promoDiscount || '').match(/\d+/)?.[0]
      const brandSlug = (brand.name || 'SAVE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'SAVE'
      generatedConfig.promoCode = `${brandSlug}${digits || ''}`
    }
  }

  const finalConfig: MasterEmailConfig = {
    ...(defaultsForMerge as MasterEmailConfig),
    ...generatedConfig,
    enabledBlocks: generatedConfig.enabledBlocks || DEFAULT_MASTER_CONFIG.enabledBlocks,
    emailColors: existingConfig.emailColors ?? null,
    imageAssignments,
    testimonials,
    igImages,
  }

  const { data: updated, error: uErr } = await supabase
    .from('email_templates')
    .update({
      email_config: finalConfig,
      brief,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  return NextResponse.json({ template: updated })
}
