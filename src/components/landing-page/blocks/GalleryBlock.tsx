'use client'
import { spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { displayStyle, Ph } from './shared'

interface Data {
  headline?: string
  items?: unknown[]
}

export function GalleryBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  const count = (d.items?.length ?? 6) || 6
  return (
    <div style={{ padding: `${spacing[16] + 8}px ${spacing[16]}px`, background: theme.cream }}>
      <h2 style={{ ...displayStyle(36, theme), margin: `0 0 ${spacing[8]}px`, textAlign: 'center' }}>{d.headline}</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: spacing[3],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <Ph key={i} h={180} label={`gallery ${i + 1}`} />
        ))}
      </div>
    </div>
  )
}
