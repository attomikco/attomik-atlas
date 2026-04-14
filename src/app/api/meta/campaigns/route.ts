import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const META_API_VERSION = 'v19.0'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const brandId = req.nextUrl.searchParams.get('brandId')
  if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 })

  const { data: brand } = await supabase.from('brands').select('id, notes').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  let notes: any = {}
  try { notes = brand.notes ? JSON.parse(brand.notes) : {} } catch {}

  const token = notes.meta_access_token
  const adAccountId = notes.meta_ad_account_id
  if (!token || !adAccountId) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/campaigns?` +
    new URLSearchParams({
      access_token: token,
      fields: 'id,name,status,objective',
      effective_status: '["ACTIVE","PAUSED"]',
      limit: '200',
    })

  try {
    const res = await fetch(url)
    const json: any = await res.json()
    if (json.error) {
      return NextResponse.json({ error: json.error.message || 'Meta API error' }, { status: 400 })
    }
    return NextResponse.json({ campaigns: json.data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Meta API fetch failed' }, { status: 500 })
  }
}
