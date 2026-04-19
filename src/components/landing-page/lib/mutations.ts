// Pure block mutations. Every function returns a new Block[]; inputs are
// never mutated in place. Safe to call from any hook / event handler.
//
// briefToBlocks seeds initial content; these functions take over once the
// builder opens. Each mutation produces the new `blocks` array that
// BuilderClient stores in state and autosaves.

import type { Block, BlockStyle, BlockType } from '../types.ts'
import { BLOCK_DEFAULTS } from '../blocks/defaults.ts'

function newId(): string {
  return 'b_' + Math.random().toString(36).slice(2, 11)
}

export function addBlock(blocks: Block[], type: BlockType, index?: number): Block[] {
  const defaults = BLOCK_DEFAULTS[type]
  if (!defaults) return blocks
  const fresh: Block = {
    id: newId(),
    type,
    variant: defaults.defaultVariant,
    visible: true,
    data: defaults.defaultData(),
  }
  const at = index === undefined ? blocks.length : Math.max(0, Math.min(blocks.length, index))
  const next = blocks.slice()
  next.splice(at, 0, fresh)
  return next
}

export function deleteBlock(blocks: Block[], id: string): Block[] {
  return blocks.filter(b => b.id !== id)
}

export function duplicateBlock(blocks: Block[], id: string): Block[] {
  const i = blocks.findIndex(b => b.id === id)
  if (i < 0) return blocks
  const src = blocks[i]
  // Deep-clone data + style so nested arrays (items[], cols[]) don't share
  // references with the original. Block.style may be undefined — passthrough.
  const clone: Block = {
    id: newId(),
    type: src.type,
    variant: src.variant,
    visible: src.visible,
    data: JSON.parse(JSON.stringify(src.data)),
    style: src.style ? JSON.parse(JSON.stringify(src.style)) as BlockStyle : undefined,
  }
  const next = blocks.slice()
  next.splice(i + 1, 0, clone)
  return next
}

export function toggleVisible(blocks: Block[], id: string): Block[] {
  return blocks.map(b => (b.id === id ? { ...b, visible: !b.visible } : b))
}

export function updateBlockData(
  blocks: Block[],
  id: string,
  patch: Partial<Block['data']>,
): Block[] {
  return blocks.map(b => (b.id === id ? { ...b, data: { ...b.data, ...patch } } : b))
}

export function updateBlockStyle(
  blocks: Block[],
  id: string,
  patch: Partial<BlockStyle>,
): Block[] {
  return blocks.map(b => {
    if (b.id !== id) return b
    const nextStyle: BlockStyle = { ...(b.style ?? {}), ...patch }
    return { ...b, style: nextStyle }
  })
}

export function updateBlockVariant(blocks: Block[], id: string, variant: string): Block[] {
  return blocks.map(b => (b.id === id ? { ...b, variant } : b))
}

// Reorder math mirrors the handoff (app.jsx:92-97): when moving forward
// (to > from), the target index is effectively one-less after the splice
// because the moved element itself vacated a slot ahead of `to`.
export function reorderBlocks(blocks: Block[], from: number, to: number): Block[] {
  if (from === to) return blocks
  if (from < 0 || from >= blocks.length) return blocks
  const next = blocks.slice()
  const [it] = next.splice(from, 1)
  const target = to > from ? to - 1 : to
  const clamped = Math.max(0, Math.min(next.length, target))
  next.splice(clamped, 0, it)
  return next
}
