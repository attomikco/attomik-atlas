import { TemplateProps, ff, px, autoSize } from './types'

const LABEL_SIZE = 32
const ITEM_SIZE = 28
const ICON_SIZE = 32
const EDGE_PAD = 56
const GAP = 28
const VS_SIZE = 48

export default function ComparisonTemplate({
  headline, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineColor,
  bodyFont, bodyWeight, bodyColor, headlineSizeMul, bodySizeMul,
  bgColor, oldWayItems, newWayItems, imageUrl, imagePosition,
}: TemplateProps) {
  const panelW = width / 2
  const p = px(EDGE_PAD, width)
  const gap = px(GAP, width)
  const oldItems = oldWayItems?.length ? oldWayItems : ['Artificial ingredients', 'Sugary mixers', 'Next-day regret']
  const newItems = newWayItems?.length ? newWayItems : ['All natural', 'Zero sugar', 'Feel great tomorrow']
  const accent = bgColor || brandColor || '#00ff97'

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width, height, fontFamily: ff(bodyFont) }}>
      {/* Full bleed image */}
      {imageUrl ? (
        <img crossOrigin="anonymous" src={imageUrl} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: `center ${imagePosition || 'center'}`,
        }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#1a1a1a' }} />
      )}

      {/* Two overlay columns */}
      <div style={{ position: 'relative', display: 'flex', width, height }}>
        {/* Left: Old Way — dark red tint */}
        <div style={{
          width: panelW, height, background: 'rgba(0,0,0,0.75)',
          display: 'flex', flexDirection: 'column' as const,
          padding: `${p * 1.5}px ${p}px ${p}px`,
        }}>
          <div style={{
            fontSize: px(LABEL_SIZE, width) * headlineSizeMul, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
            color: '#ff6b6b', fontFamily: ff(headlineFont),
            marginBottom: gap,
          }}>
            The Old Way
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', gap: gap }}>
            {oldItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(14, width) }}>
                <span style={{
                  fontSize: px(ICON_SIZE, width), lineHeight: 1, color: '#ff6b6b', flexShrink: 0, fontWeight: 700,
                }}>&#x2717;</span>
                <span style={{
                  fontSize: autoSize(px(ITEM_SIZE, width), item, 35) * bodySizeMul,
                  fontWeight: parseInt(bodyWeight) || 400, lineHeight: 1.35, color: 'rgba(255,255,255,0.8)',
                }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Brand Way — brand color tint */}
        <div style={{
          width: panelW, height, background: `${accent}dd`,
          display: 'flex', flexDirection: 'column' as const,
          padding: `${p * 1.5}px ${p}px ${p}px`,
        }}>
          <div style={{
            fontSize: px(LABEL_SIZE, width) * headlineSizeMul, fontWeight: 800,
            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
            color: '#fff', fontFamily: ff(headlineFont),
            marginBottom: gap,
          }}>
            The {brandName} Way
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', gap: gap }}>
            {newItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(14, width) }}>
                <span style={{
                  fontSize: px(ICON_SIZE, width), lineHeight: 1, color: '#fff', flexShrink: 0, fontWeight: 700,
                }}>&#x2713;</span>
                <span style={{
                  fontSize: autoSize(px(ITEM_SIZE, width), item, 35) * bodySizeMul,
                  fontWeight: parseInt(bodyWeight) || 400, lineHeight: 1.35, color: '#fff',
                }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* VS badge center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: px(VS_SIZE * 1.6, width), height: px(VS_SIZE * 1.6, width),
          borderRadius: '50%', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: px(VS_SIZE * 0.5, width), fontWeight: 900, color: '#000',
          fontFamily: ff(headlineFont), letterSpacing: '-0.02em',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          VS
        </div>
      </div>
    </div>
  )
}
