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

  // Load campaign brief if in campaign mode
  let campaign: any = null
  if (campaignId) {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()
    campaign = data
  }

  // Load brand voice examples
  const { data: voiceExamples } = await supabase
    .from('brand_voice_examples')
    .select('*')
    .eq('brand_id', brandId)

  const systemPrompt = buildBrandSystemPrompt(brand, voiceExamples || [])

  const products = (brand.products || []).slice(0, 3)
  const productList = products.map((p: any) => `${p.name}${p.price_range ? ` (${p.price_range})` : ''}: ${p.description || ''}`).join('\n') || 'No products specified'

  const campaignContext = campaign
    ? `\nCAMPAIGN BRIEF:
- Campaign: ${campaign.name || 'Untitled'}
- Goal: ${campaign.goal || 'Not specified'}
- Hook/Offer: ${campaign.key_message || 'Not specified'}
- Product Focus: ${campaign.offer || 'All products'}
- Copy Angle: ${campaign.angle || 'Not specified'}
- Target Audience: ${campaign.audience_notes || brand.target_audience || 'General'}

IMPORTANT: Every section of this email should be tailored to this campaign. The hero, CTA, testimonials, origin story — all should reinforce the campaign hook and angle. Do NOT write generic content.`
    : `\nThis is a general brand email (no specific campaign). Write evergreen content that showcases the brand, its products, and its story. The email should feel like a welcome or flagship newsletter.`

  const prompt = `Generate ALL content for a complete branded email template for ${brand.name}.

BRAND:
- Website: ${brand.website || 'N/A'}
- Mission: ${brand.mission || 'N/A'}
- Voice: ${brand.brand_voice || 'N/A'}
- Tone: ${brand.tone_keywords?.join(', ') || 'professional'}
- Target audience: ${brand.target_audience || 'General'}

PRODUCTS:
${productList}
${campaignContext}

Generate a COMPLETE JSON object with ALL of these fields. Every field must be filled with real, specific, on-brand content. No placeholder text. No "[Brand Name]" — use "${brand.name}" directly.

{
  "announcementText": "Top banner text, under 40 chars (shipping offer, sale, etc)",
  "heroHeadline": "Hero headline, 3-7 words, powerful and on-brand",
  "heroBody": "1-2 sentences supporting the hero. Benefit-focused, emotional.",
  "heroCta": "CTA button text, 2-4 words",
  "heroCtaUrl": "${brand.website || ''}",
  "ctaBannerHeadline": "Secondary CTA headline, under 8 words",
  "ctaBannerBody": "1 sentence supporting the CTA",
  "ctaBannerCta": "Button text, 2-4 words",
  "step1Title": "How it works step 1 title, 1-2 words",
  "step1Body": "Step 1 description, 1 sentence",
  "step2Title": "Step 2 title",
  "step2Body": "Step 2 description",
  "step3Title": "Step 3 title",
  "step3Body": "Step 3 description",
  "experienceHeadline": "Experience section headline, 3-6 words",
  "experienceBody": "2 sentences about the product/brand experience. Sensory, emotional.",
  "experienceQuote": "A short italic quote that captures the feeling (not a testimonial)",
  "experienceCta": "CTA button text",
  "originHeadline": "Founder/origin headline, 3-6 words",
  "originBody": "2-3 sentences about the brand story/founding. Authentic, not corporate.",
  "bundleHeadline": "Bundle section headline${products.length > 1 ? ` (you have ${products.length} products)` : ''}",
  "bundlePrice": "${products.length > 1 ? 'bundle price or empty' : ''}",
  "bundleBody": "1 sentence describing the bundle value",
  "bundleCta": "Button text",
  "featuredProductLabel": "Label like 'Best Seller' or 'New'",
  "featuredProductName": "${products[0]?.name || 'Featured Product'}",
  "featuredProductBody": "2 sentences about this specific product. Specific benefits.",
  "featuredProductCta": "Button text",
  "referralAmount": "Referral reward amount (e.g. $10)",
  "referralBody": "1-2 sentences explaining the referral program",
  "testimonials": [
    {"quote": "Realistic testimonial 1-2 sentences, specific to the product", "author": "First L."},
    {"quote": "Different angle testimonial", "author": "First L."},
    {"quote": "Third testimonial, different benefit", "author": "First L."}
  ],
  "reviewCount": "Review count like '500+' or '2,000+'",
  "socialProofQuote": "A standout customer quote, 1 sentence",
  "subscribeHeadline": "Subscribe & save headline",
  "subscribePerks": ["Perk 1 with specific benefit", "Perk 2", "Perk 3", "Perk 4"],
  "subscribeCta": "Subscribe button text",
  "promoPercent": "Discount percentage like '15%'",
  "promoCode": "A catchy promo code in CAPS",
  "blogPosts": [
    {"category": "Category", "title": "Blog title related to brand/product", "excerpt": "1-2 sentence excerpt", "url": "${brand.website || ''}"},
    {"category": "Category", "title": "Second blog title", "excerpt": "Excerpt", "url": "${brand.website || ''}"},
    {"category": "Category", "title": "Third blog title", "excerpt": "Excerpt", "url": "${brand.website || ''}"}
  ],
  "footerTagline": "Brand tagline or sign-off, under 50 chars",
  "instagramUrl": ""
}

Respond with ONLY the JSON object. No markdown, no explanation.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
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
    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}
