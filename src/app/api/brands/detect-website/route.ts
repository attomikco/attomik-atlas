import { NextRequest, NextResponse } from 'next/server'
import { scanUrl } from '@/lib/scanner'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ name: null, colors: [], font: null, ogImage: null, logo: null })

    const result = await scanUrl(url)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[detect-website] outer catch:', e)
    return NextResponse.json({ name: null, colors: [], font: null, fontTransform: 'none', letterSpacing: 'normal', ogImage: null, logo: null, platform: 'other', products: [], images: [] })
  }
}
