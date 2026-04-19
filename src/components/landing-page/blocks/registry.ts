// Block registry — single source of truth for block type → { label, glyph,
// group, variants, defaultData, contentFields, renderer }. Every surface that
// needs to know about blocks reads from here:
//   - Canvas selects the renderer to draw.
//   - Inspector ContentTab iterates contentFields to render inputs.
//   - Inspector StyleTab reads variants for the variant picker.
//   - LeftRail Blocks panel groups library cards by group.
//   - Phase 4 "add block" flows call defaultData() to seed new instances.

import type { ComponentType } from 'react'
import type { Block, BlockType } from '../types'

import { HeroBlock } from './HeroBlock'
import { ProblemBlock } from './ProblemBlock'
import { SolutionBlock } from './SolutionBlock'
import { BenefitsBlock } from './BenefitsBlock'
import { StatsBlock } from './StatsBlock'
import { TestimonialBlock } from './TestimonialBlock'
import { ProductBlock } from './ProductBlock'
import { GalleryBlock } from './GalleryBlock'
import { VideoBlock } from './VideoBlock'
import { RichTextBlock } from './RichTextBlock'
import { FaqBlock } from './FaqBlock'
import { FinalCtaBlock } from './FinalCtaBlock'
import { FooterBlock } from './FooterBlock'

export type BlockGroup = 'Openers' | 'Narrative' | 'Content' | 'Proof' | 'Closers'

export interface ContentField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'array'
  rows?: number
  itemShape?: ContentField[]
  placeholder?: string
  // Footer.cols is not editable in the inspector per the Phase 3 decision
  // (see IMPLEMENTATION_PLAN.md §0.4). Flag it read-only so ContentTab can
  // render a preview with an "edit in brand hub" link.
  readOnly?: boolean
}

export interface BlockConfig {
  type: BlockType
  label: string
  glyph: string
  group: BlockGroup
  desc: string
  variants: string[]
  defaultVariant: string
  defaultData: () => Record<string, unknown>
  contentFields: ContentField[]
  renderer: ComponentType<{ block: Block }>
}

// Default-data factories. Copied from the handoff for v1; briefToBlocks
// supplies brand-specific content on first load, and Phase 4 "add block"
// uses these factories when a brand-new instance is inserted.
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

// Content-field shapes — drive the inspector Content tab.
const HERO_FIELDS: ContentField[] = [
  { key: 'eyebrow',    label: 'Eyebrow',       type: 'text' },
  { key: 'headline',   label: 'Headline',      type: 'textarea', rows: 3 },
  { key: 'sub',        label: 'Sub-headline',  type: 'textarea', rows: 3 },
  { key: 'cta',        label: 'Primary CTA',   type: 'text' },
  { key: 'secondary',  label: 'Secondary CTA', type: 'text' },
]
const PROBLEM_FIELDS: ContentField[] = [
  { key: 'eyebrow',  label: 'Eyebrow',  type: 'text' },
  { key: 'headline', label: 'Headline', type: 'textarea', rows: 2 },
  { key: 'body',     label: 'Body',     type: 'textarea', rows: 4 },
]
const BENEFITS_FIELDS: ContentField[] = [
  { key: 'headline', label: 'Section headline', type: 'text' },
  {
    key: 'items', label: 'Benefits', type: 'array',
    itemShape: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'body',  label: 'Body',  type: 'textarea', rows: 2 },
    ],
  },
]
const STATS_FIELDS: ContentField[] = [
  {
    key: 'items', label: 'Stats', type: 'array',
    itemShape: [
      { key: 'n', label: 'Number', type: 'text' },
      { key: 'l', label: 'Label',  type: 'text' },
    ],
  },
]
const TESTIMONIAL_FIELDS: ContentField[] = [
  { key: 'quote', label: 'Quote',       type: 'textarea', rows: 3 },
  { key: 'name',  label: 'Name',        type: 'text' },
  { key: 'title', label: 'Attribution', type: 'text' },
]
const PRODUCT_FIELDS: ContentField[] = [
  { key: 'headline', label: 'Section headline', type: 'text' },
  {
    key: 'items', label: 'Products', type: 'array',
    itemShape: [
      { key: 'name',   label: 'Name',   type: 'text' },
      { key: 'flavor', label: 'Flavor', type: 'text' },
      { key: 'price',  label: 'Price',  type: 'text' },
    ],
  },
]
const GALLERY_FIELDS: ContentField[] = [
  { key: 'headline', label: 'Section headline', type: 'text' },
  // items wires to Assets drag-and-drop in Phase 6. No inspector field here.
]
const VIDEO_FIELDS: ContentField[] = [
  { key: 'headline', label: 'Headline',   type: 'text' },
  { key: 'caption',  label: 'Caption',    type: 'text' },
  { key: 'url',      label: 'Video URL',  type: 'text' },
]
const RICHTEXT_FIELDS: ContentField[] = [
  { key: 'headline', label: 'Headline', type: 'text' },
  { key: 'body',     label: 'Body',     type: 'textarea', rows: 8 },
]
const FAQ_FIELDS: ContentField[] = [
  { key: 'headline', label: 'Section headline', type: 'text' },
  {
    key: 'items', label: 'Questions', type: 'array',
    itemShape: [
      { key: 'q', label: 'Question', type: 'text' },
      { key: 'a', label: 'Answer',   type: 'textarea', rows: 2 },
    ],
  },
]
const FINALCTA_FIELDS: ContentField[] = [
  { key: 'headline', label: 'Headline', type: 'textarea', rows: 2 },
  { key: 'body',     label: 'Body',     type: 'textarea', rows: 2 },
  { key: 'cta',      label: 'CTA text', type: 'text' },
]
// Footer: brand + tagline are editable here; cols are rendered read-only in
// ContentTab with a "Edit in brand hub" link (Phase 3 decision). The array
// below flags cols as readOnly: true so the tab knows to skip normal
// ArrayEditor rendering.
const FOOTER_FIELDS: ContentField[] = [
  { key: 'brand',   label: 'Brand',   type: 'text' },
  { key: 'tagline', label: 'Tagline', type: 'text' },
  {
    key: 'cols', label: 'Columns', type: 'array', readOnly: true,
    itemShape: [
      { key: 'title', label: 'Column title', type: 'text' },
    ],
  },
]

