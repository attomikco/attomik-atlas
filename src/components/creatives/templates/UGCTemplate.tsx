import { TemplateProps, TEXT_SHADOW, ff, px } from './types'

export default function UGCTemplate({
  imageUrl, headline, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineTransform,
  headlineSizeMul,
}: TemplateProps) {
  const pad = px(60, width)
  const avatarSize = px(32, width)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(undefined) }}>
      {/* Full-bleed image — completely natural, no overlays */}
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Top bar — Instagram story-style UI */}
      <div style={{
        position: 'absolute', top: pad, left: pad, right: pad,
        display: 'flex', alignItems: 'center', gap: px(10, width),
      }}>
        {/* Avatar circle */}
        <div style={{
          width: avatarSize, height: avatarSize, borderRadius: '50%',
          background: brandColor, flexShrink: 0,
        }} />
        <div style={{ display: 'flex', flexDirection: 'column' as const }}>
          <span style={{
            fontSize: px(15, width),
            fontWeight: 600,
            color: '#fff',
            textShadow: TEXT_SHADOW,
            fontFamily: ff(headlineFont),
          }}>
            {brandName}
          </span>
          <span style={{
            fontSize: px(12, width),
            fontWeight: 400,
            color: 'rgba(255,255,255,0.5)',
            textShadow: TEXT_SHADOW,
            fontFamily: ff(undefined),
          }}>
            Sponsored
          </span>
        </div>
      </div>

      {/* Headline — bottom left, natural feel with text shadow */}
      {headline && (
        <div style={{
          position: 'absolute', bottom: pad, left: pad, right: pad,
          maxWidth: '80%',
        }}>
          <div style={{
            fontSize: px(32, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 700,
            lineHeight: 1.3,
            color: '#fff',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {headline}
          </div>
        </div>
      )}
    </div>
  )
}
