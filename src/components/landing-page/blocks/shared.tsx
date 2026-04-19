'use client'
// Shared renderer primitives. <Ph> is the diagonal-stripe image placeholder
// the handoff uses on every hero/product/gallery shot before real images
// are wired up (Phase 6 Assets panel lands that). <Btn> is the shared
// button vocabulary (dark / ghost / accent) so the 13 renderers stay
// consistent without each re-declaring button styles.

import type { ReactNode } from 'react'
import { colors, font, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/lib/design-tokens'

export function Ph({
  w = '100%',
  h = 160,
  label = 'image',
  dark = false,
}: {
  w?: number | string
  h?: number | string
  label?: string
  dark?: boolean
}) {
  const patternId = `ph-diag-${dark ? 'd' : 'l'}`
  return (
    <div style={{
      width: w, height: h,
      background: dark ? colors.darkBg : colors.gray250,
      position: 'relative', overflow: 'hidden', borderRadius: radius.xs,
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: dark ? 0.12 : 0.5 }}>
        <defs>
          <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke={dark ? colors.paper : colors.gray450} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: dark ? colors.gray750 : colors.gray800,
        fontFamily: font.mono, fontSize: fontSize.xs,
        letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  )
}

export const btnDark: React.CSSProperties = {
  background: colors.ink, color: colors.paper,
  border: 'none', padding: `${spacing[3]}px ${spacing[5]}px`,
  borderRadius: radius.pill, fontFamily: font.heading,
  fontWeight: fontWeight.extrabold, fontSize: fontSize.body,
  letterSpacing: letterSpacing.label, textTransform: 'uppercase',
  cursor: 'pointer',
}

export const btnGhost: React.CSSProperties = {
  background: 'transparent', color: colors.ink,
  border: `1.5px solid ${colors.ink}`,
  padding: `${spacing[3]}px ${spacing[5]}px`,
  borderRadius: radius.pill, fontFamily: font.heading,
  fontWeight: fontWeight.extrabold, fontSize: fontSize.body,
  letterSpacing: letterSpacing.label, textTransform: 'uppercase',
  cursor: 'pointer',
}

export const btnAccent: React.CSSProperties = {
  ...btnDark,
  background: colors.accent, color: colors.ink,
}

// Handoff uses a generic "label" class — DM Mono caps with wide tracking.
export const labelStyle: React.CSSProperties = {
  fontFamily: font.mono, fontSize: fontSize.xs,
  letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
  color: colors.muted,
}

// "display" in the handoff = Barlow 900 uppercase tight tracking, used for
// every headline/H1/H2/H3.
export function displayStyle(size: number): React.CSSProperties {
  return {
    fontFamily: font.heading, fontWeight: fontWeight.heading,
    fontSize: size, lineHeight: size >= 40 ? 0.95 : 1,
    textTransform: 'uppercase', letterSpacing: letterSpacing.slight,
    margin: 0, color: colors.ink,
  }
}

export type BlockRendererProps<TData = Record<string, unknown>> = {
  block: { id: string; type: string; variant: string; data: TData; style?: Record<string, unknown> }
}

export function Kids({ children }: { children: ReactNode }) { return <>{children}</> }
