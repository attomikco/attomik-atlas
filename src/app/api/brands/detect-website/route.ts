import { NextRequest, NextResponse } from 'next/server'
import { decodeHtml } from '@/lib/decodeHtml'

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
    const colorCounts = new Map<string, number>()

    // Extract all style content
    const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
    const inlineStyles = html.match(/style=["']([^"']+)["']/gi) || []
    const allCSS = [...styleBlocks, ...inlineStyles].join(' ')

    // Find hex colors
    const hexMatches = allCSS.match(/#[0-9a-fA-F]{3,8}/g) || []
    for (const raw of hexMatches) {
      let hex = raw.toLowerCase()
      // Expand 3-char to 6-char
      if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
      if (hex.length !== 7) continue

      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)

      // Skip whites
      if (r > 240 && g > 240 && b > 240) continue
      // Skip blacks
      if (r < 35 && g < 35 && b < 35) continue
      // Skip grays (r≈g≈b within 20)
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) continue

      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }

    // Check CSS custom properties
    const cssVarPatterns = ['--primary', '--color-primary', '--brand-color', '--accent', '--secondary', '--color-accent', '--color-secondary']
    for (const varName of cssVarPatterns) {
      const match = allCSS.match(new RegExp(`${varName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*(#[0-9a-fA-F]{3,8})`, 'i'))
      if (match) {
        let hex = match[1].toLowerCase()
        if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
        if (hex.length === 7) colorCounts.set(hex, (colorCounts.get(hex) || 0) + 100) // boost CSS var colors
      }
    }

    const colors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hex]) => hex)

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
    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      || null

    // ── Logo ────────────────────────────────────────────────────────
    let logo: string | null = null
    if (ogImage && /logo/i.test(ogImage)) {
      logo = ogImage
    }
    if (!logo) {
      const logoImg = html.match(/<img[^>]+(?:src|alt)=["'][^"']*logo[^"']*["'][^>]*>/i)
      if (logoImg) {
        const srcMatch = logoImg[0].match(/src=["']([^"']+)["']/i)
        if (srcMatch) {
          logo = srcMatch[1]
          // Resolve relative URLs
          if (logo.startsWith('/')) {
            try {
              const u = new URL(normalizedUrl)
              logo = u.origin + logo
            } catch {}
          }
        }
      }
    }

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
              image: p.images?.[0]?.src || null,
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
              image: p.images?.[0]?.src || null,
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
    type ScrapedImage = { url: string; tag: 'product' | 'lifestyle' | 'background' | 'other'; score: number }
    const imagePool: string[] = []

    const resolveUrl = (src: string): string => {
      try { return new URL(src, normalizedUrl).href } catch { return src }
    }

    // OG + meta images
    if (ogImage) imagePool.push(ogImage)
    const twitterImg = html.match(/<meta[^>]+(?:name|property)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)?.[1]
    if (twitterImg) imagePool.push(resolveUrl(twitterImg))

    // All <img> tags
    const imgTags = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*/gi) || []
    const noisePatterns = /icon|favicon|sprite|pixel|1x1|badge|arrow|chevron|star|rating|_32x|_16x|thumb_small|\.svg/i
    for (const tag of imgTags) {
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1]
      if (!src || src.startsWith('data:')) continue
      if (noisePatterns.test(src) && !/logo/i.test(src)) continue
      if (/width=["']?1["']?|height=["']?1["']?/.test(tag)) continue
      imagePool.push(resolveUrl(src))
    }

    // Shopify product images (all images, not just first)
    if (isShopify && products.length > 0) {
      for (const p of products) {
        if (p.image) imagePool.push(p.image)
      }
      // Try to get more from products.json raw data
      try {
        const baseUrl = normalizedUrl.replace(/\/+$/, '')
        const r = await fetch(`${baseUrl}/products.json?limit=6`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) })
        if (r.ok) {
          const d = await r.json()
          for (const p of (d?.products || [])) {
            for (const img of (p.images || []).slice(0, 3)) {
              if (img.src) imagePool.push(img.src)
            }
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
          if (typeof item.image === 'string') imagePool.push(resolveUrl(item.image))
          if (Array.isArray(item.image)) item.image.forEach((u: string) => typeof u === 'string' && imagePool.push(resolveUrl(u)))
        }
      } catch {}
    }

    // CSS background images
    const bgImgs = allCSS.match(/url\(['"]?(https?:[^'")\s]+)['"]?\)/gi) || []
    for (const bg of bgImgs) {
      const u = bg.replace(/url\(['"]?/, '').replace(/['"]?\)/, '')
      if (/\.(jpg|jpeg|png|webp)/i.test(u)) imagePool.push(u)
    }

    // Srcset — grab highest res
    const srcsets = html.match(/srcset=["']([^"']+)["']/gi) || []
    for (const ss of srcsets) {
      const val = ss.replace(/srcset=["']/, '').replace(/["']$/, '')
      const entries = val.split(',').map(s => s.trim())
      if (entries.length > 0) {
        const last = entries[entries.length - 1].split(/\s+/)[0]
        if (last && !last.startsWith('data:')) imagePool.push(resolveUrl(last))
      }
    }

    // Deduplicate + score
    const seen = new Set<string>()
    const uniqueImages: ScrapedImage[] = []
    for (const url of imagePool) {
      if (!url.startsWith('http')) continue
      let pathname: string
      try { pathname = new URL(url).pathname } catch { pathname = url }
      if (seen.has(pathname)) continue
      seen.add(pathname)

      let score = 0
      if (/\/products?\/|\/shop\/|\/catalog\//i.test(url)) score += 3
      if (/\.(jpg|jpeg|webp)/i.test(url)) score += 3
      if (url === ogImage || url === twitterImg) score += 2
      if (/\/lifestyle|\/campaign|\/hero|\/banner/i.test(url)) score += 2
      if (name && url.toLowerCase().includes(name.toLowerCase())) score += 1
      if (/\/icon|\/logo|\/badge|\/button/i.test(url)) score -= 2
      if (/thumb|thumbnail|_small|_mini|32x|16x/i.test(url)) score -= 3

      let tag: ScrapedImage['tag'] = 'other'
      if (/\/products?\/|\/shop\/|\/catalog\//i.test(url)) tag = 'product'
      else if (/\/lifestyle|\/campaign|\/lookbook|\/editorial|\/hero|\/banner/i.test(url)) tag = 'lifestyle'
      else if (bgImgs.some(b => b.includes(url))) tag = 'background'

      uniqueImages.push({ url, tag, score })
    }

    const images = uniqueImages.sort((a, b) => b.score - a.score).slice(0, 12)

    return NextResponse.json({ name, colors, font, fontTransform, letterSpacing, ogImage, logo, platform, products, images })
  } catch (e) {
    console.error('[detect-website] outer catch:', e)
    return NextResponse.json({ name: null, colors: [], font: null, fontTransform: 'none', letterSpacing: 'normal', ogImage: null, logo: null, platform: 'other', products: [], images: [] })
  }
}
