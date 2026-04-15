import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SHOP_HOST_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/

// Admin client — the OAuth callback arrives from Shopify's servers as a
// top-level GET. The user's Supabase session cookies usually survive the
// round-trip (SameSite=Lax), but we can't rely on that, so we use the
// service-role client to persist the token. The brandId comes from the
// signed shopify_oauth_state cookie, which means only the same browser that
// started the install can complete it.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseNotes(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

// Shopify HMAC validation per https://shopify.dev/docs/apps/build/authentication-authorization/access-token-types/online-access
// Remove the hmac param, sort the rest alphabetically as key=value pairs,
// join with '&', HMAC-SHA256 with the app secret, compare hex digests in
// constant time.
function verifyHmac(params: URLSearchParams, secret: string): boolean {
  const hmac = params.get('hmac')
  if (!hmac) return false

  const entries: Array<[string, string]> = []
  params.forEach((value, key) => {
    if (key === 'hmac') return
    entries.push([key, value])
  })
  entries.sort(([a], [b]) => a.localeCompare(b))
  const message = entries.map(([k, v]) => `${k}=${v}`).join('&')

  const digest = createHmac('sha256', secret).update(message).digest('hex')
  try {
    const a = Buffer.from(digest, 'utf8')
    const b = Buffer.from(hmac, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function errorRedirect(appUrl: string, brandId: string | null, reason: string): NextResponse {
  const base = appUrl.replace(/\/+$/, '')
  const target = new URL(brandId ? `${base}/store?brand=${brandId}` : `${base}/store`)
  target.searchParams.set('oauth_error', reason)
  return NextResponse.redirect(target.toString(), 302)
}

export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Shopify OAuth env vars not configured' }, { status: 500 })
  }
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 })
  }

  const params = req.nextUrl.searchParams
  const code = params.get('code')
  const shop = params.get('shop') || ''
  const state = params.get('state')

  if (!code || !state || !shop) {
    return errorRedirect(appUrl, null, 'missing_params')
  }
  if (!SHOP_HOST_REGEX.test(shop)) {
    return errorRedirect(appUrl, null, 'invalid_shop')
  }

  // Recover the nonce + brandId we signed into the install-time cookie.
  const raw = req.cookies.get('shopify_oauth_state')?.value
  if (!raw) {
    return errorRedirect(appUrl, null, 'missing_state_cookie')
  }
  let cookieState: { nonce?: string; brandId?: string; shop?: string }
  try {
    cookieState = JSON.parse(raw)
  } catch {
    return errorRedirect(appUrl, null, 'invalid_state_cookie')
  }
  const { nonce, brandId, shop: cookieShop } = cookieState
  if (!nonce || !brandId) {
    return errorRedirect(appUrl, null, 'invalid_state_cookie')
  }
  if (state !== nonce) {
    return errorRedirect(appUrl, brandId, 'state_mismatch')
  }
  // Belt-and-suspenders — make sure the shop coming back matches the shop
  // we started the install for. HMAC already binds shop to the Shopify
  // signature, but this catches a replay using a stale install cookie.
  if (cookieShop && cookieShop !== shop) {
    return errorRedirect(appUrl, brandId, 'shop_mismatch')
  }

  if (!verifyHmac(params, clientSecret)) {
    return errorRedirect(appUrl, brandId, 'hmac_invalid')
  }

  // Exchange the authorization code for an offline access token. Shopify's
  // token endpoint is the shop's own admin host, not a global auth server.
  let tokenBody: { access_token?: string; scope?: string }
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })
    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '')
      console.error('[shopify/callback] token exchange failed:', tokenRes.status, text)
      return errorRedirect(appUrl, brandId, 'token_exchange_failed')
    }
    tokenBody = await tokenRes.json()
  } catch (e) {
    console.error('[shopify/callback] token exchange error:', e)
    return errorRedirect(appUrl, brandId, 'token_exchange_error')
  }

  const accessToken = tokenBody?.access_token
  if (!accessToken) {
    return errorRedirect(appUrl, brandId, 'no_access_token')
  }

  // Merge Shopify keys into brand.notes without disturbing existing keys
  // (klaviyo, meta, email_config, etc).
  const { data: brand, error: brandErr } = await supabaseAdmin
    .from('brands')
    .select('id, notes')
    .eq('id', brandId)
    .maybeSingle()
  if (brandErr || !brand) {
    console.error('[shopify/callback] brand fetch failed:', brandErr)
    return errorRedirect(appUrl, brandId, 'brand_not_found')
  }
  const notes = parseNotes(brand.notes)
  const updated = {
    ...notes,
    shopify_store_url: shop,
    shopify_access_token: accessToken,
    shopify_api_version: '2024-10',
    shopify_token_saved_at: new Date().toISOString(),
  }
  const { error: updateErr } = await supabaseAdmin
    .from('brands')
    .update({ notes: JSON.stringify(updated) })
    .eq('id', brandId)
  if (updateErr) {
    console.error('[shopify/callback] brand update failed:', updateErr)
    return errorRedirect(appUrl, brandId, 'persist_failed')
  }

  const target = new URL(`${appUrl.replace(/\/+$/, '')}/store`)
  target.searchParams.set('brand', brandId)
  target.searchParams.set('connected', 'true')
  const response = NextResponse.redirect(target.toString(), 302)
  // Clear the install-time state cookie so it can't be replayed.
  response.cookies.set('shopify_oauth_state', '', { httpOnly: true, path: '/', maxAge: 0 })
  return response
}
