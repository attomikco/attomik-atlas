export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export type FetchHtmlOptions = {
  timeoutMs?: number
  userAgent?: string
}

export async function fetchHtml(url: string, opts: FetchHtmlOptions = {}): Promise<string> {
  const { timeoutMs = 12000, userAgent = DEFAULT_USER_AGENT } = opts
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    })
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

export type FetchExternalCssOptions = {
  maxFiles?: number
  maxBytes?: number
}

export async function fetchExternalCss(
  html: string,
  baseUrl: string,
  opts: FetchExternalCssOptions = {},
): Promise<string[]> {
  const { maxFiles = 2, maxBytes = 50000 } = opts

  const cssLinks = Array.from(html.matchAll(
    /<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"']+)["\'][^>]*>/gi
  )).map(m => m[1])
  .filter(href => !href.includes('fonts.googleapis') && !href.includes('font-awesome') && !href.includes('bootstrap'))
  .slice(0, maxFiles)

  const externalCSS: string[] = []
  for (const href of cssLinks) {
    try {
      const cssUrl = href.startsWith('http') ? href : href.startsWith('//') ? 'https:' + href : new URL(href, baseUrl).toString()
      const cssRes = await fetch(cssUrl, { signal: AbortSignal.timeout(3000), headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (cssRes.ok) externalCSS.push((await cssRes.text()).slice(0, maxBytes))
    } catch {}
  }
  return externalCSS
}

// Raw /products.json JSON, or null on failure. Caller decides how to interpret.
export async function fetchShopifyProducts(baseUrl: string): Promise<unknown | null> {
  try {
    const base = baseUrl.replace(/\/+$/, '')
    const res = await fetch(`${base}/products.json?limit=6`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) return await res.json()
  } catch {}
  return null
}

// Raw WooCommerce JSON array, or null on failure.
export async function fetchWooCommerceProducts(baseUrl: string): Promise<unknown | null> {
  try {
    const base = baseUrl.replace(/\/+$/, '')
    const res = await fetch(`${base}/wp-json/wc/v3/products?per_page=6&status=publish`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000),
    })
    if (res.ok) return await res.json()
  } catch {}
  return null
}
