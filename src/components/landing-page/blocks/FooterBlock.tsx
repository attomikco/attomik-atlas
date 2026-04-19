'use client'
import { fontSize, letterSpacing, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import { resolveBlockBg } from '../lib/resolveBg'
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

  // Minimal variant — brand mark + tagline + legal line, no link columns.
  // Useful for landing pages that don't want a full site footer (e.g. a
  // standalone campaign page linked from an ad).
  if (block.variant === 'minimal') {
    return (
      <div style={{ padding: `${spacing[10]}px ${spacing[16]}px`, background: resolveBlockBg(block, theme), color: theme.paper }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: spacing[6], flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[4] }}>
            <div style={{ ...displayStyle(22, theme), color: theme.accent }}>{d.brand}</div>
            {d.tagline ? (
              <div style={{ fontFamily: theme.fontBody, fontSize: fontSize.body, color: 'rgba(255,255,255,0.55)' }}>{d.tagline}</div>
            ) : null}
          </div>
          <div style={{ fontFamily: theme.fontBody, fontSize: fontSize.sm, color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} {d.brand} · Privacy · Terms
          </div>
        </div>
      </div>
    )
  }

  const gridCols = cols.length > 0 ? `2fr ${cols.map(() => '1fr').join(' ')}` : '1fr'
  return (
    <div style={{ padding: `${spacing[16] - 8}px ${spacing[16]}px ${spacing[10]}px`, background: resolveBlockBg(block, theme), color: theme.paper }}>
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
