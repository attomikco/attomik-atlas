import { TemplateProps, ff, px } from './types'

// ── Easy-to-edit design tokens (all values at 1080px reference) ──────
const HEADLINE_SIZE   = 82       // big, bold, editorial
const BODY_SIZE       = 32
const CTA_SIZE        = 26
const CTA_PAD_V       = 18
const CTA_PAD_H       = 48
const CTA_RADIUS      = 6
const EDGE_PAD        = 64       // padding from all edges
const GRADIENT_HEIGHT  = 0.50    // bottom 50% of image
const DIVIDER_W       = 48
const DIVIDER_H       = 3
const GAP_HEADLINE_DIVIDER = 20
const GAP_DIVIDER_BODY     = 16
const GAP_BODY_CTA         = 28

export default function OverlayTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform,
  bodyFont, bodyWeight, bodyTransform, headlineSizeMul, bodySizeMul,
  ctaColor, ctaFontColor,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Full-bleed image */}
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Bottom gradient — covers bottom half so text is always readable */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: Math.round(height * GRADIENT_HEIGHT),
        background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.82) 100%)',
        pointerEvents: 'none' as const,
      }} />

      {/* Text block — bottom left */}
      <div style={{ position: 'absolute', bottom: p, left: p, right: p }}>
        {headline && (
          <div style={{
            fontSize: px(HEADLINE_SIZE, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.08,
            color: '#fff',
            fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
            maxWidth: '85%',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {headline}
          </div>
        )}

        {/* Thin divider line between headline and body */}
        {headline && bodyText && (
          <div style={{
            width: px(DIVIDER_W, width), height: px(DIVIDER_H, width),
            background: brandColor, borderRadius: 2,
            margin: `${px(GAP_HEADLINE_DIVIDER, width)}px 0 ${px(GAP_DIVIDER_BODY, width)}px`,
          }} />
        )}

        {bodyText && (
          <div style={{
            fontSize: px(BODY_SIZE, width) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400,
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: ff(bodyFont),
            textTransform: bodyTransform as any,
            maxWidth: '80%',
            ...(!headline ? {} : {}),
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
            marginTop: px(GAP_BODY_CTA, width),
            background: ctaColor || brandColor,
            color: ctaFontColor || '#000',
            fontSize: px(CTA_SIZE, width) * bodySizeMul,
            fontWeight: 700,
            padding: `${px(CTA_PAD_V, width)}px ${px(CTA_PAD_H, width)}px`,
            borderRadius: CTA_RADIUS,
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
