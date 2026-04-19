import { decodeHtml } from '../helpers/decodeHtml'
import type { ClassifiedImage, ImageTagType, Product } from '../types'

type RawImage = { url: string; alt: string | null; context: string; source: string; width?: number; height?: number }

// Pure image classifier. All HTTP fetches done upstream — `shopifyJson` is the
// pre-fetched /products.json body (for variant images); `bgImgUrls` is the set
// of CSS background-image URLs already parsed from the CSS.
export function classifyImages(
  html: string,
  normalizedUrl: string,
  products: Product[],
  name: string | null,
  bgImgUrls: Set<string>,
  ogImage: string | null,
  shopifyJson: unknown | null,
): ClassifiedImage[] {
  const platformIsShopify = !!shopifyJson

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
  if (platformIsShopify && products.length > 0) {
    for (const p of products) {
      // The primary p.image from the homepage scrape is always the first image
      if (p.image) imagePool.push({ url: p.image, alt: p.name, context: '', source: 'shopify-product' })
    }
    const d = shopifyJson as { products?: Array<{ title?: string; images?: Array<{ src?: string }> }> } | null
    if (d?.products) {
      for (const p of d.products) {
        const imgs = (p.images || []).slice(0, 3)
        imgs.forEach((img, imgIdx: number) => {
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

  // CSS background images (already parsed by caller into `bgImgUrls`).
  for (const u of bgImgUrls) {
    imagePool.push({ url: u, alt: null, context: 'css-bg', source: 'css-bg' })
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
  const uniqueImages: ClassifiedImage[] = []

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
    // Brandpoof fix — Atlas regex picks up srcset attribute fragments as URLs; port back upstream
    if (/srcset|%22/i.test(raw.url)) continue
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

  return uniqueImages
}
