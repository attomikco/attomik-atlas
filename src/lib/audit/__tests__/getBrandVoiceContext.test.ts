import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getBrandVoiceContext } from '../getBrandVoiceContext.ts'

// Minimal shape that satisfies the fields we actually read. Cast through
// unknown so we don't have to fill every unrelated column on `Brand`.
function brand(overrides: Record<string, unknown> = {}) {
  return {
    brand_voice: 'Warm, honest, craft-focused.',
    tone_keywords: ['warm', 'honest', 'craft'],
    avoid_words: ['shop now', "don't miss out"],
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('getBrandVoiceContext', () => {
  it('maps all three fields when all are present', () => {
    const ctx = getBrandVoiceContext(brand())
    assert.equal(ctx.voiceDescription, 'Warm, honest, craft-focused.')
    assert.deepEqual(ctx.toneAttributes, ['warm', 'honest', 'craft'])
    assert.deepEqual(ctx.forbiddenPhrases, ['shop now', "don't miss out"])
  })

  it('falls back to a generic description when brand_voice is null', () => {
    const ctx = getBrandVoiceContext(brand({ brand_voice: null }))
    assert.ok(ctx.voiceDescription.toLowerCase().includes('no brand voice'))
  })

  it('returns an empty array when tone_keywords is null', () => {
    const ctx = getBrandVoiceContext(brand({ tone_keywords: null }))
    assert.deepEqual(ctx.toneAttributes, [])
  })

  it('returns undefined (not empty array) when avoid_words is null', () => {
    const ctx = getBrandVoiceContext(brand({ avoid_words: null }))
    assert.equal(ctx.forbiddenPhrases, undefined)
  })

  it('preserves an empty forbidden list when explicitly set to []', () => {
    const ctx = getBrandVoiceContext(brand({ avoid_words: [] }))
    assert.deepEqual(ctx.forbiddenPhrases, [])
  })
})
