import { NextRequest, NextResponse } from 'next/server'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'
import { getAsset } from '@/lib/shopify'
import { themeSettingsToColors } from '@/lib/store-colors'

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

// Thin wrapper around getAsset that returns null on any failure and logs.
// Callers continue with partial data — a missing group file or a theme
// without an about page shouldn't abort the whole pull.
async function safeFetchJSON(
  shop: string,
  token: string,
  themeId: number,
  key: string
): Promise<unknown | null> {
  try {
    const raw = await getAsset(shop, token, themeId, key)
    return JSON.parse(raw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[pull-settings] ${key}: ${msg}`)
    return null
  }
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

  // Sequential fetches — Shopify's theme-assets bucket is narrow and these
  // are only 5 GETs, so serial completes in ~1–2 seconds without risking
  // rate limits. Per-file try/catch in safeFetchJSON means a missing file
  // (e.g. a theme without a custom about page) leaves that field null and
  // we continue on to the next.
  const settingsRaw = await safeFetchJSON(shop, token, themeId, 'config/settings_data.json')
  const indexJson = await safeFetchJSON(shop, token, themeId, 'templates/index.json')
  const productJson = await safeFetchJSON(shop, token, themeId, 'templates/product.json')
  const aboutJson = await safeFetchJSON(shop, token, themeId, 'templates/page.about.json')
  const footerGroupJson = await safeFetchJSON(shop, token, themeId, 'sections/footer-group.json')

  // ── Settings: unwrap `current`, merge into selected variant's
  //    theme_settings, AND reverse-map colors into color_variants[i].colors.
  //    Shopify wraps settings in `current`; accept both shapes so a
  //    hand-edited file without the wrapper still merges correctly.
  const variants = Array.isArray(storeTheme.color_variants) ? [...storeTheme.color_variants] : []
  const idx = typeof storeTheme.selected_variant === 'number' ? storeTheme.selected_variant : 0
  if (settingsRaw && typeof settingsRaw === 'object') {
    if (!variants[idx]) {
      return NextResponse.json({ error: 'Selected variant index out of range' }, { status: 500 })
    }
    const parsed = settingsRaw as { current?: unknown }
    const remoteSettings = (parsed.current && typeof parsed.current === 'object'
      ? parsed.current
      : settingsRaw) as Record<string, unknown>

    const current = (variants[idx].theme_settings || {}) as Record<string, unknown>
    const mergedSettings = { ...current, ...remoteSettings }
    // Reverse-map the 9 Shopify color keys back into the editor's canonical
    // `colors` shape. Null means some keys are missing or malformed on the
    // remote — preserve whatever was stored so we don't clobber with an
    // incomplete map.
    const reversedColors = themeSettingsToColors(mergedSettings)
    variants[idx] = {
      ...variants[idx],
      theme_settings: mergedSettings,
      ...(reversedColors ? { colors: reversedColors } : {}),
    }
  }

  // Build the update payload, only including fields that were successfully
  // fetched. A null from safeFetchJSON means that file didn't exist or
  // failed to parse — we leave the prior stored value intact rather than
  // overwriting with null.
  const update: Record<string, unknown> = {
    color_variants: variants,
    updated_at: new Date().toISOString(),
  }
  if (indexJson !== null) update.index_json = indexJson
  if (productJson !== null) update.product_json = productJson
  if (aboutJson !== null) update.about_json = aboutJson
  if (footerGroupJson !== null) update.footer_group_json = footerGroupJson

  const { data: updated, error: updateErr } = await supabase
    .from('store_themes')
    .update(update)
    .eq('brand_id', brandId)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to persist pulled settings', details: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    theme: updated,
    pulled: {
      settings: settingsRaw !== null,
      index_json: indexJson !== null,
      product_json: productJson !== null,
      about_json: aboutJson !== null,
      footer_group_json: footerGroupJson !== null,
    },
  })
}
