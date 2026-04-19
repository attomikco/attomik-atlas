# Preview Data Contract

Renderer: `src/lib/landing-preview-renderer.ts`
Template: `src/lib/landing-preview-template.html`
Write surface: `/api/campaigns/[id]/landing-brief/route.ts` → uploads to Storage bucket `landing-previews/{brand_id}.html`
Read surface: `/preview/:id` via `PreviewClient.tsx` (iframe src)

This replaces the 1021-line Afterdream template + 30-regex `renderLandingHtml` pipeline. Single-pass mustache substitution over a CSS-variable-themed template, with iterated sections pre-rendered as HTML strings.

## Input shapes

```ts
export interface RenderPreviewInput {
  brand: Brand
  brief: LandingBrief
  brandImages: BrandImage[]
  products: Product[]          // brand.products
}
```

Columns actually read from `Brand`:
- `name`
- `website` (footer, product CTA)
- `logo_url`
- `notes` (JSON string — parsed for `logo_url_light`)
- `primary_color`, `secondary_color`, `accent_color`
- `font_heading` (`{ family, weight, transform }` — JSON or object)
- `font_body` (`{ family }`)
- `font_primary` (legacy fallback, `"Family|Weight"` string)
- `mission`
- `brand_voice` (first 200 chars as founder story fallback)
- `products`

`LandingBrief` (unchanged from existing shape):
```ts
{
  hero:         { headline, subheadline, cta_text }
  problem?:     { headline, body }
  solution?:    { headline, body }
  benefits?:    Array<{ headline, body }>
  social_proof?: { headline?, testimonial?, attribution?, stat? }
  faq?:         Array<{ question, answer }>
  final_cta?:   { headline?, body?, cta_text? }
}
```

`Product` (from `src/types/index.ts`):
```ts
{ name; description?; price_range?; url? }
```

## Template variables (scalars)

Mustache form: `{{name}}`. Renderer HTML-escapes every scalar before substitution.

| Variable | Source | Fallback |
|---|---|---|
| `page_title` | `${brand.name} \| ${brief.hero.headline}` | brand.name |
| `meta_description` | `brief.hero.subheadline` | "" |
| `announcement_text` | `"Free Shipping On Orders · " + (product.price_range ? "${brand.name} — From $${price}" : hero.cta_text)` | "" |
| `brand_name` | `brand.name` | "Brand" |
| `brand_url` | `brand.website` | "#" |
| `brand_domain` | `brand.website` stripped of scheme | `slugify(brand.name) + ".com"` |
| `brand_logo_html` | `<img>` using `notes.logo_url_light` → `brand.logo_url`; text fallback styled as display name | text fallback |
| `year` | `new Date().getFullYear()` | — |
| **Hero** | | |
| `hero_headline` | `brief.hero.headline` | brand.name |
| `hero_subheadline` | `brief.hero.subheadline` | "" |
| `hero_cta_text` | `brief.hero.cta_text` | "Shop Now" |
| `hero_badge_text` | `"${stat} — ${brand.name}"` | `"Loved by thousands — ${brand.name}"` |
| `hero_image` | `pickSlotImages(['hero'])[0]` → public URL | "" (renderer omits `<img>` when empty) |
| **Problem (Lifestyle section)** | | |
| `problem_label` | first 4 words of `brief.problem.headline` | "Why It Matters" |
| `problem_headline` | `brief.problem.headline` | "" |
| `problem_body` | `brief.problem.body` | "" |
| `problem_cta_text` | `brief.hero.cta_text` | "Shop Now" |
| `lifestyle_image` | `pickSlotImages(['lifestyle'])[0]` | "" |
| **Solution (Ingredients section)** | | |
| `solution_label` | constant `"What Makes It Work"` | — |
| `solution_headline` | `brief.solution.headline` | "" |
| `solution_body` | `brief.solution.body` | "" |
| **Founder / Story** | | |
| `founder_label` | `"The ${brand.name} Story"` | — |
| `founder_headline` | `"The Vision Behind ${brand.name}"` | — |
| `founder_body` | `brand.mission` ‖ `brand.brand_voice.slice(0,200)` ‖ `brief.solution.body` | "" |
| `founder_image` | same as `lifestyle_image` | "" |
| **Stats / testimonial header** | | |
| `stat_number` | `brief.social_proof.stat` | "" |
| `testimonial_quote` | `brief.social_proof.testimonial` | "" |
| `testimonial_attribution` | `brief.social_proof.attribution` | "Verified Customer" |
| **Final CTA** | | |
| `final_headline` | `brief.final_cta.headline` | "Ready when you are." |
| `final_offer_text` | `"${product.name}${product.price_range ? \` — $${price}\` : ""}"` | brand.name |
| `final_offer_sub` | `brief.final_cta.body` ‖ `brief.hero.subheadline` | "" |
| `final_cta_text` | `brief.final_cta.cta_text` ‖ `brief.hero.cta_text` | "Shop Now" |
| **Floating CTA** | | |
| `floating_cta_text` | `brief.hero.cta_text + " →"` | "Shop Now →" |
| **Showcase (Product) — single featured card** | | |
| `showcase_label` | constant `"Choose Yours"` | — |
| `showcase_headline` | `"Meet the ${brand.name}"` | — |

