import { TemplateProps, ff, px, autoSize } from './types'

const NAMES = ['Alex S.', 'Jordan M.', 'Taylor R.', 'Morgan K.', 'Casey L.', 'Riley P.', 'Jamie W.', 'Quinn D.', 'Avery T.', 'Skyler B.']

const IMAGE_RATIO     = 0.62
const PANEL_PAD_H     = 56
const PANEL_PAD_V     = 28
const QUOTE_SIZE      = 55
const NAME_SIZE       = 36
const HANDLE_SIZE     = 24
const STAR_SIZE       = 34
const CTA_SIZE        = 28
const CTA_PAD_V       = 16
const CTA_PAD_H       = 40

export default function TestimonialTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
  headlineColor, bodyColor, ctaColor, ctaFontColor, imagePosition, isExporting,
}: TemplateProps) {
  const imgH = Math.round(height * IMAGE_RATIO)
  const padH = px(PANEL_PAD_H, width)
  const padV = px(PANEL_PAD_V, width)
  const starColor = ctaColor || brandColor
  const nameIndex = (bodyText || '').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % NAMES.length
  const reviewerName = NAMES[nameIndex]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      <div style={{ position: 'relative', width, height: imgH, flexShrink: 0 }}>
        {imageUrl ? (
          <img crossOrigin="anonymous" src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${imagePosition || 'bottom'}`, display: 'block' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: brandColor || '#1a1a1a' }} />
        )}
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        background: bgColor || '#ffffff', padding: `${padV}px ${padH}px`,
        textAlign: 'center' as const,
      }}>
        <div style={{ display: 'flex', gap: px(6, width), marginBottom: px(14, width) }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ fontSize: px(STAR_SIZE, width), lineHeight: 1, color: starColor }}>&#9733;</span>
          ))}
        </div>

        {bodyText && (
          <div style={{
            fontSize: autoSize(px(QUOTE_SIZE, width), bodyText, 50) * bodySizeMul, fontWeight: parseInt(headlineWeight) || 700,
            fontStyle: 'italic', lineHeight: 1.4, color: headlineColor,
            fontFamily: ff(headlineFont), textTransform: headlineTransform as any,
            maxWidth: '90%',
          }}>
            &ldquo;{bodyText}&rdquo;
          </div>
        )}

        {bodyText && (
          <div style={{ marginTop: px(18, width) }}>
            <div style={{
              fontSize: px(NAME_SIZE, width) * headlineSizeMul,
              fontWeight: 600, color: bodyColor,
              fontFamily: ff(bodyFont), lineHeight: 1.2,
            }}>
              {reviewerName}
            </div>
            <div style={{ fontSize: px(HANDLE_SIZE, width), fontWeight: 400, color: bodyColor, fontFamily: ff(bodyFont), marginTop: 3 }}>
              Verified buyer
            </div>
          </div>
        )}

        {showCta && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: px(18, width) }}>
            <div style={{
              display: 'block',
              paddingTop: px(16, width),
              paddingBottom: px(16, width),
              paddingLeft: px(28, width),
              paddingRight: px(28, width),
              background: ctaColor || brandColor,
              borderRadius: 6,
              whiteSpace: 'nowrap' as const,
              color: ctaFontColor || '#000',
              fontSize: px(CTA_SIZE, width) * bodySizeMul,
              fontWeight: 700,
              fontFamily: ff(headlineFont),
              textAlign: 'center' as const,
              lineHeight: '1',
            }}>
              {ctaText || 'Shop Now'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
