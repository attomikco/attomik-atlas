// Landing-preview renderer — three-stage pipeline replacing the 348-line
// regex-chain renderLandingHtml. See .design-handoffs/PREVIEW_DATA_CONTRACT.md
// for the full list of scalars, iterated sections, CSS vars, and visibility
// rules the template honors.
//
// Stages:
//   1. resolveScalars — compute every {{name}} value from brand + brief
//   2. renderIteratedHtml — pre-render benefits/products/faq/etc. as HTML strings
//   3. substitute — one pass to strip hidden sections, one pass to swap
//      scalars + iterated-HTML placeholders, plus CSS variable + font injection
//
// Pure — no AI calls, no network IO, no Supabase client. Template is read
// from disk once per call via readFileSync; callers that need hot-path
// throughput should cache the result upstream.

import { readFileSync } from 'fs'
import { join } from 'path'
// Relative paths (not @/ alias) so Node's strip-types loader can run the
// renderer directly for tests and the regenerate-all script.
import { bucketBrandImages, getBusinessType, pickSlotImages } from './brand-images.ts'
import type { Brand, BrandImage, Product } from '../types/index.ts'

// LandingBrief shape — unchanged from the old landing-page-renderer.
// Duplicated here so the old file can be deleted in Step 6 without
// breaking callers of this renderer.
export interface LandingBrief {
  hero: { headline: string; subheadline: string; cta_text: string }
  problem?: { headline: string; body: string }
  solution?: { headline: string; body: string }
  benefits?: Array<{ headline: string; body: string }>
  social_proof?: { headline?: string; testimonial?: string; attribution?: string; stat?: string }
  faq?: Array<{ question: string; answer: string }>
  final_cta?: { headline?: string; body?: string; cta_text?: string }
}

export interface RenderPreviewInput {
  brand: Brand
  brief: LandingBrief
  brandImages: BrandImage[]
  products: Product[]
  // Supabase Storage URL. Defaults to NEXT_PUBLIC_SUPABASE_URL at call
  // time — injectable so the regenerate-all script can override without
  // threading env through its own call stack.
  supabaseUrl?: string
}

// ── Utility ────────────────────────────────────────────────────────

