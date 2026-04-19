import type { BrandImage } from '@/types'

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
