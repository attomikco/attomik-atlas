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
}

export interface GeneratedCopy {
  id: string
  content: string
  type: string
  created_at: string
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
}

export type Variation = {
  headline: string
  body: string
  cta: string
  imageId: string | null
  templateId: string
  style: StyleSnapshot
}

export type Draft = Variation & { sizeId: string }
