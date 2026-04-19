'use client'
// Shared renderer primitives. <Ph> is the diagonal-stripe image placeholder
// the handoff uses on every hero/product/gallery shot before real images
// are wired up (Phase 6 Assets panel lands that). The btn* + display helpers
// are now theme-aware — they take a PageTheme so each brand's ink/accent/
// fontHeading flows through.
//
// Ph, labelStyle — unchanged. They use neutral substrate (grays, mono)
// that stays Attomik-token-sourced per the Phase 5b decision.

import { colors, font, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/lib/design-tokens'
import type { PageTheme } from '../lib/getPageTheme'

// BrandMedia — swap-in replacement for <Ph> when a URL is available.
// Falls back to <Ph>'s diagonal-stripe placeholder when url is empty so
// every caller can use a single conditional site. object-fit:cover is the
// universal default; most slots want the image to fill its cell without
// distortion, and contain-fit is only useful for logos (which don't flow
// through this component — logos are rendered inline via <img> in the
// renderers that need them).
export function BrandMedia({
  url,
  h = 160,
  label = 'image',
  dark = false,
  fit = 'cover',
}: {
  url: string
  h?: number | string
  label?: string
  dark?: boolean
  fit?: 'cover' | 'contain'
}) {
  if (!url) return <Ph h={h} label={label} dark={dark} />
  return (
    <img
      src={url}
      alt={label}
      style={{
        display: 'block',
        width: '100%',
        height: h,
        objectFit: fit,
        borderRadius: radius.xs,
      }}
    />
  )
}

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

// Dark CTA — black bg → brand ink, white text → brand paper. Used on
// light-bg hero centered / hero split / solution image-left / product
// cards / final CTA.
export function btnDark(theme: PageTheme): React.CSSProperties {
  return {
    background: theme.ink, color: theme.paper,
    border: 'none', padding: `${spacing[3]}px ${spacing[5]}px`,
    borderRadius: radius.pill, fontFamily: theme.fontHeading,
    fontWeight: fontWeight.extrabold, fontSize: fontSize.body,
    letterSpacing: letterSpacing.label, textTransform: 'uppercase',
    cursor: 'pointer',
  }
}

// Ghost CTA — transparent with a 1.5px brand-ink border. Secondary action
// next to btnDark on hero centered / hero split.
export function btnGhost(theme: PageTheme): React.CSSProperties {
  return {
    background: 'transparent', color: theme.ink,
    border: `1.5px solid ${theme.ink}`,
    padding: `${spacing[3]}px ${spacing[5]}px`,
    borderRadius: radius.pill, fontFamily: theme.fontHeading,
    fontWeight: fontWeight.extrabold, fontSize: fontSize.body,
    letterSpacing: letterSpacing.label, textTransform: 'uppercase',
    cursor: 'pointer',
  }
}

// Accent CTA — brand accent bg, brand ink text. Hero overlay's primary
// action fires this.
export function btnAccent(theme: PageTheme): React.CSSProperties {
  return {
    ...btnDark(theme),
    background: theme.accent, color: theme.ink,
  }
}

// Labels / eyebrows — mono caps, muted. NEUTRAL substrate, not brand-themed.
// Kept static so section eyebrows read consistently across brands.
export const labelStyle: React.CSSProperties = {
  fontFamily: font.mono, fontSize: fontSize.xs,
  letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
  color: colors.muted,
}

// "display" in the handoff = Barlow 900 uppercase tight tracking. Now uses
// brand heading font + brand ink. Caller may override color (hero overlay
// needs white text on a dark image for example).
export function displayStyle(size: number, theme: PageTheme): React.CSSProperties {
  return {
    fontFamily: theme.fontHeading, fontWeight: fontWeight.heading,
    fontSize: size, lineHeight: size >= 40 ? 0.95 : 1,
    textTransform: 'uppercase', letterSpacing: letterSpacing.slight,
    margin: 0, color: theme.ink,
  }
}
