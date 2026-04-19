// briefToBlocks — convert a legacy LandingBrief (stored in generated_content
// as `type='landing_brief'`) into the block-based document shape the new
// landing-page builder operates on.
//
// Pure function. No side effects. Safe to call from server, client, or tests.
//
// Default block order mirrors INITIAL_BLOCKS in the handoff prototype:
//   hero → problem → solution → benefits → stats → testimonial → product
//         → faq → finalcta → footer
//
// Blocks omitted when their source section is empty:
//   - `stats` requires a non-empty social_proof.stat
//   - `product` requires brand.products to be non-empty
//   - problem / solution / benefits / testimonial / faq / finalcta omitted
//     when the corresponding brief section is missing or empty
//
// If `brief` is null, emits the minimal skeleton: hero + finalcta + footer.

import type { Brand } from '@/types'
import { readBrandFooter, type BrandFooter } from '../../../lib/brand-footer.ts'
import type { Block, BlockType, LandingBrief, PageSettings } from '../types'

function newId(): string {
  return 'b_' + Math.random().toString(36).slice(2, 11)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function parseBrandNotes(brand: Brand): Record<string, unknown> {
  if (!brand.notes) return {}
  try {
    return typeof brand.notes === 'string' ? JSON.parse(brand.notes) : (brand.notes as Record<string, unknown>)
  } catch {
    return {}
  }
}

interface FooterCol { title: string; items: string[] }

const DEFAULT_FOOTER_COLS: FooterCol[] = [
  { title: 'Shop', items: ['All products', 'Bundles', 'Gift cards'] },
  { title: 'Company', items: ['Our story', 'Ingredients', 'Press'] },
  { title: 'Help', items: ['Contact', 'Shipping', 'Returns'] },
]

// Map the canonical BrandFooter (from @/lib/brand-footer — same shape
// the email master template + brand hub editor read/write) into the
// column layout FooterBlock renders. Semantics:
//   Links  — user-authored `footerLinks` from the brand hub
//   Legal  — derived from privacy / refund / terms URLs (only shown
//            when at least one is set)
// When the brand has no authored footer data at all (fresh brand, or
// a brand that only uses the email footer's tagline), fall back to
// the generic DTC column defaults so the landing page still renders.
function brandFooterToCols(footer: BrandFooter): FooterCol[] {
  const cols: FooterCol[] = []
  if (footer.footerLinks.length) {
    const labels = footer.footerLinks
      .map(l => l.label.trim())
      .filter(s => s.length > 0)
    if (labels.length) cols.push({ title: 'Links', items: labels })
  }
  const legalItems: string[] = []
  if (footer.privacyPolicyUrl) legalItems.push('Privacy')
  if (footer.refundPolicyUrl) legalItems.push('Refunds')
  if (footer.termsOfServiceUrl) legalItems.push('Terms')
  if (legalItems.length) cols.push({ title: 'Legal', items: legalItems })
  return cols.length ? cols : DEFAULT_FOOTER_COLS
}

// Splits a free-form stat string into { n, l } for the stats block. The
// brief adapter used to stuff the whole string into `n`, which rendered
// "500K+ cans sold" as one giant number — no label, wrong emphasis. The
// regex captures a leading numeric token (digits + decimals + common
// quantifiers like K/M/B and suffixes %/+/★), and treats everything
// after as the descriptive label.
//
// Examples:
//   "500K+ cans sold"  → { n: "500K+",   l: "cans sold" }
//   "95% satisfaction" → { n: "95%",     l: "satisfaction" }
//   "4.9\u2605 avg review" → { n: "4.9\u2605", l: "avg review" }
//   "100K happy"       → { n: "100K",    l: "happy" }
//   "Over 10 years"    → { n: "Over 10 years", l: "" }  (no leading digit)
export function splitStat(raw: string): { n: string; l: string } {
  const trimmed = raw.trim()
  const m = trimmed.match(/^([\d.,]+\s*[a-zA-Z%+\u2605]*)\s*(.*)$/)
  if (!m || !m[1]) return { n: trimmed, l: '' }
  return { n: m[1].trim(), l: (m[2] ?? '').trim() }
}

function mkBlock(type: BlockType, variant: string, data: Record<string, unknown>): Block {
  return { id: newId(), type, variant, visible: true, data }
}

export function briefToBlocks(
  brief: LandingBrief | null,
  brand: Brand,
): { blocks: Block[]; pageSettings: PageSettings } {
  const notes = parseBrandNotes(brand)
  const brandFooter = readBrandFooter(brand.notes)
  // Prefer the canonical BrandFooter.tagline (same source the email footer
  // reads); fall back to a legacy notes.tagline key for older brands.
  const tagline = brandFooter.tagline
    || (typeof notes.tagline === 'string' ? notes.tagline : '')

  const pageSettings: PageSettings = {
    title: `${brand.name} — Landing Page`,
    slug: slugify(brand.name) + '-landing',
    meta: tagline,
    maxWidth: 'default',
  }

  const footerBlock = mkBlock('footer', 'columns', {
    brand: brand.name,
    tagline,
    cols: brandFooterToCols(brandFooter),
  })

  // Minimal default when there's no brief at all.
  if (!brief) {
    return {
      blocks: [
        mkBlock('hero', 'overlay', {
          eyebrow: '',
          headline: brand.name,
          sub: '',
          cta: 'Shop Now',
          secondary: '',
        }),
        mkBlock('finalcta', 'banner', {
          headline: '',
          body: '',
          cta: 'Shop Now',
        }),
        footerBlock,
      ],
      pageSettings,
    }
  }

  const blocks: Block[] = []

  // hero
  blocks.push(
    mkBlock('hero', 'overlay', {
      eyebrow: '',
      headline: brief.hero?.headline || brand.name,
      sub: brief.hero?.subheadline || '',
      cta: brief.hero?.cta_text || 'Shop Now',
      secondary: '',
    }),
  )

  // problem
  if (brief.problem && (brief.problem.headline || brief.problem.body)) {
    blocks.push(
      mkBlock('problem', 'statement', {
        eyebrow: 'THE PROBLEM',
        headline: brief.problem.headline || '',
        body: brief.problem.body || '',
      }),
    )
  }

  // solution
  if (brief.solution && (brief.solution.headline || brief.solution.body)) {
    blocks.push(
      mkBlock('solution', 'image-left', {
        eyebrow: 'THE ANSWER',
        headline: brief.solution.headline || '',
        body: brief.solution.body || '',
      }),
    )
  }

  // benefits
  if (brief.benefits?.length) {
    const items = brief.benefits.map(b => ({
      title: b.headline || '',
      body: b.body || '',
    }))
    blocks.push(
      mkBlock('benefits', items.length >= 3 ? '3-col' : 'stacked', {
        headline: 'Why it works',
        items,
      }),
    )
  }

  // stats — only if social_proof.stat is non-empty
  const statRaw = brief.social_proof?.stat
  const stat = typeof statRaw === 'string' ? statRaw.trim() : ''
  if (stat) {
    // Prefer the leading-number split — "500K+ cans sold" → n=500K+, l=cans
    // sold. If the string has no leading digits (e.g. "Loved by thousands"),
    // fall through with the brief's social_proof.headline as the label.
    const split = splitStat(stat)
    const label = split.l || brief.social_proof?.headline || ''
    blocks.push(
      mkBlock('stats', 'inline', {
        items: [{ n: split.n, l: label }],
      }),
    )
  }

  // testimonial — split "Name, Title" on the first comma; no comma → whole
  // attribution string goes into `name`, `title` stays empty.
  if (brief.social_proof?.testimonial) {
    const attribution = (brief.social_proof.attribution || '').trim()
    const commaIdx = attribution.indexOf(',')
    const name = commaIdx === -1 ? attribution : attribution.slice(0, commaIdx).trim()
    const title = commaIdx === -1 ? '' : attribution.slice(commaIdx + 1).trim()
    blocks.push(
      mkBlock('testimonial', 'single', {
        quote: brief.social_proof.testimonial,
        name,
        title,
      }),
    )
  }

  // product — only if brand has products
  if (brand.products?.length) {
    const items = brand.products.slice(0, 6).map(p => ({
      name: p.name,
      flavor: p.description || '',
      price: p.price_range || '',
    }))
    blocks.push(
      mkBlock('product', 'showcase', {
        headline: 'The lineup',
        items,
      }),
    )
  }

  // faq
  if (brief.faq?.length) {
    const items = brief.faq.map(f => ({ q: f.question || '', a: f.answer || '' }))
    blocks.push(
      mkBlock('faq', 'accordion', {
        headline: 'Common questions',
        items,
      }),
    )
  }

  // finalcta
  if (brief.final_cta && (brief.final_cta.headline || brief.final_cta.body || brief.final_cta.cta_text)) {
    blocks.push(
      mkBlock('finalcta', 'banner', {
        headline: brief.final_cta.headline || '',
        body: brief.final_cta.body || '',
        cta: brief.final_cta.cta_text || 'Shop Now',
      }),
    )
  }

  // footer — always last
  blocks.push(footerBlock)

  return { blocks, pageSettings }
}