## Template variables (iterated sections — pre-rendered HTML)

Each is a single placeholder; the renderer produces the joined HTML server-side and injects as a scalar.

| Variable | Source | Count | Notes |
|---|---|---|---|
| `proof_strip_html` | `brief.benefits[].headline` | first 4 | Horizontal strip under hero. Each is a short label with checkmark. |
| `hero_micro_html` | `brief.benefits[].headline` | first 3 | Inline micro-bullets under hero CTA. |
| `ingredients_cards_html` | `brief.benefits[] + brand_images` | first 3 | Solution section — paired headline/body with image from content pool. |
| `products_html` | `brand.products[]` | first 3 (template renders 3-col grid) | Product cards: name, description, price, CTA. Falls back to empty grid if no products. |
| `review_cards_html` | `brief.reviews[]` (optional — not in LandingBrief type) | up to 3 | Testimonial grid. Requires real `{ text, author? }[]`; section hides otherwise. |
| `hiw_html` | `brief.hiw[]` (optional — not in LandingBrief type) | up to 3 | How-It-Works. Requires real `{ title, desc }[]`; section hides otherwise. |
| `press_bar_html` | `brand.press_mentions[]` (optional — not in Brand type) | first 5 | Real press mentions only; section hides otherwise. No fake benefit-derived text. |
| `faq_html` | `brief.faq[]` | all | `<details>` accordion items (native, no JS). |
| `guarantee_html` | `brand.notes.guarantees[]` (optional — not in Brand type) | first 3 | Final-CTA trust badges. Requires real `{ text }[]` inside notes JSON; row hides otherwise. |
| `photo_strip_html` | `brandImages` (content pool) | first 6 | Image gallery strip. |

## CSS variables (injected into `:root`)

All declared in `<style id="brand-override">` injected into `<head>` of the template. Template's static `:root` values are placeholder defaults and get overwritten by the override block. Hex colors in the template are fully replaced by `var(--…)` references.

