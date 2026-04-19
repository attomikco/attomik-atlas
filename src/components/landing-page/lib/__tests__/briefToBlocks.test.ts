import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { briefToBlocks } from '../briefToBlocks.ts'
import type { LandingBrief } from '../../types.ts'
import type { Brand } from '../../../../types/index.ts'

// Minimal Brand fixture — fields the adapter reads: name, notes, products.
// Everything else is typed-but-unused.
function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'brand_test',
    created_at: '',
    updated_at: '',
    name: 'Atlas',
    slug: 'atlas',
    website: null,
    industry: null,
    status: 'active',
    primary_color: null,
    secondary_color: null,
    accent_color: null,
    accent_font_color: null,
    heading_color: null,
    body_color: null,
    bg_base: null,
    bg_dark: null,
    bg_secondary: null,
    bg_accent: null,
    text_on_base: null,
    text_on_dark: null,
    text_on_accent: null,
    btn_primary: null,
    btn_primary_text: null,
    btn_secondary: null,
    btn_secondary_text: null,
    btn_tertiary: null,
    btn_tertiary_text: null,
    font_primary: null,
    font_secondary: null,
    font_heading: null,
    font_body: null,
    custom_fonts_css: null,
    default_headline: null,
    default_body_text: null,
    default_cta: null,
    brand_voice: null,
    target_audience: null,
    tone_keywords: null,
    avoid_words: null,
    logo_url: null,
    notes: null,
    mission: null,
    vision: null,
    values: null,
    competitors: null,
    products: null,
    customer_personas: null,
    ...overrides,
  }
}

const FULL_BRIEF: LandingBrief = {
  hero: { headline: 'Fuel the day', subheadline: 'Clean energy', cta_text: 'Shop' },
  problem: { headline: 'Energy drinks failed', body: 'Sugar, crash.' },
  solution: { headline: 'Cleaner lift', body: 'Slow-release caffeine.' },
  benefits: [
    { headline: 'Clean caffeine', body: '80mg green tea.' },
    { headline: 'Zero sugar', body: 'Monk fruit.' },
    { headline: 'Real ingredients', body: '12 pronounceable.' },
  ],
  social_proof: {
    headline: 'Loved by thousands',
    testimonial: 'Replaced my coffee.',
    attribution: 'Maya C., Verified buyer',
    stat: '500K+ cans sold',
  },
  faq: [
    { question: 'How much caffeine?', answer: '80mg.' },
    { question: 'Shelf life?', answer: '12 months.' },
  ],
  final_cta: { headline: 'Feel the difference', body: 'Free shipping.', cta_text: 'Start with a 6-pack' },
}

describe('briefToBlocks', () => {
  it('full brief + products + stat → 10 blocks in expected order', () => {
    const brand = makeBrand({
      products: [
        { name: 'Sunrise', description: 'Citrus', price_range: '32' },
        { name: 'Forest', description: 'Matcha', price_range: '32' },
      ],
    })
    const { blocks } = briefToBlocks(FULL_BRIEF, brand)
    assert.equal(blocks.length, 10)
    assert.deepEqual(
      blocks.map(b => b.type),
      [
        'hero', 'problem', 'solution', 'benefits', 'stats',
        'testimonial', 'product', 'faq', 'finalcta', 'footer',
      ],
    )
  })

  it('no stat → no stats block (9 blocks)', () => {
    const brief: LandingBrief = {
      ...FULL_BRIEF,
      social_proof: { ...FULL_BRIEF.social_proof, stat: '' },
    }
    const brand = makeBrand({
      products: [{ name: 'Sunrise', description: 'c', price_range: '32' }],
    })
    const { blocks } = briefToBlocks(brief, brand)
    assert.equal(blocks.length, 9)
    assert.ok(!blocks.some(b => b.type === 'stats'))
  })

  it('no products → no product block', () => {
    const brand = makeBrand({ products: null })
    const { blocks } = briefToBlocks(FULL_BRIEF, brand)
    assert.ok(!blocks.some(b => b.type === 'product'))
    // Still gets all other sections: hero, problem, solution, benefits,
    // stats, testimonial, faq, finalcta, footer = 9.
    assert.equal(blocks.length, 9)
  })

  it('null brief → minimal default page (hero + finalcta + footer)', () => {
    const brand = makeBrand({ name: 'Saint Spritz' })
    const { blocks } = briefToBlocks(null, brand)
    assert.equal(blocks.length, 3)
    assert.deepEqual(blocks.map(b => b.type), ['hero', 'finalcta', 'footer'])
    assert.equal((blocks[0].data as { headline: string }).headline, 'Saint Spritz')
    assert.equal((blocks[2].data as { brand: string }).brand, 'Saint Spritz')
  })

  it('attribution with comma → split into name + title', () => {
    const brief: LandingBrief = {
      ...FULL_BRIEF,
      social_proof: { ...FULL_BRIEF.social_proof, attribution: 'Maya C., Verified buyer · 3 months' },
    }
    const { blocks } = briefToBlocks(brief, makeBrand())
    const testimonial = blocks.find(b => b.type === 'testimonial')
    assert.ok(testimonial)
    const data = testimonial.data as { name: string; title: string }
    assert.equal(data.name, 'Maya C.')
    assert.equal(data.title, 'Verified buyer · 3 months')
  })

  it('attribution without comma → whole string into name, title empty', () => {
    const brief: LandingBrief = {
      ...FULL_BRIEF,
      social_proof: { ...FULL_BRIEF.social_proof, attribution: 'Anonymous reviewer' },
    }
    const { blocks } = briefToBlocks(brief, makeBrand())
    const testimonial = blocks.find(b => b.type === 'testimonial')
    assert.ok(testimonial)
    const data = testimonial.data as { name: string; title: string }
    assert.equal(data.name, 'Anonymous reviewer')
    assert.equal(data.title, '')
  })

  it('pageSettings defaults from brand.name + notes.tagline', () => {
    const brand = makeBrand({
      name: 'Saint Spritz',
      notes: JSON.stringify({ tagline: 'Italian-made apéritif' }),
    })
    const { pageSettings } = briefToBlocks(null, brand)
    assert.equal(pageSettings.title, 'Saint Spritz — Landing Page')
    assert.equal(pageSettings.slug, 'saint-spritz-landing')
    assert.equal(pageSettings.meta, 'Italian-made apéritif')
    assert.equal(pageSettings.maxWidth, 'default')
  })

  it('every block has a block id, visible: true, no style field', () => {
    const { blocks } = briefToBlocks(FULL_BRIEF, makeBrand())
    const ids = new Set<string>()
    for (const b of blocks) {
      assert.match(b.id, /^b_[a-z0-9]+$/)
      assert.equal(b.visible, true)
      assert.equal(b.style, undefined)
      assert.ok(!ids.has(b.id), 'block ids should be unique')
      ids.add(b.id)
    }
  })
})
