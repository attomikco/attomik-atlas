import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const variationCount = body.count || 3
  const angleOverride = body.angle || ''
  const audienceOverride = body.audience || ''
  const product = body.product || null

  const audience = audienceOverride || campaign.audience_notes || brand.target_audience || 'their target audience'
  const angle = angleOverride ? `Use this specific angle: ${angleOverride}` : campaign.angle ? `Copy angle: ${campaign.angle}` : ''

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

  const userPrompt = `Write ${variationCount} distinct Facebook ad variations for ${brand.name}, which is ${offeringContext}.

${campaignTypeContext}${productContext}

CAMPAIGN BRIEF:
- Campaign: ${campaign.name}
${angle}
- Offer/product: ${campaign.offer || 'Not specified'}
- Key message: ${campaign.key_message || 'Not specified'}
- Goal: ${campaign.goal || 'Conversions'}
- Target audience: ${audience}
- Write specifically FOR this audience. Use language, references, and pain points that resonate with them directly.

For each variation write:
1. PRIMARY TEXT: Engaging copy up to 300 characters. This is the main body above the image. Hook the reader, lead with value, end with a soft CTA if needed.
2. HEADLINE: Maximum 27 characters. Short, punchy, benefit-focused.
3. DESCRIPTION: Maximum 27 characters. Supports the headline, adds context or urgency.

Make each variation feel distinctly different — vary the angle, tone, and hook. Don't just rephrase.
Suggested CTAs for this business type: ${defaultCtas.join(', ')}.

Respond ONLY with valid JSON in this exact format, no other text:
{
  "variations": [
    ${Array(variationCount).fill('{ "primary_text": "...", "headline": "...", "description": "..." }').join(',\n    ')}
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: Math.max(1500, variationCount * 500),
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
    parsed.variations = parsed.variations.map((v: { primary_text: string; headline: string; description: string }) => ({
      primary_text: v.primary_text.slice(0, 500),
      headline: v.headline.slice(0, 40),
      description: v.description.slice(0, 40),
    }))

    // Save all variations as one row
    await supabase.from('generated_content').insert({
      campaign_id: id,
      brand_id: brand.id,
      type: 'fb_ad',
      content: JSON.stringify(parsed),
    })

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
