import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  addBlock,
  deleteBlock,
  duplicateBlock,
  reorderBlocks,
  toggleVisible,
  updateBlockData,
  updateBlockStyle,
  updateBlockVariant,
} from '../mutations.ts'
import type { Block } from '../../types.ts'

function mk(id: string, type: Block['type'] = 'hero', overrides: Partial<Block> = {}): Block {
  return {
    id,
    type,
    variant: 'overlay',
    visible: true,
    data: {},
    ...overrides,
  }
}

describe('addBlock', () => {
  it('appends at end when index omitted', () => {
    const before: Block[] = [mk('a')]
    const after = addBlock(before, 'problem')
    assert.equal(after.length, 2)
    assert.equal(after[0].id, 'a')
    assert.equal(after[1].type, 'problem')
    assert.match(after[1].id, /^b_[a-z0-9]+$/)
  })
  it('inserts at given index', () => {
    const before: Block[] = [mk('a'), mk('b')]
    const after = addBlock(before, 'faq', 1)
    assert.deepEqual(after.map(b => b.id).slice(0, 3).map((id, i) => i === 1 ? 'NEW' : id), ['a', 'NEW', 'b'])
    assert.equal(after[1].type, 'faq')
  })
  it('clamps negative index to 0 and over-length to end', () => {
    const base: Block[] = [mk('a'), mk('b')]
    assert.equal(addBlock(base, 'faq', -5)[0].type, 'faq')
    assert.equal(addBlock(base, 'faq', 99)[2].type, 'faq')
  })
  it('returns same array when type is unknown', () => {
    const before: Block[] = [mk('a')]
    // @ts-expect-error — deliberately invalid
    const after = addBlock(before, 'not_a_type')
    assert.equal(after, before)
  })
})

describe('deleteBlock', () => {
  it('removes by id', () => {
    const before: Block[] = [mk('a'), mk('b'), mk('c')]
    const after = deleteBlock(before, 'b')
    assert.deepEqual(after.map(x => x.id), ['a', 'c'])
  })
  it('deletes last block cleanly (empty list ok)', () => {
    const before: Block[] = [mk('a')]
    const after = deleteBlock(before, 'a')
    assert.equal(after.length, 0)
  })
  it('no-op on missing id', () => {
    const before: Block[] = [mk('a')]
    const after = deleteBlock(before, 'zzz')
    assert.deepEqual(after.map(x => x.id), ['a'])
  })
})

describe('duplicateBlock', () => {
  it('inserts clone immediately after source with new id', () => {
    const before: Block[] = [mk('a'), mk('b'), mk('c')]
    const after = duplicateBlock(before, 'b')
    assert.equal(after.length, 4)
    assert.equal(after[0].id, 'a')
    assert.equal(after[1].id, 'b')
    assert.notEqual(after[2].id, 'b')
    assert.match(after[2].id, /^b_[a-z0-9]+$/)
    assert.equal(after[3].id, 'c')
  })
  it('deep-clones data so items arrays do not share references', () => {
    const src = mk('a', 'benefits', { data: { items: [{ title: 't' }] } })
    const before: Block[] = [src]
    const after = duplicateBlock(before, 'a')
    const clone = after[1]
    const cloneItems = clone.data.items as Array<{ title: string }>
    const srcItems = src.data.items as Array<{ title: string }>
    assert.notEqual(cloneItems, srcItems)
    assert.notEqual(cloneItems[0], srcItems[0])
    assert.equal(cloneItems[0].title, 't')
  })
  it('no-op on missing id', () => {
    const before: Block[] = [mk('a')]
    const after = duplicateBlock(before, 'zzz')
    assert.equal(after, before)
  })
})

