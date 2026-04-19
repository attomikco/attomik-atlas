'use client'
import { fontSize, letterSpacing, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import type { RenderMode } from './registry'
import { resolveBlockBg } from '../lib/resolveBg'
import { displayStyle } from './shared'

interface Data {
  items?: Array<{ n: string; l: string }>
}

export function StatsBlock({ block, theme, mode }: { block: Block; theme: PageTheme; mode: RenderMode }) {
  const d = block.data as Data
  const items = d.items ?? []
  const cols = items.length || 1

  // Empty-state hint is builder affordance only.
  if (items.length === 0 && mode !== 'edit') return null

  if (items.length === 0) {
    return (
      <div style={{ padding: spacing[16], background: resolveBlockBg(block, theme), color: theme.paper, textAlign: 'center' }}>
        <div style={{
          fontFamily: theme.fontMono, fontSize: fontSize.sm,
          letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
        }}>Add a stat in the Inspector to see it here.</div>
      </div>
    )
  }

  return (
    <div style={{ padding: spacing[16], background: resolveBlockBg(block, theme), color: theme.paper }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: spacing[6],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {items.map((it, i) => (
          <div key={i} style={{ textAlign: 'center', padding: `${spacing[2]}px 0` }}>
            <div style={{ ...displayStyle(56, theme), color: theme.accent, margin: `0 0 ${spacing[2]}px` }}>{it.n}</div>
            <div style={{
              fontFamily: theme.fontMono, fontSize: fontSize.sm,
              letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
            }}>{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
