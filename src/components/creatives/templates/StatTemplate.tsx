import { TemplateProps, TEXT_SHADOW, ff, px } from './types'

export default function StatTemplate({
  imageUrl, headline, bodyText, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, headlineSizeMul, bodySizeMul,
  headlineColor,
}: TemplateProps) {
  const pad = px(60, width)
  const statColor = (headlineColor === '#ffffff' || headlineColor === '#fff') ? brandColor : headlineColor

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Full-bleed image */}
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Heavier dark overlay so stat pops */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />

      {/* Centered content */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center', padding: pad, textAlign: 'center' as const,
      }}>
        {/* Small label ABOVE the stat */}
        <div style={{
          fontSize: px(20, width) * bodySizeMul,
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: 'rgba(255,255,255,0.7)',
          fontFamily: ff(bodyFont),
          marginBottom: px(12, width),
        }}>
          {bodyText || ''}
        </div>

        {/* Big stat number */}
        {headline && (
          <div style={{
            fontSize: px(120, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: statColor || brandColor,
            textShadow: TEXT_SHADOW,
            fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
          }}>
            {headline}
          </div>
        )}

        {/* Supporting text BELOW stat */}
        <div style={{
          fontSize: px(24, width) * bodySizeMul,
          fontWeight: 400,
          lineHeight: 1.4,
          color: 'rgba(255,255,255,0.8)',
          fontFamily: ff(bodyFont),
          marginTop: px(16, width),
          maxWidth: '80%',
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis' as const,
        }}>
          {bodyText || ''}
        </div>
      </div>

      {/* Brand name — bottom center */}
      <div style={{
        position: 'absolute', bottom: pad, left: 0, right: 0,
        textAlign: 'center' as const,
        fontSize: px(16, width),
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: ff(headlineFont),
      }}>
        {brandName}
      </div>
    </div>
  )
}
