import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: brand } = await supabase.from('brands').select('*').eq('id', id).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const products = brand.products?.map((p: any) => p.name).join(', ') || 'Not specified'

  const prompt = `You are a brand strategist. Based on the following brand information, generate a brand voice profile.

Brand: ${brand.name}
Website: ${brand.website || 'Not provided'}
Industry: ${brand.industry || 'Not specified'}
Products: ${products}

Generate a brand voice profile. Respond ONLY with valid JSON, no other text:
{
  "mission": "One sentence describing what the brand does and for whom. Be specific, not generic.",
  "target_audience": "2-3 sentences describing the ideal customer — demographics, psychographics, pain points, goals.",
  "brand_voice": "2-3 sentences describing how the brand communicates — tone, personality, style. Think of 3 adjectives and expand on them.",
  "tone_keywords": ["word1", "word2", "word3", "word4", "word5"],
  "avoid_words": ["word1", "word2", "word3"]
}`

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('Anthropic API error:', err)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
  }

  try {
    const text = response.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').replace(/```json|```/g, '').trim()
    const voice = JSON.parse(text)

    await supabase.from('brands').update({
      mission: voice.mission || null,
      target_audience: voice.target_audience || null,
      brand_voice: voice.brand_voice || null,
      tone_keywords: voice.tone_keywords || null,
      avoid_words: voice.avoid_words || null,
    }).eq('id', id)

    return NextResponse.json({ voice })
  } catch (err) {
    console.error('Voice parse error:', err)
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
