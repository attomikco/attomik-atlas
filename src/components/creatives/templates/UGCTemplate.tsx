import { TemplateProps, ff, px, autoSize } from './types'

const IMAGE_RATIO     = 0.58
const PANEL_PAD_H     = 48
const PANEL_PAD_V     = 36
const HEADLINE_SIZE   = 67
const BODY_SIZE       = 36
const CTA_SIZE        = 34
const CTA_PAD_V       = 16
const CTA_PAD_H       = 40
const GAP_HEAD_BODY   = 14
const GAP_BODY_CTA    = 24

export default function CardTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform, headlineColor,
  bodyFont, bodyWeight, bodyTransform, bodyColor, headlineSizeMul, bodySizeMul,
  ctaColor, ctaFontColor, bgColor, imagePosition,
}: TemplateProps) {
  const imgH = Math.round(height * IMAGE_RATIO)
  const padH = px(PANEL_PAD_H, width)
  const padV = px(PANEL_PAD_V, width)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Image */}
      <div style={{ position: 'relative', height: imgH, flexShrink: 0 }}>
        {imageUrl ? (
          <img crossOrigin="anonymous" src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${imagePosition || 'bottom'}` }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#e0e0e0' }} />
        )}
      </div>

      {/* Text panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        background: bgColor || '#ffffff', padding: `${padV}px ${padH}px`,
        textAlign: 'center' as const,
      }}>
        {headline && (
          <div style={{
            fontSize: autoSize(px(HEADLINE_SIZE, width), headline) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 700,
            letterSpacing: '-0.02em', lineHeight: 1.15,
            color: headlineColor, fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
          }}>
            {headline}
          </div>
        )}

        {bodyText && (
          <div style={{
            fontSize: autoSize(px(BODY_SIZE, width), bodyText, 80) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400,
            lineHeight: 1.5, color: bodyColor,
            fontFamily: ff(bodyFont), textTransform: bodyTransform as any,
            marginTop: px(GAP_HEAD_BODY, width),
          }}>
            {bodyText}
          </div>
        )}

        {showCta && (
          <div style={{
            marginTop: px(GAP_BODY_CTA, width), display: 'inline-block',
            background: ctaColor || brandColor, color: ctaFontColor || '#000',
            fontSize: px(CTA_SIZE, width) * bodySizeMul, fontWeight: 700,
            padding: `${px(CTA_PAD_V, width)}px ${px(CTA_PAD_H, width)}px`,
            borderRadius: 6, fontFamily: ff(headlineFont),
          }}>
            {ctaText || 'Shop Now'}
          </div>
        )}
      </div>
    </div>
  )
}
