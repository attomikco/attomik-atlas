import {
  DEFAULT_USER_AGENT,
  fetchExternalCss,
  fetchHtml,
  fetchShopifyProducts,
  fetchWooCommerceProducts,
} from './fetch'
import { normalizeUrl, upgradeImageUrl } from './helpers/url'
import { extractName } from './extractors/name'
import { extractColors } from './extractors/colors'
import { extractFonts } from './extractors/fonts'
import { extractOgImage } from './extractors/ogImage'
import { extractLogo } from './extractors/logo'
import { detectPlatform } from './extractors/platform'
import { extractProducts } from './extractors/products'
import { classifyImages } from './extractors/images'
import { detectBusinessType } from './extractors/businessType'
import type { RawScanResult } from './types'

export type { RawScanResult } from './types'
export type {
  Platform,
  Product,
  ClassifiedImage,
  ImageTagType,
  BusinessType,
  Offering,
  OfferingType,
  FontTransform,
  LetterSpacing,
} from './types'

export interface ScanOptions {
  timeoutMs?: number          // default 12000
  fetchExternalCss?: boolean  // default true
  maxCssFiles?: number        // default 2
  maxCssBytes?: number        // default 50000
  userAgent?: string          // default Chrome UA
}

const DEGRADED: RawScanResult = {
  name: null,
  colors: [],
  allColors: [],
  font: null,
  fontTransform: 'none',
  letterSpacing: 'normal',
  ogImage: null,
  logo: null,
  platform: 'other',
  products: [],
  images: [],
  businessType: 'brand',
  offerings: [],
}

export async function scanUrl(url: string, opts: ScanOptions = {}): Promise<RawScanResult> {
  const {
    timeoutMs = 12000,
    fetchExternalCss: shouldFetchCss = true,
    maxCssFiles = 2,
    maxCssBytes = 50000,
    userAgent = DEFAULT_USER_AGENT,
  } = opts

  try {
    if (!url) return { ...DEGRADED }
    const normalizedUrl = normalizeUrl(url)

    let html: string
    try {
      html = await fetchHtml(normalizedUrl, { timeoutMs, userAgent })
    } catch (e) {
      console.error('[scanner] fetch failed:', e)
      return { ...DEGRADED }
    }

    const name = extractName(html)

    const externalCss = shouldFetchCss
      ? await fetchExternalCss(html, normalizedUrl, { maxFiles: maxCssFiles, maxBytes: maxCssBytes })
      : []

    const { colors, allColors } = extractColors(html, externalCss)
    const { family: font, transform: fontTransform, letterSpacing } = extractFonts(html, externalCss, name)
    const ogImageRaw = extractOgImage(html)
    const logoRaw = extractLogo(html, normalizedUrl, ogImageRaw)
    const platform = detectPlatform(html)

    // Product cascade — Shopify JSON first, then html fallbacks, then Woo fetch.
    const shopifyJson = platform === 'shopify' ? await fetchShopifyProducts(normalizedUrl) : null
    let products = extractProducts(html, normalizedUrl, platform, shopifyJson, null, name)
    if (products.length === 0) {
      const wooJson = await fetchWooCommerceProducts(normalizedUrl)
      if (wooJson) {
        products = extractProducts(html, normalizedUrl, platform, shopifyJson, wooJson, name)
      }
    }

    // bgImgUrls — used both to add css-bg entries to image pool and to tag 'background'.
    const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
    const allCSS = [...styleBlocks, ...externalCss].join(' ')
    const bgImgUrls = new Set<string>()
    const bgImgs = allCSS.match(/url\(['"]?(https?:[^'")\s]+)['"]?\)/gi) || []
    for (const bg of bgImgs) {
      const u = bg.replace(/url\(['"]?/, '').replace(/['"]?\)/, '')
      if (/\.(jpg|jpeg|png|webp)/i.test(u)) bgImgUrls.add(u)
    }

    const rawImages = classifyImages(html, normalizedUrl, products, name, bgImgUrls, ogImageRaw, shopifyJson)

    // Upgrade Shopify CDN URLs to full resolution
    for (const img of rawImages) {
      img.url = upgradeImageUrl(img.url)
    }

    const ogImage = ogImageRaw ? upgradeImageUrl(ogImageRaw) : null
    let logo = logoRaw ? upgradeImageUrl(logoRaw) : null

    // Brandpoof fix — Atlas logo extractor misses JSON-LD logos; fallback uses image classifier output. Port back upstream.
    if (!logo) {
      const logoCandidates = rawImages
        .filter(i => i.tag === 'logo' && i.score >= -15)
      const nameLower = (name || '').toLowerCase()
      const rank = (alt: string | null, url: string): number => {
        const a = (alt || '').toLowerCase()
        let r = 0
        if (nameLower && a === nameLower) r += 100
        else if (nameLower && a.includes(nameLower)) r += 50
        if (/\.png(\?|$)/i.test(url) || /\.svg(\?|$)/i.test(url)) r += 10
        return r
      }
      const best = logoCandidates
        .map(c => ({ c, r: rank(c.alt, c.url) }))
        .sort((a, b) => b.r - a.r)[0]?.c
      if (best) logo = best.url
    }

    // Sort by score, products first, then lifestyle, then others. Exclude logos and press from main images.
    const contentImages = rawImages
      .filter(i => i.tag !== 'logo' && i.tag !== 'press')
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
    const logoImages = rawImages
      .filter(i => i.tag === 'logo')
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
    const pressImages = rawImages
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

    const { businessType, offerings } = detectBusinessType(html, platform, products)

    return {
      name,
      colors,
      allColors,
      font,
      fontTransform,
      letterSpacing,
      ogImage,
      logo,
      platform,
      products,
      images,
      businessType,
      offerings,
    }
  } catch (e) {
    console.error('[scanner] outer catch:', e)
    return { ...DEGRADED }
  }
}
