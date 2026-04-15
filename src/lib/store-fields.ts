// ─────────────────────────────────────────────────────────────────────────────
// store-fields.ts
// Static field spec for the Store copy editor. Every entry here is keyed by
// a variable placeholder name (see templates/store/variable-map.json); the
// module walks the three base template JSONs at import time to resolve each
// placeholder to its dot-notation path inside the stored row, so we never
// hardcode the Shopify section IDs (those are scrambled UUIDs like
// `de4cc432-8e1c-49bc-8935-1f94a9d9d797` that would rot silently if someone
// edited the base templates by hand).
//
// The generator uses pure string substitution on the serialized base JSON,
// so the structure of the stored `index_json` / `product_json` /
// `footer_group_json` is identical to the base template — the paths we
// derive here are stable across regens.
//
// Also exports readAtPath + writeAtPath — both the PATCH route and the
// client-side editor use them to navigate the same way.
// ─────────────────────────────────────────────────────────────────────────────

import baseTemplate from '../../templates/store/base-template.json'
import basePdp from '../../templates/store/base-pdp.json'
import baseFooter from '../../templates/store/base-footer-group.json'

export type StoreFieldSource = 'index_json' | 'product_json' | 'footer_group_json'
export type StoreFieldType = 'short' | 'long' | 'url'

export interface StoreFieldSpec {
  placeholder: string          // variable-map key, e.g. "hero_banner__heading_1__content"
  source: StoreFieldSource
  path: string                 // dot-notation into the source JSON
  editorSection: string        // human section label, e.g. "Hero"
  editorOrder: number          // sort key for sidebar ordering
  label: string                // field label shown in the editor
  type: StoreFieldType
}

// Curated list — every placeholder in here must exist in exactly one base
// template, otherwise it silently drops out at module load. The sections /
// order / label columns are what drive the editor UI.
interface PriorityField {
  placeholder: string
  editorSection: string
  editorOrder: number
  label: string
  type: StoreFieldType
}

