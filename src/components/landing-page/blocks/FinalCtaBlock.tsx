'use client'
import { fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { btnDark, displayStyle } from './shared'

interface Data {
  headline?: string
  body?: string
  cta?: string
}

export function FinalCtaBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  // 'centered' variant ships Phase 3 polish; handoff styles both similarly.
  return (
    <div style={{ padding: `${spacing[20] + 16}px ${spacing[16]}px`, background: theme.accent, color: theme.ink, textAlign: 'center' }}>
      <h2 style={{ ...displayStyle(56, theme), margin: `0 auto ${spacing[4]}px`, maxWidth: 760 }}>{d.headline}</h2>
      <p style={{ fontFamily: theme.fontBody, fontSize: fontSize.xl, lineHeight: 1.5, margin: `0 auto ${spacing[7]}px`, maxWidth: 520, color: theme.ink }}>{d.body}</p>
      <button style={{ ...btnDark(theme), padding: `${spacing[4]}px ${spacing[7]}px`, fontSize: fontSize.md }}>{d.cta} →</button>
    </div>
  )
}
