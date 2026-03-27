import { TemplateProps, ff, px, autoSize } from './types'

const LABEL_SIZE = 28
const ITEM_SIZE = 26
const ICON_SIZE = 30
const EDGE_PAD = 48
const GAP = 24
const LOGO_H = 36

export default function ComparisonTemplate({
  headline, brandColor, brandName, width, height,
  headlineFont, headlineWeight, headlineColor,
  bodyFont, bodyWeight, bodyColor, headlineSizeMul, bodySizeMul,
  bgColor, oldWayItems, newWayItems, brandLogoUrl, imageUrl, imagePosition,
}: TemplateProps) {
  const panelW = width / 2
  const p = px(EDGE_PAD, width)
  const gap = px(GAP, width)
  const oldItems = oldWayItems?.slice(0, 3) || []
  const newItems = newWayItems?.slice(0, 3) || []

  const panel = (bg: string, label: string, items: string[], icon: string, iconColor: string, textColor: string) => (
    <div style={{
      width: panelW, height, background: bg,
      display: 'flex', flexDirection: 'column' as const,
      padding: `${p * 1.5}px ${p}px ${p}px`,
      fontFamily: ff(bodyFont),
    }}>
      <div style={{
        fontSize: px(LABEL_SIZE, width) * headlineSizeMul, fontWeight: 800,
        letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        color: textColor, fontFamily: ff(headlineFont), opacity: 0.9,
        marginBottom: gap * 1.5,
      }}>
        {label}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, justifyContent: 'center', gap: gap * 1.2 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: px(14, width) }}>
            <span style={{
              fontSize: px(ICON_SIZE, width), lineHeight: 1, color: iconColor, flexShrink: 0,
              fontWeight: 700,
            }}>
              {icon}
            </span>
            <span style={{
              fontSize: autoSize(px(ITEM_SIZE, width), item, 40) * bodySizeMul,
              fontWeight: parseInt(bodyWeight) || 400, lineHeight: 1.35,
              color: textColor,
            }}>
              {item || '\u00A0'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', overflow: 'hidden', width, height }}>
      {panel(
        '#e8e8e8',
        'The Old Way',
        oldItems.length > 0 ? oldItems : ['Artificial ingredients', 'Sugary mixers', 'Next-day regret'],
        '\u2717',
        '#cc3333',
        '#333',
      )}
      <div style={{ width: panelW, height, position: 'relative', overflow: 'hidden' }}>
        {imageUrl && (
          <>
            <img crossOrigin="anonymous" src={imageUrl} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: `center ${imagePosition || 'center'}`, opacity: 0.15,
            }} />
          </>
        )}
      {panel(
        imageUrl ? 'transparent' : (bgColor || brandColor || '#000'),
        `The ${brandName} Way`,
        newItems.length > 0 ? newItems : ['All natural', 'Zero sugar', 'Feel great tomorrow'],
        '\u2713',
        '#33cc66',
        headlineColor || '#fff',
      )}
      </div>
    </div>
  )
}
