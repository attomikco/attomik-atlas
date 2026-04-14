import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const META_API_VERSION = 'v19.0'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const brandId = req.nextUrl.searchParams.get('brandId')
  const campaignId = req.nextUrl.searchParams.get('campaignId')
  if (!brandId || !campaignId) {
    return NextResponse.json({ error: 'brandId and campaignId required' }, { status: 400 })
  }

  const { data: brand } = await supabase.from('brands').select('id, notes').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  let notes: any = {}
  try { notes = brand.notes ? JSON.parse(brand.notes) : {} } catch {}

  const token = notes.meta_access_token
  if (!token) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  // Scope to the specific campaign — `/{campaign_id}/adsets` is more reliable
  // than filtering `/act_{id}/adsets` by campaign_id server-side.
  const url = `https://graph.facebook.com/${META_API_VERSION}/${campaignId}/adsets?` +
    new URLSearchParams({
      access_token: token,
      fields: 'id,name,status,daily_budget,lifetime_budget',
      effective_status: '["ACTIVE","PAUSED"]',
      limit: '200',
    })

  try {
    const res = await fetch(url)
    const json: any = await res.json()
    if (json.error) {
      return NextResponse.json({ error: json.error.message || 'Meta API error' }, { status: 400 })
    }
    return NextResponse.json({ adsets: json.data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Meta API fetch failed' }, { status: 500 })
  }
}
