'use client'
import { fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { resolveBlockBg, resolveBlockBgToken } from '../lib/resolveBg'
import { displayStyle, labelStyle } from './shared'

interface Data {
  eyebrow?: string
  headline?: string
  body?: string
}

export function ProblemBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  const bg = resolveBlockBg(block, theme)
  // Problem sits after the hero; if either the default or the user's
  // chosen background is dark, text inverts to paper. Otherwise stays
  // ink-on-cream for readability.
  const dark = resolveBlockBgToken(block) === 'ink'
  const headlineColor = dark ? theme.paper : theme.ink
  const bodyColor = dark ? 'rgba(255,255,255,0.6)' : theme.inkMid

  return (
    <div style={{ padding: `${spacing[20] + 8}px ${spacing[16]}px`, background: bg, color: headlineColor }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ ...labelStyle, color: theme.accent, marginBottom: spacing[3] }}>{d.eyebrow}</div>
        <h2 style={{ ...displayStyle(48, theme), color: headlineColor, margin: `0 0 ${spacing[5]}px` }}>{d.headline}</h2>
        <p style={{ fontFamily: theme.fontBody, fontSize: fontSize['2xl'], lineHeight: 1.55, color: bodyColor, margin: 0 }}>{d.body}</p>
      </div>
    </div>
  )
}
