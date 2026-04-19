import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { renderPreview, type LandingBrief } from '../landing-preview-renderer.ts'
import type { Brand, BrandImage, Product } from '../../types/index.ts'

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'brand_test',
    created_at: '', updated_at: '',
    name: 'TestBrand', slug: 'testbrand',
    website: 'https://testbrand.com',
    industry: null, status: 'active',
    primary_color: '#1a1a1a',
    secondary_color: '#555555',
    accent_color: '#00ff97',
    accent_font_color: null, heading_color: null, body_color: null,
    bg_base: null, bg_dark: null, bg_secondary: null, bg_accent: null,
    text_on_base: null, text_on_dark: null, text_on_accent: null,
    btn_primary: null, btn_primary_text: null,
    btn_secondary: null, btn_secondary_text: null,
    btn_tertiary: null, btn_tertiary_text: null,
    font_primary: null, font_secondary: null,
    font_heading: { family: 'Barlow', weight: '900', transform: 'uppercase' },
    font_body: { family: 'Inter', weight: '400', transform: 'none' },
    custom_fonts_css: null,
    default_headline: null, default_body_text: null, default_cta: null,
    brand_voice: null, target_audience: null, tone_keywords: null, avoid_words: null,
    logo_url: null, notes: null,
    mission: null, vision: null, values: null,
    competitors: null, products: null, customer_personas: null,
    ...overrides,
  }
}

