'use client'
import { fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { displayStyle, labelStyle } from './shared'

interface Data {
  eyebrow?: string
  headline?: string
  body?: string
}

export function ProblemBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  // 'list' variant ships Phase 3 polish. Handoff only showed statement.
  return (
    <div style={{ padding: `${spacing[20] + 8}px ${spacing[16]}px`, background: theme.ink, color: theme.paper }}>
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ ...labelStyle, color: theme.accent, marginBottom: spacing[3] }}>{d.eyebrow}</div>
        <h2 style={{ ...displayStyle(48, theme), color: theme.paper, margin: `0 0 ${spacing[5]}px` }}>{d.headline}</h2>
        <p style={{ fontFamily: theme.fontBody, fontSize: fontSize['2xl'], lineHeight: 1.55, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{d.body}</p>
      </div>
    </div>
  )
}
