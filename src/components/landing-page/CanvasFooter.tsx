'use client'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'

type Device = 'desktop' | 'tablet' | 'mobile'

interface Props {
  blockCount: number
  device: Device
  zoom: number
  onZoom: (z: number) => void
  version: number
}

const DEVICE_LABEL: Record<Device, string> = {
  desktop: '1280px',
  tablet: '820px',
  mobile: '390px',
}

// Sticky bottom-of-canvas chrome. Left: block count · device width · version.
// Right: zoom − / % / +  / Fit.
export function CanvasFooter({ blockCount, device, zoom, onZoom, version }: Props) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center', gap: spacing[3],
      padding: `${spacing[2]}px ${spacing[4]}px`,
      background: colors.paper,
      borderTop: `1px solid ${colors.border}`,
      zIndex: 10,
    }}>
      <div style={{
        fontFamily: font.mono, fontSize: fontSize.caption,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.subtle,
      }}>
        {blockCount} block{blockCount === 1 ? '' : 's'} · {DEVICE_LABEL[device]} · v{version}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <ZoomBtn onClick={() => onZoom(Math.max(25, zoom - 25))}>−</ZoomBtn>
        <span style={{
          fontFamily: font.mono, fontSize: fontSize.body,
          minWidth: 38, textAlign: 'center', color: colors.ink,
        }}>{zoom}%</span>
        <ZoomBtn onClick={() => onZoom(Math.min(150, zoom + 25))}>+</ZoomBtn>
        <button onClick={() => onZoom(100)} style={{
          height: 26, padding: `0 ${spacing[3]}px`,
          border: `1px solid ${colors.border}`, background: colors.paper, borderRadius: radius.sm,
          cursor: 'pointer', fontSize: fontSize.caption, fontFamily: font.mono,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.ink,
        }}>Fit</button>
      </div>
    </div>
  )
}

function ZoomBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 26, height: 26,
      border: `1px solid ${colors.border}`, background: colors.paper, borderRadius: radius.sm,
      cursor: 'pointer', fontSize: fontSize.md, fontWeight: fontWeight.bold, lineHeight: 1, color: colors.ink,
    }}>{children}</button>
  )
}
