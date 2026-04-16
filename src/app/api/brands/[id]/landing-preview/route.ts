import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Brand, FontStyle } from '@/types'
import {
  generateLandingPageHtml,
  LandingBriefData,
  LandingStructuredContent,
  LandingPageGenerationError,
} from '@/lib/landing-page-generator'

const VALID_TRANSFORMS: ReadonlyArray<FontStyle['transform']> = ['none', 'uppercase', 'lowercase', 'capitalize']

function decodeBriefParam(briefParam: string | null): LandingStructuredContent | null {
  if (!briefParam) return null
  try {
    const decoded = Buffer.from(
      briefParam.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf-8')
    return JSON.parse(decodeURIComponent(escape(decoded))) as LandingStructuredContent
  } catch (e) {
    console.error('[landing-preview] Failed to decode brief param:', e)
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

  const { data: brandRow } = await supabase
    .from('brands').select('*')
    .eq('id', id).single()
  if (!brandRow) return new NextResponse('Not found', { status: 404 })

  const searchParams = req.nextUrl.searchParams

  let structured = decodeBriefParam(searchParams.get('brief'))
  if (!structured) {
    const { data: contentRow } = await supabase
      .from('generated_content').select('content')
      .eq('brand_id', id).eq('type', 'landing_brief')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (contentRow?.content) {
      try { structured = JSON.parse(contentRow.content) as LandingStructuredContent }
      catch { return new NextResponse('Invalid stored brief', { status: 500 }) }
    }
  }
  if (!structured) return new NextResponse('No brief', { status: 404 })

  const brand = applyColorFontOverrides(brandRow as Brand, searchParams)

  const briefData: LandingBriefData = {
    audience: brand.target_audience,
    structured_content: structured,
  }

  try {
    const html = await generateLandingPageHtml({ brandData: brand, briefData })
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const message = err instanceof LandingPageGenerationError ? err.message : 'Generation failed'
    console.error('[landing-preview] generation failed:', err)
    return new NextResponse(message, { status: 500 })
  }
}
