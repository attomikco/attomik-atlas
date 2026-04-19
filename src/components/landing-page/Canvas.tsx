'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { colors, font, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/lib/design-tokens'
import type { Brand } from '@/types'
import type { Block, BlockType } from './types'
import { BlockWrap } from './BlockWrap'
import type { RenderMode } from './blocks/registry'
import { getPageTheme } from './lib/getPageTheme'
import type { BrandImageBundle } from './lib/brandImageBundle'

type Device = 'desktop' | 'tablet' | 'mobile'

interface Props {
  blocks: Block[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onInsertAt: (type: BlockType, index: number, opts?: { select?: boolean }) => void
  device: Device
  zoom: number
  brand: Brand
  brandImages: BrandImageBundle
  mode: RenderMode
}

const DEVICE_WIDTH: Record<Device, number> = {
  desktop: 1280,
  tablet: 820,
  mobile: 390,
}

// Canvas renders real blocks via <BlockWrap>. <InsertZone>s between every
// pair of blocks (and at top/bottom) accept drags from the Blocks library
// and click to insert a richtext block at that index (confirmed default).
// Outer gray-field click with e.target === e.currentTarget clears selection.
export function Canvas({ blocks, selectedId, onSelect, onInsertAt, device, zoom, brand, brandImages, mode }: Props) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [autoScale, setAutoScale] = useState(1)
  const deviceWidth = DEVICE_WIDTH[device]
  const themeResult = useMemo(() => getPageTheme(brand, brandImages), [brand, brandImages])

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
          <CanvasBody
            theme={themeResult.valid ? themeResult.theme : null}
            missing={themeResult.missing}
            blocks={blocks}
            selectedId={selectedId}
            onSelect={onSelect}
            onInsertAt={onInsertAt}
            mode={mode}
          />
        </div>
      </div>
    </div>
  )
}

// Collapsed 8px strip between blocks (and at top/bottom). Expands to 36px
// on hover or when a library card is dragged over. Click = insert richtext
// (confirmed default; later we may swap for a type-picker popover). Drop
// with a dataTransfer.blockType payload = insert that type.
function InsertZone({ index, onInsert, last }: { index: number; onInsert: (type: BlockType, i: number, opts?: { select?: boolean }) => void; last?: boolean }) {
  const [hover, setHover] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setHover(false)
    const raw = e.dataTransfer.getData('blockType')
    if (!raw) return
    // Drop carries explicit user intent ("put this block here, I'll edit it
    // next") — select the new block so the inspector opens on it.
    onInsert(raw as BlockType, index, { select: true })
  }

  const expanded = hover || dragActive
  const labelText = dragActive ? 'Drop here' : '+ Add block'

  return (
    <div
      // Click (no drag data) inserts a richtext stub but keeps selection
      // where it was — the user was navigating between existing blocks,
      // not asking to pivot focus onto the stub.
      onClick={e => { e.stopPropagation(); onInsert('richtext', index, { select: false }) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={e => { e.preventDefault(); setDragActive(true) }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      style={{
        height: expanded ? 36 : 8,
        position: 'relative',
        transition: 'height .15s',
        cursor: 'pointer',
        background: dragActive ? colors.accentMid : 'transparent',
        marginTop: last ? 0 : undefined,
      }}
    >
      {expanded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[2] }}>
          <div style={{ flex: 1, height: 1, background: dragActive ? colors.accent : colors.disabled, margin: `0 ${spacing[5]}px` }} />
          <div style={{
            fontSize: fontSize.xs, fontFamily: font.mono,
            textTransform: 'uppercase', letterSpacing: letterSpacing.widest,
            background: dragActive ? colors.accent : colors.ink,
            color: dragActive ? colors.ink : colors.accent,
            padding: `3px ${spacing[3]}px`, borderRadius: radius.pill,
            fontWeight: fontWeight.bold, whiteSpace: 'nowrap',
          }}>{labelText}</div>
          <div style={{ flex: 1, height: 1, background: dragActive ? colors.accent : colors.disabled, margin: `0 ${spacing[5]}px` }} />
        </div>
      )}
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

// Extracted so TS can narrow theme|null via a null guard into a separate
// return branch, which it can't do cleanly inside the JSX ternary.
function CanvasBody({
  theme, missing, blocks, selectedId, onSelect, onInsertAt, mode,
}: {
  theme: import('./lib/getPageTheme').PageTheme | null
  missing: string[]
  blocks: Block[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onInsertAt: (type: BlockType, index: number, opts?: { select?: boolean }) => void
  mode: RenderMode
}) {
  if (!theme) return <ThemeMissing missing={missing} />
  return (
    <>
      {blocks.length === 0 && <EmptyState />}
      {blocks.map((b, i) => (
        <div key={b.id}>
          <InsertZone index={i} onInsert={onInsertAt} />
          <BlockWrap
            block={b}
            selected={b.id === selectedId}
            onSelect={onSelect}
            theme={theme}
            mode={mode}
          />
        </div>
      ))}
      <InsertZone index={blocks.length} onInsert={onInsertAt} last />
    </>
  )
}

// Rendered inside the canvas paper when getPageTheme returns invalid (the
// brand is missing primary_color / accent_color). Drops the user straight
// into Brand Hub rather than crashing or rendering unthemed blocks. Chrome
// stays Attomik-themed (cream / ink / accent tokens) because this is builder
// surface, not rendered-page surface.
function ThemeMissing({ missing }: { missing: string[] }) {
  return (
    <div style={{
      padding: `${spacing[20]}px ${spacing[8]}px`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      minHeight: 420, background: colors.paper,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: radius.lg,
        border: `2px dashed ${colors.border}`, background: colors.cream,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, color: colors.subtle, marginBottom: spacing[5],
      }}>◐</div>
      <div style={{
        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['3xl'],
        textTransform: 'uppercase', letterSpacing: letterSpacing.slight,
        color: colors.ink, marginBottom: spacing[3], maxWidth: 460,
      }}>Set your brand colors to build your landing page</div>
      <div style={{
        fontSize: fontSize.body, color: colors.muted,
        maxWidth: 440, lineHeight: 1.5, marginBottom: spacing[5],
      }}>
        Your landing page uses your brand&rsquo;s primary color and accent color.
        Set them in Brand Hub to get started.
      </div>
      <Link
        href="/brand-hub"
        style={{
          display: 'inline-block',
          padding: `${spacing[3]}px ${spacing[5]}px`,
          background: colors.ink, color: colors.accent,
          borderRadius: radius.md, textDecoration: 'none',
          fontFamily: font.heading, fontWeight: fontWeight.extrabold,
          fontSize: fontSize.body, letterSpacing: letterSpacing.label,
          textTransform: 'uppercase',
        }}
      >Open Brand Hub →</Link>
      {missing.length > 0 && (
        <div style={{
          marginTop: spacing[4],
          fontFamily: font.mono, fontSize: fontSize.xs,
          letterSpacing: letterSpacing.widest, textTransform: 'uppercase',
          color: colors.subtle,
        }}>
          Missing: {missing.join(', ')}
        </div>
      )}
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
        Drop a block from the library on the left — or click between any two blocks to insert.
      </div>
    </div>
  )
}
