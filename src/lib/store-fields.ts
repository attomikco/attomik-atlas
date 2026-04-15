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
import baseAbout from '../../templates/store/base-about.json'

export type StoreFieldSource = 'index_json' | 'product_json' | 'footer_group_json' | 'about_json'
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

// Four placeholders in variable-map are dangling — `announcement_text`,
// `footer_about_heading`, `footer_instagram_url`, `footer_tiktok_url`,
// `footer_facebook_url`, `footer_legal_text`. The generator spends tokens
// producing values for them, but none of the three base templates wire
// them into a setting, so the values never land anywhere and there's
// nothing to edit. They're intentionally omitted from PRIORITY_FIELDS.
// (Fixing the generator to stop emitting them is out of scope for the
// copy editor.)
//
// Editor sections and their source sections in the generated JSON (verified
// against the live Jolene store_themes row 2026-04-15):
//   Hero            → sections.<banner-uuid>                       (hero_banner__*)
//   Ticker          → sections.marquee_BqJJTc                       (marquee_ticker__*)
//   Pillars         → sections.<icon-grid-uuid>                     (value_props__*)
//   Ingredients     → sections.icon_grid_pAWkqU                     (ingredients_grid__*)
//   Feature cards   → sections.content_grid_kXU8Qz                  (features_mobile__*)
//   Feature details → sections.content_grid_3GJfUT +
//                     sections.content_grid_zkMhzF                  (features_detail_mobile__* + features_detail_desktop__*)
//   Story           → sections.content_grid_fAJFeY +
//                     sections.content_grid_tMrLNn                  (founder_mobile__* + founder_desktop__*)
//   Press           → sections.testimonial_slider_hTJXnt            (press_slider__*)
//   Testimonials    → sections.testimonial_grid_ppc7zf              (customer_reviews__*)
//   Comparison      → sections.table_68DHki                         (comparison_table__*)
//   Subscription    → sections.content_grid_wGT9Va +
//                     sections.content_grid_DwtYHh                  (subscription_mobile__* + subscription_desktop__*)
//   Product grid    → sections.product_slider_AQDing                (product_slider__*)
//   FAQ             → sections.accordions_LrLbTK                    (faq__*)
//   Bottom banner   → sections.banner_j6wcjX                        (bottom_banner__*)
//   PDP             → sections.1638995507af787164                   (pdp_*)
//   Footer          → sections.text_zM9YDz + sections.theme_footer  (footer_*)
const PRIORITY_FIELDS: PriorityField[] = [
  // ── Hero (order 1) ──────────────────────────────────────────────────────
  { placeholder: 'hero_banner__heading_1__content',                 editorSection: 'Hero',            editorOrder: 1,  label: 'Headline',              type: 'short' },
  { placeholder: 'hero_banner__content_1__content',                 editorSection: 'Hero',            editorOrder: 1,  label: 'Subheadline',           type: 'long'  },
  { placeholder: 'hero_banner__buttons_1__button_label',            editorSection: 'Hero',            editorOrder: 1,  label: 'Button label',          type: 'short' },
  { placeholder: 'hero_banner__buttons_1__button_url',              editorSection: 'Hero',            editorOrder: 1,  label: 'Button URL',            type: 'url'   },

  // ── Ticker (order 2) ────────────────────────────────────────────────────
  { placeholder: 'marquee_ticker__heading_1__content',              editorSection: 'Ticker',          editorOrder: 2,  label: 'Item 1',                type: 'short' },
  { placeholder: 'marquee_ticker__heading_2__content',              editorSection: 'Ticker',          editorOrder: 2,  label: 'Item 2',                type: 'short' },
  { placeholder: 'marquee_ticker__heading_3__content',              editorSection: 'Ticker',          editorOrder: 2,  label: 'Item 3',                type: 'short' },

  // ── Pillars (order 3) ───────────────────────────────────────────────────
  { placeholder: 'value_props__heading',                            editorSection: 'Pillars',         editorOrder: 3,  label: 'Section heading',       type: 'short' },
  { placeholder: 'value_props__content',                            editorSection: 'Pillars',         editorOrder: 3,  label: 'Section body',          type: 'long'  },
  { placeholder: 'value_props__button_label',                       editorSection: 'Pillars',         editorOrder: 3,  label: 'Section CTA label',     type: 'short' },
  { placeholder: 'value_props__pillar_1__heading',                  editorSection: 'Pillars',         editorOrder: 3,  label: 'Pillar 1 title',        type: 'short' },
  { placeholder: 'value_props__pillar_1__content',                  editorSection: 'Pillars',         editorOrder: 3,  label: 'Pillar 1 body',         type: 'long'  },
  { placeholder: 'value_props__pillar_2__heading',                  editorSection: 'Pillars',         editorOrder: 3,  label: 'Pillar 2 title',        type: 'short' },
  { placeholder: 'value_props__pillar_2__content',                  editorSection: 'Pillars',         editorOrder: 3,  label: 'Pillar 2 body',         type: 'long'  },
  { placeholder: 'value_props__pillar_3__heading',                  editorSection: 'Pillars',         editorOrder: 3,  label: 'Pillar 3 title',        type: 'short' },
  { placeholder: 'value_props__pillar_3__content',                  editorSection: 'Pillars',         editorOrder: 3,  label: 'Pillar 3 body',         type: 'long'  },

  // ── Ingredients (order 4) ───────────────────────────────────────────────
  { placeholder: 'ingredients_grid__heading',                       editorSection: 'Ingredients',     editorOrder: 4,  label: 'Section heading',       type: 'short' },
  { placeholder: 'ingredients_grid__pillar_1__heading',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 1 title',    type: 'short' },
  { placeholder: 'ingredients_grid__pillar_1__content',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 1 body',     type: 'long'  },
  { placeholder: 'ingredients_grid__pillar_2__heading',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 2 title',    type: 'short' },
  { placeholder: 'ingredients_grid__pillar_2__content',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 2 body',     type: 'long'  },
  { placeholder: 'ingredients_grid__pillar_3__heading',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 3 title',    type: 'short' },
  { placeholder: 'ingredients_grid__pillar_3__content',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 3 body',     type: 'long'  },
  { placeholder: 'ingredients_grid__pillar_4__heading',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 4 title',    type: 'short' },
  { placeholder: 'ingredients_grid__pillar_4__content',             editorSection: 'Ingredients',     editorOrder: 4,  label: 'Ingredient 4 body',     type: 'long'  },

  // ── Feature cards (order 5 — features_mobile) ──────────────────────────
  { placeholder: 'features_mobile__content_1__heading',             editorSection: 'Feature cards',   editorOrder: 5,  label: 'Card 1 title',          type: 'short' },
  { placeholder: 'features_mobile__content_1__content',             editorSection: 'Feature cards',   editorOrder: 5,  label: 'Card 1 body',           type: 'long'  },
  { placeholder: 'features_mobile__content_1__url',                 editorSection: 'Feature cards',   editorOrder: 5,  label: 'Card 1 link URL',       type: 'url'   },
  { placeholder: 'features_mobile__content_2__heading',             editorSection: 'Feature cards',   editorOrder: 5,  label: 'Card 2 title',          type: 'short' },
  { placeholder: 'features_mobile__content_2__content',             editorSection: 'Feature cards',   editorOrder: 5,  label: 'Card 2 body',           type: 'long'  },

  // ── Feature details (order 6 — features_detail_mobile + features_detail_desktop) ──
  { placeholder: 'features_detail_mobile__content_1__heading',      editorSection: 'Feature details', editorOrder: 6,  label: 'Mobile 1 title',        type: 'short' },
  { placeholder: 'features_detail_mobile__content_1__content',      editorSection: 'Feature details', editorOrder: 6,  label: 'Mobile 1 body',         type: 'long'  },
  { placeholder: 'features_detail_mobile__content_2__heading',      editorSection: 'Feature details', editorOrder: 6,  label: 'Mobile 2 title',        type: 'short' },
  { placeholder: 'features_detail_mobile__content_2__content',      editorSection: 'Feature details', editorOrder: 6,  label: 'Mobile 2 body',         type: 'long'  },
  { placeholder: 'features_detail_desktop__content_1__heading',     editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 1 title',       type: 'short' },
  { placeholder: 'features_detail_desktop__content_1__content',     editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 1 body',        type: 'long'  },
  { placeholder: 'features_detail_desktop__content_1__button_label',editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 1 button',      type: 'short' },
  { placeholder: 'features_detail_desktop__content_1__url',         editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 1 button URL',  type: 'url'   },
  { placeholder: 'features_detail_desktop__content_4__heading',     editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 2 title',       type: 'short' },
  { placeholder: 'features_detail_desktop__content_4__content',     editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 2 body',        type: 'long'  },
  { placeholder: 'features_detail_desktop__content_4__button_label',editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 2 button',      type: 'short' },
  { placeholder: 'features_detail_desktop__content_4__url',         editorSection: 'Feature details', editorOrder: 6,  label: 'Desktop 2 button URL',  type: 'url'   },

  // ── Story (order 7 — founder_mobile + founder_desktop) ─────────────────
  { placeholder: 'founder_mobile__content_1__heading',              editorSection: 'Story',           editorOrder: 7,  label: 'Mobile heading',        type: 'short' },
  { placeholder: 'founder_mobile__content_1__content',              editorSection: 'Story',           editorOrder: 7,  label: 'Mobile body',           type: 'long'  },
  { placeholder: 'founder_mobile__content_1__url',                  editorSection: 'Story',           editorOrder: 7,  label: 'Mobile link URL',       type: 'url'   },
  { placeholder: 'founder_desktop__content_2__heading',             editorSection: 'Story',           editorOrder: 7,  label: 'Desktop heading',       type: 'short' },
  { placeholder: 'founder_desktop__content_2__content',             editorSection: 'Story',           editorOrder: 7,  label: 'Desktop body',          type: 'long'  },
  { placeholder: 'founder_desktop__content_2__button_label',        editorSection: 'Story',           editorOrder: 7,  label: 'Desktop button',        type: 'short' },
  { placeholder: 'founder_desktop__content_2__url',                 editorSection: 'Story',           editorOrder: 7,  label: 'Desktop button URL',    type: 'url'   },

  // ── Press (order 8 — press_slider) ─────────────────────────────────────
  { placeholder: 'press_slider__testimonial_1__content',            editorSection: 'Press',           editorOrder: 8,  label: 'Quote 1',               type: 'long'  },
  { placeholder: 'press_slider__testimonial_2__content',            editorSection: 'Press',           editorOrder: 8,  label: 'Quote 2',               type: 'long'  },
  { placeholder: 'press_slider__testimonial_3__content',            editorSection: 'Press',           editorOrder: 8,  label: 'Quote 3',               type: 'long'  },
  { placeholder: 'press_slider__testimonial_4__content',            editorSection: 'Press',           editorOrder: 8,  label: 'Quote 4',               type: 'long'  },
  { placeholder: 'press_slider__testimonial_5__content',            editorSection: 'Press',           editorOrder: 8,  label: 'Quote 5',               type: 'long'  },

  // ── Testimonials (order 9 — customer_reviews) ──────────────────────────
  { placeholder: 'customer_reviews__heading',                       editorSection: 'Testimonials',    editorOrder: 9,  label: 'Section heading',       type: 'short' },
  { placeholder: 'customer_reviews__testimonial_1__content',        editorSection: 'Testimonials',    editorOrder: 9,  label: 'Review 1',              type: 'long'  },
  { placeholder: 'customer_reviews__testimonial_1__title',          editorSection: 'Testimonials',    editorOrder: 9,  label: 'Author 1',              type: 'short' },
  { placeholder: 'customer_reviews__testimonial_2__content',        editorSection: 'Testimonials',    editorOrder: 9,  label: 'Review 2',              type: 'long'  },
  { placeholder: 'customer_reviews__testimonial_2__title',          editorSection: 'Testimonials',    editorOrder: 9,  label: 'Author 2',              type: 'short' },
  { placeholder: 'customer_reviews__testimonial_3__content',        editorSection: 'Testimonials',    editorOrder: 9,  label: 'Review 3',              type: 'long'  },
  { placeholder: 'customer_reviews__testimonial_3__title',          editorSection: 'Testimonials',    editorOrder: 9,  label: 'Author 3',              type: 'short' },

  // ── Comparison (order 10 — comparison_table) ───────────────────────────
  { placeholder: 'comparison_table__table_headings',                editorSection: 'Comparison',      editorOrder: 10, label: 'Column headings',       type: 'short' },
  { placeholder: 'comparison_table__content_1__label',              editorSection: 'Comparison',      editorOrder: 10, label: 'Row 1 label',           type: 'short' },
  { placeholder: 'comparison_table__content_1__tooltip',            editorSection: 'Comparison',      editorOrder: 10, label: 'Row 1 tooltip',         type: 'short' },
  { placeholder: 'comparison_table__content_1__column_4_content',   editorSection: 'Comparison',      editorOrder: 10, label: 'Row 1 competitor',      type: 'short' },
  { placeholder: 'comparison_table__content_2__label',              editorSection: 'Comparison',      editorOrder: 10, label: 'Row 2 label',           type: 'short' },
  { placeholder: 'comparison_table__content_2__tooltip',            editorSection: 'Comparison',      editorOrder: 10, label: 'Row 2 tooltip',         type: 'short' },
  { placeholder: 'comparison_table__content_3__label',              editorSection: 'Comparison',      editorOrder: 10, label: 'Row 3 label',           type: 'short' },
  { placeholder: 'comparison_table__content_3__column_4_content',   editorSection: 'Comparison',      editorOrder: 10, label: 'Row 3 competitor',      type: 'short' },

  // ── Subscription (order 11 — subscription_mobile + subscription_desktop) ──
  { placeholder: 'subscription_mobile__content_1__heading',         editorSection: 'Subscription',    editorOrder: 11, label: 'Mobile heading',        type: 'short' },
  { placeholder: 'subscription_mobile__content_1__content',         editorSection: 'Subscription',    editorOrder: 11, label: 'Mobile body',           type: 'long'  },
  { placeholder: 'subscription_mobile__content_1__button_label',    editorSection: 'Subscription',    editorOrder: 11, label: 'Mobile button',         type: 'short' },
  { placeholder: 'subscription_mobile__content_1__url',             editorSection: 'Subscription',    editorOrder: 11, label: 'Mobile button URL',     type: 'url'   },
  { placeholder: 'subscription_desktop__content_1__heading',        editorSection: 'Subscription',    editorOrder: 11, label: 'Desktop heading',       type: 'short' },
  { placeholder: 'subscription_desktop__content_1__content',        editorSection: 'Subscription',    editorOrder: 11, label: 'Desktop body',          type: 'long'  },
  { placeholder: 'subscription_desktop__content_1__button_label',   editorSection: 'Subscription',    editorOrder: 11, label: 'Desktop button',        type: 'short' },
  { placeholder: 'subscription_desktop__content_1__url',            editorSection: 'Subscription',    editorOrder: 11, label: 'Desktop button URL',    type: 'url'   },

  // ── Product grid (order 12 — product_slider) ───────────────────────────
  { placeholder: 'product_slider__heading',                         editorSection: 'Product grid',    editorOrder: 12, label: 'Section heading',       type: 'short' },
  { placeholder: 'product_slider__content_1__heading',              editorSection: 'Product grid',    editorOrder: 12, label: 'Callout title',         type: 'short' },
  { placeholder: 'product_slider__content_1__content',              editorSection: 'Product grid',    editorOrder: 12, label: 'Callout body',          type: 'long'  },
  { placeholder: 'product_slider__content_1__button_label',         editorSection: 'Product grid',    editorOrder: 12, label: 'Callout button',        type: 'short' },
  { placeholder: 'product_slider__content_1__url',                  editorSection: 'Product grid',    editorOrder: 12, label: 'Callout button URL',    type: 'url'   },

  // ── FAQ (order 13 — accordions_LrLbTK) ─────────────────────────────────
  { placeholder: 'faq__heading',                                    editorSection: 'FAQ',             editorOrder: 13, label: 'Section heading',       type: 'short' },
  { placeholder: 'faq__content_1__heading',                         editorSection: 'FAQ',             editorOrder: 13, label: 'Q1',                    type: 'short' },
  { placeholder: 'faq__content_1__content',                         editorSection: 'FAQ',             editorOrder: 13, label: 'A1',                    type: 'long'  },
  { placeholder: 'faq__content_2__heading',                         editorSection: 'FAQ',             editorOrder: 13, label: 'Q2',                    type: 'short' },
  { placeholder: 'faq__content_2__content',                         editorSection: 'FAQ',             editorOrder: 13, label: 'A2',                    type: 'long'  },
  { placeholder: 'faq__content_3__heading',                         editorSection: 'FAQ',             editorOrder: 13, label: 'Q3',                    type: 'short' },
  { placeholder: 'faq__content_3__content',                         editorSection: 'FAQ',             editorOrder: 13, label: 'A3',                    type: 'long'  },
  { placeholder: 'faq__content_4__heading',                         editorSection: 'FAQ',             editorOrder: 13, label: 'Q4',                    type: 'short' },
  { placeholder: 'faq__content_4__content',                         editorSection: 'FAQ',             editorOrder: 13, label: 'A4',                    type: 'long'  },
  { placeholder: 'faq__content_5__heading',                         editorSection: 'FAQ',             editorOrder: 13, label: 'Q5',                    type: 'short' },
  { placeholder: 'faq__content_5__content',                         editorSection: 'FAQ',             editorOrder: 13, label: 'A5',                    type: 'long'  },
  { placeholder: 'faq__content_6__heading',                         editorSection: 'FAQ',             editorOrder: 13, label: 'Q6',                    type: 'short' },
  { placeholder: 'faq__content_6__content',                         editorSection: 'FAQ',             editorOrder: 13, label: 'A6',                    type: 'long'  },

  // ── Bottom banner (order 14) ───────────────────────────────────────────
  { placeholder: 'bottom_banner__heading_1__content',               editorSection: 'Bottom banner',   editorOrder: 14, label: 'Headline',              type: 'short' },
  { placeholder: 'bottom_banner__content_1__content',               editorSection: 'Bottom banner',   editorOrder: 14, label: 'Subheadline',           type: 'long'  },
  { placeholder: 'bottom_banner__buttons_1__button_label',          editorSection: 'Bottom banner',   editorOrder: 14, label: 'Button label',          type: 'short' },
  { placeholder: 'bottom_banner__buttons_1__button_url',            editorSection: 'Bottom banner',   editorOrder: 14, label: 'Button URL',            type: 'url'   },

  // ── PDP (order 15) ─────────────────────────────────────────────────────
  { placeholder: 'pdp_badge_text',                                  editorSection: 'PDP',             editorOrder: 15, label: 'Badge text',            type: 'short' },
  { placeholder: 'pdp_badge_emoji',                                 editorSection: 'PDP',             editorOrder: 15, label: 'Badge emoji',           type: 'short' },
  { placeholder: 'pdp_checklist_item_1',                            editorSection: 'PDP',             editorOrder: 15, label: 'Checklist 1',           type: 'short' },
  { placeholder: 'pdp_checklist_item_2',                            editorSection: 'PDP',             editorOrder: 15, label: 'Checklist 2',           type: 'short' },
  { placeholder: 'pdp_checklist_item_3',                            editorSection: 'PDP',             editorOrder: 15, label: 'Checklist 3',           type: 'short' },
  { placeholder: 'pdp_checklist_item_4',                            editorSection: 'PDP',             editorOrder: 15, label: 'Checklist 4',           type: 'short' },
  { placeholder: 'pdp_checklist_item_5',                            editorSection: 'PDP',             editorOrder: 15, label: 'Checklist 5',           type: 'short' },
  { placeholder: 'pdp_checklist_value_tag',                         editorSection: 'PDP',             editorOrder: 15, label: 'Value tag',             type: 'short' },
  { placeholder: 'pdp_checklist_value_text',                        editorSection: 'PDP',             editorOrder: 15, label: 'Value text',            type: 'long'  },
  { placeholder: 'pdp_perks_label',                                 editorSection: 'PDP',             editorOrder: 15, label: 'Perks label',           type: 'short' },
  { placeholder: 'pdp_perks_item_1',                                editorSection: 'PDP',             editorOrder: 15, label: 'Perk 1',                type: 'short' },
  { placeholder: 'pdp_perks_item_2',                                editorSection: 'PDP',             editorOrder: 15, label: 'Perk 2',                type: 'short' },
  { placeholder: 'pdp_perks_item_3',                                editorSection: 'PDP',             editorOrder: 15, label: 'Perk 3',                type: 'short' },
  { placeholder: 'pdp_perks_item_4',                                editorSection: 'PDP',             editorOrder: 15, label: 'Perk 4',                type: 'short' },
  { placeholder: 'pdp_perks_item_5',                                editorSection: 'PDP',             editorOrder: 15, label: 'Perk 5',                type: 'short' },
  { placeholder: 'pdp_ingredients_content',                         editorSection: 'PDP',             editorOrder: 15, label: 'Ingredients body',      type: 'long'  },
  { placeholder: 'pdp_shipping_content',                            editorSection: 'PDP',             editorOrder: 15, label: 'Shipping body',         type: 'long'  },

  // ── Footer (order 16) ──────────────────────────────────────────────────
  { placeholder: 'footer_tagline',                                  editorSection: 'Footer',          editorOrder: 16, label: 'Tagline',               type: 'short' },
  { placeholder: 'footer_about_content',                            editorSection: 'Footer',          editorOrder: 16, label: 'About body',            type: 'long'  },
  { placeholder: 'footer_cta_label',                                editorSection: 'Footer',          editorOrder: 16, label: 'About CTA label',       type: 'short' },
  { placeholder: 'footer_cta_url',                                  editorSection: 'Footer',          editorOrder: 16, label: 'About CTA URL',         type: 'url'   },
  { placeholder: 'footer_newsletter_heading',                       editorSection: 'Footer',          editorOrder: 16, label: 'Newsletter heading',    type: 'short' },
  { placeholder: 'footer_newsletter_content',                       editorSection: 'Footer',          editorOrder: 16, label: 'Newsletter body',       type: 'long'  },
  { placeholder: 'footer_newsletter_button',                        editorSection: 'Footer',          editorOrder: 16, label: 'Subscribe button',      type: 'short' },
  { placeholder: 'footer_newsletter_disclaimer',                    editorSection: 'Footer',          editorOrder: 16, label: 'Newsletter disclaimer', type: 'long'  },
  { placeholder: 'footer_richtext_heading',                         editorSection: 'Footer',          editorOrder: 16, label: 'Social heading',        type: 'short' },

  // ── About Hero (order 17 — base-about.json sections.about_hero) ────────
  { placeholder: 'about_hero_heading',                              editorSection: 'About Hero',              editorOrder: 17, label: 'Headline',             type: 'short' },
  { placeholder: 'about_hero_subhead',                              editorSection: 'About Hero',              editorOrder: 17, label: 'Subheadline',          type: 'long'  },

  // ── About Founder (order 18 — base-about.json sections.about_founder) ──
  { placeholder: 'about_founder_name',                              editorSection: 'About Founder',           editorOrder: 18, label: 'Founder / team name',  type: 'short' },
  { placeholder: 'about_founder_story',                             editorSection: 'About Founder',           editorOrder: 18, label: 'Founder story',        type: 'long'  },

  // ── About Mission & Values (order 19 — sections.about_mission + about_values) ──
  { placeholder: 'about_mission_heading',                           editorSection: 'About Mission & Values', editorOrder: 19, label: 'Mission heading',      type: 'short' },
  { placeholder: 'about_mission_body',                              editorSection: 'About Mission & Values', editorOrder: 19, label: 'Mission body',         type: 'long'  },
  { placeholder: 'about_value_1_heading',                           editorSection: 'About Mission & Values', editorOrder: 19, label: 'Value 1 title',        type: 'short' },
  { placeholder: 'about_value_1_body',                              editorSection: 'About Mission & Values', editorOrder: 19, label: 'Value 1 body',         type: 'long'  },
  { placeholder: 'about_value_2_heading',                           editorSection: 'About Mission & Values', editorOrder: 19, label: 'Value 2 title',        type: 'short' },
  { placeholder: 'about_value_2_body',                              editorSection: 'About Mission & Values', editorOrder: 19, label: 'Value 2 body',         type: 'long'  },
  { placeholder: 'about_value_3_heading',                           editorSection: 'About Mission & Values', editorOrder: 19, label: 'Value 3 title',        type: 'short' },
  { placeholder: 'about_value_3_body',                              editorSection: 'About Mission & Values', editorOrder: 19, label: 'Value 3 body',         type: 'long'  },

  // ── About CTA (order 20 — base-about.json sections.about_cta) ──────────
  { placeholder: 'about_cta_heading',                               editorSection: 'About CTA',               editorOrder: 20, label: 'Headline',             type: 'short' },
  { placeholder: 'about_cta_body',                                  editorSection: 'About CTA',               editorOrder: 20, label: 'Body',                 type: 'long'  },
  { placeholder: 'about_cta_label',                                 editorSection: 'About CTA',               editorOrder: 20, label: 'Button label',         type: 'short' },
  { placeholder: 'about_cta_url',                                   editorSection: 'About CTA',               editorOrder: 20, label: 'Button URL',           type: 'url'   },
]

// ─── Direct (non-placeholder) fields ─────────────────────────────────────────
// Some editable settings on the base templates are hardcoded string literals,
// not `{{placeholder}}` references, so the placeholder walker below can't
// resolve them. We register them here with pre-resolved source + path. These
// paths were audited directly against the live `store_themes` row on
// 2026-04-15 and the base template structure (base-pdp.json) — the block IDs
// are stable across regens because the generator never rewrites them.
//
// If a future template edit changes these hardcoded paths, the `DIRECT_FIELDS`
// entry will still point to the old key. The `readAtPath` call in the editor
// will return `null` and the field will render as empty; the PATCH route's
// `writeAtPath` will then refuse the save (the key no longer exists). This is
// the same silent-drop safety net that the walker uses for unresolved
// placeholders.
interface DirectField {
  source: StoreFieldSource
  path: string
  editorSection: string
  editorOrder: number
  label: string
  type: StoreFieldType
  /**
   * Synthetic stable key used wherever a field needs to be referenced by
   * `placeholder` (initial-values map, savedSet, htmlPlaceholders, etc.).
   * Prefixed with `direct:` so it can't collide with a real placeholder
   * from variable-map.
   */
  syntheticKey: string
}

const DIRECT_FIELDS: DirectField[] = [
  {
    syntheticKey: 'direct:pdp_ingredients_title',
    source: 'product_json',
    path: 'sections.1638995507af787164.blocks.accordion_gJ6baw.settings.title',
    editorSection: 'PDP',
    editorOrder: 15,
    label: 'Ingredients title',
    type: 'short',
  },
  {
    syntheticKey: 'direct:pdp_shipping_title',
    source: 'product_json',
    path: 'sections.1638995507af787164.blocks.accordion_ERmP7y.settings.title',
    editorSection: 'PDP',
    editorOrder: 15,
    label: 'Shipping title',
    type: 'short',
  },
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
const ABOUT_PATHS = new Map<string, string>()
collectPlaceholderPaths(baseTemplate, INDEX_PATHS)
collectPlaceholderPaths(basePdp, PDP_PATHS)
collectPlaceholderPaths(baseFooter, FOOTER_PATHS)
collectPlaceholderPaths(baseAbout, ABOUT_PATHS)

function resolveSource(placeholder: string): { source: StoreFieldSource; path: string } | null {
  const indexPath = INDEX_PATHS.get(placeholder)
  if (indexPath) return { source: 'index_json', path: indexPath }
  const pdpPath = PDP_PATHS.get(placeholder)
  if (pdpPath) return { source: 'product_json', path: pdpPath }
  const footerPath = FOOTER_PATHS.get(placeholder)
  if (footerPath) return { source: 'footer_group_json', path: footerPath }
  const aboutPath = ABOUT_PATHS.get(placeholder)
  if (aboutPath) return { source: 'about_json', path: aboutPath }
  return null
}

// Drop any priority entry whose placeholder doesn't exist in the base
// templates — that would mean variable-map and base templates are out of
// sync, and the entry is unusable. Better to silently skip than render a
// field that will fail at save time.
const WALKER_FIELDS: StoreFieldSpec[] = PRIORITY_FIELDS.flatMap(f => {
  const resolved = resolveSource(f.placeholder)
  if (!resolved) {
    console.warn('[store-fields] placeholder not found in any base template:', f.placeholder)
    return []
  }
  return [{ ...f, ...resolved }]
})

// DIRECT_FIELDS entries carry their own pre-resolved source + path and get
// appended to the walker-resolved list. They use a `syntheticKey` as the
// placeholder ID so lookups by `field.placeholder` work uniformly across
// both kinds of fields.
const DIRECT_FIELD_SPECS: StoreFieldSpec[] = DIRECT_FIELDS.map(f => ({
  placeholder: f.syntheticKey,
  source: f.source,
  path: f.path,
  editorSection: f.editorSection,
  editorOrder: f.editorOrder,
  label: f.label,
  type: f.type,
}))

export const STORE_FIELDS: StoreFieldSpec[] = [...WALKER_FIELDS, ...DIRECT_FIELD_SPECS]

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
