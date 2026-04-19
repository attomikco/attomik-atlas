'use client'
import { colors, fontSize, fontWeight, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { displayStyle } from './shared'

interface Data {
  headline?: string
  items?: Array<{ q: string; a: string }>
}

export function FaqBlock({ block }: { block: Block }) {
  const d = block.data as Data
  const items = d.items ?? []
  return (
    <div style={{ padding: `${spacing[20]}px ${spacing[16]}px` }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ ...displayStyle(36), margin: `0 0 ${spacing[8]}px`, textAlign: 'center' }}>{d.headline}</h2>
        <div style={{ borderTop: `1px solid ${colors.border}` }}>
          {items.map((it, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${colors.border}`, padding: `${spacing[5]}px 4px` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div style={{ fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: colors.ink }}>{it.q}</div>
                <div style={{ fontSize: fontSize['2xl'], color: colors.gray750 }}>{i === 0 ? '−' : '+'}</div>
              </div>
              {/* First item opens by default in the handoff visual — real accordion wiring is Phase 4. */}
              {i === 0 && <p style={{ fontSize: fontSize.base, lineHeight: 1.6, color: colors.muted, margin: `${spacing[2] + 2}px 0 0` }}>{it.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