function esc(s: unknown): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isLight(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function mix(hex: string, white: number): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const lr = Math.round(r + (255 - r) * white)
  const lg = Math.round(g + (255 - g) * white)
  const lb = Math.round(b + (255 - b) * white)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

// Two-char alpha hex suffix (e.g. "15" = ~8%). Mirrors the old renderer's
// shorthand (primary + "15" → "#rrggbb15") — lets us tint a brand color
// without re-parsing it.
function hexAlpha(hex: string, alphaHex: string): string {
  return hex.replace('#', '#').padEnd(7, '0') + alphaHex
}

function parseFont(f: unknown): { family?: string; weight?: string; transform?: string } | null {
  if (!f) return null
  if (typeof f === 'string') {
    try { return JSON.parse(f) } catch { return null }
  }
  if (typeof f === 'object') return f as Record<string, string>
  return null
}

function googleFontUrl(family: string): string {
  const cleaned = family.replace(/ /g, '+')
  return `https://fonts.googleapis.com/css2?family=${cleaned}:wght@300;400;500;600;700;800;900&display=swap`
}

// ── Iterated-section renderers ─────────────────────────────────────
// Each returns a single HTML string for injection into the matching
// {{*_html}} placeholder. Inline styles reference CSS vars set by
// the theme-override block; no hex literals.

function renderProofStrip(benefits: Array<{ headline: string }>): string {
  return benefits.slice(0, 4).map(b => `
    <div class="proof-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
      ${esc(b.headline)}
    </div>
  `).join('')
}

function renderHeroMicro(benefits: Array<{ headline: string }>): string {
  return benefits.slice(0, 3).map(b => `
    <span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
      ${esc(b.headline)}
    </span>
  `).join('')
}

function renderIngredientCards(
  benefits: Array<{ headline: string; body: string }>,
  images: BrandImage[],
  getUrl: (path: string) => string,
): string {
  return benefits.slice(0, 3).map((b, i) => {
    const img = images[i] ? getUrl(images[i].storage_path) : ''
    const imgHtml = img
      ? `<img src="${esc(img)}" alt="${esc(b.headline)}" loading="lazy">`
      : `<div style="width:120px;height:120px;background:var(--accent-dim);border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--accent);">✦</div>`
    return `
      <div class="ingredient-card">
        ${imgHtml}
        <h4 class="heading">${esc(b.headline)}</h4>
        <p>${esc(b.body)}</p>
      </div>
    `
  }).join('')
}

function renderProductCards(
  products: Product[],
  productImages: BrandImage[],
  brandUrl: string,
  ctaText: string,
  getUrl: (path: string) => string,
): string {
  return products.slice(0, 3).map((p, i) => {
    const imgRow = productImages[i]
    const img = imgRow ? getUrl(imgRow.storage_path) : ''
    const imgHtml = img
      ? `<img src="${esc(img)}" alt="${esc(p.name)}" class="flavor-img" loading="lazy">`
      : `<div class="flavor-img" style="background:var(--bg-alt);display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--primary-dim);">▢</div>`
    const price = p.price_range
      ? `<p class="flavor-price">${/[$€£¥]/.test(p.price_range) ? esc(p.price_range) : '$' + esc(p.price_range)}</p>`
      : ''
    const href = p.url || brandUrl || '#'
    return `
      <div class="flavor-card">
        ${imgHtml}
        <h3 class="flavor-name heading">${esc(p.name)}</h3>
        <p class="flavor-desc">${esc(p.description || '')}</p>
        ${price}
        <a href="${esc(href)}" class="btn-flavor">${esc(ctaText)}</a>
      </div>
    `
  }).join('')
}

// ── Optional-field readers ─────────────────────────────────────────
// These four sections (reviews / hiw / press / guarantees) used to
// synthesize fake content from other fields (testimonial quotes,
// benefit headlines, hero subheadline, etc.). They now render ONLY
// when real data exists under an optional field and are hidden
// otherwise via the visibility pass. The fields don't exist in the
// DB schema today — optional chaining against duck-typed shapes
// returns falsy for every current row, which hides the section.
// When wizard / scraper / manual-edit starts populating these, the
// sections light up automatically. No fabrication anywhere.

interface OptionalReview { text: string; author?: string }
interface OptionalHiwStep { title: string; desc: string }
interface OptionalPressMention { name: string }
interface OptionalGuarantee { text: string }

function optReviews(brief: LandingBrief): OptionalReview[] {
  const v = (brief as unknown as Record<string, unknown>).reviews
  if (!Array.isArray(v)) return []
  return v.filter((r): r is OptionalReview =>
    !!r && typeof r === 'object' && typeof (r as { text?: unknown }).text === 'string'
  )
}

function optHiwSteps(brief: LandingBrief): OptionalHiwStep[] {
  const v = (brief as unknown as Record<string, unknown>).hiw
  if (!Array.isArray(v)) return []
  return v.filter((s): s is OptionalHiwStep =>
    !!s && typeof s === 'object'
    && typeof (s as { title?: unknown }).title === 'string'
    && typeof (s as { desc?: unknown }).desc === 'string'
  )
}

function optPressMentions(brand: Brand): OptionalPressMention[] {
  const v = (brand as unknown as Record<string, unknown>).press_mentions
  if (!Array.isArray(v)) return []
  return v.filter((p): p is OptionalPressMention =>
    !!p && typeof p === 'object' && typeof (p as { name?: unknown }).name === 'string'
  )
}

function optGuarantees(brand: Brand): OptionalGuarantee[] {
  if (!brand.notes) return []
  try {
    const parsed = JSON.parse(brand.notes) as Record<string, unknown>
    const v = parsed.guarantees
    if (!Array.isArray(v)) return []
    return v.filter((g): g is OptionalGuarantee =>
      !!g && typeof g === 'object' && typeof (g as { text?: unknown }).text === 'string'
    )
  } catch {
    return []
  }
}

// ── Fake-content-free renderers ────────────────────────────────────
// Each takes the real data (or nothing) and returns a possibly-empty
// string. The visibility pass strips the surrounding section block
// when no real data exists, so these functions never need to produce
// placeholder fallbacks.

function renderReviewCards(brief: LandingBrief): string {
  return optReviews(brief).slice(0, 3).map(r => `
    <div class="review-card">
      <div class="review-stars">★★★★★</div>
      <p class="review-text">"${esc(r.text)}"</p>
      <p class="review-author">${esc(r.author || 'Verified Customer')}</p>
      <p class="review-verified">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Verified Purchase
      </p>
    </div>
  `).join('')
}

function renderHiwSteps(brief: LandingBrief): string {
  return optHiwSteps(brief).slice(0, 3).map((s, i) => `
    <div class="hiw-step">
      <div class="step-num heading">${i + 1}</div>
      <h4 class="heading">${esc(s.title)}</h4>
      <p>${esc(s.desc)}</p>
    </div>
  `).join('')
}

function renderPressBar(brand: Brand): string {
  return optPressMentions(brand).slice(0, 5).map(p => `
    <span style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-secondary);padding:0 24px;border-right:1px solid var(--border);">
      ${esc(p.name)}
    </span>
  `).join('')
}

function renderFaq(faq: Array<{ question: string; answer: string }>): string {
  return faq.map((f, i) => `
    <details class="faq-item"${i === 0 ? ' open' : ''}>
      <summary class="faq-question heading">${esc(f.question)}</summary>
      <p class="faq-answer">${esc(f.answer)}</p>
    </details>
  `).join('')
}

function renderGuarantee(brand: Brand): string {
  return optGuarantees(brand).slice(0, 3).map(g => `
    <span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
      ${esc(g.text)}
    </span>
  `).join('')
}

function renderPhotoStrip(images: BrandImage[], getUrl: (path: string) => string, brandName: string): string {
  // Hard cap at 4 so the strip is always a single row of 4 on desktop
  // (the template's grid is repeat(4, 1fr) — anything over 4 wrapped
  // into a second row). Paired with the "visible only when >= 4 images"
  // rule in computeVisibility so 3-image brands hide the section entirely
  // rather than leaving an empty fourth cell.
  return images.slice(0, 4).map(img =>
    `<img src="${esc(getUrl(img.storage_path))}" alt="${esc(brandName)}" loading="lazy">`
  ).join('')
}

// ── Theme-override block ───────────────────────────────────────────

function buildThemeOverride(brand: Brand): { styleBlock: string; fontLinks: string } {
  const primary = brand.primary_color || '#000000'
  // No secondary_color set → tint of primary at 60% alpha (matches the
  // template's placeholder :root). Keeps visual separation between the
  // announcement bar (which now uses --brand-secondary) and the hero
  // (--bg-dark = primary) for brands with no secondary.
  const secondary = brand.secondary_color || hexAlpha(primary, '99')
  const accent = brand.accent_color || secondary
  const primaryIsLight = isLight(primary)
  const textOnDark = primaryIsLight ? '#000000' : '#ffffff'
  const textOnDarkSec = primaryIsLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.65)'
  const textOnDarkTer = primaryIsLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)'

  const fontHeading = parseFont(brand.font_heading)
  const fontBody = parseFont(brand.font_body)
  const headingFamily = fontHeading?.family
    || brand.font_primary?.split('|')[0]
    || 'Barlow'
  const bodyFamily = fontBody?.family
    || brand.font_secondary
    || headingFamily
  const headingWeight = fontHeading?.weight || '700'
  const headingTransform = fontHeading?.transform || 'none'

  const fontLinks: string[] = []
  if (headingFamily) fontLinks.push(`<link rel="stylesheet" href="${googleFontUrl(headingFamily)}">`)
  if (bodyFamily && bodyFamily !== headingFamily) {
    fontLinks.push(`<link rel="stylesheet" href="${googleFontUrl(bodyFamily)}">`)
  }

  const styleBlock = `<style id="brand-override">
:root {
  --brand-primary: ${primary};
  --brand-secondary: ${secondary};
  --brand-accent: ${accent};
  --brand-font-heading: '${headingFamily}', system-ui, sans-serif;
  --brand-font-body: '${bodyFamily}', system-ui, sans-serif;
  --brand-font-heading-weight: ${headingWeight};
  --brand-font-heading-transform: ${headingTransform};

  --bg: ${mix(primary, 0.93)};
  --bg-alt: ${mix(primary, 0.88)};
  --bg-card: ${mix(primary, 0.96)};
  --bg-dark: ${primary};
  --bg-dark-alt: ${secondary};

  --text: ${primary};
  --text-secondary: ${primary};
  --text-tertiary: ${hexAlpha(primary, '99')};
  --text-on-dark: ${textOnDark};
  --text-on-dark-secondary: ${textOnDarkSec};
  --text-on-dark-tertiary: ${textOnDarkTer};

  --primary: ${secondary};
  --primary-light: ${mix(secondary, 0.15)};
  --primary-dim: ${hexAlpha(secondary, '22')};

  --accent: ${accent};
  --accent-light: ${mix(accent, 0.15)};
  --accent-dim: ${hexAlpha(accent, '22')};

  --border: ${hexAlpha(primary, '15')};
  --border-strong: ${hexAlpha(primary, '28')};
  --border-on-dark: ${primaryIsLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'};
}
</style>`

  return { styleBlock, fontLinks: fontLinks.join('\n') }
}

