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
import type { PageTheme } from '../lib/getPageTheme'

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
import { BLOCK_DEFAULTS } from './defaults'

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
  variants: readonly string[]
  defaultVariant: string
  defaultData: () => Record<string, unknown>
  contentFields: ContentField[]
  renderer: ComponentType<{ block: Block; theme: PageTheme }>
}

// Default-data factories live in ./defaults.ts so pure consumers (mutations,
// tests) can import them without pulling React in.

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

// Spread BLOCK_DEFAULTS[type] into each entry so variant/defaultVariant/
// defaultData stay in lockstep across the registry and the pure mutations
// module. Non-default fields (label/glyph/group/desc/contentFields/renderer)
// live here where React-related concerns belong.
export const BLOCK_REGISTRY: Record<BlockType, BlockConfig> = {
  hero:        { type: 'hero',        label: 'Hero',          glyph: 'H',        group: 'Openers',   desc: 'Above-the-fold headline + CTA', contentFields: HERO_FIELDS,        renderer: HeroBlock,        ...BLOCK_DEFAULTS.hero },
  problem:     { type: 'problem',     label: 'Problem',       glyph: 'P',        group: 'Narrative', desc: 'Frame the pain point',          contentFields: PROBLEM_FIELDS,     renderer: ProblemBlock,     ...BLOCK_DEFAULTS.problem },
  solution:    { type: 'solution',    label: 'Solution',      glyph: 'S',        group: 'Narrative', desc: 'Introduce your answer',         contentFields: PROBLEM_FIELDS,     renderer: SolutionBlock,    ...BLOCK_DEFAULTS.solution },
  benefits:    { type: 'benefits',    label: 'Benefits',      glyph: '\u229E',   group: 'Content',   desc: 'Features grid',                 contentFields: BENEFITS_FIELDS,    renderer: BenefitsBlock,    ...BLOCK_DEFAULTS.benefits },
  stats:       { type: 'stats',       label: 'Stats',         glyph: '\u2211',   group: 'Content',   desc: 'Numbers / proof points',        contentFields: STATS_FIELDS,       renderer: StatsBlock,       ...BLOCK_DEFAULTS.stats },
  testimonial: { type: 'testimonial', label: 'Testimonial',   glyph: '\u275D',   group: 'Proof',     desc: 'Customer quote + attribution',  contentFields: TESTIMONIAL_FIELDS, renderer: TestimonialBlock, ...BLOCK_DEFAULTS.testimonial },
  product:     { type: 'product',     label: 'Product',       glyph: '\u25A3',   group: 'Content',   desc: 'Product showcase',              contentFields: PRODUCT_FIELDS,     renderer: ProductBlock,     ...BLOCK_DEFAULTS.product },
  gallery:     { type: 'gallery',     label: 'Image Gallery', glyph: '\u22A1',   group: 'Content',   desc: 'Image mosaic',                  contentFields: GALLERY_FIELDS,     renderer: GalleryBlock,     ...BLOCK_DEFAULTS.gallery },
  video:       { type: 'video',       label: 'Video',         glyph: '\u25B6',   group: 'Content',   desc: 'Embedded video',                contentFields: VIDEO_FIELDS,       renderer: VideoBlock,       ...BLOCK_DEFAULTS.video },
  richtext:    { type: 'richtext',    label: 'Rich Text',     glyph: '\u00B6',   group: 'Content',   desc: 'Long-form paragraph',           contentFields: RICHTEXT_FIELDS,    renderer: RichTextBlock,    ...BLOCK_DEFAULTS.richtext },
  faq:         { type: 'faq',         label: 'FAQ',           glyph: '?',        group: 'Content',   desc: 'Q&A accordion',                 contentFields: FAQ_FIELDS,         renderer: FaqBlock,         ...BLOCK_DEFAULTS.faq },
  finalcta:    { type: 'finalcta',    label: 'Final CTA',     glyph: '\u2192',   group: 'Closers',   desc: 'Closing call to action',        contentFields: FINALCTA_FIELDS,    renderer: FinalCtaBlock,    ...BLOCK_DEFAULTS.finalcta },
  footer:      { type: 'footer',      label: 'Footer',        glyph: '_',        group: 'Closers',   desc: 'Links & legal',                 contentFields: FOOTER_FIELDS,      renderer: FooterBlock,      ...BLOCK_DEFAULTS.footer },
}

export const BLOCK_GROUPS: readonly BlockGroup[] = ['Openers', 'Narrative', 'Content', 'Proof', 'Closers']

export function blocksInGroup(group: BlockGroup): BlockConfig[] {
  return Object.values(BLOCK_REGISTRY).filter(b => b.group === group)
}