| CSS var | Source | Fallback |
|---|---|---|
| `--brand-primary` | `brand.primary_color` | `#000000` |
| `--brand-accent` | `brand.accent_color` | `#00ff97` |
| `--brand-secondary` | `brand.secondary_color` | `rgba(primary, 0.6)` |
| `--bg` | `mix(primary, 0.93)` | light tint of primary |
| `--bg-alt` | `mix(primary, 0.88)` | — |
| `--bg-card` | `mix(primary, 0.96)` | — |
| `--bg-dark` | `brand.primary_color` | primary |
| `--bg-dark-alt` | `brand.secondary_color` | primary |
| `--text` | `brand.primary_color` | primary |
| `--text-secondary` | `brand.primary_color` | primary |
| `--text-tertiary` | `primary + 99` alpha | — |
| `--text-on-dark` | black on light primary / white on dark primary | `#fff` |
| `--text-on-dark-secondary` | rgba of text-on-dark at 0.6 / 0.65 | — |
| `--text-on-dark-tertiary` | `textOnDark + 88` alpha | — |
| `--primary` | `brand.secondary_color` (intentional — template's "primary" is a mid-layer) | primary |
| `--primary-light` | `mix(secondary, 0.15)` | — |
| `--primary-dim` | `secondary + 22` alpha | — |
| `--accent` | `brand.accent_color` | primary |
| `--accent-light` | `mix(accent, 0.15)` | — |
| `--accent-dim` | `accent + 22` alpha | — |
| `--border` | `primary + 15` alpha | — |
| `--border-strong` | `primary + 28` alpha | — |
| `--border-on-dark` | `textOnDark + 15` alpha | — |
| `--brand-font-heading` | `brand.font_heading.family` | `'Barlow', sans-serif` |
| `--brand-font-body` | `brand.font_body.family` | `system-ui, sans-serif` |
| `--brand-font-heading-weight` | `brand.font_heading.weight` | `700` |
| `--brand-font-heading-transform` | `brand.font_heading.transform` | `none` |

Google Fonts `<link>` tags injected based on `{family}` for heading + body. Loader dedupes when both share a family.

## Section visibility rules

Each section in the template is wrapped in HTML comment markers:

```html
<!-- PREVIEW_SECTION_START:proof_strip -->
...section HTML...
<!-- PREVIEW_SECTION_END:proof_strip -->
```

Renderer strips the markers after substitution. Sections with `visible = false` get their entire block (markers included) deleted from the output.

| Section | Visibility rule |
|---|---|
| `announcement` | always |
| `hero` | always |
| `proof_strip` | `brief.benefits.length >= 2` |
| `lifestyle` (problem) | `brief.problem?.headline` truthy |
| `showcase` (products) | `brand.products.length > 0` |
| `photo_strip` | `brandImages` content pool >= 3 |
| `ingredients` (solution) | `brief.solution?.headline` truthy |
| `founder` | `brand.mission` ‖ `brand.brand_voice` truthy (falls back to solution.body if set) |
| `testimonials` | real `brief.reviews?.length >= 1` (optional field not in LandingBrief type; hidden otherwise) |
| `press` | real `brand.press_mentions?.length >= 1` (optional field not in Brand type; hidden otherwise) |
| `how_it_works` | real `brief.hiw?.length >= 1` (optional field not in LandingBrief type; hidden otherwise) |
| `guarantee` | real `brand.notes.guarantees?.length >= 1` (parsed from notes JSON; hidden otherwise — wrapped in its own SECTION markers inside final_cta) |
| `faq` | `brief.faq?.length > 0` |
| `final_cta` | always |
| `floating_cta` | always |
| `footer` | always |

## Global rules

- **Scalar escape:** every `{{scalar}}` substitution HTML-escapes the value (`&`, `<`, `>`, `"`, `'`) before insertion. Pre-rendered HTML fragments (`*_html`) are inserted raw since the renderer controls their content.
- **Missing iterated source:** if the array is empty, the renderer still emits an empty string — the `{{placeholder}}` never leaks to output.
- **Dead tracking code:** the existing template's Google Analytics + Meta Pixel script block is preserved as structural scaffolding but the hardcoded IDs (`G-63LPQTRP0N`, `pixel_id: '1199920381791227'`) are stripped out. No replacement — brand-specific tracking is a v2 concern.
- **Hardcoded Afterdream copy** in the existing template (e.g. `"Federally Legal"`, `"Ships in 1-3 Days"`, `"Discovery Set"`, `"Morgan McLachlan"`) is fully replaced with variable-driven content. The new template contains zero brand-specific strings.
- **SEO / structured-data blocks** in the existing template (JSON-LD, Open Graph, Twitter Card) are dropped entirely in v1 — they were Afterdream-specific and generating structured data from brief + brand is out of scope for this iteration. The `<title>` and `<meta description>` are kept, both variable-driven.
- **No AI calls** in the renderer. Every value comes from the input shapes.

## v1 gaps (flagged)

- `hero_badge` — the current implementation mashes `brief.social_proof.stat` with brand name into one string, and many briefs have a vague stat. V1 keeps the pattern but the result is uneven. Proper fix is a dedicated `brief.hero.badge` field.
- ✅ **fixed (post-v1)**: `review_cards_html` — no more "3-card faked from single testimonial" synthesis. Section now hides entirely unless the caller provides real `brief.reviews: Review[]`. No schema change; the reader looks for the optional field via duck-typed optional chaining. Wizard / scraper / manual-edit can produce it whenever.
- ✅ **fixed (post-v1)**: `hiw_html` — no more hardcoded "Discover / Experience / Love It" across brands. Section hides unless real `brief.hiw: { title, desc }[]` is present.
- ✅ **fixed (post-v1)**: `press_bar_html` — no more benefit-headlines-as-fake-press. Section hides unless real `brand.press_mentions: { name }[]` is present.
- ✅ **fixed (post-v1)**: `guarantee_html` — no more benefit-headline reuse. Row hides unless real `brand.notes.guarantees: { text }[]` is present. Wrapped in its own `PREVIEW_SECTION_START:guarantee` markers inside `final_cta` so `final_cta` itself stays visible.
- `products_html` — current renderer only renders the first product as a single wide card; v1 renders up to 3 in a grid (matches the template's original visual). Products beyond 3 are dropped silently.
- Tracking IDs — GA4 and Meta Pixel IDs are null/empty; any analytics on preview pages will no-op until per-brand IDs become a brand field.
- Structured data (Organization, Product, FAQPage JSON-LD) — dropped entirely v1. Re-adding requires mapping `brand.*` into schema.org shapes; not blocking preview rendering.
