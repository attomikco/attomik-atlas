'use client'
import { colors, fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { displayStyle } from './shared'

interface Data {
  headline?: string
  body?: string
}

export function RichTextBlock({ block }: { block: Block }) {
  const d = block.data as Data
  return (
    <div style={{ padding: `${spacing[16] + 8}px ${spacing[16]}px` }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{ ...displayStyle(32), margin: `0 0 ${spacing[5]}px` }}>{d.headline}</h2>
        <p style={{ fontSize: fontSize.xl, lineHeight: 1.7, color: colors.gray333, margin: 0 }}>{d.body}</p>
      </div>
    </div>
  )
}
