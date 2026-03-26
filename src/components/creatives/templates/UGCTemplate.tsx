import { TemplateProps, ff, px } from './types'

const EDGE_PAD        = 48
const AVATAR_SIZE     = 40
const BRAND_NAME_SIZE = 18
const SPONSORED_SIZE  = 13
const HEADLINE_SIZE   = 44
const BODY_SIZE       = 26
const GRADIENT_HEIGHT = 0.40

export default function UGCTemplate({
  imageUrl, headline, bodyText, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineTransform, headlineColor,
  bodyFont, bodyWeight, bodyTransform, bodyColor, headlineSizeMul, bodySizeMul,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(undefined) }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: Math.round(height * GRADIENT_HEIGHT),
        background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 100%)',
        pointerEvents: 'none' as const,
      }} />

      <div style={{
        position: 'absolute', top: p, left: p, right: p,
        display: 'flex', alignItems: 'center', gap: px(12, width),
      }}>
        <div style={{
          width: px(AVATAR_SIZE, width), height: px(AVATAR_SIZE, width),
          borderRadius: '50%', background: brandColor, flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: px(BRAND_NAME_SIZE, width), fontWeight: 600, color: '#fff', fontFamily: ff(headlineFont) }}>
            {brandName}
          </div>
          <div style={{ fontSize: px(SPONSORED_SIZE, width), fontWeight: 400, color: 'rgba(255,255,255,0.55)' }}>
            Sponsored
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: p, left: p, right: p, maxWidth: '85%' }}>
        {headline && (
          <div style={{
            fontSize: px(HEADLINE_SIZE, width) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 700, lineHeight: 1.2,
            color: headlineColor, fontFamily: ff(headlineFont),
            textTransform: headlineTransform as any,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {headline}
          </div>
        )}
        {bodyText && (
          <div style={{
            fontSize: px(BODY_SIZE, width) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400, lineHeight: 1.45,
            color: bodyColor, fontFamily: ff(bodyFont),
            textTransform: bodyTransform as any, marginTop: px(8, width),
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>
            {bodyText}
          </div>
        )}
      </div>
    </div>
  )
}
