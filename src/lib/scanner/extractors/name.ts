import { decodeHtml } from '../helpers/decodeHtml'

export function extractName(html: string): string | null {
  let name: string | null = null
  const ogSiteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)?.[1]
  if (ogSiteName) {
    name = decodeHtml(ogSiteName)
  } else {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    if (titleMatch) {
      let cleaned = titleMatch
        .replace(/\s*[\|–—\-]\s*(Home|Official Site|Welcome|Shop|Store|Online).*$/i, '')
        .replace(/\s*[\|–—\-]\s*$/, '')
      // Brandpoof fix — Atlas leaves tagline after separator; port back upstream
      const sepMatch = cleaned.match(/\s+[\|–—\-]\s+/)
      if (sepMatch && typeof sepMatch.index === 'number') {
        const left = cleaned.slice(0, sepMatch.index).trim()
        if (left.length >= 2) cleaned = left
      }
      name = decodeHtml(cleaned)
    }
  }
  return name
}
