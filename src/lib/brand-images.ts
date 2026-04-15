import { type BrandImage } from '@/types'

export type BusinessType = 'shopify' | 'ecommerce' | 'saas' | 'restaurant' | 'service' | 'brand' | string | null | undefined

/** Logo images — brand marks, not usable for creative templates */
export function getLogoImages(images: BrandImage[]): BrandImage[] {
  return images.filter(img => img.tag === 'logo')
}

/** Press / "as seen in" logos — not usable for creative templates */
export function getPressImages(images: BrandImage[]): BrandImage[] {
  return images.filter(img => img.tag === 'press')
}

/** AI-generated images — kept in their own bucket so the picker can show them separately */
export function getGeneratedImages(images: BrandImage[]): BrandImage[] {
  return images.filter(img => img.tag === 'generated')
}

/** Every image that can appear inside an ad/email template — excludes logos, press, and generated */
export function getContentImages(images: BrandImage[]): BrandImage[] {
  return images.filter(img => img.tag !== 'logo' && img.tag !== 'press' && img.tag !== 'generated')
}

/**
 * Smart bucketing — single source of truth for splitting a brand's images
 * into "Product" and "Lifestyle" sections. Behavior depends on business_type:
 *
 * Shopify brands:
 *   productImages    = tag === 'shopify'   (from /products.json — true product shots)
 *   lifestyleImages  = tag in lifestyle | product | background
 *
 * Non-Shopify brands:
 *   productImages    = tag === 'product'   (white-bg detected / URL-pattern matched)
 *   lifestyleImages  = tag in lifestyle | background
 *
 * Additional rule: if productImages is empty, the caller should collapse the
 * sections into a single combined list. This helper returns a third field,
 * `shouldCollapse`, signalling that intent. Consumers that render two
 * sections can hide the Product section and show only Lifestyle (populated
 * with all content images) when this is true.
 */
// Lifestyle bucket ranking: lower index = higher quality for hero/editorial use.
// "other" is the catch-all for images the scraper couldn't classify — always last.
const LIFESTYLE_TAG_RANK: Record<string, number> = {
  lifestyle: 0,
  ugc: 1,
  seasonal: 2,
  background: 3,
  product: 4,
  shopify: 5,
  other: 99,
}

function rankLifestyle(a: BrandImage, b: BrandImage): number {
  const ra = LIFESTYLE_TAG_RANK[a.tag ?? 'other'] ?? 50
  const rb = LIFESTYLE_TAG_RANK[b.tag ?? 'other'] ?? 50
  return ra - rb
}

export function bucketBrandImages(
  images: BrandImage[],
  businessType: BusinessType
): {
  productImages: BrandImage[]
  lifestyleImages: BrandImage[]
  shouldCollapse: boolean
} {
  const isShopify = businessType === 'shopify'
  const content = getContentImages(images)

  let productImages: BrandImage[]
  let lifestyleImages: BrandImage[]

  if (isShopify) {
    productImages = content.filter(img => img.tag === 'shopify')
    lifestyleImages = content.filter(img =>
      img.tag === 'lifestyle' || img.tag === 'product' || img.tag === 'background' || img.tag === 'ugc' || img.tag === 'seasonal' || img.tag === 'other'
    )
  } else {
    productImages = content.filter(img => img.tag === 'product')
    lifestyleImages = content.filter(img =>
      img.tag === 'lifestyle' || img.tag === 'background' || img.tag === 'ugc' || img.tag === 'seasonal' || img.tag === 'other'
    )
  }

  // Rank lifestyle bucket so the "best" image for hero/editorial slots wins.
  lifestyleImages = [...lifestyleImages].sort(rankLifestyle)

  const shouldCollapse = productImages.length === 0

  // When collapsing, the single visible section is the full content pool so
  // nothing is hidden from the user. Also ranked.
  const collapsedLifestyle = shouldCollapse
    ? [...content].sort(rankLifestyle)
    : lifestyleImages

  return {
    productImages,
    lifestyleImages: collapsedLifestyle,
    shouldCollapse,
  }
}

/**
 * Pick the best hero + product images for an email / landing slot. Mirrors
 * the selection rules the Creative Studio uses per template:
 *   1. Bucket + tag-rank (lifestyle first, "other" last)
 *   2. Orientation preference (landscape-first for hero, then square, portrait)
 *   3. Never reuse an image already taken for another slot
 *
 * Returns BrandImage objects so callers can still access width/height/tag.
 */
export function pickSlotImages(
  images: BrandImage[],
  businessType: BusinessType,
  slots: Array<'hero' | 'product' | 'lifestyle'> = ['hero', 'product']
): BrandImage[] {
  const { productImages, lifestyleImages } = bucketBrandImages(images, businessType)

  const isLandscape = (i: BrandImage) => !!(i.width && i.height && i.width > i.height * 1.2)
  const isPortrait  = (i: BrandImage) => !!(i.width && i.height && i.height > i.width * 1.2)
  const isSquare    = (i: BrandImage) => !!(i.width && i.height && !isLandscape(i) && !isPortrait(i))

  // Per-slot preference: pool order and orientation priority
  const preferences: Record<'hero' | 'product' | 'lifestyle', {
    pools: BrandImage[][]
    orientations: Array<(i: BrandImage) => boolean>
  }> = {
    hero: {
      pools: [lifestyleImages, productImages],
      orientations: [isLandscape, isSquare, isPortrait],
    },
    product: {
      pools: [productImages, lifestyleImages],
      orientations: [isSquare, isPortrait, isLandscape],
    },
    lifestyle: {
      pools: [lifestyleImages, productImages],
      orientations: [isLandscape, isSquare, isPortrait],
    },
  }

  const used = new Set<string>()
  const picked: BrandImage[] = []

  for (const slot of slots) {
    const pref = preferences[slot]
    let found: BrandImage | undefined

    // Walk orientations → pools, returning the first unused match
    for (const matchesOrientation of pref.orientations) {
      if (found) break
      for (const pool of pref.pools) {
        const match = pool.find(img => !used.has(img.id) && matchesOrientation(img))
        if (match) { found = match; break }
      }
    }

    // Relax orientation — any unused image from the preferred pools
    if (!found) {
      for (const pool of pref.pools) {
        const match = pool.find(img => !used.has(img.id))
        if (match) { found = match; break }
      }
    }

    // Final fallback — reuse the first available (may repeat)
    if (!found) {
      found = pref.pools.flat()[0]
    }

    if (found) {
      used.add(found.id)
      picked.push(found)
    }
  }

  return picked
}

/**
 * Extract `business_type` from a brand's `notes` JSON field. Handles both
 * already-parsed objects and the raw JSON-string form the DB typically holds.
 */
export function getBusinessType(brand: { notes?: string | null } | null | undefined): BusinessType {
  if (!brand?.notes) return null
  try {
    const parsed = typeof brand.notes === 'string' ? JSON.parse(brand.notes) : brand.notes
    return parsed?.business_type ?? null
  } catch {
    return null
  }
}
