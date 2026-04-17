import { NextRequest, NextResponse } from 'next/server'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'
import { createTheme } from '@/lib/shopify'

export const runtime = 'nodejs'
export const maxDuration = 30

function parseNotes(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: brandId } = await params
  const { supabase, error, status } = await authorizeOwnerOrAdmin(brandId)
  if (error) return NextResponse.json({ error }, { status })

  let body: { name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, notes')
    .eq('id', brandId)
    .maybeSingle()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const notes = parseNotes(brand.notes)
  const shop = typeof notes.shopify_store_url === 'string' ? notes.shopify_store_url : null
  const token = typeof notes.shopify_access_token === 'string' ? notes.shopify_access_token : null
  if (!shop || !token) {
    return NextResponse.json({ error: 'Shopify credentials not configured' }, { status: 400 })
  }

  let theme
  try {
    theme = await createTheme(shop, token, name)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create theme'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Persist the new theme as the target on store_themes so subsequent
  // installs/deploys know where to push. Upsert because the row may not
  // exist yet (the user can pick a target before running /generate).
  // Partial upsert only updates these two columns on conflict — existing
  // color_variants / index_json / etc. from a prior generate are preserved.
  const { error: upsertErr } = await supabase
    .from('store_themes')
    .upsert({
      brand_id: brandId,
      shopify_theme_id: theme.id,
      shopify_theme_name: theme.name,
    }, { onConflict: 'brand_id' })

  if (upsertErr) {
    // Theme created on Shopify but the local pointer didn't save. Surface
    // the error so the user can retry — the remote theme already exists so
    // a retry with the same name would fail; caller should pick from list.
    return NextResponse.json({
      error: `Theme created on Shopify but failed to save selection: ${upsertErr.message}`,
      theme,
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, theme })
}
