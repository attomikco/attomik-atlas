'use client'
import { colors, font, fontSize, letterSpacing, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { displayStyle } from './shared'

interface Col { title: string; items: string[] }
interface Data {
  brand?: string
  tagline?: string
  cols?: Col[]
}

export function FooterBlock({ block }: { block: Block }) {
  const d = block.data as Data
  const cols = d.cols ?? []
  const gridCols = cols.length > 0 ? `2fr ${cols.map(() => '1fr').join(' ')}` : '1fr'
  return (
    <div style={{ padding: `${spacing[16] - 8}px ${spacing[16]}px ${spacing[10]}px`, background: colors.ink, color: colors.paper }}>
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols, gap: spacing[12],
        maxWidth: 1100, margin: `0 auto ${spacing[10]}px`,
      }}>
        <div>
          <div style={{ ...displayStyle(26), marginBottom: spacing[2], color: colors.accent }}>{d.brand}</div>
          <div style={{ fontSize: fontSize.body, color: colors.gray600, maxWidth: 260 }}>{d.tagline}</div>
        </div>
        {cols.map((c, i) => (
          <div key={i}>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.xs,
              letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
              color: colors.gray750, marginBottom: spacing[3] + 2,
            }}>{c.title}</div>
            {c.items.map((it, j) => (
              <div key={j} style={{ fontSize: fontSize.body, color: colors.gray400, marginBottom: spacing[2] }}>{it}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        borderTop: `1px solid ${colors.darkCardAlt}`, paddingTop: spacing[5],
        display: 'flex', justifyContent: 'space-between',
        fontSize: fontSize.sm, color: colors.gray700,
      }}>
        <div>© {new Date().getFullYear()} {d.brand}</div>
        <div>Privacy · Terms · Cookies</div>
      </div>
    </div>
  )
}
