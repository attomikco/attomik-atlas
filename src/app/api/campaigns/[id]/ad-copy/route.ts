import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handle(req, params)
  } catch (e) {
    // Any thrown exception — Anthropic transient 5xx, Supabase network blip,
    // etc. — returns a JSON body so the client's res.json() doesn't explode
    // on an empty 500 response.
    const message = e instanceof Error ? e.message : 'Ad copy generation failed'
    console.error('[ad-copy POST] threw:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handle(req: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, brand:brands(*)')
    .eq('id', id)
    .single()

  if (!campaign || !campaign.brand) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const brand = campaign.brand
  const systemPrompt = buildBrandSystemPrompt(brand)

  const notesData = (() => {
    try { return brand.notes ? JSON.parse(brand.notes) : {} } catch { return {} }
  })()
  const businessType = notesData?.business_type || 'brand'
  const offeringContext = ({
    shopify: 'an ecommerce product brand',
    ecommerce: 'an ecommerce brand',
    saas: 'a SaaS software product',
    restaurant: 'a restaurant or food business',
    service: 'a service-based business',
    brand: 'a brand',
  } as Record<string, string>)[businessType] || 'a brand'
  const defaultCtas = ({
    shopify: ['Shop Now', 'Add to Cart'],
    ecommerce: ['Shop Now', 'Buy Now'],
    saas: ['Start Free Trial', 'Get Started'],
    restaurant: ['Order Now', 'Reserve a Table'],
    service: ['Book a Call', 'Get a Quote'],
    brand: ['Learn More', 'Shop Now'],
  } as Record<string, string[]>)[businessType] || ['Learn More', 'Shop Now']

  const body = await req.json().catch(() => ({}))
  // When the caller specifies count (e.g. Copy Creator regeneration), honor
  // it. Onboarding fires without a body, in which case the prompt tells the
  // model to pick 6-8 angles and produce one variation per angle.
  const requestedCount: number | null = typeof body.count === 'number' ? body.count : null
  const angleOverride = body.angle || ''
  const audienceOverride = body.audience || ''
  const product = body.product || null

  const audience = audienceOverride || campaign.audience_notes || brand.target_audience || 'their target audience'
  const campaignAngle = angleOverride ? `Use this specific angle: ${angleOverride}` : campaign.angle ? `Campaign angle: ${campaign.angle}` : ''

  // Map campaign goal to type-specific context for the prompt
  const goalKey = (campaign.goal || '').toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_')
  const campaignTypeContext = ({
    new_product_launch: 'This is a NEW PRODUCT LAUNCH campaign. Lead with excitement and novelty.',
    limited_offer___sale: 'This is a LIMITED TIME OFFER campaign. Create urgency. Make the deal the hero.',
    seasonal___holiday: 'This is a SEASONAL campaign. Tie the message to the moment/season.',
    brand_awareness: 'This is a BRAND AWARENESS campaign. Focus on who you are and what makes you different.',
    retargeting: 'This is a RETARGETING campaign. Speak to people who already know the brand. Reference familiarity.',
    new_audience___cold_traffic: 'This is a COLD TRAFFIC campaign. Assume zero brand awareness. Hook with the problem or outcome.',
  } as Record<string, string>)[goalKey] || ''

  const productContext = product
    ? `\n\nPRODUCT FOCUS — center every variation on this specific product:\n- Product name: ${product.name || product.title || 'Unnamed product'}${product.description ? `\n- Description: ${product.description}` : ''}${product.price ? `\n- Price: ${product.price}` : ''}${product.benefits ? `\n- Key benefits: ${product.benefits}` : ''}\nWrite copy that specifically promotes THIS product, not generic brand messaging.`
    : ''

  // Brand context pulled from both columns (generate-voice output) and
  // brand.notes JSON (onboarding scraper output). Notes keys are the
  // fallback when the column is missing — e.g. a stale brand that skipped
  // generate-voice but still has `what_you_do` / `who_buys` from scanning.
  const whatTheyDo = brand.mission || notesData?.what_you_do || offeringContext
  const whoBuys = brand.target_audience || notesData?.who_buys || audience
  const brandVoice = brand.brand_voice || notesData?.brand_voice || ''
  const toneKeywords = brand.tone_keywords?.join(', ') || (Array.isArray(notesData?.tone) ? notesData.tone.join(', ') : '')
  const tagline = typeof notesData?.tagline === 'string' ? notesData.tagline : ''

  const countInstruction = requestedCount
    ? `Produce exactly ${requestedCount} variations. Pick ${requestedCount} angles from the list below, one per variation.`
    : `Produce 6-8 variations. Pick 6-8 angles from the list below that best fit THIS brand — some angles will be wrong for this brand and you should skip them. One variation per angle.`

  const userPrompt = `Write distinct Facebook ad variations for ${brand.name}.

BRAND CONTEXT:
- Name: ${brand.name}
- What they do: ${whatTheyDo}
- Audience: ${whoBuys}
${brandVoice ? `- Voice: ${brandVoice}` : ''}
${toneKeywords ? `- Tone: ${toneKeywords}` : ''}
${tagline ? `- Tagline: ${tagline}` : ''}

CAMPAIGN BRIEF:
- Campaign: ${campaign.name}
${campaignAngle}
- Offer/product: ${campaign.offer || 'Not specified'}
- Key message: ${campaign.key_message || 'Not specified'}
- Goal: ${campaign.goal || 'Conversions'}
${campaignTypeContext ? `- ${campaignTypeContext}` : ''}${productContext}

ANGLES — pick the ones that fit. Do NOT use any angle twice:

- sensory — what the product feels, tastes, sounds, looks, smells like. Concrete and physical.
- mission — why the brand exists. What it's fighting for or against.
- craft — how it's made. The process, the care, the people behind it.
- origin — where it comes from. Heritage, founding story, a specific place.
- occasion — when and why you'd reach for this specifically. The moment it belongs to.
- identity — who you become when you use it. What it says about the person carrying it.
- objection — the assumption this product overturns. Example: "wine you can drink on a Tuesday" overturns "wine is for special occasions."
- contrast — what this is NOT. What it refuses to be. A rejection of a category norm.

${countInstruction}

FORMAT per variation:
- headline: 2-5 words. Direct, specific, not generic ad speak.
- primary_text: The body. VARY LENGTH deliberately across the set — at least 2 variations must be under 80 characters (short, single-idea, punchy), and at least 2 must be 150-280 characters (a fuller thought, a real sentence or two). Do not default every variation to the same mid-length.
- description: Up to 27 characters. Supports the headline.

VOICE — read the context above, then write as if the founder of ${brand.name} wrote these themselves. Not a marketing team. Not a copywriter. The founder.

AVOID the following — these instantly mark copy as AI-generated and must not appear:
- Balanced three-part clauses. Do NOT write phrases like "rooted in the past, conjured in the present, alive in your glass."
- Sensory clichés. Do NOT use "awaken your senses", "taste the magic", "experience the difference", or anything in that family.
- Closer lines that summarize the brand at the end. Do NOT end with sweeping statements like "release the spirit within" or "discover what's been waiting."
- The word "elevate."
- The word "crafted" unless you are literally describing a craft process (someone making something by hand).
- Em-dashes used for dramatic pause. A hyphen in a compound adjective is fine; "— and then —" is not.

SELF-CHECK before finalizing — read each variation back. Would the founder actually say this, or does it sound like a generic ad? If it's generic, rewrite it.

Suggested CTAs for this business type: ${defaultCtas.join(', ')}.

Respond ONLY with valid JSON, no other text:
{
  "variations": [
    { "angle": "sensory|mission|craft|origin|occasion|identity|objection|contrast", "headline": "2-5 words", "primary_text": "body — length varies per variation", "description": "short support line" }
  ]
}

The "angle" value must be exactly one of: sensory, mission, craft, origin, occasion, identity, objection, contrast.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    const VALID_ANGLES = new Set(['sensory', 'mission', 'craft', 'origin', 'occasion', 'identity', 'objection', 'contrast'])
    parsed.variations = parsed.variations.map((v: { angle?: string; primary_text: string; headline: string; description: string }) => ({
      // angle is additive and optional — whitelist against the allowed set so
      // a hallucinated value doesn't leak into storage. Unknown values fall
      // through to null rather than propagating.
      angle: v.angle && VALID_ANGLES.has(v.angle.toLowerCase()) ? v.angle.toLowerCase() : null,
      primary_text: v.primary_text.slice(0, 500),
      headline: v.headline.slice(0, 40),
      description: v.description.slice(0, 40),
    }))

    // Snapshot the brand's current palette/fonts so the Preview page can
    // render the creatives with the styling they were generated against,
    // even if brand colors/fonts are edited later.
    const fontHeading = (() => {
      const raw = (brand as { font_heading?: unknown }).font_heading
      if (typeof raw === 'string') {
        try { return JSON.parse(raw) as { family?: string; transform?: string } } catch { return null }
      }
      return (raw as { family?: string; transform?: string } | null) || null
    })()
    parsed.style_snapshot = {
      primary: brand.primary_color || null,
      secondary: brand.secondary_color || null,
      accent: brand.accent_color || null,
      fontFamily: fontHeading?.family || brand.font_primary?.split('|')[0] || null,
      headingTransform: fontHeading?.transform || 'none',
    }

    // Save all variations as one row
    await supabase.from('generated_content').insert({
      campaign_id: id,
      brand_id: brand.id,
      type: 'fb_ad',
      content: JSON.stringify(parsed),
    })

    // Save first variation as brand default copy for Creative Studio
    const first = parsed.variations[0]
    if (first) {
      await supabase.from('brands').update({
        default_headline: first.headline,
        default_body_text: first.primary_text?.slice(0, 90) || null,
        default_cta: first.description || 'Shop Now',
      }).eq('id', brand.id)
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
