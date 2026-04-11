import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/email-templates/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ template: data })
}

// PATCH /api/email-templates/[id]
// Body: { name?, brief?, email_config?, status?, klaviyo_template_id? }
// Master-type templates are also synced to brands.notes.email_config so the
// public preview page keeps working without schema changes.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) patch.name = body.name
  if (body.brief !== undefined) patch.brief = body.brief
  if (body.email_config !== undefined) patch.email_config = body.email_config
  if (body.status !== undefined) patch.status = body.status
  if (body.klaviyo_template_id !== undefined) patch.klaviyo_template_id = body.klaviyo_template_id

  const { data: updated, error } = await supabase
    .from('email_templates')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[email-templates PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If this is the master template and the email_config changed, mirror it
  // onto brands.notes.email_config so the public preview page renders fresh.
  if (updated.type === 'master' && body.email_config !== undefined && updated.brand_id) {
    const { data: brandRow } = await supabase
      .from('brands')
      .select('notes')
      .eq('id', updated.brand_id)
      .single()
    const existingNotes = (() => {
      try { return brandRow?.notes ? JSON.parse(brandRow.notes) : {} } catch { return {} }
    })()
    await supabase
      .from('brands')
      .update({ notes: JSON.stringify({ ...existingNotes, email_config: body.email_config }) })
      .eq('id', updated.brand_id)
  }

  return NextResponse.json({ template: updated })
}

// DELETE /api/email-templates/[id]
// The master template cannot be deleted — it's the brand-level default.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('email_templates')
    .select('type')
    .eq('id', id)
    .single()

  if (existing?.type === 'master') {
    return NextResponse.json({ error: 'Cannot delete master template' }, { status: 400 })
  }

  const { error } = await supabase.from('email_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
