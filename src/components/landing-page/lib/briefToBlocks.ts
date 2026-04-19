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

function buildFooterCols(): Array<{ title: string; items: string[] }> {
  return [
    { title: 'Shop', items: ['All products', 'Bundles', 'Gift cards'] },
    { title: 'Company', items: ['Our story', 'Ingredients', 'Press'] },
    { title: 'Help', items: ['Contact', 'Shipping', 'Returns'] },
  ]
}

function mkBlock(type: BlockType, variant: string, data: Record<string, unknown>): Block {
  return { id: newId(), type, variant, visible: true, data }
}

export function briefToBlocks(
  brief: LandingBrief | null,
  brand: Brand,
): { blocks: Block[]; pageSettings: PageSettings } {
  const notes = parseBrandNotes(brand)
  const tagline = typeof notes.tagline === 'string' ? notes.tagline : ''

  const pageSettings: PageSettings = {
    title: `${brand.name} — Landing Page`,
    slug: slugify(brand.name) + '-landing',
    meta: tagline,
    maxWidth: 'default',
  }

  const footerBlock = mkBlock('footer', 'columns', {
    brand: brand.name,
    tagline,
    cols: buildFooterCols(),
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
    blocks.push(
      mkBlock('stats', 'inline', {
        items: [{ n: stat, l: brief.social_proof?.headline || '' }],
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
