'use client'
import { spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { resolveBlockBg } from '../lib/resolveBg'
import { BrandMedia, displayStyle } from './shared'

interface Data {
  headline?: string
  // items holds either:
  //  - an array of URLs / objects with .url (user-picked overrides), or
  //  - placeholders (numbers) from the legacy brief adapter.
  // Either way we fall back to theme.images.lifestyle[] to fill empty slots.
  items?: Array<string | number | { url?: string }>
}

function urlFromItem(item: string | number | { url?: string } | undefined): string {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object' && typeof item.url === 'string') return item.url
  return ''
}

export function GalleryBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  const items = d.items ?? []
  // Render at least 3, at most 6; prefer the user's declared count, but
  // never show fewer than we have lifestyle images for.
  const declared = items.length || theme.images.lifestyle.length || 6
  const count = Math.max(3, Math.min(declared, 6))

  return (
    <div style={{ padding: `${spacing[16] + 8}px ${spacing[16]}px`, background: resolveBlockBg(block, theme) }}>
      <h2 style={{ ...displayStyle(36, theme), margin: `0 0 ${spacing[8]}px`, textAlign: 'center' }}>{d.headline}</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: spacing[3],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {Array.from({ length: count }).map((_, i) => {
          const url = urlFromItem(items[i]) || theme.images.lifestyle[i] || ''
          return <BrandMedia key={i} url={url} h={180} label={`gallery ${i + 1}`} />
        })}
      </div>
    </div>
  )
}
