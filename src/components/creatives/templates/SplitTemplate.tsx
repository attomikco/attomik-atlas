import { TemplateProps, ff, px } from './types'

export default function SplitTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
  headlineColor, bodyColor, ctaColor, ctaFontColor,
}: TemplateProps) {
  const imgW = Math.round(width * 0.55)
  const barW = px(6, width)
  const panelW = width - imgW - barW
  const pad = px(48, width)

  return (
    <div style={{ display: 'flex', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Image — left 55%, full height, no border radius */}
      <div style={{ position: 'relative', width: imgW, height: '100%', flexShrink: 0 }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#e0e0e0' }} />
        )}
      </div>

      {/* Brand color vertical bar */}
      <div style={{ width: barW, background: brandColor, flexShrink: 0 }} />

      {/* Text panel — right 45% */}
      <div style={{
        width: panelW, display: 'flex', flexDirection: 'column' as const,
        background: bgColor || '#ffffff', padding: pad,
      }}>
        {/* Brand name — top label */}
        <div style={{
          fontSize: px(13, width),
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: brandColor,
          fontFamily: ff(headlineFont),
        }}>
          {brandName}
        </div>

        {/* Headline */}
        {headline && (
          <div style={{
            fontSize: px(56, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: headlineColor || '#000',
            fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
            marginTop: px(20, width),
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {headline}
          </div>
        )}

        {/* Divider line */}
        <div style={{
          width: px(40, width), height: px(3, width),
          background: brandColor,
          margin: `${px(24, width)}px 0`,
          borderRadius: 2,
        }} />

        {/* Body */}
        {bodyText && (
          <div style={{
            fontSize: px(22, width) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400,
            lineHeight: 1.6,
            color: bodyColor || '#555',
            fontFamily: ff(bodyFont),
            textTransform: bodyTransform as any,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {bodyText}
          </div>
        )}

        {/* Spacer pushes CTA to bottom */}
        <div style={{ flex: 1 }} />

        {/* CTA — full width of text panel */}
        {showCta && (
          <div style={{
            marginTop: px(24, width),
            background: ctaColor || brandColor,
            color: ctaFontColor || '#000',
            fontSize: px(22, width) * bodySizeMul,
            fontWeight: 700,
            padding: `${px(18, width)}px`,
            borderRadius: 6,
            textAlign: 'center' as const,
            fontFamily: ff(headlineFont),
          }}>
            {ctaText || 'Shop Now'}
          </div>
        )}
      </div>
    </div>
  )
}
