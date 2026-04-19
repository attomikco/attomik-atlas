'use client'
import { useEffect, useRef, useState } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block, BackgroundKey } from './types'

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

// Design tokens each BackgroundKey maps to. Phase 2 placeholders use these;
// real block renderers (Phase 3) can reuse the same lookup.
const BG_MAP: Record<BackgroundKey, string> = {
  paper: colors.paper,
  cream: colors.cream,
  ink: colors.ink,
  accent: colors.accent,
  // `custom` falls back to paper in Phase 2 — real custom-color support is
  // a v2 concern (pageSettings doesn't have accent/headingFont overrides
  // in the v1 scope).
  custom: colors.paper,
}

const INK_ON_BG: Record<BackgroundKey, string> = {
  paper: colors.ink,
  cream: colors.ink,
  ink: colors.paper,
  accent: colors.ink,
  custom: colors.ink,
}

// Phase 2 canvas: scrollable gray field with a fixed-width paper that
// auto-scales to fit. Placeholder blocks are gray rectangles with a
// centered mono label {type} · {variant}. Selected block = 2px accent
// outline. Hidden block = diagonal-stripe placeholder. Click canvas
// background (not the paper) to clear selection.
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
    // Only fires when the click hits the outer gray area, not a descendant.
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
            <BlockPlaceholder
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
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: '#ff5f57' }} />
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: '#febc2e' }} />
        <span style={{ width: 10, height: 10, borderRadius: radius.pill, background: '#28c840' }} />
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

function BlockPlaceholder({
  block,
  selected,
  onSelect,
}: {
  block: Block
  selected: boolean
  onSelect: (id: string) => void
}) {
  const bgKey = (block.style?.bg ?? 'paper') as BackgroundKey
  const bg = BG_MAP[bgKey] ?? colors.paper
  const ink = INK_ON_BG[bgKey] ?? colors.ink

  // Click propagation: stopPropagation so the outer canvas click handler
  // doesn't deselect when the user clicks a block.
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(block.id)
  }

  if (!block.visible) {
    return (
      <div
        onClick={handleClick}
        style={{
          padding: spacing[5],
          background: `repeating-linear-gradient(45deg, ${colors.cream}, ${colors.cream} 6px, ${colors.creamDark} 6px, ${colors.creamDark} 12px)`,
          textAlign: 'center', cursor: 'pointer',
          outline: selected ? `2px solid ${colors.accent}` : '2px solid transparent',
          outlineOffset: -2,
        }}
      >
        <span style={{
          fontFamily: font.mono, fontSize: fontSize.caption,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: colors.subtle,
        }}>
          Hidden · {block.type} · {block.variant}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative', cursor: 'pointer',
        outline: selected ? `2px solid ${colors.accent}` : '2px solid transparent',
        outlineOffset: -2,
        background: bg,
        minHeight: 120,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <span style={{
        fontFamily: font.mono, fontSize: fontSize.caption,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: ink, opacity: 0.7,
      }}>
        {block.type} · {block.variant}
      </span>
    </div>
  )
}
