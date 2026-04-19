import type { BrandImage } from '@/types'

// Images smaller than this on either axis are unusable for ad templates.
// Applied unconditionally at the top of pickImageForTemplate. Matches the
// threshold PreviewClient uses for its vision-aware picker.
const MIN_USABLE_DIMENSION = 400

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
 * Pick the best image for a template.
 *
 * Vision-aware branch (when `angle` is provided AND any image in the pools
 * has vision_tags populated): rank images by whether the angle appears in
 * vision_tags.suitable_for, then by composition_quality desc. The
 * orientation rules below are skipped — the vision model's judgment
 * dominates. Images with vision_tags.scene_type === 'logo' are excluded.
 *
 * Legacy branch (no angle provided OR no image has vision_tags): the
 * original orientation-per-template behavior — overlay/stat → random
 * square, split → random portrait, ugc/testimonial → random landscape,
 * grid/default → first of ordered pool.
 *
 * Applies a 400x400 minimum-dimension filter up front in both branches.
 * Images with unknown width/height pass through (legacy rows).
 */
export function pickImageForTemplate(
  templateId: string,
  pools: ImagePools,
  angle?: string | null
): BrandImage | null {
  const isUsableSize = (img: BrandImage): boolean => {
    if (!img.width || !img.height) return true
    return img.width >= MIN_USABLE_DIMENSION && img.height >= MIN_USABLE_DIMENSION
  }

  const filteredPools: ImagePools = {
    lifestyleImages: pools.lifestyleImages.filter(isUsableSize),
    productImages: pools.productImages.filter(isUsableSize),
    otherImages: pools.otherImages.filter(isUsableSize),
  }

  const ordered = buildOrderedImagePool(
    filteredPools.lifestyleImages,
    filteredPools.productImages,
    filteredPools.otherImages
  )
  if (ordered.length === 0) return null

  // Vision-aware branch
  if (angle) {
    const normalized = angle.toLowerCase()
    const visionEligible = ordered.filter(img =>
      img.vision_tags && img.vision_tags.scene_type !== 'logo'
    )
    if (visionEligible.length > 0) {
      const scored = visionEligible.map(img => {
        const tags = img.vision_tags!
        const angleMatch = tags.suitable_for.includes(normalized) ? 1 : 0
        return { img, score: angleMatch * 100 + tags.composition_quality }
      })
      scored.sort((a, b) => b.score - a.score)
      return scored[0]?.img ?? null
    }
    // Fall through to legacy orientation logic if no vision_tags populated.
  }

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
