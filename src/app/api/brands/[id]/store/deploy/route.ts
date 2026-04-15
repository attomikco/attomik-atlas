import { NextRequest, NextResponse } from 'next/server'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'
import { listThemes, putAsset } from '@/lib/shopify'

export const runtime = 'nodejs'
export const maxDuration = 120

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
  if (!themeId) {
    return NextResponse.json({ error: 'themeId required' }, { status: 400 })
  }

  // Load brand credentials + store_themes row in parallel.
  const [brandRes, themeRes] = await Promise.all([
    (async () => supabase.from('brands').select('id, notes').eq('id', brandId).maybeSingle())(),
    (async () => supabase.from('store_themes').select('*').eq('brand_id', brandId).maybeSingle())(),
  ])
  const brand = brandRes.data
  const storeTheme = themeRes.data
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  if (!storeTheme) return NextResponse.json({ error: 'No store theme generated yet — run /generate first' }, { status: 400 })

  const notes = parseNotes(brand.notes)
  const shop = typeof notes.shopify_store_url === 'string' ? notes.shopify_store_url : null
  const token = typeof notes.shopify_access_token === 'string' ? notes.shopify_access_token : null
  if (!shop || !token) {
    return NextResponse.json({ error: 'Shopify credentials not configured' }, { status: 400 })
  }

  // Refuse to deploy to the live (main) theme.
  let remoteThemes
  try {
    remoteThemes = await listThemes(shop, token)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list themes'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
  const target = remoteThemes.find(t => t.id === themeId)
  if (!target) {
    return NextResponse.json({ error: 'Target theme not found on store' }, { status: 404 })
  }
  if (target.role === 'main') {
    return NextResponse.json({ error: 'Refusing to deploy to the live (main) theme' }, { status: 400 })
  }

  // Mark the row as deploying so concurrent UI polls see the in-flight state.
  await supabase
    .from('store_themes')
    .update({
      last_deploy_status: 'deploying',
      last_deploy_error: null,
      shopify_theme_id: themeId,
      shopify_theme_name: target.name,
    })
    .eq('brand_id', brandId)

  // Serialize the 4 generated files and push them via Admin Asset API.
  const variantIndex = typeof storeTheme.selected_variant === 'number' ? storeTheme.selected_variant : 0
  const variants = Array.isArray(storeTheme.color_variants) ? storeTheme.color_variants : []
  const settings = variants[variantIndex]?.theme_settings ?? variants[0]?.theme_settings ?? null

  const assets: Array<{ key: string; value: string }> = []
  if (storeTheme.index_json) {
    assets.push({ key: 'templates/index.json', value: JSON.stringify(storeTheme.index_json, null, 2) })
  }
  if (storeTheme.product_json) {
    assets.push({ key: 'templates/product.json', value: JSON.stringify(storeTheme.product_json, null, 2) })
  }
  if (storeTheme.footer_group_json) {
    assets.push({ key: 'sections/footer-group.json', value: JSON.stringify(storeTheme.footer_group_json, null, 2) })
  }
  if (settings) {
    // Shopify's config/settings_data.json wraps theme settings under
    // `current`. Preserve that shape so the merchant's saved settings
    // aren't wiped out — we overwrite current but leave presets alone.
    const settingsData = { current: settings, presets: {} as Record<string, unknown> }
    assets.push({ key: 'config/settings_data.json', value: JSON.stringify(settingsData, null, 2) })
  }

  try {
    for (const asset of assets) {
      await putAsset(shop, token, themeId, asset.key, asset.value)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Deploy failed'
    await supabase
      .from('store_themes')
      .update({ last_deploy_status: 'failed', last_deploy_error: msg })
      .eq('brand_id', brandId)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  await supabase
    .from('store_themes')
    .update({
      last_deploy_status: 'success',
      last_deployed_at: new Date().toISOString(),
      last_deploy_error: null,
    })
    .eq('brand_id', brandId)

  return NextResponse.json({
    ok: true,
    preview_url: `https://${shop}/?preview_theme_id=${themeId}`,
    pushed_keys: assets.map(a => a.key),
  })
}
