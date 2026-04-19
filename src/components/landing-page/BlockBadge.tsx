'use client'
// Floating "{glyph} {label} · {variant}" tab anchored top-left of a
// selected block on the canvas. Zero interaction in Phase 3 — purely
// visual identification.

import { colors, font, fontSize, fontWeight, letterSpacing, radius, spacing } from '@/lib/design-tokens'
import { BLOCK_REGISTRY } from './blocks/registry'
import type { Block } from './types'

export function BlockBadge({ block }: { block: Block }) {
  const meta = BLOCK_REGISTRY[block.type]
  if (!meta) return null
  return (
    <div style={{
      position: 'absolute', top: -24, left: 0,
      display: 'flex', alignItems: 'center', gap: 4, zIndex: 20,
      pointerEvents: 'none',
    }}>
      <div style={{
        background: colors.accent, color: colors.ink,
        padding: `3px ${spacing[2]}px`,
        borderRadius: `${radius.xs}px ${radius.xs}px 0 0`,
        fontFamily: font.mono, fontSize: fontSize['2xs'],
        letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
        fontWeight: fontWeight.bold,
      }}>
        {meta.glyph} {meta.label} · {block.variant}
      </div>
    </div>
  )
}