const FULL_BRIEF: LandingBrief = {
  hero: { headline: 'Fuel the Day', subheadline: 'Clean energy, zero crash.', cta_text: 'Shop Now' },
  problem: { headline: 'Tired of crashes?', body: 'Most energy drinks spike then dump you.' },
  solution: { headline: 'Slow-release lift', body: 'Green tea caffeine, monk fruit sweet.' },
  benefits: [
    { headline: 'Clean caffeine', body: '80mg from green tea.' },
    { headline: 'Zero sugar', body: 'Monk fruit only.' },
    { headline: 'Real ingredients', body: '12 pronounceable.' },
    { headline: 'Lab tested', body: 'Third-party verified.' },
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

const PRODUCTS: Product[] = [
  { name: 'Sunrise', description: 'Citrus', price_range: '32' },
  { name: 'Forest', description: 'Matcha', price_range: '32' },
]

const BRAND_IMAGES: BrandImage[] = [
  { id: 'i1', created_at: '', brand_id: 'brand_test', file_name: 'hero.jpg',
    storage_path: 'brand-images/hero.jpg', mime_type: 'image/jpeg', size_bytes: 100000,
    tag: 'lifestyle', alt_text: null, width: 1200, height: 800, source_url: null, source: null },
  { id: 'i2', created_at: '', brand_id: 'brand_test', file_name: 'product.png',
    storage_path: 'brand-images/product.png', mime_type: 'image/png', size_bytes: 100000,
    tag: 'product', alt_text: null, width: 800, height: 800, source_url: null, source: null },
  { id: 'i3', created_at: '', brand_id: 'brand_test', file_name: 'lifestyle.jpg',
    storage_path: 'brand-images/lifestyle.jpg', mime_type: 'image/jpeg', size_bytes: 100000,
    tag: 'lifestyle', alt_text: null, width: 1200, height: 800, source_url: null, source: null },
  { id: 'i4', created_at: '', brand_id: 'brand_test', file_name: 'lifestyle2.jpg',
    storage_path: 'brand-images/lifestyle2.jpg', mime_type: 'image/jpeg', size_bytes: 100000,
    tag: 'lifestyle', alt_text: null, width: 1200, height: 800, source_url: null, source: null },
]

describe('renderPreview — happy path', () => {
  const html = renderPreview({
    brand: makeBrand(),
    brief: FULL_BRIEF,
    brandImages: BRAND_IMAGES,
    products: PRODUCTS,
    supabaseUrl: 'https://test.supabase.co',
  })

  it('non-empty HTML', () => {
    assert.ok(html.length > 1000, 'expected at least 1000 chars of HTML')
  })

  it('contains brand name in several places', () => {
    const occurrences = (html.match(/TestBrand/g) || []).length
    assert.ok(occurrences >= 3, `expected at least 3 TestBrand references, got ${occurrences}`)
  })

  it('contains brief headline + subheadline', () => {
    assert.ok(html.includes('Fuel the Day'))
    assert.ok(html.includes('Clean energy, zero crash.'))
  })

  it('no mustache placeholders leak through', () => {
    assert.doesNotMatch(html, /\{\{\w+\}\}/)
  })

  it('CSS var block overrides with the brand primary + accent', () => {
    assert.ok(html.includes('--brand-primary: #1a1a1a;'))
    assert.ok(html.includes('--brand-accent: #00ff97;'))
  })

  it('font links injected for heading + body families', () => {
    assert.ok(html.includes('family=Barlow'))
    assert.ok(html.includes('family=Inter'))
  })

  it('FONT_LINKS marker replaced (not leaked)', () => {
    assert.doesNotMatch(html, /<!--FONT_LINKS-->/)
  })

  it('product cards render', () => {
    assert.ok(html.includes('Sunrise'))
    assert.ok(html.includes('Forest'))
  })

  it('faq accordion renders all items', () => {
    assert.ok(html.includes('How much caffeine?'))
    assert.ok(html.includes('Shelf life?'))
  })

  it('announcement text includes brand name + price', () => {
    assert.ok(html.includes('TestBrand — From $32'))
  })
})

describe('renderPreview — visibility rules', () => {
  it('no brief.reviews → testimonials section absent (no synthesis from testimonial)', () => {
    // FULL_BRIEF has a testimonial set but no optional `reviews` array.
    // Pre-fix, that testimonial was synthesized into a fake 3-card grid.
    // Post-fix, the testimonials section only lights up when the caller
    // provides real reviews[], so this must render as absent.
    const html = renderPreview({
      brand: makeBrand(),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(!html.includes('What Customers Are Saying'))
    assert.doesNotMatch(html, /<!-- PREVIEW_SECTION_[A-Z]+:testimonials -->/)
  })

  it('empty faq → faq section absent', () => {
    const brief: LandingBrief = { ...FULL_BRIEF, faq: [] }
    const html = renderPreview({
      brand: makeBrand(),
      brief,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(!html.includes('Frequently Asked Questions'))
  })

  it('empty products → showcase section absent', () => {
    const html = renderPreview({
      brand: makeBrand(),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: [],
      supabaseUrl: 'https://test.supabase.co',
    })
    // The products-html placeholder must not leak
    assert.doesNotMatch(html, /\{\{products_html\}\}/)
    // Showcase header copy is only inside the section wrapper
    assert.ok(!html.includes('Choose Yours'))
  })

  it('no problem brief → lifestyle section absent', () => {
    const brief: LandingBrief = { ...FULL_BRIEF, problem: undefined }
    const html = renderPreview({
      brand: makeBrand(),
      brief,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(!html.includes('Tired of crashes?'))
  })

  it('every section marker is stripped regardless of visibility', () => {
    const html = renderPreview({
      brand: makeBrand(),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.doesNotMatch(html, /<!-- PREVIEW_SECTION_(START|END):\w+ -->/)
  })

  it('no brief.hiw → how-it-works section absent (no hardcoded steps)', () => {
    const html = renderPreview({
      brand: makeBrand(),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(!html.includes('How It Works'))
    assert.ok(!html.includes('Simple As It Gets'))
  })

  it('no brand.press_mentions → press section absent (no benefit-derived fake)', () => {
    const html = renderPreview({
      brand: makeBrand(),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(!html.includes('<section class="press">'))
  })

  it('no brand.notes.guarantees → guarantee row absent (no benefit-reuse badges)', () => {
    const html = renderPreview({
      brand: makeBrand(),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    // guarantee div wraps inside final-cta; the class='guarantee' node
    // should be entirely gone along with its markers.
    assert.ok(!html.includes('class="guarantee"'))
    // final-cta section itself is unaffected (always visible).
    assert.ok(html.includes('class="final-cta"'))
  })

  it('brand.notes.guarantees = [] → guarantee still hidden (empty array is falsy)', () => {
    const html = renderPreview({
      brand: makeBrand({ notes: JSON.stringify({ guarantees: [] }) }),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(!html.includes('class="guarantee"'))
  })

  it('brand.notes.guarantees populated → guarantee row renders', () => {
    const html = renderPreview({
      brand: makeBrand({
        notes: JSON.stringify({
          guarantees: [{ text: '30-day return policy' }, { text: 'Free shipping' }],
        }),
      }),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(html.includes('class="guarantee"'))
    assert.ok(html.includes('30-day return policy'))
    assert.ok(html.includes('Free shipping'))
  })
})

describe('renderPreview — CSS var substitution', () => {
  it('primary_color = #ff0000 shows up in override block', () => {
    const html = renderPreview({
      brand: makeBrand({ primary_color: '#ff0000' }),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(html.includes('--brand-primary: #ff0000;'))
  })

  it('single-font brand emits one google font link, not duplicates', () => {
    const html = renderPreview({
      brand: makeBrand({
        font_heading: { family: 'Space Grotesk', weight: '700', transform: 'none' },
        font_body: { family: 'Space Grotesk', weight: '400', transform: 'none' },
      }),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    const count = (html.match(/family=Space\+Grotesk/g) || []).length
    assert.equal(count, 1, `expected 1 link, got ${count}`)
  })
})

describe('renderPreview — escape safety', () => {
  it('scalars with angle brackets get HTML-escaped', () => {
    const html = renderPreview({
      brand: makeBrand({ name: '<script>alert(1)</script>' }),
      brief: FULL_BRIEF,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
    assert.ok(!html.includes('<script>alert(1)'))
  })

  it('brief copy with quotes gets escaped in the output', () => {
    // Previously checked via brief.social_proof.testimonial → review card,
    // but that path is gone now (reviews section hides without real
    // brief.reviews). Swap to hero.subheadline which always renders.
    const brief: LandingBrief = {
      ...FULL_BRIEF,
      hero: { ...FULL_BRIEF.hero, subheadline: 'It\'s "great"!' },
    }
    const html = renderPreview({
      brand: makeBrand(),
      brief,
      brandImages: BRAND_IMAGES,
      products: PRODUCTS,
      supabaseUrl: 'https://test.supabase.co',
    })
    assert.ok(html.includes('&quot;great&quot;'))
    assert.ok(html.includes('&#39;s'))
  })
})
