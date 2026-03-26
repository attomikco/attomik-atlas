import { TemplateProps, ff, px, positionStyles } from './types'

const IMAGE_RATIO     = 0.50
const BAR_W           = 6
const PANEL_PAD       = 56
const BRAND_SIZE      = 16
const HEADLINE_SIZE   = 76
const BODY_SIZE       = 30
const CTA_SIZE        = 26
const CTA_PAD         = 22
const GAP_BRAND_HEAD  = 20
const GAP_HEAD_BODY   = 24
const GAP_BODY_CTA    = 28

export default function SplitTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
  headlineColor, bodyColor, ctaColor, ctaFontColor, textPosition,
}: TemplateProps) {
  const imgW = Math.round(width * IMAGE_RATIO)
  const bar = px(BAR_W, width)
  const panelW = width - imgW - bar
  const pad = px(PANEL_PAD, width)
  const pos = positionStyles(textPosition)

  return (
    <div style={{ display: 'flex', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      <div style={{ position: 'relative', width: imgW, height: '100%', flexShrink: 0 }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#e0e0e0' }} />
        )}
      </div>

      <div style={{ width: bar, background: brandColor, flexShrink: 0 }} />

      <div style={{
        width: panelW, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        background: bgColor || '#ffffff', padding: pad,
        textAlign: 'center' as const,
      }}>
        <div style={{
          fontSize: px(BRAND_SIZE, width), fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase' as const, color: brandColor, fontFamily: ff(headlineFont),
        }}>
          {brandName}
        </div>

        {headline && (
          <div style={{
            fontSize: px(HEADLINE_SIZE, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.03em', lineHeight: 1.05,
            color: headlineColor, fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
            marginTop: px(GAP_BRAND_HEAD, width),
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {headline}
          </div>
        )}

        {bodyText && (
          <div style={{
            fontSize: px(BODY_SIZE, width) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400, lineHeight: 1.55,
            color: bodyColor, fontFamily: ff(bodyFont),
            textTransform: bodyTransform as any,
            marginTop: px(GAP_HEAD_BODY, width),
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {bodyText}
          </div>
        )}

        {showCta && (
          <div style={{
            marginTop: px(GAP_BODY_CTA, width),
            background: ctaColor || brandColor, color: ctaFontColor || '#000',
            fontSize: px(CTA_SIZE, width) * bodySizeMul, fontWeight: 700,
            padding: `${px(CTA_PAD, width)}px ${px(CTA_PAD * 2, width)}px`,
            borderRadius: 6, fontFamily: ff(headlineFont),
          }}>
            {ctaText || 'Shop Now'}
          </div>
        )}
      </div>
    </div>
  )
}
