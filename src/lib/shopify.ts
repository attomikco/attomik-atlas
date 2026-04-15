// Shopify Admin REST API helper.
// Uses plain fetch() — no SDK dependency. All functions throw descriptive
// errors on non-2xx responses so callers can surface the Shopify message
// directly to the user.

export const SHOPIFY_API_VERSION = '2024-10'

export type ShopifyTheme = {
  id: number
  name: string
  role: 'main' | 'unpublished' | 'demo' | 'development'
  preview_url?: string
  created_at?: string
  updated_at?: string
  processing?: boolean
}

export function shopifyHeaders(token: string): Record<string, string> {
  return {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json',
  }
}

function apiBase(shop: string): string {
  // Normalize defensively in case a caller passes an unnormalized host.
  const host = shop.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return `https://${host}/admin/api/${SHOPIFY_API_VERSION}`
}

async function parseShopifyError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body === 'object' && body) {
      if (typeof body.errors === 'string') return body.errors
      if (Array.isArray(body.errors)) return body.errors.join(', ')
      if (typeof body.errors === 'object') return JSON.stringify(body.errors)
    }
  } catch {
    // fall through to text
  }
  try {
    return await res.text()
  } catch {
    return res.statusText
  }
}

export async function validateCredentials(
  shop: string,
  token: string
): Promise<{ shop_name: string; domain: string }> {
  const res = await fetch(`${apiBase(shop)}/shop.json`, {
    method: 'GET',
    headers: shopifyHeaders(token),
  })
  if (!res.ok) {
    const msg = await parseShopifyError(res)
    throw new Error(`Shopify credentials invalid (${res.status}): ${msg}`)
  }
  const body = (await res.json()) as { shop?: { name?: string; domain?: string; myshopify_domain?: string } }
  const shopObj = body.shop
  if (!shopObj?.name || !(shopObj.domain || shopObj.myshopify_domain)) {
    throw new Error('Shopify shop.json returned an unexpected shape')
  }
  return {
    shop_name: shopObj.name,
    domain: shopObj.domain || shopObj.myshopify_domain!,
  }
}

export async function listThemes(shop: string, token: string): Promise<ShopifyTheme[]> {
  const res = await fetch(`${apiBase(shop)}/themes.json`, {
    method: 'GET',
    headers: shopifyHeaders(token),
  })
  if (!res.ok) {
    const msg = await parseShopifyError(res)
    throw new Error(`Failed to list themes (${res.status}): ${msg}`)
  }
  const body = (await res.json()) as { themes?: ShopifyTheme[] }
  return body.themes ?? []
}

export async function getAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string
): Promise<string> {
  const url = new URL(`${apiBase(shop)}/themes/${themeId}/assets.json`)
  url.searchParams.set('asset[key]', key)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: shopifyHeaders(token),
  })
  if (!res.ok) {
    const msg = await parseShopifyError(res)
    throw new Error(`Failed to get asset ${key} (${res.status}): ${msg}`)
  }
  const body = (await res.json()) as { asset?: { value?: string; attachment?: string } }
  if (typeof body.asset?.value === 'string') return body.asset.value
  // Binary assets come back base64-encoded as `attachment`. Return as-is so
  // the caller can decide how to decode. For JSON/liquid assets we always
  // get `value`, which is what we want.
  if (typeof body.asset?.attachment === 'string') return body.asset.attachment
  throw new Error(`Asset ${key} returned no value or attachment`)
}

export async function putAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string,
  value: string
): Promise<void> {
  const res = await fetch(`${apiBase(shop)}/themes/${themeId}/assets.json`, {
    method: 'PUT',
    headers: shopifyHeaders(token),
    body: JSON.stringify({ asset: { key, value } }),
  })
  if (!res.ok) {
    const msg = await parseShopifyError(res)
    throw new Error(`Failed to put asset ${key} (${res.status}): ${msg}`)
  }
}

export async function putBinaryAsset(
  shop: string,
  token: string,
  themeId: number,
  key: string,
  base64: string
): Promise<void> {
  const res = await fetch(`${apiBase(shop)}/themes/${themeId}/assets.json`, {
    method: 'PUT',
    headers: shopifyHeaders(token),
    body: JSON.stringify({ asset: { key, attachment: base64 } }),
  })
  if (!res.ok) {
    const msg = await parseShopifyError(res)
    throw new Error(`Failed to put binary asset ${key} (${res.status}): ${msg}`)
  }
}