// Six placeholders in variable-map are dangling — `announcement_text`,
// `footer_about_heading`, `footer_instagram_url`, `footer_tiktok_url`,
// `footer_facebook_url`, `footer_legal_text`. The generator spends tokens
// producing values for them, but none of the three base templates wire
// them into a setting, so the values never land anywhere and there's
// nothing to edit. They're intentionally omitted from PRIORITY_FIELDS.
// (Fixing the generator to stop emitting them is out of scope for the
// copy editor.)
const PRIORITY_FIELDS: PriorityField[] = [
  // ── Hero ────────────────────────────────────────────────────────────────
  { placeholder: 'hero_banner__heading_1__content',                editorSection: 'Hero',         editorOrder: 1, label: 'Headline',          type: 'short' },
  { placeholder: 'hero_banner__content_1__content',                editorSection: 'Hero',         editorOrder: 1, label: 'Subheadline',       type: 'long' },
  { placeholder: 'hero_banner__buttons_1__button_label',           editorSection: 'Hero',         editorOrder: 1, label: 'Button label',      type: 'short' },
  { placeholder: 'hero_banner__buttons_1__button_url',             editorSection: 'Hero',         editorOrder: 1, label: 'Button URL',        type: 'url' },

  // ── Pillars (value_props) ───────────────────────────────────────────────
  { placeholder: 'value_props__heading',                           editorSection: 'Pillars',      editorOrder: 2, label: 'Section heading',   type: 'short' },
  { placeholder: 'value_props__content',                           editorSection: 'Pillars',      editorOrder: 2, label: 'Section body',      type: 'long' },
  { placeholder: 'value_props__button_label',                      editorSection: 'Pillars',      editorOrder: 2, label: 'Section CTA label', type: 'short' },
  { placeholder: 'value_props__pillar_1__heading',                 editorSection: 'Pillars',      editorOrder: 2, label: 'Pillar 1 title',    type: 'short' },
  { placeholder: 'value_props__pillar_1__content',                 editorSection: 'Pillars',      editorOrder: 2, label: 'Pillar 1 body',     type: 'long' },
  { placeholder: 'value_props__pillar_2__heading',                 editorSection: 'Pillars',      editorOrder: 2, label: 'Pillar 2 title',    type: 'short' },
  { placeholder: 'value_props__pillar_2__content',                 editorSection: 'Pillars',      editorOrder: 2, label: 'Pillar 2 body',     type: 'long' },
  { placeholder: 'value_props__pillar_3__heading',                 editorSection: 'Pillars',      editorOrder: 2, label: 'Pillar 3 title',    type: 'short' },
  { placeholder: 'value_props__pillar_3__content',                 editorSection: 'Pillars',      editorOrder: 2, label: 'Pillar 3 body',     type: 'long' },

  // ── Story (founder_mobile) ──────────────────────────────────────────────
  { placeholder: 'founder_mobile__content_1__heading',             editorSection: 'Story',        editorOrder: 3, label: 'Heading',           type: 'short' },
  { placeholder: 'founder_mobile__content_1__content',             editorSection: 'Story',        editorOrder: 3, label: 'Body',              type: 'long' },
  { placeholder: 'founder_mobile__content_1__url',                 editorSection: 'Story',        editorOrder: 3, label: 'Link URL',          type: 'url' },

  // ── Testimonials (customer_reviews) ─────────────────────────────────────
  { placeholder: 'customer_reviews__heading',                      editorSection: 'Testimonials', editorOrder: 4, label: 'Section heading',   type: 'short' },
  { placeholder: 'customer_reviews__testimonial_1__content',       editorSection: 'Testimonials', editorOrder: 4, label: 'Review 1',          type: 'long' },
  { placeholder: 'customer_reviews__testimonial_1__title',         editorSection: 'Testimonials', editorOrder: 4, label: 'Author 1',          type: 'short' },
  { placeholder: 'customer_reviews__testimonial_2__content',       editorSection: 'Testimonials', editorOrder: 4, label: 'Review 2',          type: 'long' },
  { placeholder: 'customer_reviews__testimonial_2__title',         editorSection: 'Testimonials', editorOrder: 4, label: 'Author 2',          type: 'short' },
  { placeholder: 'customer_reviews__testimonial_3__content',       editorSection: 'Testimonials', editorOrder: 4, label: 'Review 3',          type: 'long' },
  { placeholder: 'customer_reviews__testimonial_3__title',         editorSection: 'Testimonials', editorOrder: 4, label: 'Author 3',          type: 'short' },

  // ── FAQ ─────────────────────────────────────────────────────────────────
  { placeholder: 'faq__heading',                                    editorSection: 'FAQ',          editorOrder: 5, label: 'Section heading',   type: 'short' },
  { placeholder: 'faq__content_1__heading',                         editorSection: 'FAQ',          editorOrder: 5, label: 'Q1',                type: 'short' },
  { placeholder: 'faq__content_1__content',                         editorSection: 'FAQ',          editorOrder: 5, label: 'A1',                type: 'long' },
  { placeholder: 'faq__content_2__heading',                         editorSection: 'FAQ',          editorOrder: 5, label: 'Q2',                type: 'short' },
  { placeholder: 'faq__content_2__content',                         editorSection: 'FAQ',          editorOrder: 5, label: 'A2',                type: 'long' },
  { placeholder: 'faq__content_3__heading',                         editorSection: 'FAQ',          editorOrder: 5, label: 'Q3',                type: 'short' },
  { placeholder: 'faq__content_3__content',                         editorSection: 'FAQ',          editorOrder: 5, label: 'A3',                type: 'long' },
  { placeholder: 'faq__content_4__heading',                         editorSection: 'FAQ',          editorOrder: 5, label: 'Q4',                type: 'short' },
  { placeholder: 'faq__content_4__content',                         editorSection: 'FAQ',          editorOrder: 5, label: 'A4',                type: 'long' },
  { placeholder: 'faq__content_5__heading',                         editorSection: 'FAQ',          editorOrder: 5, label: 'Q5',                type: 'short' },
  { placeholder: 'faq__content_5__content',                         editorSection: 'FAQ',          editorOrder: 5, label: 'A5',                type: 'long' },

  // ── PDP ─────────────────────────────────────────────────────────────────
  { placeholder: 'pdp_badge_text',                                  editorSection: 'PDP',          editorOrder: 6, label: 'Badge text',        type: 'short' },
  { placeholder: 'pdp_badge_emoji',                                 editorSection: 'PDP',          editorOrder: 6, label: 'Badge emoji',       type: 'short' },
  { placeholder: 'pdp_checklist_item_1',                            editorSection: 'PDP',          editorOrder: 6, label: 'Checklist 1',       type: 'short' },
  { placeholder: 'pdp_checklist_item_2',                            editorSection: 'PDP',          editorOrder: 6, label: 'Checklist 2',       type: 'short' },
  { placeholder: 'pdp_checklist_item_3',                            editorSection: 'PDP',          editorOrder: 6, label: 'Checklist 3',       type: 'short' },
  { placeholder: 'pdp_checklist_item_4',                            editorSection: 'PDP',          editorOrder: 6, label: 'Checklist 4',       type: 'short' },
  { placeholder: 'pdp_checklist_item_5',                            editorSection: 'PDP',          editorOrder: 6, label: 'Checklist 5',       type: 'short' },
  { placeholder: 'pdp_checklist_value_tag',                         editorSection: 'PDP',          editorOrder: 6, label: 'Value tag',         type: 'short' },
  { placeholder: 'pdp_checklist_value_text',                        editorSection: 'PDP',          editorOrder: 6, label: 'Value text',        type: 'long' },
  { placeholder: 'pdp_perks_label',                                 editorSection: 'PDP',          editorOrder: 6, label: 'Perks label',       type: 'short' },
  { placeholder: 'pdp_perks_item_1',                                editorSection: 'PDP',          editorOrder: 6, label: 'Perk 1',            type: 'short' },
  { placeholder: 'pdp_perks_item_2',                                editorSection: 'PDP',          editorOrder: 6, label: 'Perk 2',            type: 'short' },
  { placeholder: 'pdp_perks_item_3',                                editorSection: 'PDP',          editorOrder: 6, label: 'Perk 3',            type: 'short' },
  { placeholder: 'pdp_perks_item_4',                                editorSection: 'PDP',          editorOrder: 6, label: 'Perk 4',            type: 'short' },
  { placeholder: 'pdp_perks_item_5',                                editorSection: 'PDP',          editorOrder: 6, label: 'Perk 5',            type: 'short' },
  { placeholder: 'pdp_ingredients_content',                         editorSection: 'PDP',          editorOrder: 6, label: 'Ingredients',       type: 'long' },
  { placeholder: 'pdp_shipping_content',                            editorSection: 'PDP',          editorOrder: 6, label: 'Shipping',          type: 'long' },

  // ── Footer ──────────────────────────────────────────────────────────────
  { placeholder: 'footer_tagline',                                  editorSection: 'Footer',       editorOrder: 7, label: 'Tagline',           type: 'short' },
  { placeholder: 'footer_about_content',                            editorSection: 'Footer',       editorOrder: 7, label: 'About body',        type: 'long' },
  { placeholder: 'footer_cta_label',                                editorSection: 'Footer',       editorOrder: 7, label: 'About CTA label',   type: 'short' },
  { placeholder: 'footer_cta_url',                                  editorSection: 'Footer',       editorOrder: 7, label: 'About CTA URL',     type: 'url' },
  { placeholder: 'footer_newsletter_heading',                       editorSection: 'Footer',       editorOrder: 7, label: 'Newsletter heading',type: 'short' },
  { placeholder: 'footer_newsletter_content',                       editorSection: 'Footer',       editorOrder: 7, label: 'Newsletter body',   type: 'long' },
  { placeholder: 'footer_newsletter_button',                        editorSection: 'Footer',       editorOrder: 7, label: 'Subscribe button',  type: 'short' },
]

