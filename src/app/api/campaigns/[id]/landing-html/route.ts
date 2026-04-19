import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { renderLandingHtml, type LandingBrief } from '@/lib/landing-page-renderer'
import type { BrandImage } from '@/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns').select('*, brand:brands(*)')
    .eq('id', id).single()
  if (!campaign) return new NextResponse('Not found', { status: 404 })

  // Accept brief from URL param (base64 JSON) for live preview, otherwise load from DB
  const briefParam = req.nextUrl.searchParams.get('brief')
  let brief: LandingBrief | null = null
  if (briefParam) {
    try {
      const decoded = Buffer.from(
        briefParam.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8')
      brief = JSON.parse(decodeURIComponent(escape(decoded))) as LandingBrief
    } catch (e) {
      console.error('Failed to decode brief param:', e)
      // Fall through to DB brief
    }
  }
  if (!brief) {
    const { data: contentRow } = await supabase
      .from('generated_content').select('*')
      .eq('campaign_id', id).eq('type', 'landing_brief')
      .order('created_at', { ascending: false }).limit(1).single()
    if (!contentRow) return new NextResponse('No brief', { status: 404 })
    try { brief = JSON.parse(contentRow.content) as LandingBrief }
    catch { return new NextResponse('Invalid brief', { status: 500 }) }
  }

  const brand = campaign.brand

  const { data: allImagesRaw } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at')

  const searchParams = req.nextUrl.searchParams
  const html = renderLandingHtml({
    brand,
    brief,
    brandImages: (allImagesRaw || []) as BrandImage[],
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    primary: searchParams.get('primary') || undefined,
    secondary: searchParams.get('secondary') || undefined,
    accent: searchParams.get('accent') || undefined,
    font: searchParams.get('font') || undefined,
    transform: searchParams.get('transform') || undefined,
  })

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  })
}
