import { TemplateProps, ff, px, autoSize } from './types'

const HEADLINE_SIZE = 80
const SUBTITLE_SIZE = 30
const EDGE_PAD = 80
const PRODUCT_SIZE = 0.22
const LOGO_H = 32

export default function MissionTemplate({
  imageUrl, headline, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineTransform, headlineColor,
  bodyFont, bodyWeight, bodyColor, headlineSizeMul, bodySizeMul,
  showOverlay, overlayOpacity, subtitle, brandLogoUrl, productImageUrl, imagePosition,
}: TemplateProps) {
  const p = px(EDGE_PAD, width)
  const ov = showOverlay ? overlayOpacity : 0.5
  const prodSize = Math.round(Math.min(width, height) * PRODUCT_SIZE)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Background image */}
      {imageUrl ? (
        <img crossOrigin="anonymous" src={imageUrl} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: `center ${imagePosition || 'center'}`,
        }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${ov})` }} />

      {/* Brand logo top-left */}
      {brandLogoUrl && (
        <img crossOrigin="anonymous" src={brandLogoUrl} alt="" style={{
          position: 'absolute', top: p, left: p,
          height: px(LOGO_H, width), objectFit: 'contain',
        }} />
      )}

      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center', padding: `${p}px ${p * 1.2}px`,
        textAlign: 'center' as const,
      }}>
        {headline && (
          <div style={{
            fontSize: autoSize(px(HEADLINE_SIZE, width), headline, 28) * headlineSizeMul,
            fontWeight: parseInt(headlineWeight) || 800,
            letterSpacing: '-0.02em', lineHeight: 1.1,
            color: headlineColor || '#fff',
            fontFamily: ff(headlineFont), textTransform: headlineTransform as any,
            maxWidth: '90%',
          }}>
            {headline}
          </div>
        )}
        {(subtitle || '') && (
          <div style={{
            fontSize: autoSize(px(SUBTITLE_SIZE, width), subtitle || '', 60) * bodySizeMul,
            fontWeight: parseInt(bodyWeight) || 400,
            lineHeight: 1.45, color: bodyColor || 'rgba(255,255,255,0.85)',
            fontFamily: ff(bodyFont), marginTop: px(20, width),
            maxWidth: '80%',
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Product image bottom-right */}
      {productImageUrl && (
        <img crossOrigin="anonymous" src={productImageUrl} alt="" style={{
          position: 'absolute', bottom: p, right: p,
          width: prodSize, height: prodSize,
          objectFit: 'contain',
        }} />
      )}

      {/* Brand name watermark */}
      {!brandLogoUrl && (
        <div style={{
          position: 'absolute', bottom: px(24, width), left: 0, right: 0,
          textAlign: 'center', fontSize: px(16, width),
          fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: bodyColor || '#ffffff', fontFamily: ff(headlineFont),
        }}>
          {brandName}
        </div>
      )}
    </div>
  )
}
