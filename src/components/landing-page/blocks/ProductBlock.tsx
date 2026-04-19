'use client'
import { colors, font, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { btnDark, displayStyle, Ph } from './shared'

interface Data {
  headline?: string
  items?: Array<{ name: string; flavor?: string; price?: string }>
}

export function ProductBlock({ block }: { block: Block }) {
  const d = block.data as Data
  const items = d.items ?? []
  const cols = items.length || 1
  return (
    <div style={{ padding: `${spacing[20]}px ${spacing[16]}px` }}>
      <h2 style={{ ...displayStyle(40), margin: `0 0 ${spacing[10] + 4}px`, textAlign: 'center' }}>{d.headline}</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: spacing[6],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {items.map((p, i) => (
          <div key={i} style={{
            border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden',
            background: colors.paper,
          }}>
            <Ph h={220} label={`${p.name} can`} />
            <div style={{ padding: spacing[5] }}>
              <h3 style={{ ...displayStyle(22), margin: `0 0 ${spacing[1]}px` }}>{p.name}</h3>
              {p.flavor ? (
                <div style={{
                  fontFamily: font.mono, fontSize: fontSize.xs,
                  letterSpacing: letterSpacing.widest, textTransform: 'uppercase',
                  color: colors.gray750, marginBottom: spacing[3],
                }}>{p.flavor}</div>
              ) : null}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: fontWeight.bold, color: colors.ink }}>{p.price}</div>
                <button style={{ ...btnDark, padding: `${spacing[2]}px ${spacing[3] + 2}px`, fontSize: fontSize.sm }}>Add →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
