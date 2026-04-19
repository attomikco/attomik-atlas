'use client'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import { BLOCK_GROUPS, BLOCK_REGISTRY, blocksInGroup, type BlockConfig } from './blocks/registry'
import type { Block } from './types'

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
}

// Phase 3: Blocks panel now renders the registry-driven library. The other
// 5 panels still stub until Phase 4 (Outline panel) and Phase 6 (Pages,
// Assets, Templates, History).
export function LeftRail({ tab, onTab, blocks }: Props) {
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
        {tab === 'blocks' ? <BlocksPanel blocks={blocks} /> : <PanelStub tab={tab} />}
      </div>
    </div>
  )
}

// Registry-driven library. Blocks grouped by BLOCK_GROUPS ordering, each
// card shows glyph + label + instance count (how many of this type are
// currently on the canvas). Click / drag handlers are stubbed with
// console.warn('Phase 4') — interactions land with the Add/Insert flow.
function BlocksPanel({ blocks }: { blocks: Block[] }) {
  const counts: Record<string, number> = {}
  for (const b of blocks) counts[b.type] = (counts[b.type] ?? 0) + 1

  return (
    <div style={{ padding: `${spacing[4]}px ${spacing[3]}px`, display: 'flex', flexDirection: 'column', gap: spacing[2], overflow: 'auto' }}>
      <div style={{
        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
        textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.ink,
      }}>Block Library</div>
      <div style={{ fontSize: fontSize.caption, color: colors.subtle, marginBottom: spacing[2] }}>
        Drag to canvas · or click to append
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
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BlockCard({ config, count }: { config: BlockConfig; count: number }) {
  const handleClick = () => { console.warn('Phase 4: appendBlock(%s)', config.type) }
  return (
    <button
      type="button"
      onClick={handleClick}
      title={config.desc}
      style={{
        border: `1px solid ${colors.border}`, borderRadius: radius.md,
        padding: `${spacing[3]}px ${spacing[2]}px`, textAlign: 'center',
        cursor: 'pointer', background: colors.paper, fontFamily: 'inherit',
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
