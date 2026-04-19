// Per-block defaults. Pure TypeScript — no React, no file-system deps — so
// it can be consumed by mutations.ts AND by the full registry.ts (which
// imports renderer components on top of this).
//
// Keeps mutations + adapter tests runnable under Node's strip-types loader
// without pulling in React.

import type { BlockType } from '../types'

export interface BlockDefaultsEntry {
  defaultVariant: string
  variants: readonly string[]
  defaultData: () => Record<string, unknown>
}

function d_hero(): Record<string, unknown> {
  return { eyebrow: 'NEW', headline: 'A bold headline', sub: 'A sharp subheadline that earns the click.', cta: 'Shop Now', secondary: 'Learn More' }
}
function d_problem(): Record<string, unknown> {
  return { eyebrow: 'THE PROBLEM', headline: 'What went wrong', body: 'Describe the pain point in your audience\u2019s voice.' }
}
function d_solution(): Record<string, unknown> {
  return { eyebrow: 'THE ANSWER', headline: 'How we fix it', body: 'Specific, concrete, not vague.' }
}
function d_benefits(): Record<string, unknown> {
  return {
    headline: 'Why it works',
    items: [
      { title: 'Benefit one', body: 'One specific sentence.' },
      { title: 'Benefit two', body: 'One specific sentence.' },
      { title: 'Benefit three', body: 'One specific sentence.' },
    ],
  }
}
function d_stats(): Record<string, unknown> {
  return { items: [{ n: '100%', l: 'label' }, { n: '4.9\u2605', l: 'avg review' }] }
}
function d_testimonial(): Record<string, unknown> {
  return { quote: 'A short, specific quote from a real customer.', name: 'First L.', title: 'Verified buyer' }
}
function d_product(): Record<string, unknown> {
  return { headline: 'The lineup', items: [{ name: 'Flavor', flavor: 'Descriptor', price: '$0' }] }
}
function d_gallery(): Record<string, unknown> {
  return { headline: 'In the wild', items: [1, 2, 3, 4, 5, 6] }
}
function d_video(): Record<string, unknown> {
  return { headline: 'Watch', caption: 'Short caption', url: '' }
}
function d_richtext(): Record<string, unknown> {
  return { headline: 'Our story', body: 'Long-form body paragraph goes here.' }
}
function d_faq(): Record<string, unknown> {
  return { headline: 'Common questions', items: [{ q: 'Question one?', a: 'Answer.' }] }
}
function d_finalcta(): Record<string, unknown> {
  return { headline: 'Ready?', body: 'One or two sentences of urgency.', cta: 'Shop Now' }
}
function d_footer(): Record<string, unknown> {
  return {
    brand: 'BRAND', tagline: 'Your tagline here.',
    cols: [
      { title: 'Shop', items: ['All products', 'Bundles', 'Gift cards'] },
      { title: 'Company', items: ['Our story', 'Press'] },
      { title: 'Help', items: ['Contact', 'Shipping', 'Returns'] },
    ],
  }
}

export const BLOCK_DEFAULTS: Record<BlockType, BlockDefaultsEntry> = {
  hero:        { defaultVariant: 'overlay',     variants: ['centered', 'split', 'overlay'],      defaultData: d_hero },
  problem:     { defaultVariant: 'statement',   variants: ['statement', 'list'],                  defaultData: d_problem },
  solution:    { defaultVariant: 'image-left',  variants: ['statement', 'image-left'],            defaultData: d_solution },
  benefits:    { defaultVariant: '3-col',       variants: ['3-col', '2-col', 'stacked'],          defaultData: d_benefits },
  stats:       { defaultVariant: 'inline',      variants: ['inline', 'stacked'],                  defaultData: d_stats },
  testimonial: { defaultVariant: 'single',      variants: ['single', 'carousel'],                 defaultData: d_testimonial },
  product:     { defaultVariant: 'showcase',    variants: ['showcase', 'grid'],                   defaultData: d_product },
  gallery:     { defaultVariant: 'grid-3',      variants: ['grid-3', 'mosaic'],                   defaultData: d_gallery },
  video:       { defaultVariant: 'embed',       variants: ['embed', 'inline'],                    defaultData: d_video },
  richtext:    { defaultVariant: 'default',     variants: ['default'],                            defaultData: d_richtext },
  faq:         { defaultVariant: 'accordion',   variants: ['accordion', 'two-col'],               defaultData: d_faq },
  finalcta:    { defaultVariant: 'banner',      variants: ['banner', 'centered'],                 defaultData: d_finalcta },
  footer:      { defaultVariant: 'columns',     variants: ['minimal', 'columns'],                 defaultData: d_footer },
}
