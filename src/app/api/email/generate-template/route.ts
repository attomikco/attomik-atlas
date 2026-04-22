import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { brandId, campaignId } = await req.json()
  if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 })

  const supabase = await createClient()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  let campaign: any = null
  if (campaignId) {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    campaign = data
  }

  const { data: voiceExamples } = await supabase
    .from('brand_voice_examples')
    .select('*')
    .eq('brand_id', brandId)

  const systemPrompt = buildBrandSystemPrompt(brand, voiceExamples || [])

  const products = (brand.products || []).slice(0, 6)
  const productList = products.map((p: any) => `${p.name}${p.price_range ? ` (${p.price_range})` : ''}: ${p.description || ''}`).join('\n') || 'No products specified'

  const campaignContext = campaign
    ? `\nCAMPAIGN BRIEF:
- Campaign: ${campaign.name || 'Untitled'}
- Goal: ${campaign.goal || 'Not specified'}
- Hook: ${campaign.key_message || 'Not specified'}
- Offer: ${campaign.offer || 'All products'}
- Copy Angle: ${campaign.angle || 'Not specified'}
- Target Audience: ${campaign.audience_notes || brand.target_audience || 'General'}

IMPORTANT: Every section of this email should be tailored to this campaign. The hero, pillars, story, callout — all should reinforce the campaign hook and angle.`
    : `\nThis is a general brand email (no specific campaign). Write evergreen content that showcases the brand, its products, and its story. The email should feel like a welcome or flagship newsletter.`

  const prompt = `The brand voice examples in the system prompt are your style reference — apply that voice to email format specifically. Voice samples you were shown may come from ad copy or landing pages; your job is to carry that same voice into an email hero, a story paragraph, a testimonial, a FAQ answer, etc. without losing it to "email formality".

Generate ALL content for a complete branded email template for ${brand.name}.

BRAND:
- Website: ${brand.website || 'N/A'}
- Mission: ${brand.mission || 'N/A'}
- Voice: ${brand.brand_voice || 'N/A'}
- Tone: ${brand.tone_keywords?.join(', ') || 'professional'}
- Target audience: ${brand.target_audience || 'General'}

PRODUCTS:
${productList}
${campaignContext}

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
- productName MUST NEVER be empty. If the PRODUCTS list above is populated, pick whichever product best represents the brand as a flagship (do not default to the first if a different one is more iconic). If PRODUCTS is "No products specified", set productName to "${brand.name}" so the email still renders with something meaningful — never leave this field blank.
- The youllAlsoLove products array should be COMPLEMENTS or alternatives to the featured product, not repeats. If you featured the flagship in block 05, fill youllAlsoLove with the rest of the line or the 2-3 best cross-sells — do NOT include the flagship again.

ICON RULE:
- Do NOT use ANY emoji anywhere in the output. Pillar icons must be single unicode symbols, one of: ✦ ⇢ ✓ ◆ ★ ✧ ♦ ⇪. Pick symbols that fit each pillar's meaning.

Return a COMPLETE JSON object with ALL of these fields. Every field must be filled with real, specific, on-brand content. No placeholder text. No "[Brand Name]" — use "${brand.name}" directly.

{
  "subjectLine": "Inbox subject line, 30-60 chars, punchy and specific",
  "previewText": "40-90 chars, continues the subject (does not repeat it)",
  "announcementText": "Top banner text, under 40 chars",
  "heroEyebrow": "Small eyebrow above headline, 2-4 words",
  "heroHeadline": "Punchy 3-7 word hook",
  "heroBody": "3 sentences, about 60 words. Benefit-focused, specific, elaborates the hook",
  "heroCta": "CTA button text, 2-4 words",
  "heroCtaUrl": "${brand.website || ''}",
  "promoEyebrow": "Label above promo, 2-3 words",
  "promoDiscount": "Discount phrase like '15% Off' or '$10 Off'",
  "promoSubtitle": "Subtitle below discount, e.g. 'Your First Order'",
  "promoCode": "Brand-specific code in CAPS (see constraint above)",
  "promoExpiry": "Expiry note, e.g. 'First order only · Limited time'",
  "promoCta": "Promo CTA text, 2-4 words",
  "promoCtaUrl": "${brand.website || ''}",
  "pillarsEyebrow": "Label above 3-pillar section, 2-4 words",
  "pillarsHeadline": "3-pillar section headline, 3-6 words",
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
  "productBadge": "Badge label like 'Best Seller' or 'Fan Favorite'",
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
  "howToSubheadline": "Short subheadline under the headline, 1 sentence",
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
  "youllAlsoLoveEyebrow": "Label above product grid, 2-3 words",
  "youllAlsoLoveHeadline": "Product grid headline, 3-5 words",
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
  "igHandle": "@${brand.name.toLowerCase().replace(/\\s+/g, '')}",
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
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .replace(/```json|```/g, '')
    .trim()

  try {
    const config = JSON.parse(text)

    // Safety net — the AI sometimes returns an empty productName when the
    // brand's PRODUCTS list is sparse, even with explicit instructions not to.
    // An empty field gets spread over the client's initial fallback during
    // merge, leaving the Block 05 headline blank. Fall back to the first
    // brand product or the brand name so something always renders.
    const firstProductName = products[0]?.name || products[0]?.title || ''
    if (typeof config.productName !== 'string' || !config.productName.trim()) {
      config.productName = firstProductName || brand.name
      console.warn('[email generate-template] productName empty, fell back to', config.productName)
    }

    // Safety net — the story quote card renders an empty shell (stars + "·
    // Verified") when storyQuote is blank. If the AI returns nothing, pull the
    // first sentence of storyBody so the card still reads as a line from the
    // story. Attribution falls back to an em-dash + brand name.
    const storyQuote = typeof config.storyQuote === 'string' ? config.storyQuote.trim() : ''
    if (!storyQuote) {
      const body = typeof config.storyBody === 'string' ? config.storyBody.trim() : ''
      const firstSentence = body.match(/[^.!?]+[.!?]/)?.[0]?.trim() || body.split('\n')[0]?.trim() || ''
      config.storyQuote = firstSentence
      console.warn('[email generate-template] storyQuote empty, fell back to first sentence of storyBody')
    }
    const storyAttr = typeof config.storyQuoteAttribution === 'string' ? config.storyQuoteAttribution.trim() : ''
    if (!storyAttr) {
      config.storyQuoteAttribution = `— ${brand.name}`
    }

    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}
