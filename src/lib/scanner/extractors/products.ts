import { decodeHtml } from '../helpers/decodeHtml'
import { truncateAtSentenceBoundary } from '../helpers/truncate'
import { upgradeImageUrl } from '../helpers/url'
import type { Platform, Product } from '../types'

// Pure cascade: Shopify → JSON-LD → OG → WooCommerce → h1+price.
// Network IO lives in fetch.ts — caller pre-fetches the Shopify/Woo JSON and passes it in.
export function extractProducts(
  html: string,
  _normalizedUrl: string,
  platform: Platform,
  shopifyJson: unknown | null,
  wooJson: unknown | null,
  name: string | null,
): Product[] {
  let products: Product[] = []

  // Try Shopify products.json
  if (platform === 'shopify' && shopifyJson) {
    const prodData = shopifyJson as { products?: unknown }
    if (Array.isArray(prodData?.products)) {
      products = (prodData.products as unknown[]).slice(0, 6).map((raw: unknown) => {
        const p = raw as {
          title?: string
          body_html?: string
          variants?: Array<{ price?: string }>
          images?: Array<{ src?: string }>
        }
        return {
          name: decodeHtml(p.title) || '',
          description: p.body_html ? truncateAtSentenceBoundary(p.body_html.replace(/<[^>]*>/g, ' ').trim(), 400) : null,
          price: p.variants?.[0]?.price || null,
          image: p.images?.[0]?.src ? upgradeImageUrl(p.images[0].src) : null,
        }
      })
    }
  }

  // Fallback: JSON-LD Product schema
  if (products.length === 0) {
    const ldJsonBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    for (const block of ldJsonBlocks) {
      try {
        const content = block.replace(/<\/?script[^>]*>/gi, '')
        const parsed = JSON.parse(content)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          if (item?.['@type'] === 'Product' && item?.name) {
            products.push({
              name: item.name,
              description: typeof item.description === 'string' ? truncateAtSentenceBoundary(item.description.replace(/<[^>]*>/g, ' ').trim(), 400) : null,
              price: item.offers?.price?.toString() || item.offers?.lowPrice?.toString() || null,
              image: typeof item.image === 'string' ? item.image : Array.isArray(item.image) ? item.image[0] : null,
            })
          }
          if (products.length >= 4) break
        }
      } catch {}
      if (products.length >= 4) break
    }
  }

  // Fallback 2: Open Graph product tags
  if (products.length === 0) {
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    const ogPrice = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1]
    if (ogTitle && ogTitle !== name) {
      products.push({
        name: decodeHtml(ogTitle),
        description: ogDesc ? truncateAtSentenceBoundary(decodeHtml(ogDesc), 400) : null,
        price: ogPrice || null,
        image: ogImg || null,
      })
    }
  }

  // Fallback 3: WooCommerce public API
  if (products.length === 0 && wooJson) {
    if (Array.isArray(wooJson)) {
      products = (wooJson as unknown[]).slice(0, 6).map((raw: unknown) => {
        const p = raw as {
          name?: string
          short_description?: string
          price?: string
          images?: Array<{ src?: string }>
        }
        return {
          name: decodeHtml(p.name || ''),
          description: p.short_description ? truncateAtSentenceBoundary(p.short_description.replace(/<[^>]*>/g, ' ').trim(), 400) : null,
          price: p.price || null,
          image: p.images?.[0]?.src ? upgradeImageUrl(p.images[0].src) : null,
        }
      }).filter((p: Product) => p.name)
    }
  }

  // Fallback 4: Scrape h1 + price patterns
  if (products.length === 0) {
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]
    const pricePattern = html.match(/\$\s*(\d+(?:\.\d{2})?)/)?.[1]
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
    if (h1 && h1.length < 80) {
      products.push({
        name: decodeHtml(h1.trim()),
        description: metaDesc ? truncateAtSentenceBoundary(decodeHtml(metaDesc), 400) : null,
        price: pricePattern || null,
        image: null,
      })
    }
  }

  return products
}
