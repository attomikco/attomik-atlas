import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SHOP_HOST_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/
const SCOPES = 'read_themes,write_themes,read_content,write_content'

// GET /api/shopify/install?shop=<myshopify.com>&brandId=<uuid>
//
// Entry point for the OAuth authorization code grant. Signs a nonce + brandId
// into an httpOnly cookie (`shopify_oauth_state`), then 302s the browser to
// Shopify's authorize URL. The callback route reads the same cookie to
// validate the returned `state` param and recover which brand owns the token.
//
// This route is public (see middleware.ts) — it runs before the user session
// is active in the OAuth handshake. We deliberately do not check auth here:
// anyone who knows the brandId can kick off the install, but only a successful
// callback from Shopify will actually persist a token to that brand. If that
// guarantee weakens in the future, this is the place to add an auth check.
export async function GET(req: NextRequest) {
  const clientId = process.env.SHOPIFY_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!clientId) {
    return NextResponse.json({ error: 'SHOPIFY_CLIENT_ID not configured' }, { status: 500 })
  }
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 })
  }

  const shop = req.nextUrl.searchParams.get('shop') || ''
  const brandId = req.nextUrl.searchParams.get('brandId') || ''

  if (!shop || !SHOP_HOST_REGEX.test(shop)) {
    return NextResponse.json({ error: 'Invalid shop — must be <name>.myshopify.com' }, { status: 400 })
  }
  if (!brandId) {
    return NextResponse.json({ error: 'brandId required' }, { status: 400 })
  }

  const nonce = crypto.randomUUID()
  const redirectUri = `${appUrl.replace(/\/+$/, '')}/api/shopify/callback`

  const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`)
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('scope', SCOPES)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('state', nonce)

  const response = NextResponse.redirect(authorizeUrl.toString(), 302)
  response.cookies.set('shopify_oauth_state', JSON.stringify({ nonce, brandId, shop }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
