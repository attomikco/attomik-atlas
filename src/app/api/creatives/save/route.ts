import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const row = {
    brand_id: body.brand_id,
    campaign_id: body.campaign_id || null,
    template_id: body.template_id,
    size_id: body.size_id || 'feed',
    image_url: body.image_url || null,
    headline: body.headline || '',
    body_text: body.body_text || '',
    cta_text: body.cta_text || '',
    style_snapshot: body.style_snapshot || {},
    name: body.name || null,
  }

  const { data, error } = await supabase
    .from('saved_creatives')
    .insert(row)
    .select()
    .single()

  if (error) {
    console.error('[Save creative] Supabase error:', error.message, error.details, error.hint)
    return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 })
  }
  return NextResponse.json(data)
}
