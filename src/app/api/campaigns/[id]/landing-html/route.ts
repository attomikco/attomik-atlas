import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Brand, BrandImage, FontStyle } from '@/types'
import { bucketBrandImages, type BusinessType } from '@/lib/brand-images'
import {
  buildLandingPrompts,
  generateLandingPageFromPrompts,
  hashLandingPrompts,
  LandingBriefData,
  LandingImage,
  LandingStructuredContent,
  LandingPageGenerationError,
} from '@/lib/landing-page-generator'
import type { SupabaseClient } from '@supabase/supabase-js'

const VALID_TRANSFORMS: ReadonlyArray<FontStyle['transform']> = ['none', 'uppercase', 'lowercase', 'capitalize']

// Cap on content images (product + lifestyle) passed to Claude. Logos are structural
// and always included when available, on top of this cap.
const PRODUCT_CAP = 3
const LIFESTYLE_CAP = 3

function parseBrandNotes(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

async function loadLandingImages(
  supabase: SupabaseClient,
  brand: Brand,
): Promise<LandingImage[]> {
  const { data } = await supabase
    .from('brand_images')
    .select('id, storage_path, tag, width, height, alt_text')
    .eq('brand_id', brand.id)
  const rows = (data || []) as BrandImage[]

  const toUrl = (img: BrandImage): string | null => {
    if (!img.storage_path) return null
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl || null
  }

  const notes = parseBrandNotes(brand.notes)
  const businessType = (notes.business_type as BusinessType) ?? null
  const logoLightUrl = typeof notes.logo_url_light === 'string' ? notes.logo_url_light : null

  const { productImages, lifestyleImages } = bucketBrandImages(rows, businessType)

  const toLanding = (img: BrandImage, role: LandingImage['role']): LandingImage | null => {
    const url = toUrl(img)
    if (!url) return null
    return { url, role, width: img.width, height: img.height, alt: img.alt_text }
  }

  const out: LandingImage[] = []
  if (brand.logo_url) {
    out.push({ url: brand.logo_url, role: 'logo' })
  }
  if (logoLightUrl) {
    out.push({ url: logoLightUrl, role: 'logo_light' })
  }
  for (const img of productImages.slice(0, PRODUCT_CAP)) {
    const entry = toLanding(img, 'product')
    if (entry) out.push(entry)
  }
  for (const img of lifestyleImages.slice(0, LIFESTYLE_CAP)) {
    const entry = toLanding(img, 'lifestyle')
    if (entry) out.push(entry)
  }
  return out
}

function decodeBriefParam(briefParam: string | null): LandingStructuredContent | null {
  if (!briefParam) return null
  try {
    const decoded = Buffer.from(
      briefParam.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf-8')
    return JSON.parse(decodeURIComponent(escape(decoded))) as LandingStructuredContent
  } catch (e) {
    console.error('[landing-html] Failed to decode brief param:', e)
    return null
  }
}

function applyColorFontOverrides(brand: Brand, searchParams: URLSearchParams): Brand {
  const primary = searchParams.get('primary')
  const secondary = searchParams.get('secondary')
  const accent = searchParams.get('accent')
  const fontFamily = searchParams.get('font')
  const transformRaw = searchParams.get('transform')
  const transform = VALID_TRANSFORMS.includes(transformRaw as FontStyle['transform'])
    ? (transformRaw as FontStyle['transform'])
    : null

  if (!primary && !secondary && !accent && !fontFamily && !transform) return brand

  const baseHeading: FontStyle = brand.font_heading || { family: '', weight: '900', transform: 'uppercase' }
  const nextHeading: FontStyle | null = (fontFamily || transform)
    ? { ...baseHeading, family: fontFamily || baseHeading.family, transform: transform || baseHeading.transform }
    : brand.font_heading

  return {
    ...brand,
    primary_color: primary || brand.primary_color,
    secondary_color: secondary || brand.secondary_color,
    accent_color: accent || brand.accent_color,
    font_heading: nextHeading,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns').select('*, brand:brands(*)')
    .eq('id', id).single()
  if (!campaign || !campaign.brand) {
    return new NextResponse('Not found', { status: 404 })
  }

  const searchParams = req.nextUrl.searchParams
  const urlBrief = decodeBriefParam(searchParams.get('brief'))

  const { data: briefRow } = await supabase
    .from('generated_content')
    .select('id, content, generated_html, generated_html_hash')
    .eq('campaign_id', id).eq('type', 'landing_brief')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  let dbBrief: LandingStructuredContent | null = null
  if (briefRow?.content) {
    try { dbBrief = JSON.parse(briefRow.content) as LandingStructuredContent }
    catch { return new NextResponse('Invalid stored brief', { status: 500 }) }
  }

  const structured = urlBrief ?? dbBrief
  if (!structured) return new NextResponse('No brief', { status: 404 })

  const brand = applyColorFontOverrides(campaign.brand as Brand, searchParams)

  const briefData: LandingBriefData = {
    campaign_name: campaign.name,
    goal: campaign.goal,
    offer: campaign.offer,
    key_message: campaign.key_message,
    angle: campaign.angle,
    audience: campaign.audience_notes || brand.target_audience,
    structured_content: structured,
  }

  const images = await loadLandingImages(supabase, brand)
  const prompts = buildLandingPrompts({ brandData: brand, briefData, images })
  const hash = hashLandingPrompts(prompts)

  if (briefRow?.generated_html && briefRow.generated_html_hash === hash) {
    return new NextResponse(briefRow.generated_html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Landing-Cache': 'hit',
      },
    })
  }

  try {
    const html = await generateLandingPageFromPrompts(prompts)
    if (briefRow?.id) {
      await supabase
        .from('generated_content')
        .update({ generated_html: html, generated_html_hash: hash })
        .eq('id', briefRow.id)
    }
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Landing-Cache': 'miss',
      },
    })
  } catch (err) {
    const message = err instanceof LandingPageGenerationError ? err.message : 'Generation failed'
    console.error('[landing-html] generation failed:', err)
    return new NextResponse(message, { status: 500 })
  }
}
