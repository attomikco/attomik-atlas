import { TemplateProps, ff, px } from './types'

const IMAGE_RATIO     = 0.65
const PANEL_PAD_H     = 56
const PANEL_PAD_V     = 32
const QUOTE_SIZE      = 30
const NAME_SIZE       = 20
const HANDLE_SIZE     = 15
const STAR_SIZE       = 22
const CTA_SIZE        = 22
const CTA_PAD_V       = 14
const CTA_PAD_H       = 36

export default function TestimonialTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
  headlineColor, bodyColor, ctaColor, ctaFontColor,
}: TemplateProps) {
  const imgH = Math.round(height * IMAGE_RATIO)
  const padH = px(PANEL_PAD_H, width)
  const padV = px(PANEL_PAD_V, width)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      <div style={{ position: 'relative', height: imgH, flexShrink: 0 }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#e0e0e0' }} />
        )}
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center',
        background: bgColor || '#ffffff', padding: `${padV}px ${padH}px`,
        textAlign: 'center' as const,
      }}>
        <div style={{ display: 'flex', gap: px(4, width), marginBottom: px(14, width) }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width={px(STAR_SIZE, width)} height={px(STAR_SIZE, width)} viewBox="0 0 20 20" fill={brandColor}>
              <path d="M10 1l2.39 4.84L17.82 6.9l-3.91 3.81.92 5.39L10 13.47l-4.83 2.63.92-5.39L2.18 6.9l5.43-.79L10 1z" />
            </svg>
          ))}
        </div>

        {bodyText && (
          <div style={{
            fontSize: px(QUOTE_SIZE, width) * bodySizeMul, fontWeight: 600,
            fontStyle: 'italic', lineHeight: 1.45, color: bodyColor,
            fontFamily: ff(bodyFont), textTransform: bodyTransform as any,
            maxWidth: '90%', display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            &ldquo;{bodyText}&rdquo;
          </div>
        )}

        {headline && (
          <div style={{ marginTop: px(16, width) }}>
            <div style={{
              fontSize: px(NAME_SIZE, width) * headlineSizeMul,
              fontWeight: parseInt(headlineWeight) || 700, color: headlineColor,
              fontFamily: ff(headlineFont), textTransform: headlineTransform as any, lineHeight: 1.2,
            }}>
              {headline}
            </div>
            <div style={{ fontSize: px(HANDLE_SIZE, width), fontWeight: 400, color: '#888', fontFamily: ff(bodyFont), marginTop: 3 }}>
              Verified buyer
            </div>
          </div>
        )}

        {showCta && (
          <div style={{
            marginTop: px(16, width), display: 'inline-block',
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
