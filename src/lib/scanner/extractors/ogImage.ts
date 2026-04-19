import { decodeHtml } from '../helpers/decodeHtml'

// Returns the raw (decoded but not URL-upgraded) og:image value, or null.
export function extractOgImage(html: string): string | null {
  const ogImageRaw = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
    || null
  return ogImageRaw ? decodeHtml(ogImageRaw) : null
}
