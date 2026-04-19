import type { BrandImage } from '@/types'
import { bucketBrandImages, getContentImages, type BusinessType } from './brand-images'

// Dimension floor for Preview creative slots. 76x137 icon artefacts and
// other undersized scrapes would blow out layout in 1080x1350/1080x1920
// creative templates. Rows with null width/height are NOT filtered — we
// don't penalize legacy uploads that lack dimension metadata.
const PREVIEW_MIN_DIMENSION = 400

/**
 * Build an ordered image list for the Preview's creative slots, prioritizing
 * lifestyle imagery.
 *
 * Ordering: [all lifestyle] → [all product] → [other content]. Within each
 * tier, order follows bucketBrandImages' lifestyle rank (lifestyle > ugc >
 * seasonal > background > product > shopify > other). Deduped by id.
 *
 * When slotCount exceeds the pool size, slots cycle from the start of the
 * pool — the carousel repeats rather than going empty.
 *
 * This is Preview-specific. Landing and email keep using pickSlotImages
 * from brand-images.ts: those surfaces render 1-3 images each in distinct
 * roles, where orientation-per-slot matters more than tier-ordering.
 */
export function buildPreviewImageSlots(
  brandImages: BrandImage[],
  businessType: BusinessType,
  slotCount: number
): BrandImage[] {
  if (slotCount <= 0) return []

  const filtered = brandImages.filter(img => {
    if (img.width != null && img.width < PREVIEW_MIN_DIMENSION) return false
    if (img.height != null && img.height < PREVIEW_MIN_DIMENSION) return false
    return true
  })

  const { lifestyleImages, productImages } = bucketBrandImages(filtered, businessType)
  const content = getContentImages(filtered)
  const bucketIds = new Set<string>()
  for (const img of lifestyleImages) bucketIds.add(img.id)
  for (const img of productImages) bucketIds.add(img.id)
  const otherImages = content.filter(img => !bucketIds.has(img.id))

  // Dedupe as we build the pool — bucketBrandImages folds some tags into
  // lifestyle that might also show up in product depending on tag, so this
  // guards against the same row appearing twice.
  const seen = new Set<string>()
  const pool: BrandImage[] = []
  for (const img of [...lifestyleImages, ...productImages, ...otherImages]) {
    if (seen.has(img.id)) continue
    seen.add(img.id)
    pool.push(img)
  }

  if (pool.length === 0) return []
  return Array.from({ length: slotCount }, (_, i) => pool[i % pool.length])
}

/**
 * Build an ordered pool with lifestyle first, product second, other last.
 * Lifestyle sets the emotional tone for a creative and is the default pick
 * downstream — product shots come after as fallback.
 */
export function buildOrderedImagePool(
  lifestyle: BrandImage[],
  product: BrandImage[],
  other: BrandImage[]
): BrandImage[] {
  return [...lifestyle, ...product, ...other]
}

/** Split images by orientation. Square = within 15% of each other on w/h. */
export function filterByOrientation(images: BrandImage[]): {
  portraits: BrandImage[]
  landscapes: BrandImage[]
  squares: BrandImage[]
} {
  const portraits = images.filter(img => img.width && img.height && img.height > img.width)
  const landscapes = images.filter(img => img.width && img.height && img.width > img.height)
  const squares = images.filter(img =>
    img.width && img.height && Math.abs(img.width - img.height) < img.width * 0.15
  )
  return { portraits, landscapes, squares }
}

function randomFrom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)] ?? null
}

export type ImagePools = {
  lifestyleImages: BrandImage[]
  productImages: BrandImage[]
  otherImages: BrandImage[]
}

/**
 * Pick the best image for a template by orientation, with a first-of-ordered
 * fallback when the preferred orientation isn't available.
 *
 * - overlay / stat → random square
 * - split → random portrait
 * - ugc / testimonial → random landscape
 * - grid / default → first of ordered pool
 */
export function pickImageForTemplate(
  templateId: string,
  pools: ImagePools
): BrandImage | null {
  const ordered = buildOrderedImagePool(pools.lifestyleImages, pools.productImages, pools.otherImages)
  if (ordered.length === 0) return null
  const { portraits, landscapes, squares } = filterByOrientation(ordered)
  const firstOrdered = ordered[0] ?? null

  switch (templateId) {
    case 'overlay':
    case 'stat':
      return squares.length > 0 ? randomFrom(squares) : firstOrdered
    case 'split':
      return portraits.length > 0 ? randomFrom(portraits) : firstOrdered
    case 'ugc':
    case 'testimonial':
      return landscapes.length > 0 ? randomFrom(landscapes) : firstOrdered
    case 'grid':
      return firstOrdered
    default:
      return firstOrdered
  }
}

/**
 * Pick a secondary image for templates that pair two (Grid). Prefers a product
 * image that isn't the hero; falls back to any non-excluded image.
 */
export function pickSecondImage(
  excludeId: string | null,
  allImages: BrandImage[],
  productImages: BrandImage[]
): BrandImage | null {
  const productPool = productImages.filter(img => img.id !== excludeId)
  if (productPool.length > 0) return productPool[0] ?? null
  if (allImages.length < 2) {
    return allImages.find(img => img.id === excludeId) ?? null
  }
  const others = allImages.filter(img => img.id !== excludeId)
  const picked = randomFrom(others)
  if (picked) return picked
  return allImages.find(img => img.id === excludeId) ?? null
}
