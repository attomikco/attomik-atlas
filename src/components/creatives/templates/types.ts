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
  imagePosition: string
  // Template-specific (optional)
  callouts?: { icon: string; label: string; description: string }[]
  statStripText?: string
  oldWayItems?: string[]
  newWayItems?: string[]
  subtitle?: string
  brandLogoUrl?: string | null
  productImageUrl?: string | null
  isExporting?: boolean
}

export interface Callout {
  icon: string
  label: string
  description: string
}

/** Banner style for text bar at top or bottom */
export function bannerStyle(banner: 'none' | 'top' | 'bottom', bannerColor: string, height: number): React.CSSProperties | null {
  if (banner === 'none') return null
  return {
    position: 'absolute' as const,
    left: 0, right: 0,
    [banner]: 0,
    height: height * 0.22,
    background: bannerColor,
  }
}

/** CSS alignment helpers derived from TextPosition */
export function positionStyles(pos: TextPosition) {
  const v = pos.startsWith('top') ? 'flex-start' : pos.startsWith('bottom') ? 'flex-end' : 'center'
  const h = pos.endsWith('left') ? 'flex-start' : pos.endsWith('right') ? 'flex-end' : 'center'
  return { justifyContent: v, alignItems: h, textAlign: (h === 'center' ? 'center' : h === 'flex-end' ? 'right' : 'left') as 'left' | 'center' | 'right' }
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

/** Auto-scale font size based on text length. Short text stays big, long text shrinks gently. */
export function autoSize(basePx: number, text: string, maxChars = 40) {
  const len = text.length
  if (len <= maxChars) return basePx
  return Math.max(basePx * 0.6, basePx * (maxChars / len))
}
