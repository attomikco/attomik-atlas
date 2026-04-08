import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import { buildMasterEmail, DEFAULT_MASTER_CONFIG, type MasterEmailConfig } from '@/lib/email-master-template'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, brand:brands(*)')
    .eq('id', id).single()

  if (!campaign?.brand) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const brand = campaign.brand
  const systemPrompt = buildBrandSystemPrompt(brand)

  const notesData = (() => { try { return JSON.parse(brand.notes || '{}') } catch { return {} } })()
  const savedConfig = notesData?.email_config as MasterEmailConfig | null

  // Fetch images
  const { data: brandImages } = await supabase
    .from('brand_images').select('storage_path, tag')
    .eq('brand_id', brand.id).order('created_at')
  const lifestyleImages: string[] = []
  const productImages: string[] = []
  for (const img of brandImages || []) {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    const { data: urlData } = supabase.storage.from('brand-images').getPublicUrl(cleanPath)
    if (img.tag === 'product' || img.tag === 'shopify') productImages.push(urlData.publicUrl)
    else if (img.tag !== 'logo' && img.tag !== 'press') lifestyleImages.push(urlData.publicUrl)
  }

  const products = (brand.products || []).slice(0, 3)
  const productList = products.map((p: any) => `${p.name}${p.price_range ? ` (${p.price_range})` : ''}: ${p.description || ''}`).join('\n') || 'No products specified'

  const prompt = `Generate ALL content for a campaign email for ${brand.name}. Do NOT use any emoji anywhere in the output.

CAMPAIGN:
- Type: ${campaign.goal || 'Brand campaign'}
- Hook: ${campaign.key_message || 'Not specified'}
- Offer: ${campaign.offer || 'Not specified'}
- Angle: ${campaign.angle || 'Not specified'}
- Audience: ${campaign.audience_notes || brand.target_audience || 'General'}

BRAND:
- Website: ${brand.website || 'N/A'}
- Mission: ${brand.mission || 'N/A'}
- Voice: ${brand.brand_voice || 'N/A'}
- Tone: ${brand.tone_keywords?.join(', ') || 'professional'}

PRODUCTS:
${productList}

Every section should be tailored to this campaign. The hero, CTA, testimonials — all should reinforce the campaign hook.
Respond ONLY with valid JSON:
{
  "announcementText": "Top banner text, under 40 chars. No emoji.",
  "heroHeadline": "Hero headline, 3-7 words, matches campaign hook",
  "heroBody": "3 sentences, about 60 words. Benefit-focused, specific to products.",
  "heroCta": "CTA button text, 2-4 words",
  "heroCtaUrl": "${brand.website || ''}",
  "ctaBannerHeadline": "Secondary CTA headline, under 8 words",
  "ctaBannerBody": "1 sentence supporting the CTA",
  "ctaBannerCta": "Button text, 2-4 words",
  "step1Title": "Step 1 title, 1-2 words",
  "step1Body": "Step 1 description, 1 sentence",
  "step2Title": "Step 2 title",
  "step2Body": "Step 2 description",
  "step3Title": "Step 3 title",
  "step3Body": "Step 3 description",
  "experienceHeadline": "Experience headline, 3-6 words",
  "experienceBody": "3-4 sentences about the experience, sensory and emotional",
  "experienceQuote": "Short italic quote capturing the feeling",
  "experienceCta": "CTA button text",
  "originHeadline": "Origin headline, 3-6 words",
  "originBody": "1-2 sentences, about 25 words. Brand origin in a nutshell.",
  "featuredProductLabel": "Label like 'Best Seller' or campaign-specific",
  "featuredProductName": "${products[0]?.name || 'Featured Product'}",
  "featuredProductBody": "1-2 sentences, about 25 words. Key product benefit.",
  "featuredProductCta": "Button text",
  "referralAmount": "$10",
  "referralBody": "1-2 sentences about the referral program",
  "testimonials": [
    {"quote": "Realistic testimonial 1-2 sentences", "author": "First L."},
    {"quote": "Different angle testimonial", "author": "First L."},
    {"quote": "Third testimonial", "author": "First L."}
  ],
  "reviewCount": "500+",
  "socialProofQuote": "Standout customer quote",
  "subscribeHeadline": "Subscribe headline",
  "subscribePerks": ["Perk 1", "Perk 2", "Perk 3", "Perk 4"],
  "subscribeCta": "Subscribe button text",
  "promoPercent": "${campaign.key_message?.match(/(\d+%)/) ? campaign.key_message.match(/(\d+%)/)?.[1] : '15%'}",
  "promoCode": "A catchy promo code in CAPS",
  "blogPosts": [
    {"category": "Category", "title": "Blog title", "excerpt": "1-2 sentence excerpt", "url": "${brand.website || ''}"},
    {"category": "Category", "title": "Second blog title", "excerpt": "Excerpt", "url": "${brand.website || ''}"}
  ],
  "footerTagline": "Brand tagline, under 50 chars",
  "instagramUrl": ""
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text).join('')
    .replace(/```json|```/g, '').trim()

  let generatedConfig: Partial<MasterEmailConfig>
  try {
    generatedConfig = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Merge: saved config > AI generated > defaults
  const finalConfig: MasterEmailConfig = { ...DEFAULT_MASTER_CONFIG, ...savedConfig, ...generatedConfig, emailColors: null }

  // Build brand data for the template
  const logoLight = notesData?.logo_url_light || null
  const brandData = {
    ...brand,
    logo_url_light: logoLight,
    font_heading: typeof brand.font_heading === 'string' ? JSON.parse(brand.font_heading) : brand.font_heading,
    font_body: typeof brand.font_body === 'string' ? JSON.parse(brand.font_body) : brand.font_body,
  }

  const html = buildMasterEmail(brandData, finalConfig, productImages, lifestyleImages)
  const subject = (generatedConfig as any).subject || finalConfig.heroHeadline

  await supabase.from('generated_content').insert({
    campaign_id: id,
    brand_id: brand.id,
    type: 'email',
    content: JSON.stringify({ html, subject, config: finalConfig }),
  })

  return NextResponse.json({
    html,
    subject,
    config: finalConfig,
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('generated_content')
    .select('content')
    .eq('campaign_id', id)
    .eq('type', 'email')
    .order('created_at', { ascending: false })
    .limit(1).single()

  if (!data) return NextResponse.json({ html: null })

  try {
    return NextResponse.json(JSON.parse(data.content))
  } catch {
    return NextResponse.json({ html: null })
  }
}