// ─── Path resolution ─────────────────────────────────────────────────────────
// Walk each base template once at module load time; build a map from
// `{{placeholder}}` name → dot-notation path into the source JSON. We skip
// arrays entirely because no Shopify section setting places placeholder
// strings inside an array value in the base templates.

const PLACEHOLDER_RE = /^\{\{([a-z0-9_]+)\}\}$/i

function collectPlaceholderPaths(
  root: unknown,
  map: Map<string, string>,
  currentPath: string[] = []
): void {
  if (root === null || typeof root !== 'object' || Array.isArray(root)) return
  for (const [key, value] of Object.entries(root as Record<string, unknown>)) {
    if (typeof value === 'string') {
      const m = value.match(PLACEHOLDER_RE)
      if (m && !map.has(m[1])) {
        map.set(m[1], [...currentPath, key].join('.'))
      }
    } else {
      collectPlaceholderPaths(value, map, [...currentPath, key])
    }
  }
}

const INDEX_PATHS = new Map<string, string>()
const PDP_PATHS = new Map<string, string>()
const FOOTER_PATHS = new Map<string, string>()
collectPlaceholderPaths(baseTemplate, INDEX_PATHS)
collectPlaceholderPaths(basePdp, PDP_PATHS)
collectPlaceholderPaths(baseFooter, FOOTER_PATHS)

