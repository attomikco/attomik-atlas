'use client'
import { colors, fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { btnDark, btnGhost, displayStyle, labelStyle, Ph } from './shared'

interface Data {
  eyebrow?: string
  headline?: string
  sub?: string
  cta?: string
  secondary?: string
}

export function HeroBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data

  if (block.variant === 'split') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', minHeight: 440 }}>
        <div style={{ padding: `${spacing[16] + 8}px ${spacing[16]}px`, background: theme.paper, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ ...labelStyle, marginBottom: spacing[4] }}>{d.eyebrow}</div>
          <h1 style={{ ...displayStyle(56, theme), marginBottom: spacing[5] }}>{d.headline}</h1>
          <p style={{ fontFamily: theme.fontBody, fontSize: fontSize.xl, lineHeight: 1.55, color: theme.inkMid, margin: 0, marginBottom: spacing[7], maxWidth: 440 }}>{d.sub}</p>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <button style={btnDark(theme)}>{d.cta} →</button>
            {d.secondary ? <button style={btnGhost(theme)}>{d.secondary}</button> : null}
          </div>
        </div>
        <Ph h={'100%'} label="hero product shot" />
      </div>
    )
  }

  if (block.variant === 'overlay') {
    return (
      <div style={{ position: 'relative', minHeight: 520, background: theme.ink, color: theme.paper, overflow: 'hidden' }}>
        <Ph h={'100%'} label="full-bleed lifestyle" dark />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.75))' }} />
        <div style={{ position: 'absolute', inset: 0, padding: `${spacing[16] + 8}px ${spacing[16]}px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ ...labelStyle, color: theme.accent, marginBottom: spacing[4] }}>{d.eyebrow}</div>
          <h1 style={{ ...displayStyle(64, theme), color: theme.paper, marginBottom: spacing[5], maxWidth: 720 }}>{d.headline}</h1>
          <p style={{ fontFamily: theme.fontBody, fontSize: fontSize['2xl'], lineHeight: 1.55, margin: 0, marginBottom: spacing[7], maxWidth: 560, color: colors.gray400 }}>{d.sub}</p>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <button style={{ ...btnDark(theme), background: theme.accent, color: theme.ink }}>{d.cta} →</button>
          </div>
        </div>
      </div>
    )
  }

  // centered
  return (
    <div style={{ padding: `${spacing[20] + 16}px ${spacing[16]}px ${spacing[20] + 8}px`, textAlign: 'center', background: theme.cream }}>
      <div style={{ ...labelStyle, marginBottom: spacing[4] }}>{d.eyebrow}</div>
      <h1 style={{ ...displayStyle(72, theme), margin: `0 auto ${spacing[5]}px`, maxWidth: 820 }}>{d.headline}</h1>
      <p style={{ fontFamily: theme.fontBody, fontSize: fontSize['2xl'], lineHeight: 1.5, color: theme.inkMid, margin: `0 auto ${spacing[8]}px`, maxWidth: 560 }}>{d.sub}</p>
      <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'center', marginBottom: spacing[12] }}>
        <button style={btnDark(theme)}>{d.cta} →</button>
        {d.secondary ? <button style={btnGhost(theme)}>{d.secondary}</button> : null}
      </div>
      <Ph h={260} label="hero product shot" />
    </div>
  )
}
