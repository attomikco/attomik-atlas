'use client'
import { useState } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import { BLOCK_GROUPS, BLOCK_REGISTRY, blocksInGroup, type BlockConfig } from './blocks/registry'
import type { Block } from './types'
import type { BuilderActions } from './BuilderClient'

export type LeftTab = 'blocks' | 'outline' | 'pages' | 'assets' | 'templates' | 'history'

const TABS: Array<{ id: LeftTab; label: string; icon: string }> = [
  { id: 'blocks',    label: 'Blocks',    icon: '⊞' },
  { id: 'outline',   label: 'Outline',   icon: '≡' },
  { id: 'pages',     label: 'Pages',     icon: '⌘' },
  { id: 'assets',    label: 'Assets',    icon: '▣' },
  { id: 'templates', label: 'Templates', icon: '◈' },
  { id: 'history',   label: 'History',   icon: '◷' },
]

interface Props {
  tab: LeftTab
  onTab: (t: LeftTab) => void
  blocks: Block[]
  selectedId: string | null
  actions: BuilderActions
}

// Phase 4: Blocks panel click appends, drag wires to InsertZone drops.
// OutlinePanel is the real row-per-block list with HTML5 DnD reorder.
// Remaining 4 panels still stub for Phase 6.
export function LeftRail({ tab, onTab, blocks, selectedId, actions }: Props) {
  return (
    <div style={{
      display: 'flex', height: '100%',
      background: colors.paper, borderRight: `1px solid ${colors.border}`,
      flexShrink: 0,
    }}>
      <div style={{
        width: 48, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: `${spacing[2]}px 0`, gap: 4,
        borderRight: `1px solid ${colors.border}`, background: colors.cream,
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => onTab(t.id)} title={t.label} style={{
              width: 36, height: 36, border: 'none', cursor: 'pointer',
              borderRadius: radius.md,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? colors.ink : 'transparent',
              color: active ? colors.accent : colors.muted,
            }}>
              <span style={{ fontSize: fontSize.md, fontFamily: font.heading, fontWeight: fontWeight.heading }}>
                {t.icon}
              </span>
            </button>
          )
        })}
      </div>
      <div style={{
        width: 256, height: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {tab === 'blocks' && <BlocksPanel blocks={blocks} actions={actions} />}
        {tab === 'outline' && <OutlinePanel blocks={blocks} selectedId={selectedId} actions={actions} />}
        {tab !== 'blocks' && tab !== 'outline' && <PanelStub tab={tab} />}
      </div>
    </div>
  )
}

