import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt, getBrandGuidelineBase64 } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { brandId, objective, placement, offer, audience, cta, notes } = await req.json()

  const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const { data: assets } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('brand_id', brandId)
    .eq('type', 'guidelines')
    .limit(1)
  const guidelineAsset = assets?.[0] ?? null

  const systemPrompt = buildBrandSystemPrompt(brand)

  const effectiveAudience = audience || brand.target_audience || 'their target audience'
  const effectiveCta = cta || 'Shop Now'

  const userPrompt = `Write 3 distinct Facebook ad variations for ${brand.name}.

CAMPAIGN DETAILS:
- Objective: ${objective}
- Placement: ${placement}
- Offer/product: ${offer}
- Audience: ${effectiveAudience}
- CTA button: ${effectiveCta}
${notes ? `- Additional notes: ${notes}` : ''}

For each variation write:
1. PRIMARY TEXT: Engaging copy up to 300 characters. This is the main body above the image. Hook the reader, lead with value, end with a soft CTA if needed.
2. HEADLINE: Maximum 27 characters. Short, punchy, benefit-focused.
3. DESCRIPTION: Maximum 27 characters. Supports the headline, adds context or urgency.

Make each variation feel distinctly different — vary the angle, tone, and hook. Don't just rephrase.

Respond ONLY with valid JSON in this exact format, no other text:
{
  "variations": [
    {
      "primary_text": "...",
      "headline": "...",
      "description": "..."
    },
    {
      "primary_text": "...",
      "headline": "...",
      "description": "..."
    },
    {
      "primary_text": "...",
      "headline": "...",
      "description": "..."
    }
  ]
}`

  const messages: Anthropic.MessageParam[] = []

  if (guidelineAsset) {
    const base64 = await getBrandGuidelineBase64(guidelineAsset)
    if (base64) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: `These are the brand guidelines for ${brand.name}. Apply them to all ad copy.` },
        ],
      })
      messages.push({
        role: 'assistant',
        content: `Understood. I've reviewed the brand guidelines for ${brand.name} and will apply them.`,
      })
    }
  }

  messages.push({ role: 'user', content: userPrompt })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages,
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    // Enforce character limits
    parsed.variations = parsed.variations.map((v: { primary_text: string; headline: string; description: string }) => ({
      primary_text:  v.primary_text.slice(0, 500),
      headline:      v.headline.slice(0, 40),    // give a little buffer, UI shows warning
      description:   v.description.slice(0, 40),
    }))
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
