import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const VALID_STATUSES = new Set(['draft', 'published', 'archived'])

// GET /api/landing-pages/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ page: data })
}

// PATCH /api/landing-pages/[id]
// Body: { content?, name?, slug?, status?, meta?, campaign_id? }
// Explicitly maintains updated_at — no DB trigger in this repo.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handlePatch(req, params)
  } catch (e) {
    // Match email_templates pattern: always return JSON so clients using
    // res.json() don't explode on an empty 500 body.
    const message = e instanceof Error ? e.message : 'Landing page update failed'
    console.error('[landing-pages PATCH] threw:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handlePatch(req: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  if (body.slug !== undefined && !SLUG_RE.test(body.slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase alphanumeric with hyphens (e.g. fall-launch)' },
      { status: 400 },
    )
  }
  if (body.status !== undefined && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${Array.from(VALID_STATUSES).join(', ')}` },
      { status: 400 },
    )
  }

  // updated_at is set on every PATCH. The table's default now() only fires on
  // insert; without this line the column would lag behind real mutations.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.content !== undefined) patch.content = body.content
  if (body.name !== undefined) patch.name = body.name
  if (body.slug !== undefined) patch.slug = body.slug
  if (body.status !== undefined) patch.status = body.status
  if (body.meta !== undefined) patch.meta = body.meta
  if (body.campaign_id !== undefined) patch.campaign_id = body.campaign_id
  if (body.published_url !== undefined) patch.published_url = body.published_url

  const { data, error } = await supabase
    .from('landing_pages')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[landing-pages PATCH]', error.message)
    const status = error.code === '23505' ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ page: data })
}

// DELETE /api/landing-pages/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('landing_pages').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
