import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildMasterEmail,
  DEFAULT_MASTER_CONFIG,
  type MasterEmailConfig,
} from '@/lib/email-master-template'
import { bucketBrandImages, getBusinessType, pickSlotImages } from '@/lib/brand-images'
import { pushTemplateToKlaviyo } from '@/lib/klaviyo'
import type { BrandImage } from '@/types'

// POST /api/campaigns/[id]/email/klaviyo
// Re-renders fresh HTML from brand.notes.email_config (with campaign prefills)
// and pushes to Klaviyo. Create-or-update keyed on the klaviyo_template_id
// persisted inside the latest generated_content row's JSON content — no schema
// change required.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, brand:brands(*)')
    .eq('id', id)
    .single()

  if (!campaign?.brand) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const brand = campaign.brand
  const notesData = (() => {
    try { return brand.notes ? JSON.parse(brand.notes) : {} } catch { return {} }
  })()

  const klaviyoKey = notesData?.klaviyo_api_key
  if (!klaviyoKey) {
    return NextResponse.json(
      { error: 'No Klaviyo API key found. Add it in Brand Hub → Integrations.' },
      { status: 400 }
    )
  }

  const savedConfig = (notesData?.email_config || null) as MasterEmailConfig | null
  if (!savedConfig) {
    return NextResponse.json(
      { error: 'No email configured for this brand yet. Generate an email first.' },
      { status: 400 }
    )
  }

  // Images — same bucketing + seeding pipeline the preview uses.
  const { data: brandImagesData } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at')
  const rows = (brandImagesData || []) as BrandImage[]
  const toUrl = (img: BrandImage) => {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }
  const { productImages: bucketProduct, lifestyleImages: bucketLifestyle } =
    bucketBrandImages(rows, getBusinessType(brand))
  const productImages = bucketProduct.map(toUrl)
  const lifestyleImages = bucketLifestyle.map(toUrl)

  // IG grid backfill — seed from the lifestyle/product pool so pushed emails
  // never contain placehold.co tiles.
  const savedIg = Array.isArray(savedConfig.igImages) ? savedConfig.igImages : []
  const anyIgSet = savedIg.some(url => typeof url === 'string' && url.length > 0)
  const lifestylePool = [...lifestyleImages, ...productImages]
  const igImages: string[] = anyIgSet
    ? [0, 1, 2, 3, 4, 5].map(i => savedIg[i] || lifestylePool[i] || '')
    : [0, 1, 2, 3, 4, 5].map(i => lifestylePool[i] || '')

  // Pre-pick hero + product defaults when saved config leaves them blank.
  const [heroPick, productPick] = pickSlotImages(rows, getBusinessType(brand), ['hero', 'product'])
  const heroUrl = heroPick ? toUrl(heroPick) : ''
  const productUrl = productPick ? toUrl(productPick) : ''

  const configWithPrefills: MasterEmailConfig = {
    ...DEFAULT_MASTER_CONFIG,
    ...savedConfig,
    igImages,
    imageAssignments: {
      ...(savedConfig.imageAssignments || {}),
      hero: savedConfig.imageAssignments?.hero || heroUrl,
      product: savedConfig.imageAssignments?.product || productUrl,
    },
    heroHeadline: campaign.key_message || savedConfig.heroHeadline,
    calloutHeadline: campaign.offer || savedConfig.calloutHeadline,
    heroCta: campaign.goal === 'new_product_launch' ? 'Shop Now'
      : campaign.goal === 'limited_offer___sale' ? 'Claim Offer'
      : campaign.goal === 'brand_awareness' ? 'Learn More'
      : savedConfig.heroCta || 'Shop Now',
  }

  const brandData = {
    ...brand,
    logo_url_light: notesData?.logo_url_light || null,
    font_heading: typeof brand.font_heading === 'string' ? JSON.parse(brand.font_heading) : brand.font_heading,
    font_body: typeof brand.font_body === 'string' ? JSON.parse(brand.font_body) : brand.font_body,
  }
  const html = buildMasterEmail(brandData, configWithPrefills, productImages, lifestyleImages)
  const subject = configWithPrefills.subjectLine || configWithPrefills.heroHeadline || campaign.name

  // Existing Klaviyo template id lives inside the latest generated_content row's
  // content JSON. Read it (if any) so repeated pushes update in place.
  const { data: latestRow } = await supabase
    .from('generated_content')
    .select('id, content')
    .eq('campaign_id', id)
    .eq('type', 'email')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let existingKlaviyoId: string | null = null
  let parsedLatest: Record<string, unknown> | null = null
  if (latestRow?.content) {
    try {
      parsedLatest = JSON.parse(latestRow.content) as Record<string, unknown>
      const existing = parsedLatest?.klaviyo_template_id
      if (typeof existing === 'string') existingKlaviyoId = existing
    } catch {}
  }

  const templateName = `${brand.name} — ${campaign.name}`

  let pushResult: { klaviyoId: string; created: boolean }
  try {
    pushResult = await pushTemplateToKlaviyo(klaviyoKey, templateName, html, existingKlaviyoId)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Klaviyo push failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // Persist fresh HTML + klaviyo_template_id back onto the generated_content
  // row so the next push hits the update path and the preview shows the pushed
  // HTML. Insert a new row if none exists yet for this campaign.
  const newContent = JSON.stringify({
    ...(parsedLatest || {}),
    html,
    subject,
    config: configWithPrefills,
    klaviyo_template_id: pushResult.klaviyoId,
  })

  if (latestRow?.id) {
    await supabase
      .from('generated_content')
      .update({ content: newContent })
      .eq('id', latestRow.id)
  } else {
    await supabase
      .from('generated_content')
      .insert({
        campaign_id: id,
        brand_id: brand.id,
        type: 'email',
        content: newContent,
      })
  }

  return NextResponse.json({
    success: true,
    templateId: pushResult.klaviyoId,
    templateName,
    message: `Template "${templateName}" ${pushResult.created ? 'created in' : 'updated in'} Klaviyo successfully.`,
  })
}
