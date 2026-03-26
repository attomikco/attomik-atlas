import { TemplateProps, ff, px, autoSize, positionStyles } from './types'

const STAT_SIZE       = 160
const LABEL_SIZE      = 24
const SUPPORT_SIZE    = 28
const BRAND_SIZE      = 16
const EDGE_PAD        = 64
const DIVIDER_W       = 56
const DIVIDER_H       = 3
const GAP_LABEL_STAT  = 16
const GAP_STAT_DIV    = 24
const GAP_DIV_SUPPORT = 20
const OVERLAY_OPACITY = 0.30

export default function StatTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, headlineSizeMul, bodySizeMul,
  headlineColor, bodyColor, bgColor, showOverlay, overlayOpacity, imagePosition, textPosition,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)
  const pos = positionStyles(textPosition)
  const statColor = (headlineColor === '#ffffff' || headlineColor === '#fff') ? brandColor : headlineColor

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont), background: bgColor }}>
      {imageUrl ? (
        <img crossOrigin="anonymous" src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${imagePosition || 'center'}` }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: bgColor || '#1a1a1a' }} />
      )}

      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${showOverlay ? overlayOpacity : OVERLAY_OPACITY})` }} />

      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const,
        alignItems: pos.alignItems === 'flex-end' ? 'flex-end' : pos.alignItems === 'center' ? 'center' : 'flex-start',
        justifyContent: pos.justifyContent,
        padding: `${textPosition.startsWith('top') && height / width > 1.4 ? p * 3 : p}px ${p}px ${p}px`,
        textAlign: pos.textAlign,
      }}>
        {ctaText && (() => {
          const callouts = ctaText.split(/[|,]/).map(s => s.trim()).filter(Boolean)
          return callouts.length > 1 ? (
            <div style={{ display: 'flex', gap: px(24, width), marginBottom: px(GAP_LABEL_STAT, width) }}>
              {callouts.map((c, i) => (
                <div key={i} style={{
                  fontSize: px(LABEL_SIZE, width) * bodySizeMul, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  color: 'rgba(255,255,255,0.7)', fontFamily: ff(bodyFont),
                }}>
                  {c}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              fontSize: px(LABEL_SIZE, width) * bodySizeMul, fontWeight: 600,
              letterSpacing: '0.15em', textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.7)', fontFamily: ff(bodyFont),
              marginBottom: px(GAP_LABEL_STAT, width),
            }}>
              {ctaText}
            </div>
          )
        })()}

        {headline && (
          <div style={{
            fontSize: px(STAT_SIZE, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.04em', lineHeight: 1,
            color: statColor || brandColor,
            fontFamily: ff(headlineFont), textTransform: headlineTransform as any,
          }}>
            {headline}
          </div>
        )}

        <div style={{
          width: px(DIVIDER_W, width), height: px(DIVIDER_H, width),
          background: headlineColor, borderRadius: 2, opacity: 0.8,
          margin: `${px(GAP_STAT_DIV, width)}px 0 ${px(GAP_DIV_SUPPORT, width)}px`,
        }} />

        {bodyText && (
          <div style={{
            fontSize: autoSize(px(SUPPORT_SIZE, width), bodyText, 50) * bodySizeMul, fontWeight: 400,
            lineHeight: 1.4, color: 'rgba(255,255,255,0.8)', fontFamily: ff(bodyFont),
            textTransform: bodyTransform as any, maxWidth: '80%',
          }}>
            {bodyText}
          </div>
        )}
      </div>

      <div style={{
        position: 'absolute', bottom: p, left: 0, right: 0,
        textAlign: 'center' as const, fontSize: px(BRAND_SIZE, width),
        fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
        color: 'rgba(255,255,255,0.5)', fontFamily: ff(headlineFont),
      }}>
        {brandName}
      </div>
    </div>
  )
}