describe('toggleVisible', () => {
  it('flips visible and preserves everything else', () => {
    const before: Block[] = [mk('a', 'hero', { visible: true, variant: 'overlay', data: { headline: 'x' } })]
    const after = toggleVisible(before, 'a')
    assert.equal(after[0].visible, false)
    assert.equal(after[0].variant, 'overlay')
    assert.deepEqual(after[0].data, { headline: 'x' })
  })
  it('no-op on missing id', () => {
    const before: Block[] = [mk('a')]
    const after = toggleVisible(before, 'zzz')
    assert.equal(after[0].visible, true)
  })
})

describe('updateBlockData', () => {
  it('merges patch into data without touching other keys', () => {
    const before: Block[] = [mk('a', 'hero', { data: { headline: 'h', sub: 's' } })]
    const after = updateBlockData(before, 'a', { headline: 'new' })
    assert.deepEqual(after[0].data, { headline: 'new', sub: 's' })
  })
  it('adds new keys', () => {
    const before: Block[] = [mk('a', 'hero', { data: { headline: 'h' } })]
    const after = updateBlockData(before, 'a', { sub: 'new' })
    assert.deepEqual(after[0].data, { headline: 'h', sub: 'new' })
  })
})

describe('updateBlockStyle', () => {
  it('creates style object when absent', () => {
    const before: Block[] = [mk('a')]
    const after = updateBlockStyle(before, 'a', { bg: 'ink' })
    assert.deepEqual(after[0].style, { bg: 'ink' })
  })
  it('merges patch into existing style', () => {
    const before: Block[] = [mk('a', 'hero', { style: { bg: 'paper', pad: 'lg' } })]
    const after = updateBlockStyle(before, 'a', { pad: 'xl' })
    assert.deepEqual(after[0].style, { bg: 'paper', pad: 'xl' })
  })
})

describe('updateBlockVariant', () => {
  it('replaces variant', () => {
    const before: Block[] = [mk('a', 'hero', { variant: 'overlay' })]
    const after = updateBlockVariant(before, 'a', 'split')
    assert.equal(after[0].variant, 'split')
  })
})

describe('reorderBlocks', () => {
  it('moves backward (from > to)', () => {
    const before: Block[] = [mk('a'), mk('b'), mk('c'), mk('d')]
    const after = reorderBlocks(before, 2, 0)
    assert.deepEqual(after.map(x => x.id), ['c', 'a', 'b', 'd'])
  })
  it('moves forward applies the to-1 offset (handoff app.jsx:92-97)', () => {
    // Moving item at 0 to position 2 should land at index 1 (since removing
    // it from 0 vacates a slot, `to=2` becomes effective index 1).
    const before: Block[] = [mk('a'), mk('b'), mk('c'), mk('d')]
    const after = reorderBlocks(before, 0, 2)
    assert.deepEqual(after.map(x => x.id), ['b', 'a', 'c', 'd'])
  })
  it('no-op when from === to', () => {
    const before: Block[] = [mk('a'), mk('b')]
    const after = reorderBlocks(before, 0, 0)
    assert.equal(after, before)
  })
  it('no-op on out-of-range from', () => {
    const before: Block[] = [mk('a')]
    assert.equal(reorderBlocks(before, -1, 0), before)
    assert.equal(reorderBlocks(before, 5, 0), before)
  })
  it('clamps to beyond end', () => {
    const before: Block[] = [mk('a'), mk('b'), mk('c')]
    const after = reorderBlocks(before, 0, 99)
    assert.deepEqual(after.map(x => x.id), ['b', 'c', 'a'])
  })
})

describe('purity — original array untouched by any mutation', () => {
  it('deleteBlock does not mutate input', () => {
    const before: Block[] = [mk('a'), mk('b')]
    const snapshot = before.slice()
    deleteBlock(before, 'a')
    assert.deepEqual(before.map(x => x.id), snapshot.map(x => x.id))
  })
  it('reorderBlocks does not mutate input', () => {
    const before: Block[] = [mk('a'), mk('b'), mk('c')]
    const snapshot = before.slice()
    reorderBlocks(before, 0, 2)
    assert.deepEqual(before.map(x => x.id), snapshot.map(x => x.id))
  })
})