function resolveSource(placeholder: string): { source: StoreFieldSource; path: string } | null {
  const indexPath = INDEX_PATHS.get(placeholder)
  if (indexPath) return { source: 'index_json', path: indexPath }
  const pdpPath = PDP_PATHS.get(placeholder)
  if (pdpPath) return { source: 'product_json', path: pdpPath }
  const footerPath = FOOTER_PATHS.get(placeholder)
  if (footerPath) return { source: 'footer_group_json', path: footerPath }
  return null
}

// Drop any priority entry whose placeholder doesn't exist in the base
// templates — that would mean variable-map and base templates are out of
// sync, and the entry is unusable. Better to silently skip than render a
// field that will fail at save time.
export const STORE_FIELDS: StoreFieldSpec[] = PRIORITY_FIELDS.flatMap(f => {
  const resolved = resolveSource(f.placeholder)
  if (!resolved) {
    console.warn('[store-fields] placeholder not found in any base template:', f.placeholder)
    return []
  }
  return [{ ...f, ...resolved }]
})

// Stable ordering — by editor section order, then by original position in
// PRIORITY_FIELDS so fields appear in the author's intended order.
// (flatMap preserves source order already; no extra sort needed beyond the
// implicit editorOrder grouping done by the UI.)

// ─── Read/write helpers ──────────────────────────────────────────────────────
// The PATCH route and the editor UI both navigate the stored JSON with these.
// `writeAtPath` is strict: it refuses to create new keys, it refuses to
// overwrite anything that isn't already a string. That's the safety guarantee
// the PATCH route promises — a malformed path can't accidentally mutate a
// color, a layout setting, or a product handle.

export function readAtPath(root: unknown, path: string): string | null {
  const parts = path.split('.')
  let current: unknown = root
  for (const part of parts) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return null
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : null
}

export function writeAtPath(root: unknown, path: string, value: string): boolean {
  const parts = path.split('.')
  if (parts.length === 0) return false
  if (root === null || typeof root !== 'object' || Array.isArray(root)) return false
  let current = root as Record<string, unknown>
  for (let i = 0; i < parts.length - 1; i++) {
    const segment = parts[i]
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return false
    const next = current[segment]
    if (next === null || typeof next !== 'object' || Array.isArray(next)) return false
    current = next as Record<string, unknown>
  }
  const last = parts[parts.length - 1]
  if (!Object.prototype.hasOwnProperty.call(current, last)) return false
  // Only overwrite existing string values. This is the "never create new
  // keys, never clobber non-strings" guard.
  if (typeof current[last] !== 'string') return false
  current[last] = value
  return true
}

// Grouped view used by the editor UI — preserves sidebar order and
// per-section field order from PRIORITY_FIELDS.
export function groupStoreFields(): Array<{ section: string; order: number; fields: StoreFieldSpec[] }> {
  const bySection = new Map<string, { order: number; fields: StoreFieldSpec[] }>()
  for (const field of STORE_FIELDS) {
    const existing = bySection.get(field.editorSection)
    if (existing) {
      existing.fields.push(field)
    } else {
      bySection.set(field.editorSection, { order: field.editorOrder, fields: [field] })
    }
  }
  return Array.from(bySection.entries())
    .map(([section, v]) => ({ section, order: v.order, fields: v.fields }))
    .sort((a, b) => a.order - b.order)
}
