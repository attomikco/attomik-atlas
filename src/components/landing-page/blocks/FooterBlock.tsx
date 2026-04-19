'use client'
import { fontSize, letterSpacing, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { displayStyle } from './shared'

interface Col { title: string; items: string[] }
interface Data {
  brand?: string
  tagline?: string
  cols?: Col[]
}

export function FooterBlock({ block, theme }: { block: Block; theme: PageTheme }) {
  const d = block.data as Data
  const cols = d.cols ?? []
  const gridCols = cols.length > 0 ? `2fr ${cols.map(() => '1fr').join(' ')}` : '1fr'
  return (
    <div style={{ padding: `${spacing[16] - 8}px ${spacing[16]}px ${spacing[10]}px`, background: theme.ink, color: theme.paper }}>
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols, gap: spacing[12],
        maxWidth: 1100, margin: `0 auto ${spacing[10]}px`,
      }}>
        <div>
          <div style={{ ...displayStyle(26, theme), marginBottom: spacing[2], color: theme.accent }}>{d.brand}</div>
          <div style={{ fontFamily: theme.fontBody, fontSize: fontSize.body, color: 'rgba(255,255,255,0.55)', maxWidth: 260 }}>{d.tagline}</div>
        </div>
        {cols.map((c, i) => (
          <div key={i}>
            <div style={{
              fontFamily: theme.fontMono, fontSize: fontSize.xs,
              letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)', marginBottom: spacing[3] + 2,
            }}>{c.title}</div>
            {c.items.map((it, j) => (
              <div key={j} style={{ fontFamily: theme.fontBody, fontSize: fontSize.body, color: 'rgba(255,255,255,0.75)', marginBottom: spacing[2] }}>{it}</div>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        borderTop: `1px solid rgba(255,255,255,0.12)`, paddingTop: spacing[5],
        display: 'flex', justifyContent: 'space-between',
        fontFamily: theme.fontBody, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.4)',
      }}>
        <div>© {new Date().getFullYear()} {d.brand}</div>
        <div>Privacy · Terms · Cookies</div>
      </div>
    </div>
  )
}