export const BLOCK_REGISTRY: Record<BlockType, BlockConfig> = {
  hero: {
    type: 'hero', label: 'Hero', glyph: 'H', group: 'Openers',
    desc: 'Above-the-fold headline + CTA',
    variants: ['centered', 'split', 'overlay'], defaultVariant: 'overlay',
    defaultData: d_hero, contentFields: HERO_FIELDS, renderer: HeroBlock,
  },
  problem: {
    type: 'problem', label: 'Problem', glyph: 'P', group: 'Narrative',
    desc: 'Frame the pain point',
    variants: ['statement', 'list'], defaultVariant: 'statement',
    defaultData: d_problem, contentFields: PROBLEM_FIELDS, renderer: ProblemBlock,
  },
  solution: {
    type: 'solution', label: 'Solution', glyph: 'S', group: 'Narrative',
    desc: 'Introduce your answer',
    variants: ['statement', 'image-left'], defaultVariant: 'image-left',
    defaultData: d_solution, contentFields: PROBLEM_FIELDS, renderer: SolutionBlock,
  },
  benefits: {
    type: 'benefits', label: 'Benefits', glyph: '\u229E', group: 'Content',
    desc: 'Features grid',
    variants: ['3-col', '2-col', 'stacked'], defaultVariant: '3-col',
    defaultData: d_benefits, contentFields: BENEFITS_FIELDS, renderer: BenefitsBlock,
  },
  stats: {
    type: 'stats', label: 'Stats', glyph: '\u2211', group: 'Content',
    desc: 'Numbers / proof points',
    variants: ['inline', 'stacked'], defaultVariant: 'inline',
    defaultData: d_stats, contentFields: STATS_FIELDS, renderer: StatsBlock,
  },
  testimonial: {
    type: 'testimonial', label: 'Testimonial', glyph: '\u275D', group: 'Proof',
    desc: 'Customer quote + attribution',
    variants: ['single', 'carousel'], defaultVariant: 'single',
    defaultData: d_testimonial, contentFields: TESTIMONIAL_FIELDS, renderer: TestimonialBlock,
  },
  product: {
    type: 'product', label: 'Product', glyph: '\u25A3', group: 'Content',
    desc: 'Product showcase',
    variants: ['showcase', 'grid'], defaultVariant: 'showcase',
    defaultData: d_product, contentFields: PRODUCT_FIELDS, renderer: ProductBlock,
  },
  gallery: {
    type: 'gallery', label: 'Image Gallery', glyph: '\u22A1', group: 'Content',
    desc: 'Image mosaic',
    variants: ['grid-3', 'mosaic'], defaultVariant: 'grid-3',
    defaultData: d_gallery, contentFields: GALLERY_FIELDS, renderer: GalleryBlock,
  },
  video: {
    type: 'video', label: 'Video', glyph: '\u25B6', group: 'Content',
    desc: 'Embedded video',
    variants: ['embed', 'inline'], defaultVariant: 'embed',
    defaultData: d_video, contentFields: VIDEO_FIELDS, renderer: VideoBlock,
  },
  richtext: {
    type: 'richtext', label: 'Rich Text', glyph: '\u00B6', group: 'Content',
    desc: 'Long-form paragraph',
    variants: ['default'], defaultVariant: 'default',
    defaultData: d_richtext, contentFields: RICHTEXT_FIELDS, renderer: RichTextBlock,
  },
  faq: {
    type: 'faq', label: 'FAQ', glyph: '?', group: 'Content',
    desc: 'Q&A accordion',
    variants: ['accordion', 'two-col'], defaultVariant: 'accordion',
    defaultData: d_faq, contentFields: FAQ_FIELDS, renderer: FaqBlock,
  },
  finalcta: {
    type: 'finalcta', label: 'Final CTA', glyph: '\u2192', group: 'Closers',
    desc: 'Closing call to action',
    variants: ['banner', 'centered'], defaultVariant: 'banner',
    defaultData: d_finalcta, contentFields: FINALCTA_FIELDS, renderer: FinalCtaBlock,
  },
  footer: {
    type: 'footer', label: 'Footer', glyph: '_', group: 'Closers',
    desc: 'Links & legal',
    variants: ['minimal', 'columns'], defaultVariant: 'columns',
    defaultData: d_footer, contentFields: FOOTER_FIELDS, renderer: FooterBlock,
  },
}

export const BLOCK_GROUPS: readonly BlockGroup[] = ['Openers', 'Narrative', 'Content', 'Proof', 'Closers']

export function blocksInGroup(group: BlockGroup): BlockConfig[] {
  return Object.values(BLOCK_REGISTRY).filter(b => b.group === group)
}