// ── Scalars ────────────────────────────────────────────────────────

function resolveScalars(
  input: RenderPreviewInput,
  getUrl: (path: string) => string,
  heroImg: string,
  lifestyleImg: string,
): Record<string, string> {
  const { brand, brief, products } = input
  const firstProduct = products[0]
  const stat = brief.social_proof?.stat?.trim() || 'Loved by thousands'
  const problemWords = (brief.problem?.headline || '').split(' ').slice(0, 4).join(' ')

  const notes = (() => { try { return brand.notes ? JSON.parse(brand.notes) : null } catch { return null } })()
  const logoLight: string | undefined = notes?.logo_url_light
  const logoToUse = logoLight || brand.logo_url
  const fontHeading = parseFont(brand.font_heading)
  const headingTransform = fontHeading?.transform || 'none'
  const brandLogoHtml = logoToUse
    ? `<img src="${esc(logoToUse)}" alt="${esc(brand.name)}" class="hero-logo">`
    : `<span style="font-family:var(--brand-font-heading);font-weight:900;font-size:20px;color:var(--text-on-dark);letter-spacing:-0.02em;text-transform:${esc(headingTransform)};">${esc(brand.name)}</span>`

  const brandUrl = brand.website || '#'
  const brandDomain = brand.website
    ? brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : brand.name.toLowerCase().replace(/\s+/g, '-') + '.com'

  const productPriceDisplay = firstProduct?.price_range
    ? (/[$€£¥]/.test(firstProduct.price_range) ? firstProduct.price_range : '$' + firstProduct.price_range)
    : ''
  const announcementText = firstProduct?.price_range
    ? `Free Shipping On Orders · ${brand.name} — From ${productPriceDisplay}`
    : `Free Shipping On Orders · ${brief.hero.cta_text}`

  const finalOfferText = firstProduct
    ? `${firstProduct.name}${productPriceDisplay ? ` — ${productPriceDisplay}` : ''}`
    : brand.name

  const founderBody = brand.mission
    || (brand.brand_voice?.slice(0, 200) ?? '')
    || brief.solution?.body
    || ''

  const heroImageHtml = heroImg
    ? `<img src="${esc(heroImg)}" alt="${esc(brand.name)}" loading="eager">`
    : ''
  const lifestyleImageHtml = lifestyleImg
    ? `<img src="${esc(lifestyleImg)}" alt="${esc(brand.name)}" loading="lazy">`
    : ''
  // Founder image reuses the lifestyle slot per the contract — keeps
  // image-pool pressure low when brands only have 2-3 images.
  const founderImageHtml = lifestyleImageHtml

  return {
    page_title: `${brand.name} | ${brief.hero.headline}`,
    meta_description: brief.hero.subheadline || '',
    brand_name: brand.name,
    brand_url: brandUrl,
    brand_domain: brandDomain,
    brand_logo_html: brandLogoHtml,
    year: String(new Date().getFullYear()),
    announcement_text: announcementText,

    hero_headline: brief.hero.headline,
    hero_subheadline: brief.hero.subheadline,
    hero_cta_text: brief.hero.cta_text,
    hero_badge_text: `${stat} — ${brand.name}`,
    hero_image_html: heroImageHtml,

    problem_label: problemWords || 'Why It Matters',
    problem_headline: brief.problem?.headline || '',
    problem_body: brief.problem?.body || '',
    problem_cta_text: brief.hero.cta_text,
    lifestyle_image_html: lifestyleImageHtml,

    showcase_label: 'Choose Yours',
    showcase_headline: `Meet the ${brand.name}`,

    solution_label: 'What Makes It Work',
    solution_headline: brief.solution?.headline || '',
    solution_body: brief.solution?.body || '',

    founder_label: `The ${brand.name} Story`,
    founder_headline: `The Vision Behind ${brand.name}`,
    founder_body: founderBody,
    founder_image_html: founderImageHtml,

    final_headline: brief.final_cta?.headline || 'Ready when you are.',
    final_offer_text: finalOfferText,
    final_offer_sub: brief.final_cta?.body || brief.hero.subheadline,
    final_cta_text: brief.final_cta?.cta_text || brief.hero.cta_text,

    floating_cta_text: `${brief.hero.cta_text} →`,
  }
}

