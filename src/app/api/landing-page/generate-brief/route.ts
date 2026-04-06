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
    .from('brands').select('*').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  // Load campaign if provided
  let campaign: any = null
  if (campaignId) {
    const { data } = await supabase
      .from('campaigns').select('*').eq('id', campaignId).single()
    campaign = data
  }

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

  const products = (brand.products || []).slice(0, 5)
  const productList = products.map((p: any) => `- ${p.name}${p.price_range ? ` ($${p.price_range})` : ''}${p.description ? `: ${p.description}` : ''}`).join('\n') || 'No products specified'

  // Brand hub knowledge from notes
  const whatYouDo = notesData?.what_you_do || brand.mission || ''
  const whoBuys = notesData?.who_buys || brand.target_audience || ''
  const brandVoice = notesData?.brand_voice || brand.brand_voice || ''
  const tonePills = notesData?.tone ? (Array.isArray(notesData.tone) ? notesData.tone.join(', ') : notesData.tone) : (brand.tone_keywords?.join(', ') || '')

  // Campaign context block
  const campaignBlock = campaign ? `
CAMPAIGN CONTEXT — Tailor the entire landing page to this campaign:
- Campaign: ${campaign.name || 'Untitled'}
- Goal: ${campaign.goal || 'Conversions'}
- Offer/product: ${campaign.offer || 'Not specified'}
- Key message: ${campaign.key_message || 'Not specified'}
- Angle: ${campaign.angle || 'Not specified'}
- Audience: ${campaign.audience_notes || whoBuys || 'General'}

IMPORTANT: Every section must reinforce this campaign's hook and offer. The hero, problem, solution, benefits, testimonials, and CTAs should all be specific to this campaign — not generic brand content.` : `
This is an evergreen brand landing page (not tied to a specific campaign). Showcase the brand's core value proposition, products, and story.`

  const userPrompt = `Generate a complete landing page brief for ${brand.name}, which is ${offeringContext}.

BRAND HUB:
- What they do: ${whatYouDo || 'Not specified'}
- Who buys: ${whoBuys || 'Not specified'}
- Brand voice: ${brandVoice || 'Not specified'}
- Tone: ${tonePills || 'professional'}
- Website: ${brand.website || 'N/A'}
- Mission: ${brand.mission || 'Not specified'}
- Avoid words: ${brand.avoid_words?.join(', ') || 'None specified'}

PRODUCTS:
${productList}
${campaignBlock}

Generate a COMPLETE JSON object. Every field must have real, specific, on-brand content. No placeholders, no "[Brand Name]" — use "${brand.name}" directly. Write in the brand's actual voice.

Respond ONLY with valid JSON:
{
  "hero": {
    "headline": "Hero h1 — powerful, specific to this brand, 3-8 words",
    "subheadline": "1-2 sentences. Benefit-focused, emotional, on-brand voice.",
    "cta_text": "CTA button text, 2-4 words"
  },
  "problem": {
    "headline": "Problem section headline — what pain does the audience feel?",
    "body": "2-3 sentences describing the pain point. Specific to the audience, not generic."
  },
  "solution": {
    "headline": "Solution headline — how the brand solves it",
    "body": "2-3 sentences on the solution. Specific product/service benefits."
  },
  "benefits": [
    { "headline": "Benefit 1 title — specific", "body": "1 sentence with a concrete detail" },
    { "headline": "Benefit 2 title", "body": "1 sentence" },
    { "headline": "Benefit 3 title", "body": "1 sentence" }
  ],
  "social_proof": {
    "headline": "Social proof headline",
    "testimonial": "A realistic customer testimonial, 1-2 sentences, specific to the product",
    "attribution": "First Name L., descriptor",
    "stat": "A compelling stat (e.g. '500+ 5-star reviews', '10,000+ customers')"
  },
  "faq": [
    { "question": "Realistic customer question", "answer": "Clear, helpful answer" },
    { "question": "Question about the product/service", "answer": "Answer" },
    { "question": "Question about shipping/pricing/returns", "answer": "Answer" }
  ],
  "final_cta": {
    "headline": "Closing headline — urgency or reinforcement",
    "body": "1-2 sentences driving action",
    "cta_text": "Final CTA button text"
  }
}

Suggested CTAs for this business type: ${defaultCtas.join(', ')}.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(text)

    await supabase.from('generated_content').insert({
      brand_id: brandId,
      campaign_id: campaignId || null,
      type: 'landing_brief',
      content: JSON.stringify(parsed),
    })

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
