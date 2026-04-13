import { FontStyle } from '@/types'
import { TextPosition } from './templates/types'

export interface Brand {
  id: string
  name: string
  slug: string
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  accent_font_color: string | null
  heading_color: string | null
  body_color: string | null
  bg_base: string | null
  bg_dark: string | null
  bg_secondary: string | null
  bg_accent: string | null
  text_on_base: string | null
  text_on_dark: string | null
  text_on_accent: string | null
  btn_primary: string | null
  btn_primary_text: string | null
  btn_secondary: string | null
  btn_secondary_text: string | null
  btn_tertiary: string | null
  btn_tertiary_text: string | null
  font_primary: string | null
  font_secondary: string | null
  font_heading: FontStyle | null
  font_body: FontStyle | null
  custom_fonts_css: string | null
  brand_voice: string | null
  target_audience: string | null
  default_headline: string | null
  default_body_text: string | null
  default_cta: string | null
  logo_url: string | null
  mission: string | null
  products: any[] | null
  notes: string | null
}

export interface GeneratedCopy {
  id: string
  content: string
  type: string
  created_at: string
  campaign_id?: string | null
}

export type StyleSnapshot = {
  headlineColor: string
  bodyColor: string
  headlineFont: string
  headlineWeight: string
  headlineTransform: string
  bodyFont: string
  bodyWeight: string
  bodyTransform: string
  bgColor: string
  headlineSizeMul: number
  bodySizeMul: number
  showOverlay: boolean
  overlayOpacity: number
  textBanner: 'none' | 'top' | 'bottom'
  textBannerColor: string
  textPosition: TextPosition
  showCta: boolean
  imagePosition: string
  ctaColor?: string
  ctaFontColor?: string
  ctaSizeMul?: number
}

export type Variation = {
  headline: string
  body: string
  cta: string
  imageId: string | null
  templateId: string
  style: StyleSnapshot
  fbPrimaryText?: string
  fbHeadline?: string
  fbDescription?: string
}

export type Draft = Variation & {
  sizeId: string
  dbId?: string
  imageUrl?: string | null
  // ── Meta ad launch fields, hydrated from saved_creatives when loading ──
  destinationUrl?: string
  ctaType?: CtaType
}

export type CtaType =
  | 'SHOP_NOW'
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'BOOK_NOW'
  | 'CONTACT_US'
  | 'DOWNLOAD'
  | 'GET_OFFER'
  | 'WATCH_MORE'

export const CTA_TYPE_LABELS: Record<CtaType, string> = {
  SHOP_NOW: 'Shop Now',
  LEARN_MORE: 'Learn More',
  SIGN_UP: 'Sign Up',
  BOOK_NOW: 'Book Now',
  CONTACT_US: 'Contact Us',
  DOWNLOAD: 'Download',
  GET_OFFER: 'Get Offer',
  WATCH_MORE: 'Watch More',
}

export type SavedCreative = {
  id: string
  created_at: string
  brand_id: string
  campaign_id: string | null
  template_id: string
  size_id: string
  image_url: string | null
  headline: string
  body_text: string
  cta_text: string
  style_snapshot: StyleSnapshot
  thumbnail_url: string | null
  name: string | null
  // ── Meta ad launch fields (20260413_creatives_meta_fields.sql) ──
  destination_url: string | null
  cta_type: CtaType
  fb_primary_text: string | null
  fb_headline: string | null
  fb_description: string | null
  meta_ad_id: string | null
  meta_ad_status: string | null
}
