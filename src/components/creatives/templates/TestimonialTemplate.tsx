import { TemplateProps, ff, px } from './types'

export default function TestimonialTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
  headlineColor, bodyColor, ctaColor, ctaFontColor,
}: TemplateProps) {
  const imgH = Math.round(height * 0.50)
  const pad = px(48, width)
  const starSize = px(20, width)
  const avatarSize = px(40, width)

  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Image — top 50% */}
      <div style={{ position: 'relative', height: imgH, flexShrink: 0 }}>
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: '#e0e0e0' }} />
        )}
      </div>

      {/* White panel — bottom 50% */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column' as const,
        background: bgColor || '#ffffff', padding: pad,
      }}>
        {/* Giant quotation mark */}
        <div style={{
          fontSize: px(80, width),
          fontWeight: 800,
          lineHeight: 0.5,
          color: brandColor,
          fontFamily: ff(headlineFont),
          userSelect: 'none' as const,
          marginBottom: px(16, width),
        }}>
          &ldquo;
        </div>

        {/* Quote text */}
        {bodyText && (
          <div style={{
            fontSize: px(26, width) * bodySizeMul,
            fontWeight: 600,
            fontStyle: 'italic',
            lineHeight: 1.5,
            color: bodyColor || '#000',
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

        {/* Divider */}
        <div style={{
          width: '100%', height: 1,
          background: '#e0e0e0',
          margin: `${px(20, width)}px 0`,
        }} />

        {/* Attribution row */}
        {headline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: px(12, width) }}>
            {/* Avatar placeholder */}
            <div style={{
              width: avatarSize, height: avatarSize, borderRadius: '50%',
              background: brandColor, flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontSize: px(18, width) * headlineSizeMul,
                fontWeight: parseInt(headlineWeight) || 700,
                color: headlineColor || '#000',
                fontFamily: ff(headlineFont),
                textTransform: headlineTransform as any,
                lineHeight: 1.3,
              }}>
                {headline}
              </div>
              <div style={{
                fontSize: px(15, width),
                fontWeight: 400,
                color: '#666',
                fontFamily: ff(bodyFont),
                marginTop: 2,
              }}>
                Verified buyer
              </div>
            </div>
          </div>
        )}

        {/* Stars row */}
        <div style={{ display: 'flex', gap: px(4, width), marginTop: px(16, width) }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} width={starSize} height={starSize} viewBox="0 0 20 20" fill={brandColor}>
              <path d="M10 1l2.39 4.84L17.82 6.9l-3.91 3.81.92 5.39L10 13.47l-4.83 2.63.92-5.39L2.18 6.9l5.43-.79L10 1z" />
            </svg>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* CTA */}
        {showCta && (
          <div style={{
            marginTop: px(16, width),
            display: 'inline-block',
            alignSelf: 'flex-start',
            background: ctaColor || brandColor,
            color: ctaFontColor || '#000',
            fontSize: px(22, width) * bodySizeMul,
            fontWeight: 700,
            padding: `${px(14, width)}px ${px(36, width)}px`,
            borderRadius: 6,
            fontFamily: ff(headlineFont),
          }}>
            {ctaText || 'Shop Now'}
          </div>
        )}
      </div>
    </div>
  )
}
