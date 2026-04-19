'use client'
// Canvas-level wrapper around each rendered block. Owns:
//   - click-to-select (stopPropagation so Canvas's outer bg handler doesn't
//     deselect when the user clicks a block)
//   - selection outline (2px accent, -2px offset)
//   - floating BlockBadge when selected
//   - hidden-state diagonal-stripe placeholder (shown instead of the real
//     renderer when block.visible === false)

import { colors, font, fontSize, letterSpacing, spacing } from '@/lib/design-tokens'
import { BLOCK_REGISTRY } from './blocks/registry'
import { BlockBadge } from './BlockBadge'
import type { Block } from './types'

interface Props {
  block: Block
  selected: boolean
  onSelect: (id: string) => void
}

export function BlockWrap({ block, selected, onSelect }: Props) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(block.id)
  }

  if (!block.visible) {
    return (
      <div
        onClick={handleClick}
        style={{
          padding: spacing[5],
          background: `repeating-linear-gradient(45deg, ${colors.gray100}, ${colors.gray100} 6px, ${colors.gray250} 6px, ${colors.gray250} 12px)`,
          textAlign: 'center', cursor: 'pointer',
          outline: selected ? `2px solid ${colors.accent}` : '2px solid transparent',
          outlineOffset: -2,
          position: 'relative',
        }}
      >
        {selected && <BlockBadge block={block} />}
        <span style={{
          fontFamily: font.mono, fontSize: fontSize.xs,
          letterSpacing: letterSpacing.xwide, textTransform: 'uppercase',
          color: colors.subtle,
        }}>
          Hidden · {block.type} · {block.variant}
        </span>
      </div>
    )
  }

  const Renderer = BLOCK_REGISTRY[block.type]?.renderer
  if (!Renderer) {
    // Defensive — an unknown block type shouldn't exist, but if a stale doc
    // carries one we render a visible stub instead of crashing.
    return (
      <div
        onClick={handleClick}
        style={{
          padding: spacing[6], textAlign: 'center',
          background: colors.cream,
          outline: selected ? `2px solid ${colors.accent}` : '2px solid transparent',
          outlineOffset: -2,
        }}
      >
        <span style={{
          fontFamily: font.mono, fontSize: fontSize.caption,
          letterSpacing: letterSpacing.widest, textTransform: 'uppercase',
          color: colors.muted,
        }}>Unknown block: {block.type}</span>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative', cursor: 'pointer',
        outline: selected ? `2px solid ${colors.accent}` : '2px solid transparent',
        outlineOffset: -2,
        transition: 'outline-color 0.1s',
      }}
    >
      {selected && <BlockBadge block={block} />}
      <Renderer block={block} />
    </div>
  )
}
