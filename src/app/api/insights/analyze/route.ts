import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { brandId, aggregatedData } = await req.json()
  if (!brandId || !aggregatedData) return NextResponse.json({ error: 'brandId and aggregatedData required' }, { status: 400 })

  const supabase = await createClient()

  const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const systemPrompt = buildBrandSystemPrompt(brand)

  const userPrompt = `You are a performance marketing strategist. Based on this Meta Ads data for ${brand.name}, identify what is working and what is not.

Here is the aggregated performance data:

${aggregatedData}

Return ONLY valid JSON in this exact shape, no markdown, no explanation:
{
  "summary": "2-3 sentence overview of overall performance",
  "topInsights": ["insight 1", "insight 2", "insight 3"],
  "angles": [{ "angle": "string", "reasoning": "string" }],
  "audiences": [{ "segment": "string", "reasoning": "string" }],
  "offers": [{ "offer": "string", "reasoning": "string" }]
}

Return 3-5 items in each array. Base everything on the data provided.`

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
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}