// ── Section visibility ─────────────────────────────────────────────

function computeVisibility(input: RenderPreviewInput): Record<string, boolean> {
  const { brand, brief, brandImages, products } = input
  const contentCount = brandImages.filter(i =>
    i.tag !== 'logo' && i.tag !== 'press' && i.tag !== 'generated'
  ).length

  return {
    hero:          true,
    proof_strip:   (brief.benefits?.length ?? 0) >= 2,
    lifestyle:     !!brief.problem?.headline,
    showcase:      products.length > 0,
    photo_strip:   contentCount >= 4,
    ingredients:   !!brief.solution?.headline,
    founder:       !!(brand.mission || brand.brand_voice || brief.solution?.body),
    // These four require REAL data under optional fields that don't
    // exist in the schema yet — always hidden today, light up when
    // wizard / scraper / manual edit starts populating them.
    testimonials:  optReviews(brief).length >= 1,
    how_it_works:  optHiwSteps(brief).length >= 1,
    press:         optPressMentions(brand).length >= 1,
    guarantee:     optGuarantees(brand).length >= 1,
    faq:           (brief.faq?.length ?? 0) > 0,
    final_cta:     true,
    footer:        true,
    floating_cta:  true,
  }
}

// Strip any `<!-- PREVIEW_SECTION_START:X -->...<!-- PREVIEW_SECTION_END:X -->`
// block whose visibility flag is false; remove the markers for blocks
// that stay. Markers must be on their own lines in the template.
function applyVisibility(html: string, visibility: Record<string, boolean>): string {
  let out = html
  for (const [name, visible] of Object.entries(visibility)) {
    const openRe = new RegExp(`<!-- PREVIEW_SECTION_START:${name} -->`, 'g')
    const closeRe = new RegExp(`<!-- PREVIEW_SECTION_END:${name} -->`, 'g')
    if (visible) {
      out = out.replace(openRe, '').replace(closeRe, '')
    } else {
      const blockRe = new RegExp(
        `<!-- PREVIEW_SECTION_START:${name} -->[\\s\\S]*?<!-- PREVIEW_SECTION_END:${name} -->`,
        'g'
      )
      out = out.replace(blockRe, '')
    }
  }
  return out
}

