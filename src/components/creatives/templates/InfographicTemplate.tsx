import { TemplateProps, ff, px, autoSize } from './types'

const HEADLINE_SIZE = 64
const CALLOUT_LABEL = 22
const CALLOUT_DESC = 16
const CALLOUT_ICON = 32
const STAT_SIZE = 36
const EDGE_PAD = 64
const CALLOUT_PAD = 24
const CALLOUT_RADIUS = 12

export default function InfographicTemplate({
  imageUrl, headline, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineTransform, headlineColor,
  bodyFont, bodyColor, headlineSizeMul, bodySizeMul,
  bgColor, callouts, statStripText, imagePosition,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)
  const items = callouts?.slice(0, 4) || []
  const imgSize = Math.round(Math.min(width, height) * 0.32)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont), background: bgColor || brandColor || '#000' }}>
      {/* Headline */}
      {headline && (
        <div style={{
          position: 'absolute', top: p, left: p, right: p,
          fontSize: autoSize(px(HEADLINE_SIZE, width), headline, 25) * headlineSizeMul,
          fontWeight: parseInt(headlineWeight) || 800,
          lineHeight: 1.1, color: headlineColor,
          fontFamily: ff(headlineFont), textTransform: headlineTransform as any,
          textAlign: 'center',
        }}>
          {headline}
        </div>
      )}

      {/* Product image centered */}
      {imageUrl && (
        <img crossOrigin="anonymous" src={imageUrl} alt="" style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -55%)',
          width: imgSize, height: imgSize,
          objectFit: 'contain', objectPosition: `center ${imagePosition || 'center'}`,
        }} />
      )}

      {/* 4 callout boxes */}
      {items.length > 0 && (() => {
        const cw = Math.round(width * 0.36)
        const ch = Math.round(height * 0.14)
        const positions = [
          { top: '32%', left: p },
          { top: '32%', right: p },
          { top: '58%', left: p },
          { top: '58%', right: p },
        ]
        return items.map((c, i) => (
          <div key={i} style={{
            position: 'absolute', ...positions[i % 4] as any,
            width: cw, padding: px(CALLOUT_PAD, width),
            background: 'rgba(255,255,255,0.12)', borderRadius: px(CALLOUT_RADIUS, width),
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: px(CALLOUT_ICON, width), marginBottom: px(6, width) }}>{c.icon || '+'}</div>
            <div style={{
              fontSize: px(CALLOUT_LABEL, width) * bodySizeMul, fontWeight: 700,
              color: headlineColor, fontFamily: ff(headlineFont), lineHeight: 1.2,
            }}>
              {c.label}
            </div>
            {c.description && (
              <div style={{
                fontSize: px(CALLOUT_DESC, width) * bodySizeMul, fontWeight: 400,
                color: bodyColor, opacity: 0.8, marginTop: px(4, width), lineHeight: 1.3,
              }}>
                {c.description}
              </div>
            )}
          </div>
        ))
      })()}

      {/* Stat strip */}
      {statStripText && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.3)', padding: `${px(20, width)}px ${p}px`,
          textAlign: 'center',
          fontSize: px(STAT_SIZE, width) * bodySizeMul, fontWeight: 700,
          color: headlineColor, fontFamily: ff(headlineFont),
          letterSpacing: '0.04em',
        }}>
          {statStripText}
        </div>
      )}

      {/* Brand watermark */}
      {!statStripText && (
        <div style={{
          position: 'absolute', bottom: px(20, width), left: 0, right: 0,
          textAlign: 'center', fontSize: px(16, width),
          fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: bodyColor, fontFamily: ff(headlineFont),
        }}>
          {brandName}
        </div>
      )}
    </div>
  )
}
