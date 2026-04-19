import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMasterEmail, type MasterEmailConfig } from '@/lib/email-master-template'
import { bucketBrandImages, getBusinessType } from '@/lib/brand-images'
import { KlaviyoPushError, pushTemplateToKlaviyo } from '@/lib/klaviyo'
import type { BrandImage } from '@/types'

// POST /api/email-templates/[id]/klaviyo
// Always re-renders fresh HTML from template.email_config via buildMasterEmail,
// then pushes to Klaviyo using create-or-update semantics keyed on
// template.klaviyo_template_id. Never trusts client-supplied HTML.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: template } = await supabase
    .from('email_templates')
    .select('*, brand:brands(*)')
    .eq('id', id)
    .single()

  if (!template?.brand) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const brand = template.brand
  const notesData = (() => {
    try { return brand.notes ? JSON.parse(brand.notes) : {} } catch { return {} }
  })()

  console.log('[email-templates klaviyo] brand notes inspection', {
    templateId: id,
    notesRawType: typeof brand.notes,
    notesRawLength: typeof brand.notes === 'string' ? brand.notes.length : null,
    parsedNotesKeys: Object.keys(notesData || {}),
    hasKlaviyoKey: typeof notesData?.klaviyo_api_key === 'string' && notesData.klaviyo_api_key.length > 0,
    klaviyoKeyPrefix: typeof notesData?.klaviyo_api_key === 'string'
      ? notesData.klaviyo_api_key.slice(0, 6) + '…'
      : null,
  })

  const klaviyoKey = notesData?.klaviyo_api_key
  if (!klaviyoKey) {
    return NextResponse.json(
      { error: 'No Klaviyo API key found. Add it in Brand Hub → Integrations.' },
      { status: 400 }
    )
  }

  const config = (template.email_config || {}) as MasterEmailConfig

  const { data: brandImagesData } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at')
  const rows = (brandImagesData || []) as BrandImage[]
  const toUrl = (img: BrandImage) => {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }
  const { productImages: bp, lifestyleImages: bl } =
    bucketBrandImages(rows, getBusinessType(brand))
  const productImages = bp.map(toUrl)
  const lifestyleImages = bl.map(toUrl)

  const brandData = {
    ...brand,
    logo_url_light: notesData?.logo_url_light || null,
    font_heading: typeof brand.font_heading === 'string' ? JSON.parse(brand.font_heading) : brand.font_heading,
    font_body: typeof brand.font_body === 'string' ? JSON.parse(brand.font_body) : brand.font_body,
  }
  const html = buildMasterEmail(brandData, config, productImages, lifestyleImages)

  const templateName = `${brand.name} — ${template.name}`
  const existingKlaviyoId: string | null = template.klaviyo_template_id || null

  console.log('[email-templates klaviyo] route hit', {
    templateId: id,
    templateName,
    hasApiKey: !!klaviyoKey,
    apiKeyLength: typeof klaviyoKey === 'string' ? klaviyoKey.length : 0,
    htmlLength: html?.length ?? 0,
    existingKlaviyoId,
  })

  let pushResult: { klaviyoId: string; created: boolean; staleIdDetected: boolean }
  try {
    pushResult = await pushTemplateToKlaviyo(klaviyoKey, templateName, html, existingKlaviyoId)
  } catch (e) {
    console.error('[email-templates klaviyo] push failed:', {
      templateId: id,
      templateName,
      existingKlaviyoId,
      htmlLength: html.length,
      error: e instanceof Error ? { message: e.message, stack: e.stack } : e,
    })
    // When PATCH against a stored klaviyo_template_id returns a 4xx and the
    // POST fallback also fails, pushTemplateToKlaviyo throws a
    // KlaviyoPushError with staleIdDetected=true. Null the column so the
    // next push starts fresh (no PATCH against a dead id). Without this,
    // every retry repeats the same PATCH→4xx→POST→fail cycle.
    const staleIdDetected = e instanceof KlaviyoPushError && e.staleIdDetected
    if (staleIdDetected && existingKlaviyoId) {
      await supabase
        .from('email_templates')
        .update({ klaviyo_template_id: null })
        .eq('id', id)
    }
    const message = e instanceof Error ? e.message : 'Klaviyo push failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  if (pushResult.klaviyoId && pushResult.klaviyoId !== existingKlaviyoId) {
    await supabase
      .from('email_templates')
      .update({ klaviyo_template_id: pushResult.klaviyoId })
      .eq('id', id)
  }

  return NextResponse.json({
    success: true,
    templateId: pushResult.klaviyoId,
    templateName,
    message: `Template "${templateName}" ${pushResult.created ? 'created in' : 'updated in'} Klaviyo successfully.`,
  })
}
