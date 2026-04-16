import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Brand, FontStyle } from '@/types'
import {
  buildLandingPrompts,
  generateLandingPageFromPrompts,
  hashLandingPrompts,
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
  const urlBrief = decodeBriefParam(searchParams.get('brief'))

  const { data: briefRow } = await supabase
    .from('generated_content')
    .select('id, content, generated_html, generated_html_hash')
    .eq('brand_id', id).eq('type', 'landing_brief')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  let dbBrief: LandingStructuredContent | null = null
  if (briefRow?.content) {
    try { dbBrief = JSON.parse(briefRow.content) as LandingStructuredContent }
    catch { return new NextResponse('Invalid stored brief', { status: 500 }) }
  }

  const structured = urlBrief ?? dbBrief
  if (!structured) return new NextResponse('No brief', { status: 404 })

  const brand = applyColorFontOverrides(brandRow as Brand, searchParams)

  const briefData: LandingBriefData = {
    audience: brand.target_audience,
    structured_content: structured,
  }

  const prompts = buildLandingPrompts({ brandData: brand, briefData })
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
    console.error('[landing-preview] generation failed:', err)
    return new NextResponse(message, { status: 500 })
  }
}
