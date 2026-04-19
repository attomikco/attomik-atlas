// Resolves a brand's image rows into a pre-picked bundle of URLs the
// rendered page uses as fallbacks when a block carries no explicit image.
//
// The picking rules mirror Creative Studio / email-template:
//   - hero slot  → landscape-first lifestyle, then product
//   - solution   → lifestyle alternate (so hero + solution don't repeat)
//   - productList → bucketed product pool (shopify-first for shopify brands)
//   - lifestyle  → bucketed lifestyle pool
//
// Pure — takes a `toUrl` callback so page.tsx can plug the Supabase client
// without dragging storage-bucket knowledge into this module or its tests.

import { bucketBrandImages, getBusinessType, pickSlotImages } from '../../../lib/brand-images.ts'
import type { Brand, BrandImage } from '../../../types/index.ts'

export interface BrandImageBundle {
  hero: string
  solution: string
  productList: string[]
  lifestyle: string[]
}

export const EMPTY_IMAGE_BUNDLE: BrandImageBundle = {
  hero: '',
  solution: '',
  productList: [],
  lifestyle: [],
}

export function resolveBrandImageBundle(
  rows: BrandImage[],
  brand: Brand,
  toUrl: (img: BrandImage) => string,
): BrandImageBundle {
  if (!rows.length) return EMPTY_IMAGE_BUNDLE

  const businessType = getBusinessType(brand)
  const [hero, solution] = pickSlotImages(rows, businessType, ['hero', 'lifestyle'])
  const { productImages, lifestyleImages } = bucketBrandImages(rows, businessType)

  const heroUrl = hero ? toUrl(hero) : ''
  return {
    hero: heroUrl,
    solution: solution ? toUrl(solution) : heroUrl,
    productList: productImages.slice(0, 6).map(toUrl),
    lifestyle: lifestyleImages.slice(0, 6).map(toUrl),
  }
}
