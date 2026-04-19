import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import { renderLandingHtml, type LandingBrief } from '@/lib/landing-page-renderer'
import type { BrandImage } from '@/types'
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

  const audience = campaign.audience_notes || brand.target_audience || 'their target audience'
  const angle = campaign.angle ? `Campaign angle/concept: ${campaign.angle}` : ''

  const userPrompt = `Write a structured landing page brief for ${brand.name}, which is ${offeringContext}.

CAMPAIGN BRIEF:
- Campaign: ${campaign.name}
${angle}
- Offer/product: ${campaign.offer || 'Not specified'}
- Key message: ${campaign.key_message || 'Not specified'}
- Goal: ${campaign.goal || 'Conversions'}
- Audience: ${audience}

Generate a complete landing page content brief with these exact sections. Use the JSON format below.

Respond ONLY with valid JSON, no other text:
{
  "hero": {
    "headline": "...",
    "subheadline": "...",
    "cta_text": "..."
  },
  "problem": {
    "headline": "...",
    "body": "2-3 sentences describing the pain point"
  },
  "solution": {
    "headline": "...",
    "body": "2-3 sentences on how the product solves it"
  },
  "benefits": [
    { "headline": "...", "body": "1 sentence" },
    { "headline": "...", "body": "1 sentence" },
    { "headline": "...", "body": "1 sentence" }
  ],
  "social_proof": {
    "headline": "...",
    "testimonial": "A realistic customer quote",
    "attribution": "Name, title or descriptor",
    "stat": "A compelling stat with number"
  },
  "faq": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ],
  "final_cta": {
    "headline": "...",
    "body": "1-2 sentences of urgency or reinforcement",
    "cta_text": "..."
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

  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean) as LandingBrief

    // Insert the brief row first so we have an id to update.
    const { data: insertedRow, error: insertErr } = await supabase
      .from('generated_content')
      .insert({
        campaign_id: id,
        brand_id: brand.id,
        type: 'landing_brief',
        content: JSON.stringify(parsed),
      })
      .select('id')
      .single()

    // Snapshot the landing HTML with the brand's current palette/fonts baked in
    // so the Preview page can render it unchanged even if the brand is edited
    // later. Failure here is non-fatal — the brief is still saved and the
    // live /landing-html endpoint keeps working as a fallback.
    if (insertedRow && !insertErr) {
      try {
        const { data: allImagesRaw } = await supabase
          .from('brand_images').select('*')
          .eq('brand_id', brand.id).order('created_at')

        const snapshotHtml = renderLandingHtml({
          brand,
          brief: parsed,
          brandImages: (allImagesRaw || []) as BrandImage[],
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        })

        await supabase
          .from('generated_content')
          .update({ generated_html: snapshotHtml })
          .eq('id', insertedRow.id)
      } catch (e) {
        console.error('[landing-brief] snapshot render failed:', e)
      }
    }

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
