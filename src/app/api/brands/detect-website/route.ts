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
          if (logo.startsWith('/')) {
            try { logo = new URL(logo, normalizedUrl).href } catch {}
          }
        }
      }
    }
    // Look for img in header/nav area
    if (!logo) {
      const navLogoImg = html.match(/<(?:header|nav)[^>]*>[\s\S]{0,2000}?<img[^>]+src=["']([^"']+)["'][^>]*>/i)
      if (navLogoImg?.[1]) {
        const src = navLogoImg[1]
        if (!src.includes('icon') && !src.includes('favicon')) {
          try { logo = new URL(src, normalizedUrl).href } catch {}
        }
      }
    }
    // Check for SVG logo link
    if (!logo) {
      const svgLogoLink = html.match(/href=["']([^"']*\.svg[^"']*)["'][^>]*(?:logo|brand)/i)
      if (svgLogoLink?.[1]) {
        try { logo = new URL(svgLogoLink[1], normalizedUrl).href } catch {}
      }
    }
    // og:image as last resort if it looks like a logo
    if (!logo && ogImage) {
      if (/logo|brand|mark/i.test(ogImage) || /200x200|400x400/i.test(ogImage)) logo = ogImage
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
    type ImageTagType = 'product' | 'lifestyle' | 'background' | 'logo' | 'other'
    type ScrapedImage = { url: string; tag: ImageTagType; score: number; alt: string | null }
    type RawImage = { url: string; alt: string | null; context: string; source: string }
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
    const twitterImg = html.match(/<meta[^>]+(?:name|property)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)?.[1]
    if (ogImage) imagePool.push({ url: ogImage, alt: null, context: 'meta', source: 'og' })
    if (twitterImg) imagePool.push({ url: resolveUrl(twitterImg), alt: null, context: 'meta', source: 'twitter' })

    // All <img> tags — extract alt text and surrounding context
    const noisePatterns = /favicon|sprite|pixel|1x1|badge|arrow|chevron|star|rating|_32x|_16x|thumb_small/i
    // Match full img tags including surrounding parent context (up to 300 chars before)
    const imgTagRegex = /<img[^>]+>/gi
    let imgMatch
    while ((imgMatch = imgTagRegex.exec(html)) !== null) {
      const tag = imgMatch[0]
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1]
      if (!src || src.startsWith('data:')) continue
      if (noisePatterns.test(src)) continue
      if (/width=["']?1["']?|height=["']?1["']?/.test(tag)) continue

      const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1] || null
      // Grab ~300 chars before the img tag for parent context (class names, section ids)
      const before = html.slice(Math.max(0, imgMatch.index - 300), imgMatch.index)
      const parentClasses = (before.match(/class=["']([^"']+)["']/gi) || []).join(' ').toLowerCase()
      const parentIds = (before.match(/id=["']([^"']+)["']/gi) || []).join(' ').toLowerCase()
      const context = parentClasses + ' ' + parentIds

      imagePool.push({ url: resolveUrl(src), alt, context, source: 'img-tag' })
    }

    // Shopify product images (all images, not just first)
    if (isShopify && products.length > 0) {
      for (const p of products) {
        if (p.image) imagePool.push({ url: p.image, alt: p.name, context: '', source: 'shopify-product' })
      }
      try {
        const baseUrl = normalizedUrl.replace(/\/+$/, '')
        const r = await fetch(`${baseUrl}/products.json?limit=6`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) })
        if (r.ok) {
          const d = await r.json()
          for (const p of (d?.products || [])) {
            for (const img of (p.images || []).slice(0, 3)) {
              if (img.src) {
                const imgUrl = img.src
                knownProductUrls.add(imgUrl)
                try { knownProductUrls.add(new URL(imgUrl).pathname) } catch {}
                imagePool.push({ url: imgUrl, alt: p.title || null, context: '', source: 'shopify-product' })
              }
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

    // Context patterns for smart tagging
    const logoContextPattern = /logo|partner|brand-?logo|sponsor|trust|retailer|stockist|as-seen|featured-?in|press/i
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
      let tag: ImageTagType = 'other'

      // 1. Known product URL (from products.json, JSON-LD Product, etc.)
      if (knownProductUrls.has(url) || knownProductUrls.has(pathname) ||
          raw.source === 'shopify-product' || raw.source === 'jsonld-product') {
        tag = 'product'
      }
      // 2. Alt text matches a detected product name
      else if (altLower && productNames.some(pn => altLower.includes(pn))) {
        tag = 'product'
      }
      // 3. URL path signals product
      else if (/\/products?\/|\/shop\/|\/catalog\//i.test(url)) {
        tag = 'product'
      }
      // 4. Context signals product (parent class/id)
      else if (productContextPattern.test(ctx) && !logoContextPattern.test(ctx)) {
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

      // ── Score ──
      let score = 0
      if (tag === 'product') score += 5
      if (tag === 'lifestyle') score += 3
      if (/\.(jpg|jpeg|webp)/i.test(url)) score += 3
      if (raw.source === 'og' || raw.source === 'twitter') score += 2
      if (name && url.toLowerCase().includes(name.toLowerCase())) score += 1
      if (tag === 'logo') score -= 3
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

    // Sort by score, products first, then lifestyle, then others. Exclude logos from main images.
    const contentImages = uniqueImages
      .filter(i => i.tag !== 'logo')
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
    const logoImages = uniqueImages
      .filter(i => i.tag === 'logo')
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const images = [...contentImages, ...logoImages]

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

    return NextResponse.json({ name, colors, font, fontTransform, letterSpacing, ogImage: finalOgImage, logo: finalLogo, platform, products, images, businessType, offerings })
  } catch (e) {
    console.error('[detect-website] outer catch:', e)
    return NextResponse.json({ name: null, colors: [], font: null, fontTransform: 'none', letterSpacing: 'normal', ogImage: null, logo: null, platform: 'other', products: [], images: [] })
  }
}
