import { TemplateProps, ff, px, autoSize, bannerStyle, positionStyles } from './types'

const HEADLINE_SIZE   = 82
const BODY_SIZE       = 42
const CTA_SIZE        = 34
const CTA_PAD_V       = 22
const CTA_PAD_H       = 56
const CTA_RADIUS      = 6
const EDGE_PAD        = 64
const GRADIENT_HEIGHT = 0.50
const DIVIDER_W       = 48
const DIVIDER_H       = 3
const GAP_HEADLINE_DIVIDER = 28
const GAP_DIVIDER_BODY     = 16
const GAP_BODY_CTA         = 28

export default function OverlayTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform, headlineColor,
  bodyFont, bodyWeight, bodyTransform, bodyColor, headlineSizeMul, bodySizeMul,
  ctaColor, ctaFontColor, bgColor, textPosition,
  showOverlay, overlayOpacity, textBanner, textBannerColor, imagePosition,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)
  const pos = positionStyles(textPosition)
  const banner = bannerStyle(textBanner, textBannerColor, height)
  const isCenter = textPosition === 'center'
  const isTop = textPosition.startsWith('top')
  const isTall = height / width > 1.4

  // Gradient position: top, center (band), or bottom
  const gradientStyle: React.CSSProperties = isCenter
    ? {
        position: 'absolute', left: 0, right: 0,
        top: '25%', height: '50%',
        background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0.45) 70%, transparent 100%)',
        pointerEvents: 'none',
      }
    : {
        position: 'absolute', left: 0, right: 0,
        ...(isTop ? { top: 0 } : { bottom: 0 }),
        height: Math.round(height * GRADIENT_HEIGHT),
        background: isTop
          ? 'linear-gradient(to top, transparent 0%, rgba(0,0,0,0.82) 100%)'
          : 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.82) 100%)',
        pointerEvents: 'none',
      }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont), background: bgColor }}>
      {imageUrl ? (
        <img crossOrigin="anonymous" src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${imagePosition || 'center'}` }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: bgColor || '#1a1a1a' }} />
      )}

      {/* Full overlay (user toggle) */}
      {showOverlay && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${overlayOpacity})` }} />
      )}

      {/* Gradient — follows text position */}
      <div style={gradientStyle} />

      {/* Text banner */}
      {banner && <div style={banner} />}

      {/* Text block — positioned by textPosition */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const,
        justifyContent: pos.justifyContent,
        padding: `${isTop && isTall ? p * 3 : p}px ${p}px ${p}px`,
      }}>
        <div style={{ textAlign: pos.textAlign, maxWidth: '85%', alignSelf: pos.alignItems === 'flex-end' ? 'flex-end' : pos.alignItems === 'center' ? 'center' : 'flex-start' }}>
          {headline && (
            <div style={{
              fontSize: autoSize(px(HEADLINE_SIZE, width), headline) * headlineSizeMul,
              fontWeight: parseInt(headlineWeight) || 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: headlineColor,
              fontFamily: ff(headlineFont),
              textTransform: headlineTransform as any,
            }}>
              {headline}
            </div>
          )}

          {headline && bodyText && (
            <div style={{
              width: px(DIVIDER_W, width), height: px(DIVIDER_H, width),
              background: headlineColor, borderRadius: 2,
              margin: `${px(GAP_HEADLINE_DIVIDER, width)}px ${pos.textAlign === 'center' ? 'auto' : '0'} ${px(GAP_DIVIDER_BODY, width)}px`,
              ...(pos.textAlign === 'center' ? {} : pos.textAlign === 'right' ? { marginLeft: 'auto' } : {}),
            }} />
          )}

          {bodyText && (
            <div style={{
              fontSize: autoSize(px(BODY_SIZE, width), bodyText, 80) * bodySizeMul,
              fontWeight: parseInt(bodyWeight) || 400,
              lineHeight: 1.45,
              color: bodyColor,
              fontFamily: ff(bodyFont),
              textTransform: bodyTransform as any,
            }}>
              {bodyText}
            </div>
          )}

          {showCta && (
            <div style={{
              display: 'inline-block',
              marginTop: px(GAP_BODY_CTA, width),
              background: ctaColor || brandColor,
              color: ctaFontColor || '#000',
              fontSize: px(CTA_SIZE, width) * bodySizeMul,
              fontWeight: 700,
              padding: `${px(CTA_PAD_V, width)}px ${px(CTA_PAD_H, width)}px`,
              borderRadius: CTA_RADIUS,
              whiteSpace: 'nowrap' as const,
              fontFamily: ff(headlineFont),
            }}>
              {ctaText || 'Shop Now'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
