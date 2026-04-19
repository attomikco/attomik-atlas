'use client'
import { fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { resolveBlockBg } from '../lib/resolveBg'
import { displayStyle } from './shared'

interface Data {
  headline?: string
  body?: string
}

export function RichTextBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  return (
    <div style={{ padding: `${spacing[16] + 8}px ${spacing[16]}px`, background: resolveBlockBg(block, theme) }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{ ...displayStyle(32, theme), margin: `0 0 ${spacing[5]}px` }}>{d.headline}</h2>
        <p style={{ fontFamily: theme.fontBody, fontSize: fontSize.xl, lineHeight: 1.7, color: theme.inkMid, margin: 0 }}>{d.body}</p>
      </div>
    </div>
  )
}
