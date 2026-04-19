'use client'
import { colors, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { displayStyle } from './shared'

interface Data {
  headline?: string
  items?: Array<{ title: string; body: string }>
}

export function BenefitsBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  const cols = block.variant === '2-col' ? 2 : block.variant === 'stacked' ? 1 : 3
  const items = d.items ?? []
  return (
    <div style={{ padding: `${spacing[20]}px ${spacing[16]}px`, background: theme.cream }}>
      <h2 style={{ ...displayStyle(40, theme), margin: `0 0 ${spacing[10] + 4}px`, textAlign: 'center' }}>{d.headline}</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: spacing[5],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: theme.paper, padding: spacing[7], borderRadius: radius.xl, border: `1px solid ${colors.border}` }}>
            <div style={{
              width: 40, height: 40, borderRadius: radius.lg,
              background: theme.ink, color: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: fontWeight.heading, marginBottom: spacing[4],
              fontFamily: theme.fontHeading,
            }}>{String(i + 1).padStart(2, '0')}</div>
            <h3 style={{ ...displayStyle(19, theme), margin: `0 0 ${spacing[2]}px` }}>{it.title}</h3>
            <p style={{ fontFamily: theme.fontBody, fontSize: fontSize.md, lineHeight: 1.55, color: theme.inkMid, margin: 0 }}>{it.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
