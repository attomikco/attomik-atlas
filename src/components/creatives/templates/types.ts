export type TextPosition = 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface TemplateProps {
  imageUrl: string | null
  headline: string
  bodyText: string
  ctaText: string
  brandColor: string
  brandName: string
  width: number
  height: number
  textPosition: TextPosition
  showCta: boolean
  headlineColor: string
  bodyColor: string
  headlineFont: string
  headlineWeight: string
  headlineTransform: string
  bodyFont: string
  bodyWeight: string
  bodyTransform: string
  bgColor: string
  /** Multiplier relative to the template default, e.g. 1 = 100%, 1.5 = 150% */
  headlineSizeMul: number
  bodySizeMul: number
  showOverlay: boolean
  overlayOpacity: number
  /** Text banner: 'none' | 'top' | 'bottom' */
  textBanner: 'none' | 'top' | 'bottom'
  textBannerColor: string
  ctaColor: string
  ctaFontColor: string
}

/** Text shadow for text sitting over images */
export const TEXT_SHADOW = '0 2px 8px rgba(0,0,0,0.6)'

/** Resolve font family with Barlow fallback */
export function ff(font: string | undefined) {
  return font ? `${font}, Barlow, sans-serif` : 'Barlow, sans-serif'
}

/**
 * Scale a pixel value designed at 1080px reference width
 * to the actual template width. e.g. px(64, 1080) = 64,
 * px(64, 540) = 32.
 */
export function px(val: number, width: number) {
  return Math.round(val * (width / 1080))
}
