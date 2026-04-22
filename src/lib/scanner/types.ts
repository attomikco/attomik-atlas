export type Platform = 'shopify' | 'other'

export type Product = {
  name: string
  description: string | null
  price: string | null
  image: string | null
}

export type ImageTagType = 'product' | 'lifestyle' | 'background' | 'logo' | 'press' | 'press_logo' | 'shopify' | 'other'

export type ClassifiedImage = {
  url: string
  tag: ImageTagType
  score: number
  alt: string | null
  // Short human-readable string ("<tag>: <what fired>") written by every
  // rule in classifyImages. Persisted to brand_images.classification_reason
  // so the admin surface can show why a row landed where it did. Nullable
  // so synthetic consumers (og-image fallback, product-URL-only rows
  // bypassing the scanner) can leave it empty.
  reason: string | null
}

export type BusinessType = 'shopify' | 'ecommerce' | 'saas' | 'restaurant' | 'service' | 'brand'

export type OfferingType = 'product' | 'plan' | 'service' | 'menu_item'

export type Offering = {
  name: string
  description: string | null
  price: string | null
  image: string | null
  type: OfferingType
}

export type FontTransform = 'uppercase' | 'lowercase' | 'capitalize' | 'none'
export type LetterSpacing = 'wide' | 'tight' | 'normal'

export type RawScanResult = {
  name: string | null
  colors: string[]
  allColors: string[]
  font: string | null
  fontTransform: FontTransform
  letterSpacing: LetterSpacing
  ogImage: string | null
  logo: string | null
  platform: Platform
  products: Product[]
  images: ClassifiedImage[]
  businessType: BusinessType
  offerings: Offering[]
}
