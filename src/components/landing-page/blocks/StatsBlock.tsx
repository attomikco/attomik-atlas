'use client'
import { colors, fontSize, letterSpacing, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { displayStyle } from './shared'

interface Data {
  items?: Array<{ n: string; l: string }>
}

export function StatsBlock({ block }: { block: Block }) {
  const d = block.data as Data
  const items = d.items ?? []
  const cols = items.length || 1
  return (
    <div style={{ padding: spacing[16], background: colors.ink, color: colors.paper }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: spacing[6],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {items.map((it, i) => (
          <div key={i} style={{ textAlign: 'center', padding: `${spacing[2]}px 0` }}>
            <div style={{ ...displayStyle(56), color: colors.accent, margin: `0 0 ${spacing[2]}px` }}>{it.n}</div>
            <div style={{
              fontFamily: 'DM Mono, monospace', fontSize: fontSize.sm,
              letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
              color: colors.gray750,
            }}>{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
