import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('saved_creatives').insert({
    brand_id: body.brand_id,
    campaign_id: body.campaign_id || null,
    template_id: body.template_id,
    size_id: body.size_id,
    image_url: body.image_url || null,
    headline: body.headline || '',
    body_text: body.body_text || '',
    cta_text: body.cta_text || '',
    style_snapshot: body.style_snapshot || {},
    name: body.name || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
