import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Build the patch dynamically so callers can PATCH a subset of fields
  // (e.g., the post-save thumbnail endpoint only sends { thumbnail_url }).
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.template_id !== undefined) patch.template_id = body.template_id
  if (body.size_id !== undefined) patch.size_id = body.size_id
  if (body.image_url !== undefined) patch.image_url = body.image_url || null
  if (body.headline !== undefined) patch.headline = body.headline
  if (body.body_text !== undefined) patch.body_text = body.body_text
  if (body.cta_text !== undefined) patch.cta_text = body.cta_text
  if (body.style_snapshot !== undefined) patch.style_snapshot = body.style_snapshot
  if (body.name !== undefined) patch.name = body.name
  // ── Meta ad launch fields ──
  if (body.destination_url !== undefined) patch.destination_url = body.destination_url || null
  if (body.cta_type !== undefined) patch.cta_type = body.cta_type
  if (body.fb_primary_text !== undefined) patch.fb_primary_text = body.fb_primary_text || null
  if (body.fb_headline !== undefined) patch.fb_headline = body.fb_headline || null
  if (body.fb_description !== undefined) patch.fb_description = body.fb_description || null
  if (body.thumbnail_url !== undefined) patch.thumbnail_url = body.thumbnail_url || null
  if (body.meta_ad_id !== undefined) patch.meta_ad_id = body.meta_ad_id || null
  if (body.meta_ad_status !== undefined) patch.meta_ad_status = body.meta_ad_status || null

  const { data, error } = await supabase.from('saved_creatives')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
