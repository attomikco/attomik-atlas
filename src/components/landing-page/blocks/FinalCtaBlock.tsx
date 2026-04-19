'use client'
import { colors, fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { btnDark, displayStyle } from './shared'

interface Data {
  headline?: string
  body?: string
  cta?: string
}

export function FinalCtaBlock({ block }: { block: Block }) {
  const d = block.data as Data
  // 'centered' variant in the handoff is visually the same block with a
  // transparent bg — Phase 3 ships the 'banner' visual for both and the
  // inspector picker surfaces the selection.
  return (
    <div style={{ padding: `${spacing[20] + 16}px ${spacing[16]}px`, background: colors.accent, color: colors.ink, textAlign: 'center' }}>
      <h2 style={{ ...displayStyle(56), margin: `0 auto ${spacing[4]}px`, maxWidth: 760 }}>{d.headline}</h2>
      <p style={{ fontSize: fontSize.xl, lineHeight: 1.5, margin: `0 auto ${spacing[7]}px`, maxWidth: 520, color: colors.ink }}>{d.body}</p>
      <button style={{ ...btnDark, padding: `${spacing[4]}px ${spacing[7]}px`, fontSize: fontSize.md }}>{d.cta} →</button>
    </div>
  )
}
