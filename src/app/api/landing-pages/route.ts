import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Slug = lowercase alphanumeric + hyphens, no leading/trailing/doubled hyphens.
// Shared regex used by both POST (create) and PATCH (rename) routes.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// GET /api/landing-pages?brand_id=...  — list pages for a brand.
// Returns newest-first. RLS gates the visibility per brand_members; this
// route does not double-check access — Supabase returns an empty array for
// brands the caller can't see.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const brandId = req.nextUrl.searchParams.get('brand_id')
  if (!brandId) return NextResponse.json({ error: 'brand_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('brand_id', brandId)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pages: data || [] })
}

// POST /api/landing-pages  — create a new page.
// Body: { brand_id, name, slug, content, campaign_id?, meta? }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!body.brand_id || !body.name || !body.slug || body.content === undefined) {
    return NextResponse.json(
      { error: 'brand_id, name, slug, content required' },
      { status: 400 },
    )
  }
  if (!SLUG_RE.test(body.slug)) {
    return NextResponse.json(
      { error: 'slug must be lowercase alphanumeric with hyphens (e.g. fall-launch)' },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('landing_pages')
    .insert({
      brand_id: body.brand_id,
      campaign_id: body.campaign_id ?? null,
      name: body.name,
      slug: body.slug,
      meta: body.meta ?? null,
      content: body.content,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    console.error('[landing-pages POST]', error.message, error.details)
    // Unique-constraint collision on (brand_id, slug) surfaces as 23505.
    const status = error.code === '23505' ? 409 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json({ page: data })
}
