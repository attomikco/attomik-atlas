import { decodeHtml } from '../helpers/decodeHtml'

// `ogImage` is the already-decoded og:image value (pre URL upgrade).
// Returns the raw best-guess logo URL; caller is responsible for upgradeImageUrl.
export function extractLogo(html: string, normalizedUrl: string, ogImage: string | null): string | null {
  // Collect all logo candidates, prefer the one from header/nav (usually white/light for dark bg)
  const logoCandidates: string[] = []

  // 1. Header/nav logo — highest priority (usually white on dark background)
  const navLogoImg = html.match(/<(?:header|nav)[^>]*>[\s\S]{0,2000}?<img[^>]+src=["']([^"']+)["'][^>]*>/i)
  if (navLogoImg?.[1]) {
    const src = decodeHtml(navLogoImg[1])
    if (!src.includes('icon') && !src.includes('favicon')) {
      try { logoCandidates.push(new URL(src.startsWith('/') ? src : src, normalizedUrl).href) } catch {}
    }
  }

  // 2. Any img with "logo" in src or alt
  const logoImg = html.match(/<img[^>]+(?:src|alt)=["'][^"']*logo[^"']*["'][^>]*>/i)
  if (logoImg) {
    const srcMatch = logoImg[0].match(/src=["']([^"']+)["']/i)
    if (srcMatch) {
      let src = decodeHtml(srcMatch[1])
      if (src.startsWith('/')) { try { src = new URL(src, normalizedUrl).href } catch {} }
      logoCandidates.push(src)
    }
  }

  // 3. Look for white/light variant keywords in logo URLs
  const whiteLogoPatterns = [
    /logo[._-]?white/i, /logo[._-]?light/i, /white[._-]?logo/i, /light[._-]?logo/i,
    /logo[._-]?inv/i, /logo[._-]?neg/i, /White_no_background/i,
  ]
  const allLogoImgs = html.match(/<img[^>]+src=["']([^"']*logo[^"']*|[^"']*Logo[^"']*)["'][^>]*>/gi) || []
  for (const tag of allLogoImgs) {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i)
    if (!srcMatch) continue
    const src = decodeHtml(srcMatch[1])
    if (whiteLogoPatterns.some(p => p.test(src))) {
      try { logoCandidates.unshift(src.startsWith('http') ? src : new URL(src, normalizedUrl).href) } catch {}
    }
  }

  // 4. SVG logo link
  const svgLogoLink = html.match(/href=["']([^"']*\.svg[^"']*)["'][^>]*(?:logo|brand)/i)
  if (svgLogoLink?.[1]) {
    try { logoCandidates.push(new URL(svgLogoLink[1], normalizedUrl).href) } catch {}
  }

  // 5. OG image as last resort
  if (ogImage && (/logo|brand|mark/i.test(ogImage) || /200x200|400x400/i.test(ogImage))) {
    logoCandidates.push(ogImage)
  }

  // Dedupe and pick first (priority: white/light variant > nav logo > any logo)
  const seenLogos = new Set<string>()
  const uniqueLogos = logoCandidates.filter(url => { if (seenLogos.has(url)) return false; seenLogos.add(url); return true })
  return uniqueLogos[0] || null
}
