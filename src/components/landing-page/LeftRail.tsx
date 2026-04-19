'use client'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'

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
}

// Phase 2: rail shell with 6 tabs. Panels render placeholder copy — real
// panel implementations land in Phase 3 (Outline), 4 (Blocks wired to
// mutations), and 6 (Pages / Assets / Templates / History).
export function LeftRail({ tab, onTab }: Props) {
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
        <PanelStub tab={tab} />
      </div>
    </div>
  )
}

// Per-tab placeholder. Each will be replaced as subsequent phases land the
// real panel implementations; listing them here makes the routing
// self-documenting for the next engineer.
function PanelStub({ tab }: { tab: LeftTab }) {
  const meta: Record<LeftTab, { head: string; sub: string; phase: string }> = {
    blocks:    { head: 'Block Library',    sub: 'Drag to canvas · or click to append', phase: 'Phase 4' },
    outline:   { head: 'Page Outline',     sub: 'Blocks in order · drag to reorder',   phase: 'Phase 3' },
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
