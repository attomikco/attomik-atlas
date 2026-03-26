import { TemplateProps, ff, px } from './types'

// ── Easy-to-edit design tokens (all values at 1080px reference) ──────
const STAT_SIZE       = 160      // massive stat number
const LABEL_SIZE      = 24       // small label above stat
const SUPPORT_SIZE    = 28       // supporting text below stat
const BRAND_SIZE      = 16       // brand name at bottom
const EDGE_PAD        = 64
const DIVIDER_W       = 56
const DIVIDER_H       = 3
const GAP_LABEL_STAT  = 16
const GAP_STAT_DIV    = 24
const GAP_DIV_SUPPORT = 20
const OVERLAY_OPACITY = 0.55

export default function StatTemplate({
  imageUrl, headline, bodyText, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, headlineSizeMul, bodySizeMul,
  headlineColor,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)
  const statColor = (headlineColor === '#ffffff' || headlineColor === '#fff') ? brandColor : headlineColor

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Full-bleed image */}
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${OVERLAY_OPACITY})` }} />

      {/* Centered content */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center', padding: p, textAlign: 'center' as const,
      }}>
        {/* Small label ABOVE stat */}
        {bodyText && (
          <div style={{
            fontSize: px(LABEL_SIZE, width) * bodySizeMul,
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            color: 'rgba(255,255,255,0.7)',
            fontFamily: ff(bodyFont),
            marginBottom: px(GAP_LABEL_STAT, width),
          }}>
            {bodyText}
          </div>
        )}

        {/* Big stat number */}
        {headline && (
          <div style={{
            fontSize: px(STAT_SIZE, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: statColor || brandColor,
            fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
          }}>
            {headline}
          </div>
        )}

        {/* Divider line */}
        <div style={{
          width: px(DIVIDER_W, width), height: px(DIVIDER_H, width),
          background: brandColor, borderRadius: 2,
          margin: `${px(GAP_STAT_DIV, width)}px 0 ${px(GAP_DIV_SUPPORT, width)}px`,
          opacity: 0.8,
        }} />

        {/* Supporting text BELOW stat */}
        {bodyText && (
          <div style={{
            fontSize: px(SUPPORT_SIZE, width) * bodySizeMul,
            fontWeight: 400,
            lineHeight: 1.4,
            color: 'rgba(255,255,255,0.8)',
            fontFamily: ff(bodyFont),
            textTransform: bodyTransform as any,
            maxWidth: '80%',
          }}>
            {bodyText}
          </div>
        )}
      </div>

      {/* Brand name — bottom center */}
      <div style={{
        position: 'absolute', bottom: p, left: 0, right: 0,
        textAlign: 'center' as const,
        fontSize: px(BRAND_SIZE, width),
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
