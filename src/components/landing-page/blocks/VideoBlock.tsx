'use client'
import { colors, font, fontSize, letterSpacing, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { displayStyle, Ph } from './shared'

interface Data {
  headline?: string
  caption?: string
  url?: string
}

export function VideoBlock({ block }: { block: Block }) {
  const d = block.data as Data
  return (
    <div style={{ padding: `${spacing[16] + 8}px ${spacing[16]}px`, textAlign: 'center' }}>
      <h2 style={{ ...displayStyle(32), margin: `0 0 ${spacing[6]}px` }}>{d.headline}</h2>
      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        <Ph h={440} label="video still" />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: radius.pill, background: colors.paper,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              width: 0, height: 0,
              borderTop: '14px solid transparent', borderBottom: '14px solid transparent',
              borderLeft: `22px solid ${colors.ink}`, marginLeft: 6,
            }} />
          </div>
        </div>
        <div style={{
          fontFamily: font.mono, fontSize: fontSize.xs,
          letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
          color: colors.gray750, marginTop: spacing[4],
        }}>{d.caption}</div>
      </div>
    </div>
  )
}
