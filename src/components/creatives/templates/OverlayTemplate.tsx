import { TemplateProps, ff, px, bannerStyle, positionStyles } from './types'

const HEADLINE_SIZE   = 82
const BODY_SIZE       = 32
const CTA_SIZE        = 26
const CTA_PAD_V       = 18
const CTA_PAD_H       = 48
const CTA_RADIUS      = 6
const EDGE_PAD        = 64
const GRADIENT_HEIGHT = 0.50
const DIVIDER_W       = 48
const DIVIDER_H       = 3
const GAP_HEADLINE_DIVIDER = 20
const GAP_DIVIDER_BODY     = 16
const GAP_BODY_CTA         = 28

export default function OverlayTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform, headlineColor,
  bodyFont, bodyWeight, bodyTransform, bodyColor, headlineSizeMul, bodySizeMul,
  ctaColor, ctaFontColor, bgColor, textPosition,
  showOverlay, overlayOpacity, textBanner, textBannerColor,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)
  const pos = positionStyles(textPosition)
  const banner = bannerStyle(textBanner, textBannerColor, height)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont), background: bgColor }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: bgColor || '#1a1a1a' }} />
      )}

      {/* Overlay */}
      {showOverlay && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${overlayOpacity})` }} />
      )}

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: Math.round(height * GRADIENT_HEIGHT),
        background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.82) 100%)',
        pointerEvents: 'none' as const,
      }} />

      {/* Text banner */}
      {banner && <div style={banner} />}

      {/* Text block — positioned by textPosition */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const,
        justifyContent: pos.justifyContent, padding: p,
      }}>
        <div style={{ textAlign: pos.textAlign, maxWidth: '85%', alignSelf: pos.alignItems === 'flex-end' ? 'flex-end' : pos.alignItems === 'center' ? 'center' : 'flex-start' }}>
          {headline && (
            <div style={{
              fontSize: px(HEADLINE_SIZE, width) * headlineSizeMul,
              fontWeight: parseInt(headlineWeight) || 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.08,
              color: headlineColor,
              fontFamily: ff(headlineFont),
              textTransform: headlineTransform as any,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}>
              {headline}
            </div>
          )}

          {headline && bodyText && (
            <div style={{
              width: px(DIVIDER_W, width), height: px(DIVIDER_H, width),
              background: brandColor, borderRadius: 2,
              margin: `${px(GAP_HEADLINE_DIVIDER, width)}px 0 ${px(GAP_DIVIDER_BODY, width)}px`,
            }} />
          )}

          {bodyText && (
            <div style={{
              fontSize: px(BODY_SIZE, width) * bodySizeMul,
              fontWeight: parseInt(bodyWeight) || 400,
              lineHeight: 1.5,
              color: bodyColor,
              fontFamily: ff(bodyFont),
              textTransform: bodyTransform as any,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
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
