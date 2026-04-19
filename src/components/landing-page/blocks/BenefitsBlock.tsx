'use client'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { displayStyle } from './shared'

interface Data {
  headline?: string
  items?: Array<{ title: string; body: string }>
}

export function BenefitsBlock({ block }: { block: Block }) {
  const d = block.data as Data
  const cols = block.variant === '2-col' ? 2 : block.variant === 'stacked' ? 1 : 3
  const items = d.items ?? []
  return (
    <div style={{ padding: `${spacing[20]}px ${spacing[16]}px`, background: colors.cream }}>
      <h2 style={{ ...displayStyle(40), margin: `0 0 ${spacing[10] + 4}px`, textAlign: 'center' }}>{d.headline}</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: spacing[5],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: colors.paper, padding: spacing[7], borderRadius: radius.xl, border: `1px solid ${colors.border}` }}>
            <div style={{
              width: 40, height: 40, borderRadius: radius.lg,
              background: colors.ink, color: colors.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: fontWeight.heading, marginBottom: spacing[4],
              fontFamily: font.heading,
            }}>{String(i + 1).padStart(2, '0')}</div>
            <h3 style={{ ...displayStyle(19), margin: `0 0 ${spacing[2]}px` }}>{it.title}</h3>
            <p style={{ fontSize: fontSize.md, lineHeight: 1.55, color: colors.muted, margin: 0 }}>{it.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
