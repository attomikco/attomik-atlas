'use client'
import { colors, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { PageTheme } from '../lib/getPageTheme'
import type { RenderMode } from './registry'
import { resolveBlockBg } from '../lib/resolveBg'
import { displayStyle } from './shared'

interface Data {
  headline?: string
  items?: Array<{ title: string; body: string }>
}

export function BenefitsBlock({ block, theme, mode }: { block: Block; theme: PageTheme; mode: RenderMode }) {
  const d = block.data as Data
  const items = d.items ?? []
  const cols = block.variant === '2-col' ? 2 : block.variant === 'stacked' ? 1 : 3
  const isStacked = block.variant === 'stacked'

  // Empty-state hint is builder affordance only — preview must render a
  // clean page (no "Add benefits in the Inspector" nudges bleeding into
  // the shared/published surface).
  if (items.length === 0 && mode !== 'edit') return null

  return (
    <div style={{ padding: `${spacing[20]}px ${spacing[16]}px`, background: resolveBlockBg(block, theme) }}>
      <h2 style={{ ...displayStyle(40, theme), margin: `0 0 ${spacing[10] + 4}px`, textAlign: 'center' }}>{d.headline}</h2>
      {items.length === 0 ? (
        <EmptyBenefits theme={theme} />
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: spacing[5],
          maxWidth: 1100, margin: '0 auto',
        }}>
          {items.map((it, i) => (
            // Stacked variant goes horizontal: icon-left, text-right, with
            // a flex row instead of a vertical card. Keeps the same token
            // vocabulary; just differentiates the shape so the variant
            // picker is obviously distinct from 2-col / 3-col.
            <div key={i} style={{
              background: theme.paper,
              padding: spacing[7],
              borderRadius: radius.xl,
              border: `1px solid ${colors.border}`,
              display: isStacked ? 'flex' : 'block',
              alignItems: isStacked ? 'flex-start' : undefined,
              gap: isStacked ? spacing[5] : undefined,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: radius.lg,
                background: theme.ink, color: theme.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: fontWeight.heading,
                marginBottom: isStacked ? 0 : spacing[4],
                fontFamily: theme.fontHeading,
                flexShrink: 0,
              }}>{String(i + 1).padStart(2, '0')}</div>
              <div>
                <h3 style={{ ...displayStyle(19, theme), margin: `0 0 ${spacing[2]}px` }}>{it.title}</h3>
                <p style={{ fontFamily: theme.fontBody, fontSize: fontSize.md, lineHeight: 1.55, color: theme.inkMid, margin: 0 }}>{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyBenefits({ theme }: { theme: PageTheme }) {
  return (
    <div style={{
      maxWidth: 520, margin: '0 auto', textAlign: 'center',
      padding: spacing[10], borderRadius: radius.xl,
      border: `1px dashed ${colors.border}`, background: theme.paper,
    }}>
      <div style={{
        fontFamily: theme.fontBody, fontSize: fontSize.md, color: theme.inkMid,
      }}>Add three benefits in the Inspector to see them here.</div>
    </div>
  )
}
