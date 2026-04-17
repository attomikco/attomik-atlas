import { NextRequest, NextResponse } from 'next/server'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'
import { listThemes, putAsset } from '@/lib/shopify'
import { colorsToThemeSettings, parseThemeColors } from '@/lib/store-colors'

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

// Shopify's Asset API rejects theme JSON where an image-type setting holds
// an external URL — it expects a Shopify Files resource ID instead. The
// generator stores raw URLs from `brand_images` directly in image slots so
// the editor can render them, but those can't be pushed as-is. Until we
// wire up a Shopify Files upload step, strip every http(s) URL string from
// the JSON before handing it to `putAsset`. This is a pure deploy-time
// transformation — the stored `store_themes` row keeps the raw URLs so
// future deploys pick them up once we have real Shopify file IDs.
//
// The walk is depth-first, null-safe, and treats arrays and objects
// structurally. We only null the value when the string STARTS with the
// scheme, so narrative copy like "visit https://example.com for details"
// survives — those paragraphs don't start with http(s). Shopify-scheme
// links (shopify://pages/about) and relative paths (/collections/all) are
// also preserved.
function stripImageUrls(json: unknown): unknown {
  if (json === null || json === undefined) return json
  if (typeof json === 'string') {
    if (json.startsWith('https://') || json.startsWith('http://')) return null
    return json
  }
  if (Array.isArray(json)) {
    return json.map(stripImageUrls)
  }
  if (typeof json === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
      out[key] = stripImageUrls(value)
    }
    return out
  }
  return json
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
  const bodyThemeId = typeof body.themeId === 'number' ? body.themeId : null

  // Load brand credentials + store_themes row in parallel.
  const [brandRes, themeRes] = await Promise.all([
    (async () => supabase.from('brands').select('id, notes').eq('id', brandId).maybeSingle())(),
    (async () => supabase.from('store_themes').select('*').eq('brand_id', brandId).maybeSingle())(),
  ])
  const brand = brandRes.data
  const storeTheme = themeRes.data
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  if (!storeTheme) return NextResponse.json({ error: 'No store theme generated yet — run /generate first' }, { status: 400 })

  // Fall back to the persisted target on store_themes when the caller
  // omits themeId. Callers that used to require themeId in the body still
  // work identically; new callers can rely on the stored selection.
  const themeId = bodyThemeId ?? (typeof storeTheme.shopify_theme_id === 'number' ? storeTheme.shopify_theme_id : null)
  if (!themeId) {
    return NextResponse.json({ error: 'themeId required — pass in body or set a target theme via PATCH /store/target-theme' }, { status: 400 })
  }

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
  const activeVariant = variants[variantIndex] ?? variants[0] ?? null
  const baseSettings = activeVariant?.theme_settings ?? null

  // Prefer the 9-slot `colors` object when present: it's the source of truth
  // the editor UI writes to, and the deploy must mirror it into the Shopify
  // `config/settings_data.json` keys. For legacy rows without `colors`, fall
  // back to the stored theme_settings as-is.
  const variantColors = parseThemeColors(activeVariant?.colors)
  const settings = baseSettings
    ? (variantColors
        ? { ...baseSettings, ...colorsToThemeSettings(variantColors) }
        : baseSettings)
    : null

  // All 4 blobs run through stripImageUrls before serialization — see the
  // helper for the rationale. The original storeTheme row is untouched.
  const assets: Array<{ key: string; value: string }> = []
  if (storeTheme.index_json) {
    assets.push({
      key: 'templates/index.json',
      value: JSON.stringify(stripImageUrls(storeTheme.index_json), null, 2),
    })
  }
  if (storeTheme.product_json) {
    assets.push({
      key: 'templates/product.json',
      value: JSON.stringify(stripImageUrls(storeTheme.product_json), null, 2),
    })
  }
  if (storeTheme.footer_group_json) {
    assets.push({
      key: 'sections/footer-group.json',
      value: JSON.stringify(stripImageUrls(storeTheme.footer_group_json), null, 2),
    })
  }
  if (storeTheme.about_json) {
    assets.push({
      key: 'templates/page.about.json',
      value: JSON.stringify(stripImageUrls(storeTheme.about_json), null, 2),
    })
  }
  if (settings) {
    // Shopify's config/settings_data.json wraps theme settings under
    // `current`. Preserve that shape so the merchant's saved settings
    // aren't wiped out — we overwrite current but leave presets alone.
    // The theme_settings block may also carry image URLs (logo fields,
    // favicon, etc.) — strip those too before pushing.
    const cleanSettings = stripImageUrls(settings)
    const settingsData = { current: cleanSettings, presets: {} as Record<string, unknown> }
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
