import { TemplateProps, ff, px } from './types'

const IMAGE_RATIO     = 0.58
const PANEL_PAD_H     = 48
const PANEL_PAD_V     = 36
const HEADLINE_SIZE   = 48
const BODY_SIZE       = 26
const CTA_SIZE        = 24
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
          <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${imagePosition || 'center'}` }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#e0e0e0' }} />
        )}
      </div>

      {/* Text panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column' as const,
        justifyContent: 'center',
        background: bgColor || '#ffffff', padding: `${padV}px ${padH}px`,
      }}>
        {headline && (
          <div style={{
            fontSize: px(HEADLINE_SIZE, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 700,
            letterSpacing: '-0.02em', lineHeight: 1.15,
            color: headlineColor, fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {headline}
          </div>
        )}

        {bodyText && (
          <div style={{
            fontSize: px(BODY_SIZE, width) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400,
            lineHeight: 1.5, color: bodyColor,
            fontFamily: ff(bodyFont), textTransform: bodyTransform as any,
            marginTop: px(GAP_HEAD_BODY, width),
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {bodyText}
          </div>
        )}

        {showCta && (
          <div style={{
            marginTop: px(GAP_BODY_CTA, width), display: 'inline-block', alignSelf: 'flex-start',
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
