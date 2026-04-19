'use client'
import { colors, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import type { RenderMode } from './registry'
import { resolveBlockBg } from '../lib/resolveBg'
import { displayStyle } from './shared'

interface Data {
  headline?: string
  items?: Array<{ q: string; a: string }>
}

export function FaqBlock({ block, theme, mode }: { block: Block; theme: PageTheme; mode: RenderMode }) {
  const d = block.data as Data
  const items = d.items ?? []

  // Empty-state hint is builder affordance only.
  if (items.length === 0 && mode !== 'edit') return null

  return (
    <div style={{ padding: `${spacing[20]}px ${spacing[16]}px`, background: resolveBlockBg(block, theme) }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 style={{ ...displayStyle(36, theme), margin: `0 0 ${spacing[8]}px`, textAlign: 'center' }}>{d.headline}</h2>
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: spacing[10],
            borderRadius: radius.xl, border: `1px dashed ${colors.border}`,
            fontFamily: theme.fontBody, fontSize: fontSize.md, color: theme.inkMid,
          }}>Add questions in the Inspector to see them here.</div>
        ) : (
          <div style={{ borderTop: `1px solid ${theme.border}` }}>
            {items.map((it, i) => (
              <div key={i} style={{ borderBottom: `1px solid ${theme.border}`, padding: `${spacing[5]}px 4px` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ fontFamily: theme.fontBody, fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: theme.ink }}>{it.q}</div>
                  <div style={{ fontSize: fontSize['2xl'], color: theme.inkSoft }}>{i === 0 ? '−' : '+'}</div>
                </div>
                {/* First item opens by default (visual-only; real accordion toggle is Phase 4). */}
                {i === 0 && <p style={{ fontFamily: theme.fontBody, fontSize: fontSize.base, lineHeight: 1.6, color: theme.inkMid, margin: `${spacing[2] + 2}px 0 0` }}>{it.a}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
