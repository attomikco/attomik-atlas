import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import { renderEmail, type EmailContent, type BrandEmailData } from '@/lib/email-renderer'
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
  const emailConfig = notesData?.email_config
  const campaignType = campaign.goal?.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_') || 'awareness'

  // Fetch lifestyle images for the email
  const { data: brandImages } = await supabase
    .from('brand_images').select('storage_path, tag')
    .eq('brand_id', brand.id).order('created_at')
  const lifestyleImages: string[] = []
  for (const img of brandImages || []) {
    if (img.tag === 'lifestyle' || img.tag === 'background') {
      const cleanPath = img.storage_path.replace(/^brand-images\//, '')
      const { data: urlData } = supabase.storage.from('brand-images').getPublicUrl(cleanPath)
      lifestyleImages.push(urlData.publicUrl)
    }
  }

  const prompt = `Generate a complete email campaign for ${brand.name}.

CAMPAIGN:
- Type: ${campaign.goal || 'Brand campaign'}
- Hook: ${campaign.key_message || 'Not specified'}
- Offer: ${campaign.offer || 'Not specified'}
- Angle: ${campaign.angle || 'Not specified'}
- Audience: ${campaign.audience_notes || brand.target_audience || 'General'}

Products: ${(brand.products || []).map((p: any) => p.name).join(', ') || 'Not specified'}
Brand voice: ${brand.brand_voice || 'Not specified'}

Generate compelling, on-brand email content. Use the brand's actual voice — not generic copy.
Respond ONLY with valid JSON:
{
  "subject": "Subject line under 50 chars — specific, intriguing, no emojis",
  "previewText": "Preview text under 90 chars",
  "bannerText": "Top banner text under 40 chars (e.g. 'Free shipping on orders over $50')",
  "heroHeadline": "Hero h1 — punchy, under 8 words, matches campaign hook",
  "heroSubheadline": "1-2 sentences supporting the hero. Benefit-focused, brand voice.",
  "heroCta": "CTA button text 2-4 words",
  "ctaEyebrow": "Section eyebrow under 20 chars",
  "ctaHeadline": "Secondary section headline under 8 words",
  "ctaBody": "1 sentence supporting the CTA",
  "ctaButton": "Button text 2-4 words",
  "promoCode": ${campaign.key_message?.match(/\d+%/) ? '"CODE" or null' : 'null'},
  "promoDiscount": ${campaign.key_message?.match(/\d+%/) ? '"discount amount" or null' : 'null'},
  "testimonials": [
    {"quote": "Authentic customer testimonial 1-2 sentences", "author": "First Name L."},
    {"quote": "Authentic customer testimonial 1-2 sentences", "author": "First Name L."}
  ],
  "experienceHeadline": "Experience section headline under 6 words",
  "experienceBody": "2 sentences describing the product experience in brand voice",
  "faqItems": [
    {"question": "Common customer question", "answer": "Clear helpful answer"},
    {"question": "Common customer question", "answer": "Clear helpful answer"},
    {"question": "Common customer question", "answer": "Clear helpful answer"}
  ]
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text).join('')
    .replace(/```json|```/g, '').trim()

  let emailContent: EmailContent
  try {
    emailContent = {
      ...JSON.parse(text),
      heroCtaUrl: brand.website || '#',
    }
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Override with saved testimonials/FAQ from email config
  if (emailConfig?.testimonials?.length > 0) {
    emailContent.testimonials = emailConfig.testimonials
  }
  if (emailConfig?.faq?.length > 0) {
    emailContent.faqItems = emailConfig.faq
  }

  const brandData: BrandEmailData = {
    name: brand.name,
    website: brand.website || '#',
    logoUrl: brand.logo_url || '',
    primaryColor: emailConfig?.primaryColor || brand.primary_color || '#000000',
    accentColor: emailConfig?.accentColor || brand.accent_color || brand.secondary_color || '#888888',
    bgColor: emailConfig?.bgColor || '#f5f5f5',
    headingFont: emailConfig?.headingFont || brand.font_primary?.split('|')[0] || 'Georgia',
    products: (brand.products || []).slice(0, 3).map((p: any) => ({
      name: p.name || '', price: p.price_range || '',
      image: p.image || '', url: brand.website || '#',
    })),
    lifestyleImages,
  }

  const html = renderEmail(emailContent, brandData, campaignType, emailConfig?.blocks)

  await supabase.from('generated_content').insert({
    campaign_id: id,
    brand_id: brand.id,
    type: 'email',
    content: JSON.stringify({ emailContent, html, subject: emailContent.subject }),
  })

  return NextResponse.json({
    html,
    subject: emailContent.subject,
    previewText: emailContent.previewText,
    emailContent,
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
