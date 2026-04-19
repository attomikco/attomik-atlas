export type Platform = 'shopify' | 'other'

export type Product = {
  name: string
  description: string | null
  price: string | null
  image: string | null
}

export type ImageTagType = 'product' | 'lifestyle' | 'background' | 'logo' | 'press' | 'shopify' | 'other'

export type ClassifiedImage = {
  url: string
  tag: ImageTagType
  score: number
  alt: string | null
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
