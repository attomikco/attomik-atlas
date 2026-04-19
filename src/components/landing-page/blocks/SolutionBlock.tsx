'use client'
import { fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { resolveBlockBg } from '../lib/resolveBg'
import { BrandMedia, displayStyle, labelStyle } from './shared'

interface Data {
  eyebrow?: string
  headline?: string
  body?: string
  image?: string
}

export function SolutionBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  if (block.variant === 'image-left') {
    const url = d.image || theme.images.solution
    return (
      <div style={{ padding: `${spacing[20] + 8}px ${spacing[16]}px`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[12], alignItems: 'center', background: resolveBlockBg(block, theme) }}>
        <BrandMedia url={url} h={360} label="product detail" />
        <div>
          <div style={{ ...labelStyle, marginBottom: spacing[3] }}>{d.eyebrow}</div>
          <h2 style={{ ...displayStyle(44, theme), margin: `0 0 ${spacing[5]}px` }}>{d.headline}</h2>
          <p style={{ fontFamily: theme.fontBody, fontSize: fontSize.xl, lineHeight: 1.55, color: theme.inkMid, margin: 0 }}>{d.body}</p>
        </div>
      </div>
    )
  }
  // statement
  return (
    <div style={{ padding: `${spacing[20] + 8}px ${spacing[16]}px`, textAlign: 'center', background: resolveBlockBg(block, theme) }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ ...labelStyle, marginBottom: spacing[3] }}>{d.eyebrow}</div>
        <h2 style={{ ...displayStyle(52, theme), margin: `0 0 ${spacing[5]}px` }}>{d.headline}</h2>
        <p style={{ fontFamily: theme.fontBody, fontSize: fontSize['2xl'], lineHeight: 1.55, color: theme.inkMid, margin: 0 }}>{d.body}</p>
      </div>
    </div>
  )
}
