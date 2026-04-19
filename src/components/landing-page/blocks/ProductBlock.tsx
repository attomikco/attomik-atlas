'use client'
import { colors, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import type { RenderMode } from './registry'
import { resolveBlockBg } from '../lib/resolveBg'
import { BrandMedia, btnDark, displayStyle } from './shared'

interface Data {
  headline?: string
  items?: Array<{ name: string; flavor?: string; price?: string; image?: string }>
}

// Shopify typically stores prices as bare numbers ("32", "24.5"). If no
// currency symbol / word is already present, prepend "$" so the lineup
// doesn't render naked integers next to the Add CTA.
function formatPrice(raw: string | undefined): string {
  if (!raw) return ''
  const s = raw.trim()
  if (!s) return ''
  if (/[$€£¥]|USD|EUR|GBP/i.test(s)) return s
  return `$${s}`
}

function truncate(s: string | undefined, max: number): string {
  if (!s) return ''
  const trimmed = s.trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max - 1).trimEnd() + '…'
}

export function ProductBlock({ block, theme, mode }: { block: Block; theme: PageTheme; mode: RenderMode }) {
  const d = block.data as Data
  const items = d.items ?? []
  // Cap visible columns at 4 to keep cards legible; beyond that products
  // wrap to the next row (grid auto-flow handles it).
  const cols = Math.min(Math.max(items.length, 1), 4)

  // Empty-state hint is builder affordance only.
  if (items.length === 0 && mode !== 'edit') return null

  if (items.length === 0) {
    return (
      <div style={{ padding: `${spacing[20]}px ${spacing[16]}px`, background: resolveBlockBg(block, theme) }}>
        <h2 style={{ ...displayStyle(40, theme), margin: `0 0 ${spacing[10] + 4}px`, textAlign: 'center' }}>{d.headline}</h2>
        <div style={{
          maxWidth: 520, margin: '0 auto', textAlign: 'center',
          padding: spacing[10], borderRadius: radius.xl,
          border: `1px dashed ${colors.border}`, background: theme.paper,
          fontFamily: theme.fontBody, fontSize: fontSize.md, color: theme.inkMid,
        }}>Add products in the Inspector to see them here.</div>
      </div>
    )
  }

  return (
    <div style={{ padding: `${spacing[20]}px ${spacing[16]}px`, background: resolveBlockBg(block, theme) }}>
      <h2 style={{ ...displayStyle(40, theme), margin: `0 0 ${spacing[10] + 4}px`, textAlign: 'center' }}>{d.headline}</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: spacing[6],
        maxWidth: 1100, margin: '0 auto',
      }}>
        {items.map((p, i) => {
          const url = p.image || theme.images.productList[i] || ''
          return (
            <div key={i} style={{
              border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden',
              background: theme.paper,
            }}>
              <BrandMedia url={url} h={220} label={`${p.name} product`} />
              <div style={{ padding: spacing[5] }}>
                <h3 style={{ ...displayStyle(22, theme), margin: `0 0 ${spacing[1]}px` }}>{p.name}</h3>
                {p.flavor ? (
                  <div style={{
                    fontFamily: theme.fontMono, fontSize: fontSize.xs,
                    letterSpacing: letterSpacing.widest, textTransform: 'uppercase',
                    color: colors.gray750, marginBottom: spacing[3],
                  }}>{truncate(p.flavor, 120)}</div>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: theme.fontBody, fontWeight: fontWeight.bold, color: theme.ink }}>{formatPrice(p.price)}</div>
                  <button style={{ ...btnDark(theme), padding: `${spacing[2]}px ${spacing[3] + 2}px`, fontSize: fontSize.sm }}>Add →</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
