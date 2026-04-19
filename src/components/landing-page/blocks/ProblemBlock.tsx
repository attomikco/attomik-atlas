'use client'
import { colors, fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { displayStyle, labelStyle } from './shared'

interface Data {
  eyebrow?: string
  headline?: string
  body?: string
}

export function ProblemBlock({ block }: { block: Block }) {
  const d = block.data as Data
  // Both variants render the same v1 layout — 'list' variant ships Phase 3
  // polish. Handoff shows only 'statement' fully-styled.
  return (
    <div style={{ padding: `${spacing[20] + 8}px ${spacing[16]}px`, background: colors.darkBg, color: colors.paper }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ ...labelStyle, color: colors.accent, marginBottom: spacing[3] }}>{d.eyebrow}</div>
        <h2 style={{ ...displayStyle(48), color: colors.paper, margin: `0 0 ${spacing[5]}px` }}>{d.headline}</h2>
        <p style={{ fontSize: fontSize['2xl'], lineHeight: 1.55, color: colors.gray500, margin: 0 }}>{d.body}</p>
      </div>
    </div>
  )
}
