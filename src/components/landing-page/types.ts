// Landing-page builder types (Phase 1+).
//
// Canonical document = { blocks: Block[], pageSettings: PageSettings, version }
// Persisted to landing_pages.content jsonb column.
//
// PageSettings intentionally excludes accent/headingFont — brand hub is the
// single source of truth for color + font. Per-page overrides are a v2 concern.

export type BlockType =
  | 'hero'
  | 'problem'
  | 'solution'
  | 'benefits'
  | 'stats'
  | 'testimonial'
  | 'product'
  | 'gallery'
  | 'video'
  | 'richtext'
  | 'faq'
  | 'finalcta'
  | 'footer'

export type BackgroundKey = 'paper' | 'cream' | 'ink' | 'accent' | 'custom'
export type PaddingKey = 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type AlignKey = 'left' | 'center' | 'right'
export type WidthKey = 'narrow' | 'default' | 'wide' | 'full'

export interface BlockStyle {
  bg?: BackgroundKey
  pad?: PaddingKey
  align?: AlignKey
  width?: WidthKey
  divider?: boolean
  anchor?: string
  cls?: string
}

export interface Block {
  id: string
  type: BlockType
  variant: string
  visible: boolean
  data: Record<string, unknown>
  style?: BlockStyle
}

export interface PageSettings {
  title: string
  slug: string
  meta: string
  // Excludes 'full' — this constrains content width, not page-shell bleed.
  maxWidth: 'narrow' | 'default' | 'wide'
}

export interface LandingPageDocument {
  blocks: Block[]
  pageSettings: PageSettings
  // Increments on every save; builder history panel reads it.
  version: number
}

// Legacy brief shape from generated_content (type='landing_brief').
// briefToBlocks() converts this into a LandingPageDocument on first builder
// load for brands that predate the landing_pages table.
export interface LandingBrief {
  hero: { headline: string; subheadline: string; cta_text: string }
  problem: { headline: string; body: string }
  solution: { headline: string; body: string }
  benefits: Array<{ headline: string; body: string }>
  social_proof: { headline: string; testimonial: string; attribution: string; stat: string }
  faq: Array<{ question: string; answer: string }>
  final_cta: { headline: string; body: string; cta_text: string }
}

export interface BuilderState {
  blocks: Block[]
  pageSettings: PageSettings
  selectedId: string | null
  leftTab: 'blocks' | 'outline' | 'pages' | 'assets' | 'templates' | 'history'
  device: 'desktop' | 'tablet' | 'mobile'
  zoom: number
  mode: 'edit' | 'preview'
}
