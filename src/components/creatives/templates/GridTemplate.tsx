import { TemplateProps, ff, px, autoSize } from './types'

const PAD = 48
const GAP = 8
const HEADLINE_SIZE = 104
const BODY_SIZE = 62
const CTA_SIZE = 24
const CTA_PAD_V = 14
const CTA_PAD_H = 36

export default function GridTemplate({
  imageUrl, headline, bodyText, ctaText, brandColor, brandName, width, height,
  showCta, headlineFont, headlineWeight, headlineTransform, headlineColor,
  bodyFont, bodyWeight, bodyTransform, bodyColor, headlineSizeMul, bodySizeMul,
  ctaColor, ctaFontColor, bgColor, imagePosition, productImageUrl,
}: TemplateProps) {
  const gap = px(GAP, width)
  const cellW = (width - gap) / 2
  const cellH = (height - gap) / 2
  const pad = px(PAD, width)

  const textCell = (content: React.ReactNode, bg: string) => (
    <div style={{
      width: cellW, height: cellH, background: bg,
      display: 'flex', flexDirection: 'column' as const,
      justifyContent: 'center', padding: pad,
    }}>
      {content}
    </div>
  )

  const imgCell = (url: string | null | undefined) => (
    <div style={{ width: cellW, height: cellH, position: 'relative', overflow: 'hidden' }}>
      {url ? (
        <img crossOrigin="anonymous" src={url} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: `center ${imagePosition || 'center'}`,
        }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#e0e0e0' }} />
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, width, height, gap, fontFamily: ff(bodyFont) }}>
      {/* Top-left: headline on bg */}
      {textCell(
        <>
          {headline && (
            <div style={{
              fontSize: autoSize(px(HEADLINE_SIZE, width), headline, 20) * headlineSizeMul,
              fontWeight: parseInt(headlineWeight) || 800,
              letterSpacing: '-0.02em', lineHeight: 1.15,
              color: headlineColor, fontFamily: ff(headlineFont),
              textTransform: headlineTransform as any,
            }}>
              {headline}
            </div>
          )}
        </>,
        bgColor || '#000',
      )}

      {/* Top-right: image 1 */}
      {imgCell(imageUrl)}

      {/* Bottom-left: image 2 (falls back to image 1) */}
      {imgCell(productImageUrl || imageUrl)}

      {/* Bottom-right: body + CTA on accent */}
      {textCell(
        <>
          {bodyText && (
            <div style={{
              fontSize: autoSize(px(BODY_SIZE, width), bodyText, 50) * bodySizeMul,
              fontWeight: parseInt(bodyWeight) || 400,
              lineHeight: 1.45, color: bodyColor,
              fontFamily: ff(bodyFont), textTransform: bodyTransform as any,
            }}>
              {bodyText}
            </div>
          )}
          {showCta && (
            <div style={{
              marginTop: px(16, width), display: 'inline-block', alignSelf: 'flex-start',
              background: ctaColor || brandColor, color: ctaFontColor || '#000',
              fontSize: px(CTA_SIZE, width), fontWeight: 700,
              padding: `${px(CTA_PAD_V, width)}px ${px(CTA_PAD_H, width)}px`,
              borderRadius: 6, fontFamily: ff(headlineFont), lineHeight: 1,
            }}>
              {ctaText || 'Shop Now'}
            </div>
          )}
        </>,
        brandColor || '#1a1a1a',
      )}
    </div>
  )
}
