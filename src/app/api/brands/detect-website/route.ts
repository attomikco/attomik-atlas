import { NextRequest, NextResponse } from 'next/server'
import { decodeHtml } from '@/lib/decodeHtml'

function upgradeImageUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    if (u.hostname.includes('shopify') || u.hostname.includes('shopifycdn')) {
      u.searchParams.delete('width'); u.searchParams.delete('height'); u.searchParams.delete('crop'); u.searchParams.delete('w'); u.searchParams.delete('h')
      u.pathname = u.pathname.replace(/_(?:pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|\d+x\d*|\d*x\d+)\./g, '.')
      return u.toString()
    }
    u.searchParams.delete('width'); u.searchParams.delete('height'); u.searchParams.delete('w'); u.searchParams.delete('h')
    u.searchParams.delete('size'); u.searchParams.delete('resize'); u.searchParams.delete('fit'); u.searchParams.delete('crop')
    u.searchParams.delete('quality'); u.searchParams.delete('q'); u.searchParams.delete('auto'); u.searchParams.delete('fm'); u.searchParams.delete('ixlib')
    u.pathname = u.pathname.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')
    return u.toString()
  } catch { return url }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ name: null, colors: [], font: null, ogImage: null, logo: null })

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    let html: string
    try {
      const res = await fetch(normalizedUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache',
        },
      })
      html = await res.text()
    } catch (e) {
      console.error('[detect-website] fetch failed:', e)
      return NextResponse.json({ name: null, colors: [], font: null, ogImage: null, logo: null, products: [], images: [] })
    } finally {
      clearTimeout(timeout)
    }

    // ── Brand Name ──────────────────────────────────────────────────
    let name: string | null = null
    const ogSiteName = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)?.[1]
    if (ogSiteName) {
      name = decodeHtml(ogSiteName)
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      if (titleMatch) {
        name = decodeHtml(titleMatch
          .replace(/\s*[\|–—\-]\s*(Home|Official Site|Welcome|Shop|Store|Online).*$/i, '')
          .replace(/\s*[\|–—\-]\s*$/, ''))
      }
    }

    // ── Colors ──────────────────────────────────────────────────────

    // Fetch external CSS
    const cssLinks = Array.from(html.matchAll(
      /<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"']+)["\'][^>]*>/gi
    )).map(m => m[1])
    .filter(href => !href.includes('fonts.googleapis') && !href.includes('font-awesome') && !href.includes('bootstrap'))
    .slice(0, 2)

    const externalCSS: string[] = []
    for (const href of cssLinks) {
      try {
        const cssUrl = href.startsWith('http') ? href : href.startsWith('//') ? 'https:' + href : new URL(href, url).toString()
        const cssRes = await fetch(cssUrl, { signal: AbortSignal.timeout(3000), headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (cssRes.ok) externalCSS.push((await cssRes.text()).slice(0, 50000))
      } catch {}
    }

    // Combine all CSS sources + inline styles into one string
    const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
    const inlineStyles = (html.match(/style=["'][^"']+["']/gi) || []).join(' ')
    const allCSS = [...styleBlocks, ...externalCSS].join(' ')
    const styleText = allCSS + ' ' + inlineStyles

    // Extract hex colors
    const WHITES = new Set(['#ffffff', '#fefefe', '#f9f9f9', '#f8f8f8', '#fcfcfc'])
    const BLACKS = new Set(['#000000', '#111111', '#222222'])
    const colorCounts = new Map<string, number>()

    const hexMatches = styleText.match(/#[0-9a-fA-F]{6}\b/g) || []
    for (const raw of hexMatches) {
      const hex = raw.toLowerCase()
      if (WHITES.has(hex) || BLACKS.has(hex)) continue
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      // Skip near-grays (R, G, B all within 20 of each other)
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) continue
      // Skip very light colors (all channels > 220)
      if (r > 220 && g > 220 && b > 220) continue
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }

    // Also extract rgb() values
    const rgbMatches = styleText.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g) || []
    for (const m of rgbMatches) {
      const parts = m.match(/(\d{1,3})/g)
      if (!parts || parts.length < 3) continue
      const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2])
      if (r > 255 || g > 255 || b > 255) continue
      // Skip if opacity 0
      if (/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(m)) continue
      const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
      if (WHITES.has(hex) || BLACKS.has(hex)) continue
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) continue
      if (r > 220 && g > 220 && b > 220) continue
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }

    // ── Smart color role classification ──
    // Instead of blindly picking the 3 most frequent, classify into roles:
    //   primary   = most frequent DARK, saturated color (brand hero)
    //   secondary = most frequent LIGHT color (backgrounds, cards)
    //   accent    = most frequent color that differs in hue from primary (CTAs, highlights)
    const colorDistance = (a: string, b2: string): number => {
      const r1 = parseInt(a.slice(1, 3), 16), g1 = parseInt(a.slice(3, 5), 16), b1 = parseInt(a.slice(5, 7), 16)
      const r2 = parseInt(b2.slice(1, 3), 16), g2 = parseInt(b2.slice(3, 5), 16), bv = parseInt(b2.slice(5, 7), 16)
      return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - bv) ** 2)
    }

    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      const l = (max + min) / 2
      if (max === min) return { h: 0, s: 0, l }
      const d = max - min
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      let h = 0
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else h = ((r - g) / d + 4) / 6
      return { h: h * 360, s, l }
    }

    const sorted = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([hex, count]) => ({ hex, count, ...hexToHsl(hex) }))

    // Pick primary: darkest saturated color with high frequency (l < 0.6 and s > 0.15)
    // Falls back to most frequent color overall
    const darkSaturated = sorted.filter(c => c.l < 0.6 && c.s > 0.15)
    const primary = darkSaturated[0] || sorted[0]

    // Pick secondary: lightest color (l > 0.7) that's distinct from primary
    const lightColors = sorted.filter(c => c.l > 0.7 && colorDistance(c.hex, primary?.hex || '') > 60)
    const secondary = lightColors[0] || null

    // Pick accent: saturated color with hue distance > 30° from primary, distinct visually
    const hueDist = (h1: number, h2: number) => Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2))
    const accentCandidates = sorted.filter(c =>
      c.hex !== primary?.hex &&
      c.hex !== secondary?.hex &&
      c.s > 0.2 &&
      colorDistance(c.hex, primary?.hex || '') > 50 &&
      (primary ? hueDist(c.h, primary.h) > 30 || Math.abs(c.l - primary.l) > 0.25 : true)
    )
    const accent = accentCandidates[0] || sorted.find(c => c.hex !== primary?.hex && c.hex !== secondary?.hex) || null

    // Return in order: [primary, secondary, accent] — matching brand setup mapping
    const colors: string[] = []
    if (primary) colors.push(primary.hex)
    if (secondary) colors.push(secondary.hex)
    else if (primary) colors.push(primary.l < 0.5 ? '#f8f7f4' : '#1a1a1a') // synth light/dark counterpart
    if (accent) colors.push(accent.hex)
    else if (colors.length === 2) colors.push(colors[0]) // fallback accent = primary

    // Full palette: top 12 visually distinct scraped colors for the picker
    const allColors: string[] = []
    for (const c of sorted) {
      if (allColors.length >= 12) break
      if (allColors.some(existing => colorDistance(c.hex, existing) < 35)) continue
      allColors.push(c.hex)
    }

    // ── Font ────────────────────────────────────────────────────────
    let font: string | null = null
    const systemFonts = new Set(['arial', 'helvetica', 'verdana', 'georgia', 'times', 'times new roman', 'courier', 'courier new', 'sans-serif', 'serif', 'monospace', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'inherit', 'initial'])

    // Google Fonts link
    const gfLink = html.match(/fonts\.googleapis\.com\/css2?\?family=([^&"']+)/i)?.[1]
    if (gfLink) {
      font = decodeURIComponent(gfLink.split('&')[0]).replace(/\+/g, ' ').split(':')[0]
    }

    // @import Google Fonts
    if (!font) {
      const importMatch = allCSS.match(/@import\s+url\(['"]?[^)]*fonts\.googleapis\.com\/css2?\?family=([^&"')]+)/i)?.[1]
      if (importMatch) font = decodeURIComponent(importMatch.split('&')[0]).replace(/\+/g, ' ').split(':')[0]
    }

    // font-family in CSS
    if (!font) {
      const ffMatches = allCSS.match(/font-family\s*:\s*["']?([^;"'}\n]+)/gi) || []
      for (const m of ffMatches) {
        const families = m.replace(/font-family\s*:\s*/i, '').split(',')
        for (const f of families) {
          const clean = f.trim().replace(/["']/g, '').toLowerCase()
          if (!systemFonts.has(clean) && clean.length > 1) {
            font = f.trim().replace(/["']/g, '')
            break
          }
        }
        if (font) break
      }
    }

    // ── Font transform & letter-spacing ──────────────────────────
    let fontTransform: 'uppercase' | 'lowercase' | 'capitalize' | 'none' = 'none'
    let letterSpacing: 'wide' | 'tight' | 'normal' = 'normal'

    const transformCounts: Record<string, number> = { uppercase: 0, lowercase: 0, capitalize: 0 }
    // Check heading-level selectors for text-transform
    const headingPatterns = /(?:h[1-3]|\.heading|header|nav|\[class\*="title"\]|\[class\*="heading"\]|\[class\*="hero"\]|\[class\*="brand"\]|\[class\*="logo"\]|\.title|\.hero|\.brand)[^{]*\{[^}]*text-transform\s*:\s*(uppercase|lowercase|capitalize)/gi
    let ttMatch
    while ((ttMatch = headingPatterns.exec(allCSS)) !== null) {
      const val = ttMatch[1].toLowerCase()
      if (val in transformCounts) transformCounts[val]++
    }
    // Also detect from brand name casing
    const brandText = ogSiteName || name
    if (brandText) {
      if (brandText === brandText.toUpperCase() && brandText.length > 1) transformCounts.uppercase += 3
      else if (brandText === brandText.toLowerCase()) transformCounts.lowercase += 2
      else if (brandText === brandText.replace(/\b\w/g, c => c.toUpperCase())) transformCounts.capitalize += 1
    }
    const topTransform = Object.entries(transformCounts).sort((a, b) => b[1] - a[1])[0]
    if (topTransform && topTransform[1] > 0) fontTransform = topTransform[0] as typeof fontTransform

    // Check letter-spacing on headings
    const lsMatch = allCSS.match(/(?:h[1-3]|\.heading|\.title|\.hero|header)[^{]*\{[^}]*letter-spacing\s*:\s*([^;}\s]+)/i)
    if (lsMatch) {
      const val = lsMatch[1]
      const em = parseFloat(val)
      if (val.includes('em')) {
        if (em >= 0.1) letterSpacing = 'wide'
        else if (em <= -0.02) letterSpacing = 'tight'
      }
    }
    // Also check if any wide spacing found anywhere in heading context
    if (letterSpacing === 'normal') {
      const wideCheck = allCSS.match(/letter-spacing\s*:\s*([0-9.]+)em/gi) || []
      for (const w of wideCheck) {
        const v = parseFloat(w.replace(/letter-spacing\s*:\s*/i, ''))
        if (v >= 0.1) { letterSpacing = 'wide'; break }
      }
    }

    // ── OG Image ────────────────────────────────────────────────────
    const ogImageRaw = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      || null
    const ogImage = ogImageRaw ? decodeHtml(ogImageRaw) : null

    // ── Logo ────────────────────────────────────────────────────────
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
    const logo = uniqueLogos[0] || null

    // ── Platform detection ────────────────────────────────────────
    const isShopify = /Shopify\.shop|cdn\.shopify\.com|myshopify\.com/i.test(html)
    const platform = isShopify ? 'shopify' : 'other'

    // ── Product detection ──────────────────────────────────────────
    type DetectedProduct = { name: string; description: string | null; price: string | null; image: string | null }
    let products: DetectedProduct[] = []

    // Try Shopify products.json
    if (isShopify) {
      try {
        const baseUrl = normalizedUrl.replace(/\/+$/, '')
        const prodRes = await fetch(`${baseUrl}/products.json?limit=6`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(6000),
        })
        if (prodRes.ok) {
          const prodData = await prodRes.json()
          if (Array.isArray(prodData?.products)) {
            products = prodData.products.slice(0, 6).map((p: any) => ({
              name: decodeHtml(p.title) || '',
              description: p.body_html ? p.body_html.replace(/<[^>]*>/g, ' ').trim().slice(0, 200) : null,
              price: p.variants?.[0]?.price || null,
              image: p.images?.[0]?.src ? upgradeImageUrl(p.images[0].src) : null,
            }))
          }
        }
      } catch {}
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
                description: typeof item.description === 'string' ? item.description.replace(/<[^>]*>/g, ' ').trim().slice(0, 200) : null,
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
          description: ogDesc ? decodeHtml(ogDesc).slice(0, 200) : null,
          price: ogPrice || null,
          image: ogImg || null,
        })
      }
    }

    // Fallback 3: WooCommerce public API
    if (products.length === 0) {
      try {
        const baseUrl = normalizedUrl.replace(/\/+$/, '')
        const wcRes = await fetch(`${baseUrl}/wp-json/wc/v3/products?per_page=6&status=publish`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(3000),
        })
        if (wcRes.ok) {
          const wcData = await wcRes.json()
          if (Array.isArray(wcData)) {
            products = wcData.slice(0, 6).map((p: any) => ({
              name: decodeHtml(p.name || ''),
              description: p.short_description ? p.short_description.replace(/<[^>]*>/g, ' ').trim().slice(0, 200) : null,
              price: p.price || null,
              image: p.images?.[0]?.src ? upgradeImageUrl(p.images[0].src) : null,
            })).filter((p: DetectedProduct) => p.name)
          }
        }
      } catch {}
    }

    // Fallback 4: Scrape h1 + price patterns
    if (products.length === 0) {
      const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]
      const pricePattern = html.match(/\$\s*(\d+(?:\.\d{2})?)/)?.[1]
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      if (h1 && h1.length < 80) {
        products.push({
          name: decodeHtml(h1.trim()),
          description: metaDesc ? decodeHtml(metaDesc).slice(0, 200) : null,
          price: pricePattern || null,
          image: null,
        })
      }
    }

    // ── Image scraping ──────────────────────────────────────────
    type ImageTagType = 'product' | 'lifestyle' | 'background' | 'logo' | 'press' | 'shopify' | 'other'
    type ScrapedImage = { url: string; tag: ImageTagType; score: number; alt: string | null }
    type RawImage = { url: string; alt: string | null; context: string; source: string; width?: number; height?: number }
    const imagePool: RawImage[] = []

    const resolveUrl = (src: string): string => {
      try { return new URL(src, normalizedUrl).href } catch { return src }
    }

    // Build a set of known product image URLs for cross-referencing
    const knownProductUrls = new Set<string>()
    for (const p of products) {
      if (p.image) {
        knownProductUrls.add(p.image)
        try { knownProductUrls.add(new URL(p.image).pathname) } catch {}
      }
    }

    // OG + meta images
    const twitterImgRaw = html.match(/<meta[^>]+(?:name|property)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)?.[1]
    const twitterImg = twitterImgRaw ? decodeHtml(twitterImgRaw) : null
    if (ogImage) imagePool.push({ url: ogImage, alt: null, context: 'meta', source: 'og' })
    if (twitterImg) imagePool.push({ url: resolveUrl(twitterImg), alt: null, context: 'meta', source: 'twitter' })

    // All <img> tags — extract alt text and surrounding context
    const noisePatterns = /favicon|sprite|pixel|1x1|badge|arrow|chevron|star|rating|_32x|_16x|thumb_small/i
    // Match full img tags including surrounding parent context (up to 300 chars before)
    const imgTagRegex = /<img[^>]+>/gi
    let imgMatch
    while ((imgMatch = imgTagRegex.exec(html)) !== null) {
      const tag = imgMatch[0]
      const srcRaw = tag.match(/src=["']([^"']+)["']/i)?.[1]
      if (!srcRaw || srcRaw.startsWith('data:')) continue
      const src = decodeHtml(srcRaw)
      if (noisePatterns.test(src)) continue
      if (/width=["']?1["']?|height=["']?1["']?/.test(tag)) continue

      const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1] || null
      const imgW = parseInt(tag.match(/width=["']?(\d+)/i)?.[1] || '0')
      const imgH = parseInt(tag.match(/height=["']?(\d+)/i)?.[1] || '0')
      // Grab ~500 chars before the img tag for parent context (class names, section ids, elements)
      const before = html.slice(Math.max(0, imgMatch.index - 500), imgMatch.index)
      const parentClasses = (before.match(/class=["']([^"']+)["']/gi) || []).join(' ').toLowerCase()
      const parentIds = (before.match(/id=["']([^"']+)["']/gi) || []).join(' ').toLowerCase()
      // Detect if in header/nav/footer
      const parentElements = (before.match(/<(header|nav|footer)\b/gi) || []).join(' ').toLowerCase()
      const context = parentClasses + ' ' + parentIds + ' ' + parentElements

      imagePool.push({ url: resolveUrl(src), alt, context, source: 'img-tag', width: imgW || undefined, height: imgH || undefined })
    }

    // Shopify product images.
    // IMPORTANT: only the FIRST image per product is treated as a true product shot
    // (source='shopify-product' → tag='shopify'). Additional images (variants,
    // lifestyle shots, packaging) are marked as 'shopify-product-variant' so they
    // fall through to the lifestyle bucket via rule 11.
    if (isShopify && products.length > 0) {
      for (const p of products) {
        // The primary p.image from the homepage scrape is always the first image
        if (p.image) imagePool.push({ url: p.image, alt: p.name, context: '', source: 'shopify-product' })
      }
      try {
        const baseUrl = normalizedUrl.replace(/\/+$/, '')
        const r = await fetch(`${baseUrl}/products.json?limit=6`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) })
        if (r.ok) {
          const d = await r.json()
          for (const p of (d?.products || [])) {
            const imgs = (p.images || []).slice(0, 3)
            imgs.forEach((img: { src?: string }, imgIdx: number) => {
              if (!img.src) return
              const imgUrl = img.src
              const isFirstImage = imgIdx === 0
              // Only add the first image to knownProductUrls. Otherwise rule 1a's
              // third clause (CDN + knownProductUrls) would promote variants back
              // to 'shopify'. Variants stay out of the known set so rule 11 can
              // demote them to 'lifestyle'.
              if (isFirstImage) {
                knownProductUrls.add(imgUrl)
                try { knownProductUrls.add(new URL(imgUrl).pathname) } catch {}
              }
              imagePool.push({
                url: imgUrl,
                alt: p.title || null,
                context: '',
                source: isFirstImage ? 'shopify-product' : 'shopify-product-variant',
              })
            })
          }
        }
      } catch {}
    }

    // JSON-LD images
    const ldBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    for (const block of ldBlocks) {
      try {
        const parsed = JSON.parse(block.replace(/<\/?script[^>]*>/gi, ''))
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          const isProduct = item['@type'] === 'Product'
          if (typeof item.image === 'string') {
            const u = resolveUrl(item.image)
            imagePool.push({ url: u, alt: item.name || null, context: '', source: isProduct ? 'jsonld-product' : 'jsonld' })
            if (isProduct) { knownProductUrls.add(u); try { knownProductUrls.add(new URL(u).pathname) } catch {} }
          }
          if (Array.isArray(item.image)) {
            for (const u of item.image) {
              if (typeof u === 'string') {
                const resolved = resolveUrl(u)
                imagePool.push({ url: resolved, alt: item.name || null, context: '', source: isProduct ? 'jsonld-product' : 'jsonld' })
                if (isProduct) { knownProductUrls.add(resolved); try { knownProductUrls.add(new URL(resolved).pathname) } catch {} }
              }
            }
          }
        }
      } catch {}
    }

    // CSS background images
    const bgImgUrls = new Set<string>()
    const bgImgs = allCSS.match(/url\(['"]?(https?:[^'")\s]+)['"]?\)/gi) || []
    for (const bg of bgImgs) {
      const u = bg.replace(/url\(['"]?/, '').replace(/['"]?\)/, '')
      if (/\.(jpg|jpeg|png|webp)/i.test(u)) {
        bgImgUrls.add(u)
        imagePool.push({ url: u, alt: null, context: 'css-bg', source: 'css-bg' })
      }
    }

    // Srcset — grab highest res
    const srcsets = html.match(/srcset=["']([^"']+)["']/gi) || []
    for (const ss of srcsets) {
      const val = ss.replace(/srcset=["']/, '').replace(/["']$/, '')
      const entries = val.split(',').map(s => s.trim())
      if (entries.length > 0) {
        const last = entries[entries.length - 1].split(/\s+/)[0]
        if (last && !last.startsWith('data:')) imagePool.push({ url: resolveUrl(last), alt: null, context: '', source: 'srcset' })
      }
    }

    // ── Deduplicate, score, and tag with context ──────────────────
    const seen = new Set<string>()
    const uniqueImages: ScrapedImage[] = []

    // Build URL frequency map — repeated images are likely decorative/brand assets
    const urlFrequency = new Map<string, number>()
    for (const raw of imagePool) {
      try {
        const p = new URL(raw.url).pathname
        urlFrequency.set(p, (urlFrequency.get(p) || 0) + 1)
      } catch {}
    }

    // Context patterns for smart tagging
    const pressContextPattern = /as-?seen|featured-?in|press|media|in-the-news|publications?|coverage/i
    const pressAltPattern = /\b(gq|vogue|forbes|bevnet|delish|trendhunter|cosmopolitan|esquire|wired|techcrunch|mashable|huffpost|buzzfeed|refinery29|allure|glamour|elle|nylon|bustle|popsugar|brit\+?co|the\s*quality\s*edit|rdr|women'?s\s*health|men'?s\s*health|self|shape|well\+?good|mindbodygreen|food\s*&?\s*wine|bon\s*app[eé]tit|eater|the\s*verge|fast\s*company|inc\b|entrepreneur)\b/i
    const pressUrlPattern = /\/press\/|\/media\/|\/as-seen|\/featured-in|\/publications?\//i
    const logoContextPattern = /logo|partner|brand-?logo|sponsor|trust|retailer|stockist/i
    const heroContextPattern = /hero|banner|jumbotron|slider|carousel|splash|masthead|above-?fold/i
    const testimonialContextPattern = /testimonial|review|ugc|user-generated|customer-?photo/i
    const productContextPattern = /product|shop|catalog|item|merch|collection/i

    // Product name keywords for alt text matching
    const productNames = products.map(p => p.name.toLowerCase()).filter(n => n.length > 2)

    for (const raw of imagePool) {
      if (!raw.url.startsWith('http')) continue
      let pathname: string
      try { pathname = new URL(raw.url).pathname } catch { pathname = raw.url }
      if (seen.has(pathname)) continue
      seen.add(pathname)

      const url = raw.url
      const altLower = (raw.alt || '').toLowerCase()
      const ctx = raw.context

      // ── Determine tag ──
      // Default to 'lifestyle' — most unclassified scraped content from brand websites
      // is lifestyle imagery, not genuinely unclassifiable. 'other' is reserved for
      // cases that fail every specific rule AND aren't lifestyle-appropriate.
      let tag: ImageTagType = 'lifestyle'

      // Pre-check: is this image likely a brand mark / logo?
      const freq = urlFrequency.get(pathname) || 0

      // STRONG logo signal — URL or alt text explicitly contains "logo" / "wordmark" /
      // "emblem". This beats EVERY other rule (including Shopify /products.json sources
      // and CDN fallbacks), because if a filename literally says "Saint_Spritz_Logo_Circle"
      // there's no ambiguity — it's a logo, even if Shopify's admin happens to list it
      // as a product thumbnail.
      const isLogoByName =
        /logo|wordmark|emblem/i.test(url) ||
        /logo|wordmark|emblem/i.test(altLower)

      // Diagnostic: log every image the scraper thinks is a logo so we can
      // verify the classifier is seeing the right URLs. Remove once settled.
      if (isLogoByName) {
        console.log(`[detect-website] isLogoByName=true  source=${raw.source}  url=${url.slice(0, 140)}`)
      }

      // WEAK logo signal — heuristic combo that's noisier. Still skipped for
      // known-product sources to avoid tagging legit product thumbnails as logos.
      const isBrandMarkHeuristic =
        /brand|icon|favicon|badge|symbol/i.test(url) ||
        (altLower && name && altLower.includes(name.toLowerCase()) && !/product|shop|buy|price/i.test(altLower)) ||
        (raw.width && raw.height && raw.width < 100 && raw.height < 100) ||
        (raw.width && raw.height && raw.height > 0 && raw.width / raw.height > 3) ||
        /header|nav|footer/i.test(ctx) ||
        freq >= 3

      // 0. Press/media logos — check BEFORE everything to prevent misclassification
      if (pressContextPattern.test(ctx) || pressUrlPattern.test(url) ||
          (altLower && pressAltPattern.test(altLower))) {
        tag = 'press'
      }
      // 0a. Strong logo signal — fires regardless of source. URL/alt with "logo"
      // is unambiguous and must win over Shopify product sources and CDN fallbacks.
      else if (isLogoByName) {
        tag = 'logo'
      }
      // 0b. Weak brand-mark heuristics — still respect the Shopify-product guard
      // so that legit product thumbnails don't get mistagged as logos.
      else if (isBrandMarkHeuristic && raw.source !== 'shopify-product' && raw.source !== 'jsonld-product') {
        tag = 'logo'
      }
      // 1a. Shopify product images (from products.json API or Shopify CDN in product context).
      // Matches cdn.shopify.com AND custom-domain Shopify stores that serve via
      // /cdn/shop/files/ (e.g. saintspritz.com/cdn/shop/files/...).
      else if (raw.source === 'shopify-product' ||
          (raw.source === 'jsonld-product' && /cdn\.shopify\.com|\/cdn\/shop\/files\//i.test(url)) ||
          ((/cdn\.shopify\.com\/s\/files/i.test(url) || /\/cdn\/shop\/files\//i.test(url)) && (knownProductUrls.has(url) || knownProductUrls.has(pathname)))) {
        tag = 'shopify'
      }
      // 1b. Other known product URLs (JSON-LD Product, etc.)
      else if (knownProductUrls.has(url) || knownProductUrls.has(pathname) ||
          raw.source === 'jsonld-product') {
        tag = 'product'
      }
      // Shopify CDN guard — Rules 2 and 4 over-tag lifestyle shots on Shopify
      // brands because editorial images live on the same CDN as product shots
      // and typically have alt text mentioning the product name and sit inside
      // DOM sections with class="product-grid" etc. For any image served from
      // cdn.shopify.com/s/files/ or /cdn/shop/files/ that isn't already a known
      // product SKU (rule 1a), let rule 11 catch it as lifestyle instead.
      // shopify-product-variant source is also explicitly excluded from rules 2
      // and 4 — these are extra images per product and belong in lifestyle.
      // 2. Alt text matches a detected product name
      else if (altLower && productNames.some(pn => altLower.includes(pn))
          && raw.source !== 'shopify-product-variant'
          && !/\/cdn\/shop\/files\//i.test(url)
          && !/cdn\.shopify\.com\/s\/files/i.test(url)) {
        tag = 'product'
      }
      // 3. URL path signals product catalog page.
      // Use pathname (not full URL) and require the segment to be at the start of
      // the path — otherwise Shopify's /cdn/shop/files/ asset path matches /shop/
      // and mis-tags every CDN-hosted image as a product.
      else if (/^\/(products?|collections?|catalog)\//i.test(pathname)
            || /^\/shop\//i.test(pathname)) {
        tag = 'product'
      }
      // 4. Context signals product (parent class/id)
      else if (productContextPattern.test(ctx) && !logoContextPattern.test(ctx)
          && raw.source !== 'shopify-product-variant'
          && !/\/cdn\/shop\/files\//i.test(url)
          && !/cdn\.shopify\.com\/s\/files/i.test(url)) {
        tag = 'product'
      }
      // 5. Logo detection — URL or context
      else if (/logo/i.test(url) || /logo/i.test(altLower) || logoContextPattern.test(ctx)) {
        tag = 'logo'
      }
      // 6. SVG images are usually logos/icons
      else if (/\.svg/i.test(url)) {
        tag = 'logo'
      }
      // 7. Hero/lifestyle — URL or context
      else if (/\/lifestyle|\/campaign|\/lookbook|\/editorial|\/hero|\/banner/i.test(url) || heroContextPattern.test(ctx)) {
        tag = 'lifestyle'
      }
      // 8. OG/Twitter images are usually lifestyle/hero shots
      else if (raw.source === 'og' || raw.source === 'twitter') {
        tag = 'lifestyle'
      }
      // 9. Testimonials/UGC
      else if (testimonialContextPattern.test(ctx) || testimonialContextPattern.test(altLower)) {
        tag = 'lifestyle'
      }
      // 10. CSS background images
      else if (bgImgUrls.has(url)) {
        tag = 'background'
      }
      // 11. Shopify CDN fallback — any image served from /cdn/shop/files/ or
      // cdn.shopify.com/s/files/ that wasn't caught by earlier rules. Tagged
      // as 'lifestyle' (not 'shopify') because page-HTML scrapes from the CDN
      // are typically editorial/banner content. True product shots from
      // /products.json are caught earlier by rule 1a (source='shopify-product').
      // Guard: never override a logo signal. Rule 0a (isLogoByName) already
      // catches logos first, but the explicit guard here documents the intent.
      else if (!isLogoByName && (/\/cdn\/shop\/files\//i.test(url) || /cdn\.shopify\.com\/s\/files/i.test(url))) {
        tag = 'lifestyle'
      }

      // ── Score ──
      let score = 0
      // Source-based bonuses
      if (raw.source === 'shopify-product' || raw.source === 'jsonld-product') score += 15
      if (/cdn\.shopify\.com/i.test(url)) score += 10
      // Tag-based scoring
      if (tag === 'shopify') score += 8
      if (tag === 'product') score += 5
      if (tag === 'lifestyle') score += 3
      if (tag === 'logo' || tag === 'press') score -= 10
      // Format bonuses
      if (/\.(jpg|jpeg|webp)/i.test(url)) score += 3
      if (raw.source === 'og' || raw.source === 'twitter') score += 2
      if (name && url.toLowerCase().includes(name.toLowerCase())) score += 1
      // Penalties
      if (/thumb|thumbnail|_small|_mini|32x|16x/i.test(url)) score -= 3
      if (/icon|badge|button/i.test(url) && tag !== 'logo') score -= 2

      uniqueImages.push({ url, tag, score, alt: raw.alt })
    }

    // Upgrade Shopify CDN URLs to full resolution
    for (const img of uniqueImages) {
      img.url = upgradeImageUrl(img.url)
    }

    const finalOgImage = ogImage ? upgradeImageUrl(ogImage) : null
    const finalLogo = logo ? upgradeImageUrl(logo) : null

    // Sort by score, products first, then lifestyle, then others. Exclude logos and press from main images.
    const contentImages = uniqueImages
      .filter(i => i.tag !== 'logo' && i.tag !== 'press')
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
    const logoImages = uniqueImages
      .filter(i => i.tag === 'logo')
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const pressImages = uniqueImages
      .filter(i => i.tag === 'press')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
    // Deduplicate final images array by URL
    const seenFinal = new Set<string>()
    const images = [...contentImages, ...logoImages, ...pressImages].filter(img => {
      if (seenFinal.has(img.url)) return false
      seenFinal.add(img.url)
      return true
    })

    // ── Business type detection ──────────────────────────────────
    type BusinessType = 'shopify' | 'ecommerce' | 'saas' | 'restaurant' | 'service' | 'brand'
    type DetectedOffering = {
      name: string
      description: string | null
      price: string | null
      image: string | null
      type: 'product' | 'plan' | 'service' | 'menu_item'
    }

    let businessType: BusinessType = 'brand'
    let offerings: DetectedOffering[] = []

    // 1. Shopify — already handled, products.json works
    if (platform === 'shopify' && products.length > 0) {
      businessType = 'shopify'
      offerings = products.map(p => ({
        name: p.name,
        description: p.description || null,
        price: p.price || null,
        image: p.image || null,
        type: 'product' as const,
      }))
    }

    // 2. Non-Shopify ecommerce — check JSON-LD schema
    if (businessType === 'brand') {
      const jsonLdMatches = Array.from(html.matchAll(
        /<script[^>]+type=["\']application\/ld\+json["\'][^>]*>([\s\S]*?)<\/script>/gi
      ))
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1])
          const items = Array.isArray(data) ? data : [data]
          for (const item of items) {
            if (item['@type'] === 'Product') {
              businessType = 'ecommerce'
              offerings.push({
                name: item.name || '',
                description: item.description || null,
                price: item.offers?.price ? `$${item.offers.price}` : null,
                image: item.image?.[0] || item.image || null,
                type: 'product',
              })
            }
            if (item['@type'] === 'ItemList') {
              const listItems = item.itemListElement || []
              for (const li of listItems) {
                if (li['@type'] === 'Product') {
                  businessType = 'ecommerce'
                  offerings.push({
                    name: li.name || '',
                    description: li.description || null,
                    price: null,
                    image: null,
                    type: 'product',
                  })
                }
              }
            }
          }
        } catch {}
      }
    }

    // 3. SaaS — check for pricing page signals
    if (businessType === 'brand') {
      const hasPricing =
        /\/pricing|\/plans|\/subscription/i.test(html) ||
        /pricing|per month|per year|billed annually|\$\d+\/mo/i.test(html)

      const planMatches = Array.from(html.matchAll(
        /<(?:div|section|article)[^>]*(?:class|id)=[^>]*(?:plan|tier|pricing)[^>]*>[\s\S]{0,500}?<\/(?:div|section|article)>/gi
      ))

      const plans: DetectedOffering[] = []
      for (const match of planMatches) {
        const planHtml = match[0]
        const nameMatch = planHtml.match(/<h[1-4][^>]*>([^<]{2,40})<\/h[1-4]>/i)
        const priceMatch = planHtml.match(/\$(\d+(?:\.\d{2})?)/)
        if (nameMatch) {
          plans.push({
            name: nameMatch[1].trim(),
            description: null,
            price: priceMatch ? `$${priceMatch[1]}/mo` : null,
            image: null,
            type: 'plan',
          })
        }
      }

      if (hasPricing || plans.length >= 2) {
        businessType = 'saas'
        offerings = plans.slice(0, 4)
      }
    }

    // 4. Restaurant — check for menu signals
    if (businessType === 'brand') {
      const hasMenu =
        /menu|appetizer|entree|entrée|dessert|cuisine|dish|restaurant/i.test(html)
      const hasFood =
        /breakfast|lunch|dinner|brunch|pizza|burger|sushi|tacos/i.test(html)

      if (hasMenu && hasFood) {
        businessType = 'restaurant'
        const menuItems = Array.from(html.matchAll(
          /<(?:li|div)[^>]*>([A-Z][^<]{5,50})<\/(?:li|div)>/g
        ))
        const items: DetectedOffering[] = []
        for (const match of menuItems) {
          const text = match[1].trim()
          if (text.length > 5 && text.length < 60 &&
              !/menu|home|about|contact/i.test(text)) {
            items.push({
              name: text,
              description: null,
              price: null,
              image: null,
              type: 'menu_item',
            })
          }
        }
        offerings = items.slice(0, 6)
      }
    }

    // 5. Service business
    if (businessType === 'brand') {
      const serviceKeywords =
        /services|consulting|agency|coaching|therapy|legal|accounting|design|photography|real estate/i

      if (serviceKeywords.test(html)) {
        businessType = 'service'
        const serviceMatches = Array.from(html.matchAll(
          /<h[2-4][^>]*>([^<]{5,60})<\/h[2-4]>/gi
        ))
        const services: DetectedOffering[] = []
        for (const match of serviceMatches) {
          const text = match[1].trim()
          if (!/(home|about|contact|blog|news|faq)/i.test(text) &&
              text.length > 5) {
            services.push({
              name: text,
              description: null,
              price: null,
              image: null,
              type: 'service',
            })
          }
        }
        offerings = services.slice(0, 4)
      }
    }

    return NextResponse.json({ name, colors, allColors, font, fontTransform, letterSpacing, ogImage: finalOgImage, logo: finalLogo, platform, products, images, businessType, offerings })
  } catch (e) {
    console.error('[detect-website] outer catch:', e)
    return NextResponse.json({ name: null, colors: [], font: null, fontTransform: 'none', letterSpacing: 'normal', ogImage: null, logo: null, platform: 'other', products: [], images: [] })
  }
}