// ── Blocks panel ────────────────────────────────────────────────────
function BlocksPanel({ blocks, actions }: { blocks: Block[]; actions: BuilderActions }) {
  const counts: Record<string, number> = {}
  for (const b of blocks) counts[b.type] = (counts[b.type] ?? 0) + 1

  return (
    <div style={{ padding: `${spacing[4]}px ${spacing[3]}px`, display: 'flex', flexDirection: 'column', gap: spacing[2], overflow: 'auto' }}>
      <div style={{
        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
        textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.ink,
      }}>Block Library</div>
      <div style={{ fontSize: fontSize.caption, color: colors.subtle, marginBottom: spacing[2] }}>
        Click a card to append · drag onto a slot to insert
      </div>

      {BLOCK_GROUPS.map(group => {
        const items = blocksInGroup(group)
        if (items.length === 0) return null
        return (
          <div key={group} style={{ marginBottom: spacing[3] }}>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.xs,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
              marginBottom: spacing[2], paddingLeft: 4,
            }}>{group}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[1] + 2 }}>
              {items.map(cfg => (
                <BlockCard
                  key={cfg.type}
                  config={cfg}
                  count={counts[cfg.type] ?? 0}
                  onClick={() => actions.appendBlock(cfg.type)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BlockCard({ config, count, onClick }: { config: BlockConfig; count: number; onClick: () => void }) {
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData('blockType', config.type)
    e.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <button
      type="button"
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      title={config.desc}
      style={{
        border: `1px solid ${colors.border}`, borderRadius: radius.md,
        padding: `${spacing[3]}px ${spacing[2]}px`, textAlign: 'center',
        cursor: 'grab', background: colors.paper, fontFamily: 'inherit',
        userSelect: 'none', position: 'relative',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: radius.md,
        background: colors.ink, color: colors.accent,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.base,
      }}>{config.glyph}</div>
      <div style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: spacing[1], color: colors.ink }}>
        {config.label}
      </div>
      {count > 0 && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: radius.pill,
          background: colors.accent, color: colors.ink,
          fontFamily: font.mono, fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}>{count}</div>
      )}
    </button>
  )
}

// ── Outline panel ───────────────────────────────────────────────────
// Reorderable row list. Drag handle + block glyph + type + variant label +
// visibility / duplicate / delete buttons. Selected row gets the
// accent-tint background + accent-tint border per handoff outlineRowSel.
function OutlinePanel({
  blocks, selectedId, actions,
}: {
  blocks: Block[]; selectedId: string | null; actions: BuilderActions
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  return (
    <div style={{ padding: `${spacing[4]}px ${spacing[3]}px`, display: 'flex', flexDirection: 'column', gap: spacing[2], overflow: 'auto' }}>
      <div style={{
        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
        textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.ink,
      }}>Page Outline</div>
      <div style={{ fontSize: fontSize.caption, color: colors.subtle, marginBottom: spacing[1] }}>
        {blocks.length} block{blocks.length === 1 ? '' : 's'} · drag to reorder
      </div>

      {blocks.map((b, i) => {
        const meta = BLOCK_REGISTRY[b.type]
        const isSelected = b.id === selectedId
        const isDragging = dragIdx === i
        const isDropTarget = overIdx === i && dragIdx !== null && dragIdx !== i
        return (
          <div
            key={b.id}
            draggable
            onDragStart={e => {
              setDragIdx(i)
              e.dataTransfer.setData('outlineIdx', String(i))
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={e => { e.preventDefault(); setOverIdx(i) }}
            onDragLeave={() => setOverIdx(prev => (prev === i ? null : prev))}
            onDrop={e => {
              e.preventDefault()
              const from = Number(e.dataTransfer.getData('outlineIdx'))
              if (!Number.isNaN(from) && from !== i) actions.reorder(from, i)
              setDragIdx(null); setOverIdx(null)
            }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
            onClick={() => actions.select(b.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: spacing[2],
              padding: `${spacing[2]}px ${spacing[2]}px`,
              borderRadius: radius.md,
              cursor: 'grab',
              border: `1px solid ${isSelected ? colors.accentTintBorder : 'transparent'}`,
              background: isSelected ? colors.accentMid : 'transparent',
              opacity: b.visible ? (isDragging ? 0.5 : 1) : 0.45,
              borderTop: isDropTarget ? `2px solid ${colors.accent}` : undefined,
              userSelect: 'none',
            }}
          >
            <span style={{ color: colors.disabled, fontSize: fontSize.md, lineHeight: 1, cursor: 'grab' }}>⋮⋮</span>
            <div style={{
              width: 24, height: 24, borderRadius: radius.sm,
              background: colors.cream, color: colors.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.caption,
            }}>{meta?.glyph ?? '?'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {meta?.label ?? b.type}
              </div>
              <div style={{ fontSize: fontSize.xs, color: colors.subtle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {b.variant}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <OutlineIconBtn
                onClick={e => { e.stopPropagation(); actions.toggleVisible(b.id) }}
                title={b.visible ? 'Hide' : 'Show'}
              >{b.visible ? '◉' : '◎'}</OutlineIconBtn>
              <OutlineIconBtn
                onClick={e => { e.stopPropagation(); actions.duplicate(b.id) }}
                title="Duplicate"
              >⎘</OutlineIconBtn>
              <OutlineIconBtn
                onClick={e => { e.stopPropagation(); actions.removeBlock(b.id) }}
                title="Delete"
                danger
              >×</OutlineIconBtn>
            </div>
          </div>
        )
      })}
      {blocks.length === 0 && (
        <div style={{
          padding: spacing[4], textAlign: 'center',
          border: `1.5px dashed ${colors.border}`, borderRadius: radius.md,
          fontFamily: font.mono, fontSize: fontSize.caption,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
        }}>No blocks yet</div>
      )}
    </div>
  )
}

function OutlineIconBtn({
  children, onClick, title, danger,
}: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void; title?: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 22, height: 22, border: 'none', background: 'transparent',
        cursor: 'pointer', borderRadius: radius.xs,
        color: danger ? colors.danger : colors.subtle,
        fontSize: fontSize.md,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >{children}</button>
  )
}

// ── Stubs (Phase 6) ────────────────────────────────────────────────
function PanelStub({ tab }: { tab: LeftTab }) {
  const meta: Record<LeftTab, { head: string; sub: string; phase: string }> = {
    blocks:    { head: 'Block Library',    sub: 'Drag to canvas · or click to append', phase: 'Phase 4' },
    outline:   { head: 'Page Outline',     sub: 'Blocks in order · drag to reorder',   phase: 'Phase 4' },
    pages:     { head: 'Page Settings',    sub: 'Title · slug · meta description',     phase: 'Phase 6' },
    assets:    { head: 'Brand Assets',     sub: 'From brand hub · drag to image slots', phase: 'Phase 6' },
    templates: { head: 'Page Templates',   sub: 'Saved layouts · click to apply',      phase: 'Phase 6' },
    history:   { head: 'Version History',  sub: 'Recent edits · click to restore',     phase: 'Phase 6' },
  }
  const m = meta[tab]
  return (
    <div style={{ padding: `${spacing[4]}px ${spacing[3]}px`, display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      <div style={{
        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
        textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.ink,
      }}>{m.head}</div>
      <div style={{ fontSize: fontSize.caption, color: colors.subtle }}>{m.sub}</div>
      <div style={{
        marginTop: spacing[4], padding: spacing[4],
        border: `1.5px dashed ${colors.border}`, borderRadius: radius.md,
        textAlign: 'center',
        fontFamily: font.mono, fontSize: fontSize.caption,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
      }}>
        Lands in {m.phase}
      </div>
    </div>
  )
}