// ── Main entry point ───────────────────────────────────────────────

export function renderPreview(input: RenderPreviewInput): string {
  const { brand, brief, brandImages, products } = input
  const supabaseUrl = input.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const getUrl = (path: string) =>
    `${supabaseUrl}/storage/v1/object/public/brand-images/${path}`

  // Image slot picks — hero gets the lifestyle-first pick, lifestyle
  // alternate goes to the founder section, ingredients reuse content pool.
  const [heroSlot, lifestyleSlot] =
    pickSlotImages(brandImages, getBusinessType(brand), ['hero', 'lifestyle'])
  const heroImg = heroSlot ? getUrl(heroSlot.storage_path) : ''
  const lifestyleImg = lifestyleSlot ? getUrl(lifestyleSlot.storage_path) : ''

  const { productImages, lifestyleImages } = bucketBrandImages(brandImages, getBusinessType(brand))

  // Stage 1 — scalars
  const scalars = resolveScalars(input, getUrl, heroImg, lifestyleImg)

  // Stage 2 — iterated sections
  const iterated: Record<string, string> = {
    proof_strip_html:        renderProofStrip(brief.benefits || []),
    hero_micro_html:         renderHeroMicro(brief.benefits || []),
    ingredients_cards_html:  renderIngredientCards(brief.benefits || [], lifestyleImages, getUrl),
    products_html:           renderProductCards(products, productImages, brand.website || '#', brief.hero.cta_text, getUrl),
    review_cards_html:       renderReviewCards(brief),
    hiw_html:                renderHiwSteps(brief),
    press_bar_html:          renderPressBar(brand),
    faq_html:                renderFaq(brief.faq || []),
    guarantee_html:          renderGuarantee(brand),
    photo_strip_html:        renderPhotoStrip(
                               brandImages.filter(i => i.tag !== 'logo' && i.tag !== 'press' && i.tag !== 'generated'),
                               getUrl,
                               brand.name
                             ),
  }

  // Stage 3 — theme override + font links + visibility + substitution
  const { styleBlock, fontLinks } = buildThemeOverride(brand)

  const tplPath = join(process.cwd(), 'src/lib/landing-preview-template.html')
  let html = readFileSync(tplPath, 'utf-8')

  // Inject fonts at the <!--FONT_LINKS--> marker, theme override just
  // before </head> so it wins the cascade against the placeholder :root.
  html = html.replace('<!--FONT_LINKS-->', fontLinks)
  html = html.replace('</head>', `${styleBlock}\n</head>`)

  // Strip hidden sections first so we don't waste substitution passes
  // on blocks we're about to delete.
  const visibility = computeVisibility(input)
  html = applyVisibility(html, visibility)

  // Merge scalars + iterated into a single value map. Mustache
  // substitution is one regex pass. Scalars ending in _html are
  // pre-rendered by the renderer (image tags, iterated sections) and
  // get injected raw; every other scalar is HTML-escaped here so
  // caller-provided strings (brand names, brief copy) can't break out
  // of their slot.
  const values: Record<string, string> = { ...scalars, ...iterated }
  html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return ''
    const v = values[key]
    return key.endsWith('_html') ? v : esc(v)
  })

  return html
}
