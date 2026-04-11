import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, buildBrandSystemPrompt } from '@/lib/anthropic'
import { DEFAULT_MASTER_CONFIG, type MasterEmailConfig } from '@/lib/email-master-template'
import { bucketBrandImages, getBusinessType } from '@/lib/brand-images'
import type { BrandImage } from '@/types'

// POST /api/email-templates/[id]/generate
// Body: { brief: string }
// Runs Claude with the brand system prompt + the block-menu instruction and
// writes the returned config into the template row. Returns the updated row.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const brief = (body.brief || '').toString().trim()
  if (!brief) return NextResponse.json({ error: 'brief required' }, { status: 400 })

  const { data: template, error: tErr } = await supabase
    .from('email_templates')
    .select('*, brand:brands(*)')
    .eq('id', id)
    .single()

  if (tErr || !template?.brand) {
    return NextResponse.json({ error: 'Template or brand not found' }, { status: 404 })
  }

  const brand = template.brand
  const systemPrompt = buildBrandSystemPrompt(brand)

  const products = (brand.products || []).slice(0, 6)
  const productList = products.map((p: { name?: string; price_range?: string; description?: string }) =>
    `${p.name || ''}${p.price_range ? ` (${p.price_range})` : ''}: ${p.description || ''}`
  ).join('\n') || 'No products specified'

  const prompt = `You are building a specific email template. Based on the brief below, decide:
1. Which blocks to enable (pick only the blocks that serve this email's goal — not all of them)
2. What copy to write for each enabled block

BLOCK MENU (pick only what fits the brief):
- 01a: Hero Image — always include
- 01b: Hero Text — always include
- 01c: CTA Button — always include
- 02: Promo Code — only if there's a discount or offer
- 03: 3-Pillar Feature — good for welcome/brand intro emails
- 04: Story / Nostalgia — good for brand story, welcome series
- 05: Product Feature — good for product launch, promotion
- 06: How-To — good for post-purchase, product education
- 07: Testimonials — good for welcome, abandoned cart, promotion
- 08: You'll Also Love — good for post-purchase, newsletter
- 09: Instagram Grid — always
- 11: Callout Card — good for abandoned cart, promotion, urgency
- 12: FAQ — good for welcome series, post-purchase

BRIEF:
${brief}

BRAND:
- Name: ${brand.name}
- Website: ${brand.website || 'N/A'}
- Mission: ${brand.mission || 'N/A'}
- Voice: ${brand.brand_voice || 'N/A'}
- Tone: ${brand.tone_keywords?.join(', ') || 'professional'}

PRODUCTS:
${productList}

ICON RULE:
- Do NOT use ANY emoji anywhere in the output. Pillar icons must be single unicode symbols, one of: \u2726 \u21e2 \u2713 \u25c6 \u2605 \u2727 \u2666 \u21ea.

Return a COMPLETE JSON object that matches the MasterEmailConfig shape. Include:
- "enabledBlocks": array of block IDs you've chosen from the menu above (e.g. ["01a","01b","01c","04","07","09"])
- "subjectLine" (30-60 chars) and "previewText" (40-90 chars, continues the subject without repeating)
- All copy fields for the blocks you enabled — headlines, eyebrows, bodies, CTAs, etc.
- For blocks you did NOT enable, leave their copy fields as empty strings
- Use "${brand.name}" directly — never "[Brand Name]" placeholder
- Do NOT include emailColors, imageAssignments, or image URLs — those are handled separately

Respond with ONLY the JSON object. No markdown, no explanation.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
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

  // Seed from defaults so every required field has a value. Generated copy
  // overrides the defaults. emailColors/imageAssignments are preserved from
  // the existing template row so the user's color/image customizations carry
  // over if they're regenerating copy on an existing template.
  const existingConfig = (template.email_config || {}) as Partial<MasterEmailConfig>

  // Testimonials fallback chain — AI → master template → DEFAULT_MASTER_CONFIG.
  // The AI often returns empty-string testimonials for templates where it
  // doesn't think social proof is the main goal; we never want empty star
  // rows rendering in the preview, so always backfill from a real source.
  const genTestimonials = (generatedConfig.testimonials || []).filter(
    t => (t?.quote || '').trim().length > 0
  )
  let testimonials = genTestimonials
  if (testimonials.length === 0) {
    const { data: masterRow } = await supabase
      .from('email_templates')
      .select('email_config')
      .eq('brand_id', brand.id)
      .eq('type', 'master')
      .maybeSingle()
    const masterConfig = (masterRow?.email_config || {}) as Partial<MasterEmailConfig>
    const masterTestimonials = (masterConfig.testimonials || []).filter(
      t => (t?.quote || '').trim().length > 0
    )
    testimonials = masterTestimonials.length > 0 ? masterTestimonials : DEFAULT_MASTER_CONFIG.testimonials
  }

  // Instagram grid — always seed from the brand's lifestyle images so new
  // templates render a populated IG block instead of placeholder tiles. Uses
  // the same bucketing helper as the email page and preview.
  const { data: brandImagesData } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at', { ascending: false })
  const rows = (brandImagesData || []) as BrandImage[]
  const toUrl = (img: BrandImage) => {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }
  const { lifestyleImages: bucketLifestyle, productImages: bucketProduct } =
    bucketBrandImages(rows, getBusinessType(brand))
  const lifestylePool = [...bucketLifestyle, ...bucketProduct].map(toUrl)
  const igImages: string[] = Array.from({ length: 6 }, (_, i) => lifestylePool[i] || '')

  const finalConfig: MasterEmailConfig = {
    ...DEFAULT_MASTER_CONFIG,
    ...generatedConfig,
    enabledBlocks: generatedConfig.enabledBlocks || DEFAULT_MASTER_CONFIG.enabledBlocks,
    emailColors: existingConfig.emailColors ?? null,
    imageAssignments: existingConfig.imageAssignments ?? {},
    testimonials,
    igImages,
  }

  const { data: updated, error: uErr } = await supabase
    .from('email_templates')
    .update({
      email_config: finalConfig,
      brief,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
  return NextResponse.json({ template: updated })
}
