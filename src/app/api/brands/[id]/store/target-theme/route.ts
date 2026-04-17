import { NextRequest, NextResponse } from 'next/server'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'

export const runtime = 'nodejs'

// Persists the target Shopify theme on the store_themes row so later deploys
// and installs don't need the user to re-pick. Upserts because the row may
// not exist yet (the user can set a target before running /generate).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: brandId } = await params
  const { supabase, error, status } = await authorizeOwnerOrAdmin(brandId)
  if (error) return NextResponse.json({ error }, { status })

  let body: { shopify_theme_id?: number; shopify_theme_name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const themeId = typeof body.shopify_theme_id === 'number' ? body.shopify_theme_id : null
  const themeName = typeof body.shopify_theme_name === 'string' ? body.shopify_theme_name.trim() : ''
  if (!themeId || !themeName) {
    return NextResponse.json({ error: 'shopify_theme_id (number) and shopify_theme_name (string) required' }, { status: 400 })
  }

  const { error: upsertErr } = await supabase
    .from('store_themes')
    .upsert({
      brand_id: brandId,
      shopify_theme_id: themeId,
      shopify_theme_name: themeName,
    }, { onConflict: 'brand_id' })

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
