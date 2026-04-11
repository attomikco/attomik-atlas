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

/** Every image that can appear inside an ad/email template — excludes logos + press */
export function getContentImages(images: BrandImage[]): BrandImage[] {
  return images.filter(img => img.tag !== 'logo' && img.tag !== 'press')
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

  const shouldCollapse = productImages.length === 0

  // When collapsing, the single visible section is the full content pool so
  // nothing is hidden from the user.
  const collapsedLifestyle = shouldCollapse ? content : lifestyleImages

  return {
    productImages,
    lifestyleImages: collapsedLifestyle,
    shouldCollapse,
  }
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
