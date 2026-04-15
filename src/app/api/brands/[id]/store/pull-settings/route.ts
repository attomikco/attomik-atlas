import { NextRequest, NextResponse } from 'next/server'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'
import { getAsset } from '@/lib/shopify'

export const runtime = 'nodejs'
export const maxDuration = 60

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

  let body: { themeId?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const themeId = typeof body.themeId === 'number' ? body.themeId : null
  if (!themeId) return NextResponse.json({ error: 'themeId required' }, { status: 400 })

  const [brandRes, themeRes] = await Promise.all([
    (async () => supabase.from('brands').select('id, notes').eq('id', brandId).maybeSingle())(),
    (async () => supabase.from('store_themes').select('*').eq('brand_id', brandId).maybeSingle())(),
  ])
  const brand = brandRes.data
  const storeTheme = themeRes.data
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  if (!storeTheme) return NextResponse.json({ error: 'No store theme generated yet' }, { status: 400 })

  const notes = parseNotes(brand.notes)
  const shop = typeof notes.shopify_store_url === 'string' ? notes.shopify_store_url : null
  const token = typeof notes.shopify_access_token === 'string' ? notes.shopify_access_token : null
  if (!shop || !token) {
    return NextResponse.json({ error: 'Shopify credentials not configured' }, { status: 400 })
  }

  let raw: string
  try {
    raw = await getAsset(shop, token, themeId, 'config/settings_data.json')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to pull settings'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  let remoteSettings: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw) as { current?: unknown }
    // Shopify wraps settings in `current` — accept both shapes so a
    // hand-edited file without the wrapper still merges correctly.
    remoteSettings = (parsed.current && typeof parsed.current === 'object'
      ? parsed.current
      : parsed) as Record<string, unknown>
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid settings JSON from Shopify'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Merge into the selected color variant's theme_settings.
  const variants = Array.isArray(storeTheme.color_variants) ? [...storeTheme.color_variants] : []
  const idx = typeof storeTheme.selected_variant === 'number' ? storeTheme.selected_variant : 0
  if (!variants[idx]) {
    return NextResponse.json({ error: 'Selected variant index out of range' }, { status: 500 })
  }
  const current = (variants[idx].theme_settings || {}) as Record<string, unknown>
  variants[idx] = {
    ...variants[idx],
    theme_settings: { ...current, ...remoteSettings },
  }

  const { error: updateErr } = await supabase
    .from('store_themes')
    .update({ color_variants: variants, updated_at: new Date().toISOString() })
    .eq('brand_id', brandId)
  if (updateErr) {
    return NextResponse.json({ error: 'Failed to persist merged settings', details: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, color_variants: variants })
}
