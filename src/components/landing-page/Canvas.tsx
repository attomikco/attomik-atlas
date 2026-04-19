'use client'
import { useEffect, useRef, useState } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from './types'
import { BlockWrap } from './BlockWrap'

type Device = 'desktop' | 'tablet' | 'mobile'

interface Props {
  blocks: Block[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  device: Device
  zoom: number
}

const DEVICE_WIDTH: Record<Device, number> = {
  desktop: 1280,
  tablet: 820,
  mobile: 390,
}

// Phase 3: real block rendering. <BlockWrap> handles selection chrome,
// click-to-select with stopPropagation, and routes to the registry's
// renderer. The outer gray field handles click-canvas-bg-to-deselect
// via the e.target === e.currentTarget check.
export function Canvas({ blocks, selectedId, onSelect, device, zoom }: Props) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [autoScale, setAutoScale] = useState(1)
  const deviceWidth = DEVICE_WIDTH[device]

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const compute = () => {
      const avail = el.clientWidth - 48
      const s = Math.min(1, avail / deviceWidth)
      setAutoScale(s > 0 ? s : 1)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [deviceWidth])

  const scale = autoScale * (zoom / 100)

  const handleOuterClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onSelect(null)
  }

  return (
    <div
      ref={outerRef}
      onClick={handleOuterClick}
      style={{
        flex: 1, overflow: 'auto',
        padding: `${spacing[6]}px ${spacing[6]}px ${spacing[20]}px`,
        background: colors.canvasGray,
        display: 'flex', justifyContent: 'center',
      }}
    >
      <div style={{ width: deviceWidth * scale, transition: 'width .2s' }} onClick={handleOuterClick}>
        <div style={{
          width: deviceWidth,
          transform: `scale(${scale})`, transformOrigin: 'top left',
          background: colors.paper,
          boxShadow: '0 4px 32px rgba(0,0,0,0.1)',
          borderRadius: radius.sm,
          overflow: 'hidden',
        }}>
          <BrowserBar />
          {blocks.length === 0 && <EmptyState />}
          {blocks.map(b => (
            <BlockWrap
              key={b.id}
              block={b}
              selected={b.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function BrowserBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: spacing[3],
      padding: `${spacing[2]}px ${spacing[4]}px`,
      borderBottom: `1px solid ${colors.border}`, background: colors.cream,
    }}>
      <div style={{ display: 'flex', gap: spacing[1] }}>
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: colors.trafficRed }} />
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: colors.trafficYellow }} />
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: colors.trafficGreen }} />
      </div>
      <div style={{
        flex: 1, background: colors.paper, border: `1px solid ${colors.border}`,
        borderRadius: radius.pill, padding: `4px ${spacing[3]}px`,
        fontSize: fontSize.caption, color: colors.subtle, fontFamily: font.mono,
      }}>🔒 preview</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: `${spacing[20]}px ${spacing[6]}px`,
      textAlign: 'center', color: colors.subtle,
    }}>
      <div style={{ fontSize: 48, marginBottom: spacing[3] }}>◯</div>
      <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.xl, color: colors.ink, marginBottom: spacing[2], textTransform: 'uppercase' }}>
        Start your page
      </div>
      <div style={{ fontSize: fontSize.body, maxWidth: 340, margin: '0 auto', lineHeight: 1.5 }}>
        Block library + drag-to-add arrive in Phase 4.
      </div>
    </div>
  )
}
