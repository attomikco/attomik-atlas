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

  const prompt = `You are a brand strategist. Based on the following brand information, generate a brand voice profile AND a brand intelligence assessment.

Brand: ${brand.name}
Website: ${brand.website || 'Not provided'}
Industry: ${brand.industry || 'Not specified'}
Products: ${products}
Colors detected: ${brand.primary_color || 'none'}, ${brand.secondary_color || 'none'}, ${brand.accent_color || 'none'}
Font: ${brand.font_primary || 'not detected'}

Generate a brand voice profile and intelligence score. Respond ONLY with valid JSON, no other text:
{
  "mission": "One sentence describing what the brand does and for whom. Be specific, not generic.",
  "target_audience": "2-3 sentences describing the ideal customer — demographics, psychographics, pain points, goals.",
  "brand_voice": "2-3 sentences describing how the brand communicates — tone, personality, style. Think of 3 adjectives and expand on them.",
  "tone_keywords": ["word1", "word2", "word3", "word4", "word5"],
  "avoid_words": ["word1", "word2", "word3"],
  "score": <number 0-100, overall brand readiness score based on how complete and coherent the brand identity is>,
  "scoreBreakdown": {
    "brandIdentity": <number 0-100, how strong the visual identity is — logo, colors, fonts, consistency>,
    "creativeStrength": <number 0-100, how well-positioned the brand is for ad creative — imagery, messaging hooks>,
    "audienceClarity": <number 0-100, how clearly defined the target audience is>,
    "contentReadiness": <number 0-100, how ready the brand is to produce content — voice, tone, product info>
  },
  "insights": [
    { "label": "Brand Positioning", "text": "<1-2 sentences on how the brand is positioned in the market>" },
    { "label": "Audience Signal", "text": "<1-2 sentences on the clearest audience signal from the brand>" },
    { "label": "Content Angle", "text": "<1-2 sentences on the most promising content/creative angle>" },
    { "label": "Growth Opportunity", "text": "<1-2 sentences on the biggest untapped opportunity>" }
  ]
}`

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    console.error('Anthropic API error:', err)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 })
  }

  try {
    const text = response.content.filter(b => b.type === 'text').map(b => (b as { type: 'text'; text: string }).text).join('').replace(/```json|```/g, '').trim()
    const voice = JSON.parse(text)

    // Write voice fields to brand columns
    const brandUpdate: Record<string, unknown> = {
      mission: voice.mission || null,
      target_audience: voice.target_audience || null,
      brand_voice: voice.brand_voice || null,
      tone_keywords: voice.tone_keywords || null,
      avoid_words: voice.avoid_words || null,
    }

    // Write intelligence data to brand.notes (TEXT column — safe merge)
    if (voice.score !== undefined || voice.scoreBreakdown || voice.insights) {
      const { data: freshBrand } = await supabase.from('brands').select('notes').eq('id', id).single()
      const currentNotes = JSON.parse(freshBrand?.notes || '{}')
      const updatedNotes = {
        ...currentNotes,
        ...(voice.score !== undefined ? { score: voice.score } : {}),
        ...(voice.scoreBreakdown ? { scoreBreakdown: voice.scoreBreakdown } : {}),
        ...(voice.insights ? { insights: voice.insights } : {}),
      }
      brandUpdate.notes = JSON.stringify(updatedNotes)
    }

    await supabase.from('brands').update(brandUpdate).eq('id', id)

    return NextResponse.json({ voice })
  } catch (err) {
    console.error('Voice parse error:', err)
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
