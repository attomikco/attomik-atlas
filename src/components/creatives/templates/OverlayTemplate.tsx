import { TemplateProps, TEXT_SHADOW, ff, px } from './types'

export default function OverlayTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, headlineSizeMul, bodySizeMul,
  ctaColor, ctaFontColor,
}: TemplateProps) {
  const pad = px(60, width)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Full-bleed image */}
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Bottom-third gradient only — top stays clean */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: Math.round(height * 0.38),
        background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 100%)',
        pointerEvents: 'none' as const,
      }} />

      {/* Text content — bottom left, sits in the gradient zone */}
      <div style={{
        position: 'absolute', bottom: pad, left: pad, right: pad,
      }}>
        {headline && (
          <div style={{
            fontSize: px(64, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: '#fff',
            textShadow: TEXT_SHADOW,
            fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
            maxWidth: '80%',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {headline}
          </div>
        )}

        {bodyText && (
          <div style={{
            fontSize: px(28, width) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.85)',
            textShadow: TEXT_SHADOW,
            fontFamily: ff(bodyFont),
            textTransform: bodyTransform as any,
            marginTop: px(12, width),
            maxWidth: '75%',
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
            marginTop: px(20, width),
            background: ctaColor || brandColor,
            color: ctaFontColor || '#000',
            fontSize: px(24, width) * bodySizeMul,
            fontWeight: 700,
            padding: `${px(16, width)}px ${px(40, width)}px`,
            borderRadius: px(60, width),
            whiteSpace: 'nowrap' as const,
            fontFamily: ff(headlineFont),
          }}>
            {ctaText || 'Shop Now'}
          </div>
        )}
      </div>
    </div>
  )
}
