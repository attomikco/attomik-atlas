import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMasterEmail, type MasterEmailConfig } from '@/lib/email-master-template'
import { bucketBrandImages, getBusinessType } from '@/lib/brand-images'
import type { BrandImage } from '@/types'

// POST /api/email-templates/[id]/klaviyo
// Body (optional): { html?: string }  — if html is provided, push that directly;
// otherwise render fresh from the template row's email_config.
// Stores the returned klaviyo_template_id back on the template row.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const klaviyoKey = notesData?.klaviyo_api_key
  if (!klaviyoKey) {
    return NextResponse.json(
      { error: 'No Klaviyo API key found. Add it in Brand Hub → Integrations.' },
      { status: 400 }
    )
  }

  let html = ''
  try {
    const body = await req.json()
    if (body?.html) html = body.html
  } catch {}

  if (!html) {
    // Render fresh from the template's email_config
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
    html = buildMasterEmail(brandData, config, productImages, lifestyleImages)
  }

  const subject = (template.email_config?.subjectLine as string) || template.name
  const templateName = `${brand.name} — ${template.name}`

  // Update existing Klaviyo template if we already pushed this one; otherwise create.
  const existingKlaviyoId: string | null = template.klaviyo_template_id || null

  const klaviyoRes = await fetch(
    existingKlaviyoId
      ? `https://a.klaviyo.com/api/templates/${existingKlaviyoId}/`
      : 'https://a.klaviyo.com/api/templates/',
    {
      method: existingKlaviyoId ? 'PATCH' : 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${klaviyoKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'template',
          ...(existingKlaviyoId ? { id: existingKlaviyoId } : {}),
          attributes: {
            name: templateName,
            html: html,
            text: `${subject}\n\nView this email in your browser.`,
          },
        },
      }),
    }
  )

  if (!klaviyoRes.ok) {
    const error = await klaviyoRes.text()
    return NextResponse.json({ error: `Klaviyo error: ${error}` }, { status: klaviyoRes.status })
  }

  const result = await klaviyoRes.json()
  const klaviyoTemplateId = result.data?.id || existingKlaviyoId

  // Persist the Klaviyo template ID on the template row for next time.
  if (klaviyoTemplateId && klaviyoTemplateId !== existingKlaviyoId) {
    await supabase
      .from('email_templates')
      .update({ klaviyo_template_id: klaviyoTemplateId })
      .eq('id', id)
  }

  return NextResponse.json({
    success: true,
    templateId: klaviyoTemplateId,
    templateName,
    message: `Template "${templateName}" ${existingKlaviyoId ? 'updated in' : 'created in'} Klaviyo successfully.`,
  })
}
