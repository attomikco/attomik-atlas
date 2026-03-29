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

  const body = await req.json().catch(() => ({}))
  const variationCount = body.count || 3
  const angleOverride = body.angle || ''
  const audienceOverride = body.audience || ''

  const audience = audienceOverride || campaign.audience_notes || brand.target_audience || 'their target audience'
  const angle = angleOverride ? `Use this specific angle: ${angleOverride}` : campaign.angle ? `Campaign angle/concept: ${campaign.angle}` : ''

  const userPrompt = `Write ${variationCount} distinct Facebook ad variations for ${brand.name}.

CAMPAIGN BRIEF:
- Campaign: ${campaign.name}
${angle}
- Offer/product: ${campaign.offer || 'Not specified'}
- Key message: ${campaign.key_message || 'Not specified'}
- Goal: ${campaign.goal || 'Conversions'}
- Audience: ${audience}

For each variation write:
1. PRIMARY TEXT: Engaging copy up to 300 characters. This is the main body above the image. Hook the reader, lead with value, end with a soft CTA if needed.
2. HEADLINE: Maximum 27 characters. Short, punchy, benefit-focused.
3. DESCRIPTION: Maximum 27 characters. Supports the headline, adds context or urgency.

Make each variation feel distinctly different — vary the angle, tone, and hook. Don't just rephrase.

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
