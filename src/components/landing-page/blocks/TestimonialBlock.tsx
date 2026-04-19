'use client'
import { colors, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'

interface Data {
  quote?: string
  name?: string
  title?: string
}

export function TestimonialBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  const initial = (d.name ?? 'A').trim().charAt(0).toUpperCase()
  return (
    <div style={{ padding: `${spacing[20] + 8}px ${spacing[16]}px`, textAlign: 'center', background: theme.cream }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: 64, lineHeight: 0.5, color: theme.accent, marginBottom: spacing[2] }}>❝</div>
        <p style={{
          fontFamily: theme.fontHeading, fontWeight: fontWeight.heading, fontSize: 34,
          lineHeight: 1.15, margin: `0 0 ${spacing[7]}px`,
          textTransform: 'none', letterSpacing: letterSpacing.slight,
          color: theme.ink,
        }}>{d.quote}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
          <div style={{
            width: 40, height: 40, borderRadius: radius.pill,
            background: theme.ink, color: theme.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: fontWeight.heading, fontFamily: theme.fontHeading,
          }}>{initial}</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: theme.fontBody, fontWeight: fontWeight.bold, fontSize: fontSize.body, color: theme.ink }}>{d.name}</div>
            <div style={{
              fontFamily: theme.fontMono, fontSize: fontSize.xs,
              letterSpacing: letterSpacing.widest, textTransform: 'uppercase',
              color: colors.gray750,
            }}>{d.title}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
