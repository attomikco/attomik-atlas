import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getPageTheme, rgbaFromHex } from '../getPageTheme.ts'
import type { Brand } from '../../../../types/index.ts'

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b', created_at: '', updated_at: '',
    name: 'Atlas', slug: 'atlas',
    website: null, industry: null, status: 'active',
    primary_color: null, secondary_color: null, accent_color: null,
    accent_font_color: null, heading_color: null, body_color: null,
    bg_base: null, bg_dark: null, bg_secondary: null, bg_accent: null,
    text_on_base: null, text_on_dark: null, text_on_accent: null,
    btn_primary: null, btn_primary_text: null, btn_secondary: null,
    btn_secondary_text: null, btn_tertiary: null, btn_tertiary_text: null,
    font_primary: null, font_secondary: null, font_heading: null, font_body: null,
    custom_fonts_css: null,
    default_headline: null, default_body_text: null, default_cta: null,
    brand_voice: null, target_audience: null, tone_keywords: null, avoid_words: null,
    logo_url: null, notes: null,
    mission: null, vision: null, values: null,
    competitors: null, products: null, customer_personas: null,
    ...overrides,
  }
}

describe('rgbaFromHex', () => {
  it('parses 6-digit hex', () => {
    assert.equal(rgbaFromHex('#ff00ff', 0.12), 'rgba(255,0,255,0.12)')
  })
  it('parses 3-digit hex via expansion', () => {
    assert.equal(rgbaFromHex('#f0f', 0.5), 'rgba(255,0,255,0.5)')
  })
  it('tolerates missing #', () => {
    assert.equal(rgbaFromHex('00ff97', 0.35), 'rgba(0,255,151,0.35)')
  })
  it('falls back to black on invalid input', () => {
    assert.equal(rgbaFromHex('nope', 0.5), 'rgba(0,0,0,0.5)')
    assert.equal(rgbaFromHex('', 0.5), 'rgba(0,0,0,0.5)')
  })
})

describe('getPageTheme', () => {
  it('happy path — full brand produces valid theme', () => {
    const brand = makeBrand({
      primary_color: '#1a1a1a',
      secondary_color: '#d4af37',
      accent_color: '#ff3366',
      font_heading: { family: 'Barlow', weight: '900', transform: 'uppercase' },
      font_body: { family: 'Inter', weight: '400', transform: 'none' },
    })
    const { valid, missing, theme } = getPageTheme(brand)
    assert.equal(valid, true)
    assert.deepEqual(missing, [])
    assert.ok(theme)
    assert.equal(theme.ink, '#1a1a1a')
    assert.equal(theme.accent, '#ff3366')
    assert.equal(theme.secondary, '#d4af37')
    assert.equal(theme.accentMid, 'rgba(255,51,102,0.12)')
    assert.equal(theme.accentTintBorder, 'rgba(255,51,102,0.35)')
    assert.equal(theme.inkMid, 'rgba(26,26,26,0.6)')
    assert.equal(theme.inkSoft, 'rgba(26,26,26,0.4)')
    assert.match(theme.fontHeading, /^'Barlow',/)
    assert.match(theme.fontBody, /^'Inter',/)
    assert.equal(theme.fontMono, 'DM Mono, monospace')
    assert.equal(theme.googleFonts.length, 2)
    assert.ok(theme.googleFonts[0].includes('Barlow'))
    assert.ok(theme.googleFonts[1].includes('Inter'))
  })

  it('missing primary → invalid with primary_color in missing[]', () => {
    const brand = makeBrand({ primary_color: null, accent_color: '#00ff97' })
    const { valid, missing, theme } = getPageTheme(brand)
    assert.equal(valid, false)
    assert.ok(missing.includes('primary_color'))
    assert.equal(theme, null)
  })

  it('missing accent → invalid with accent_color in missing[]', () => {
    const brand = makeBrand({ primary_color: '#000', accent_color: null })
    const { valid, missing, theme } = getPageTheme(brand)
    assert.equal(valid, false)
    assert.ok(missing.includes('accent_color'))
    assert.equal(theme, null)
  })

  it('missing both → both in missing[]', () => {
    const brand = makeBrand({})
    const { missing } = getPageTheme(brand)
    assert.deepEqual(missing.sort(), ['accent_color', 'primary_color'])
  })

  it('missing secondary does NOT block validity; falls back to ink tint', () => {
    const brand = makeBrand({ primary_color: '#101010', accent_color: '#abc' })
    const { valid, theme } = getPageTheme(brand)
    assert.equal(valid, true)
    assert.ok(theme)
    assert.equal(theme.secondary, 'rgba(16,16,16,0.6)')
  })

  it('handles font_heading stored as JSON string', () => {
    const brand = makeBrand({
      primary_color: '#000', accent_color: '#fff',
      font_heading: '{"family":"Playfair","weight":"700","transform":"none"}' as unknown as Brand['font_heading'],
    })
    const { theme } = getPageTheme(brand)
    assert.ok(theme)
    assert.match(theme.fontHeading, /^'Playfair',/)
  })

  it('single-font brand produces one google URL, not two duplicates', () => {
    const brand = makeBrand({
      primary_color: '#000', accent_color: '#fff',
      font_heading: { family: 'Space Grotesk', weight: '700', transform: 'none' },
      // body missing — falls back to heading family
    })
    const { theme } = getPageTheme(brand)
    assert.ok(theme)
    assert.equal(theme.googleFonts.length, 1)
    assert.ok(theme.googleFonts[0].includes('Space+Grotesk'))
  })
})
