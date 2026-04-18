# Creative Studio reshell — integration map

**Purpose.** For the upcoming 3-column workspace reshell of `/creatives`. Every design element in `README.md §4.1–5.7` is mapped here to the existing file + state/handler that powers it today. The reshell MUST reuse every row below (no new state except the two local UI tabs in §6).

**Scope boundary.** The active route file is `src/app/(app)/creatives/page.tsx` (124 lines) and its monolithic child `src/components/creatives/CreativeBuilder.tsx` (1159 lines). The reshell rewrites CreativeBuilder's render only — its state declarations, handlers, effects, and child-component contracts stay intact and must be wired into the new layout verbatim.

---

## Route + shell

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Route `/creatives` | `src/app/(app)/creatives/page.tsx` | `CreativesPage` component, fetches `brands`, `campaignBrief`, `preloadedCopy`, passes to `<CreativeBuilder>` | Keep unchanged. Reshell is inside `CreativeBuilder`. |
| Page component name | `CreativesPage` | exported default at line 8 of `page.tsx` | Keep — README §10 forbids rename. |
| Data fetching (brands, campaign copy preload) | `page.tsx:20–109` | 3 `useEffect`s on supabase + `/api/*` | Keep untouched. README §10. |
| App shell (TopNav, global campaign bar, brand switch indicator) | `src/app/(app)/layout.tsx` | `LayoutShell` | **OUT OF SCOPE** — README §10. See Open Q #5 below: there's already a `<CampaignModeBar />` rendered at the app layer for `/creatives`, which overlaps with README §5.2. |

---

## §5.1 Top nav

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Global top nav (logo, brand switcher, nav links, user pill) | `src/components/ui/TopNav.tsx` | — | Keep as-is per README §5.1. Rendered by `(app)/layout.tsx` above every page. Do not touch. |

---

## §5.2 Campaign context bar

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Campaign bar (NEW in design) | `src/components/ui/CampaignModeBar.tsx` (already exists) | `useBrand()` → `activeCampaign`, `exitCampaignMode` | **Important:** already rendered globally by `(app)/layout.tsx:40` when pathname starts with `/creatives`. See Open Q #5 — specs diverge on height/counter. |
| `campaignMode` / `activeCampaign` state | `src/lib/brand-context.tsx:26,50` | `BrandProvider` exports `activeCampaignId`, `activeCampaign`, `exitCampaignMode` via `useBrand()` | Reuse. `CreativesPage` already reads `activeCampaignId` and falls back to URL param `?campaign=`. |
| Exit campaign handler | `brand-context.tsx:195` | `exitCampaignMode()` | Already wired; `CampaignModeBar` uses it. |
| Green-dot active indicator | design-tokens `colors.accent` (`#00ff97`) | — | Existing token matches. |
| Live counter of "creatives + unsaved drafts" | **does not exist today** | Could derive from `savedDrafts.length` + "active variation/draft unsaved" state — but those live inside `CreativeBuilder`, not in `CampaignModeBar`. See Open Q #5. |

---

## §5.3 Toolbar (44 px)

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Breadcrumb `Campaigns / <campaign> / <creative name>` | **partially exists**: `CreativeBuilder.tsx:808–816` has a "← Back to funnel" link only | No breadcrumb state today. Campaign name via `useBrand().activeCampaign`, creative name via `d.headline` of active draft | Judgment call: render breadcrumb from (`activeCampaign?.name` or null) → current draft headline or "Untitled". Flagging in §13 Open Q. |
| Size pill group `1:1` / `9:16` / `4:5` | `CreativeBuilder.tsx:769–771` (topbar), `SIZES` from `templates/registry.ts:23` | `sizeId` state @ line 51, `setSizeId` setter | Move the same selector + same options + same handler into the new toolbar. |
| Dims readout `1080×1080` | `PreviewCanvas.tsx:168` (`{size.w}×{size.h}`) | derived from `SIZES.find(s=>s.id===sizeId)` in `CreativeBuilder.tsx:179` | Re-derive in toolbar. |
| **Save draft** button | `PreviewCanvas.tsx:177–189` | `saveCurrentAsDraft()` @ `CreativeBuilder.tsx:425`, `updateCurrentDraft()` @ 429 | Reuse both. The "isEditingDraft" branch switches between Update / Save-as-new — preserve. |
| **Export** button (PNG) | `PreviewCanvas.tsx:191–196` | `exportPng` from `useCreativeExport` hook | Reuse. |
| **Export all sizes** | `PreviewCanvas.tsx:197–202` | `exportAllSizes` from `useCreativeExport` hook | Not in README toolbar spec but currently exposed. Keep somewhere (likely an overflow menu or keep next to Export). Flagging in §13 Open Q. |
| **Launch** button (primary) | Currently per-draft in `DraftStrip.tsx` (one button per saved draft) | `onLaunchDraft(i)` → `MetaLaunchModal` via `setLaunchModalDraft(i)` | Judgment call: design has a single toolbar Launch button, but the codebase today only launches individual saved drafts (each draft row has its own Launch button). Two interpretations — flagged in §13 Open Q. |
| `metaConnected` gate | `CreativeBuilder.tsx:134–140` | parsed from `brand.notes` | Reuse to disable Launch. |

---

## §5.4 Left rail (232 px)

### Templates grid

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| 9-template grid, 2-col cards, active = black border + green ring | `CreativeBuilder.tsx:777–806` (current horizontal pill row) | `TEMPLATES` from `templates/registry.ts:11–21`, `templateId` state @ line 50, setter + the side-effects at lines 779–794 (swap image by orientation, apply template-default style) | IDs already match README §5.4: `overlay, split, testimonial, stat, ugc, grid, infographic, comparison, mission`. Preserve the `onClick` block verbatim — it sets template, swaps image, kicks position defaults. |
| Template thumbnail | — | Today the builder uses just the label text on a pill. The design wants a visual thumbnail. | Judgment call: CSS placeholder thumbnails (a la the HTML prototype) will ship since we don't have template mini-previews baked anywhere. Flagging — spec says "visual thumbnail" but codebase has none. |

### Lifestyle images grid

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Lifestyle image grid, 2-col, "tag" badge | `CreativeBuilder.tsx:900–916` (existing images panel) | `lifestyleImages` from `bucketBrandImages(images, getBusinessType(brand))` @ line 725, click → `setSelectedImageId` | Reuse. |
| Bucketing helper | `src/lib/brand-images.ts` → `bucketBrandImages` | — | No change. |

### Product images grid + "Generate image"

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Product images grid | `CreativeBuilder.tsx:917–929` | `productImages` from same `bucketBrandImages` bucket | Reuse. |
| AI-generated images section | `CreativeBuilder.tsx:947–986` | `generatedImages` @ line 730, `generateImage()` @ line 734, posts to `/api/images/generate` | Live — AI image gen already exists. Design's "Generate image" CTA at bottom of rail maps to this. README §5.4 said "leave disabled if not implemented" but it IS implemented. |
| Dashed-border CTA | — | `generateImage` + `generatingImage` state + `generateError` | Reuse, keep dashed-border visual per spec. |

Other / "OTHER" bucket images (`CreativeBuilder.tsx:930–942`) exist in today's layout — not in the design. Judgment call: keep in the rail under a 3rd "Other" group, or drop them. Flagging in §13 Open Q.

---

## §5.5 Canvas

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Live preview surface | `src/components/creatives/preview/PreviewCanvas.tsx:146–150` | `<TemplateComponent {...templateProps} />` scaled to fit | **Reuse as-is** — README §5.5 explicitly says call the existing renderer. |
| Template component lookup | `CreativeBuilder.tsx:180–181` | `TEMPLATES.find(t=>t.id===templateId)!.component` | Unchanged. |
| `templateProps` assembly | `CreativeBuilder.tsx:643–650` | 27+ props merged from state + brand | Unchanged. |
| Preview scaling | `CreativeBuilder.tsx:694–699` | `maxPreviewH = 460`, `previewContainerW` via ResizeObserver | Preserve, but adapt to canvas column width (the new layout changes the center column width). |
| Dotted grid canvas background + corner markers + mono label | **does not exist today** — current card is white with just a border | New CSS only, no new state. Labels derived from existing `template.label` + `size.w/h`. |

---

## §5.6 Reel (below canvas)

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Reel tabs: Drafts / AI variations | Today rendered as two separate strips (not tabbed): `DraftStrip` + `VariationStrip` | No tab state today — new local UI state `reelTab: 'drafts' \| 'variations'` per README §6 | Merge into tabbed strip in the reshell. Both strips already expose 72×72-ish thumbnails rendered via `<TemplateComponent>` minis. |
| Drafts state | `CreativeBuilder.tsx:101` | `savedDrafts: Draft[]`, `activeDraft: number \| null`, loaded from `/api/creatives/by-brand/{brandId}` @ lines 598–631 | Reuse. |
| Variations state | `CreativeBuilder.tsx:99–100` | `variations: Variation[]`, `activeVariation: number \| null`, populated by `generateBatch()` @ line 322 | Reuse. |
| Load draft → canvas | `loadDraft(i)` @ `CreativeBuilder.tsx:550–565` | — | Reuse. |
| Load variation → canvas | `loadVariation(i)` @ `CreativeBuilder.tsx:409` | — | Reuse. |
| Save-variation-as-draft | `saveVariationAsDraft(i)` @ line 410 | — | Reuse. |
| Remove draft | `removeDraft(i)` @ line 569 | `DELETE /api/creatives/[id]/delete` | Reuse. |
| Per-draft Launch | `DraftStrip.tsx:48–56` + `MetaLaunchModal` | `onLaunchDraft(i)` → `setLaunchModalDraft(i)` @ `CreativeBuilder.tsx:103` | Reuse. Design also wants a toolbar-level Launch — see Open Q above. |
| "Clear" button (README §5.6) | `clearActiveDraft()` @ line 567 | — | Reuse — interpreting README's "Clear" as "deselect active draft/variation." |
| "Export all" (variations) | `exportAllVariations` from `useCreativeExport` | — | Reuse — currently inside `VariationStrip` header. |
| "Export all" (drafts) | `exportAllDrafts` from `useCreativeExport` | — | Reuse — currently inside `DraftStrip` header. Reshell consolidates into reel action buttons. |
| "Generate 5 more" | `generateBatch()` + `batchCount` + `setBatchCount` @ `CreativeBuilder.tsx:95–98`, UI in `PreviewCanvas.tsx:62–135` | — | Rewire: the "Batch generate" card currently lives inside `PreviewCanvas`. Design puts a "Generate 5 more" button on the reel tab bar. Reuse the same handler; pass the stop / progress state through. |
| Saved check badge (top-right of draft thumb) | `DraftStrip.tsx` renders a check mark when `dbId` exists | — | Reuse. |
| Active ring (black border + green ring) | existing but inconsistent styling | `activeDraft` / `activeVariation` index | Re-style per design. |

---

## §5.7 Right inspector — Copy tab

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| "Generate copy with brand voice" banner (⌘G) | `sidebar/CopyEditor.tsx:66–72` (labeled "AI Copy") | `generateCopy()` @ `CreativeBuilder.tsx:226` | Reuse. ⌘G shortcut **doesn't exist today** — flagging as field to stub if we want keyboard. |
| Headline textarea + char counter + "billboard" warning past limit | `CopyEditor.tsx:87` (plain input, no counter/warning) | `headline` state + `setHeadline` | Reuse state; counter + warning visual is NEW UI only (no new state). Limit is "3–5 words / billboard" per the existing prompt — exact char limit isn't set today. Flagging in §13. |
| Body textarea + char counter | `CopyEditor.tsx:88` (plain textarea, no counter; trim logic at line 251 caps at 75 chars after generation) | `bodyText` state | Reuse. Counter visual only. Limit derived from existing 75-char truncate. |
| CTA text input + visibility toggle | `CopyEditor.tsx:89–96` | `ctaText` state, `showCta` state + `setShowCta` | Reuse. Eye/EyeOff icon already present. |
| Destination URL | `CopyEditor.tsx:118–129` | `destinationUrl` state + `setDestinationUrl` @ `CreativeBuilder.tsx:62` | Reuse. Placeholder falls back to `brandWebsite`. |
| CTA type select (`SHOP_NOW`, `LEARN_MORE`, `SIGN_UP`, `GET_OFFER`, …) | `CopyEditor.tsx:100–114`, enum from `types.ts:99–118` | `ctaType` state, `CTA_TYPE_LABELS` constant | Reuse. The enum has 8 values (8, not 4 as README lists) — reshell keeps all 8. |
| Meta Ad Copy (`fbPrimaryText`, `fbHeadline`, `fbDescription`) collapsible | `CopyEditor.tsx:132–197` | 3 states, currently in a collapsible | Reuse — whether to keep the collapsible inside the new Copy tab or surface at top level is a small judgment call. |

---

## §5.7 Right inspector — Style tab

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| Brand color swatches (8-col grid) | `sidebar/StylePanel.tsx` + `brandColors` array from `CreativeBuilder.tsx:146–178` | `brandColors` is a built palette of up to ~20 colors from 20+ brand fields (bg_base, bg_dark, primary_color, secondary_color, accent_color, text_on_*, btn_*) + black + white | Reuse. README says "8-col grid"; today it auto-flows. |
| "+" swatch → color picker | **partially exists** in `StylePanel.tsx` (some template-specific pickers) | No single "+" picker entry point — `StylePanel` uses Swatch rows for each color category | Judgment call: add `+` tile at end that opens a native `<input type="color">`. Flagging as potentially-new UX. |
| Active swatch = black border + green ring | `StylePanel.tsx:Swatch` already uses `outline: selected ? 2px solid ${ringColor ?? colors.ink}` | — | Style difference only. |
| Font family + weight selects | `StylePanel.tsx` has `headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform` | 6 states in `CreativeBuilder.tsx:68–73` | Reuse. |
| Case segmented control (none / UPPER / lower / Title) | `setHeadlineTransform` / `setBodyTransform` exist (values: `'none' \| 'uppercase' \| ...`) | — | Reuse with segmented UI. README says "Title" — current enum doesn't include capitalize-first variants; flagging. |
| Headline size slider (0.6–1.8×) | `StylePanel.tsx` exposes `headlineSizeMul` | `headlineSizeMul` state, currently `1` default | Reuse. Same for `bodySizeMul`. |
| Background segmented (Image / Brand color / Dark / Custom) | **DOES NOT EXIST AS A FOUR-WAY MODE** today. Current: `bgColor` + `updateBgColor` + `showOverlay` toggles | — | **NO exact equivalent** in state. Closest mapping: "Image" means `selectedImageId !== null`, "Brand color" / "Dark" / "Custom" all collapse to setting `bgColor`. Flagging as §5.7 field-mismatch Open Q #6. |
| Overlay opacity slider (0–100%) | `StylePanel.tsx` has `overlayOpacity` slider + `showOverlay` toggle | `overlayOpacity` state @ `CreativeBuilder.tsx:78` (stored 0–100) | Reuse. |

---

## §5.7 Right inspector — Layout tab

| Design element | Current file | Current state/handler | Notes |
|---|---|---|---|
| 3×3 text position pad | `StylePanel.tsx` uses `POSITIONS` from `templates/registry.ts:29–33` (7 positions — no mid-row side positions, just corners + top-center / bottom-center / center) | `textPosition: TextPosition` @ `CreativeBuilder.tsx:64`, `setTextPosition` | Reuse. 9-cell visual maps to 7 supported values; the 2 mid-row sides (`middle-left`, `middle-right`) are unsupported in `TextPosition` type — cells disabled. Flagging. |
| Image position segmented (Top / Center / Bottom / Fit) | `StylePanel.tsx` exposes `imagePosition: string` | `imagePosition` state default `'center'` | Reuse — currently accepts string; `'top'`, `'center'`, `'bottom'`, `'fit'` mapping is implicit in templates. Flagging: `'fit'` mapping not verified yet. |
| Text banner segmented (None / Top / Bottom) | `StylePanel.tsx` exposes `textBanner` | `textBanner: 'none' \| 'top' \| 'bottom'` state | Reuse verbatim. |
| Padding slider (0–80 px) | **DOES NOT EXIST** today | — | Flagging as §5.7 field-mismatch Open Q #7. |
| Logo placement segmented (Hide / TL / TR / BL / BR) | **DOES NOT EXIST** today | — | Flagging as §5.7 field-mismatch Open Q #8. |

### Template-specific editable state (orphaned today)

| State field | Status | Notes |
|---|---|---|
| `callouts` (infographic) | State exists @ `CreativeBuilder.tsx:83–89`, passed to template. `InfographicSidebar` component exists (`sidebar/InfographicSidebar.tsx`) but is **not rendered** by `CreativeBuilder`. | Orphaned UI. Reshell could expose it inside Layout tab when `templateId === 'infographic'`. Flagging. |
| `statStripText` (infographic) | Same — state present, editor sidebar orphaned. | Flagging. |
| `oldWayItems` / `newWayItems` (comparison) | Same — `ComparisonSidebar.tsx` orphaned. | Flagging. |
| `subtitle`, `selectedProductImageId` (mission) | Same — `MissionSidebar.tsx` orphaned. | Flagging. |
| "Second image" picker for grid template | Rendered conditionally at `CreativeBuilder.tsx:1074–1086` | `selectedProductImageId` state | Reuse — but moves into the Layout tab context when `templateId === 'grid'`. |

---

## §6 Local UI state (NEW, per README §6)

| Design element | New state | localStorage key |
|---|---|---|
| Inspector active tab | `inspectorTab: 'copy' \| 'style' \| 'layout'` | `atlas-creative-studio-inspector-tab` |
| Reel active tab | `reelTab: 'drafts' \| 'variations'` | `atlas-creative-studio-reel-tab` |

No other new state. Everything else reuses `CreativeBuilder`'s existing state.

---

## §7 Design tokens

| README token | Current `design-tokens.ts` equivalent | Action |
|---|---|---|
| `ink` `#000000` | `colors.ink` | Reuse. |
| `paper` `#ffffff` | `colors.paper` + `colors.white` | Reuse. |
| `cream` `#f2f2f2` | `colors.cream` | Reuse. |
| `cream-2` `#f8f7f4` | `colors.previewCream` | Reuse (rename in-use as `cream-2` not needed — use `previewCream`). |
| `accent` `#00ff97` | `colors.accent` | Reuse. |
| `accent-hover` `#00e085` | `colors.accentHover` | Reuse. |
| `accent-dark` `#00cc78` | `colors.accentDark` | Reuse. |
| `muted` `#555555` | `colors.muted` | Reuse. |
| `subtle` `#777777` | `colors.subtle` | Reuse. |
| `disabled` `#bbbbbb` | `colors.disabled` | Reuse. |
| `border` `#e0e0e0` | `colors.border` | Reuse. |
| `border-strong` `#c4c4c4` | `colors.borderStrong` | Reuse. |
| Gray scale `#fafafa, #f8f8f8, …, #111111` | `colors.gray100`…`gray900` covers all | Reuse. |
| `r-btn` 6px | `radius.sm` (6) | Reuse. |
| `r-card` 10px | `radius.lg` (10) | Reuse. |
| `r-modal` 12px | `radius.xl` (12) | Reuse. |
| `r-pill` 20px | `radius.pill` is 999; no 20px radius exists. Closest: `radius['4xl']` (20). | Use `radius['4xl']`. |
| `shadow-card` 0 2px 16px rgba(0,0,0,0.05) | `shadow.card` — exact match | Reuse. |
| `shadow-dropdown` 0 8px 24px rgba(0,0,0,0.1) | `shadow.dropdown` — exact match | Reuse. |
| `shadow-accent` 0 4px 20px rgba(0,255,151,0.25) | `shadow.accent` — exact match | Reuse. |
| Canvas shadow `0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)` | No exact token — `shadow.modal` is close but single-layer | **NEW** inline value, no token (1-off). Can add `shadow.canvasCard` if preferred. |
| Barlow / DM Mono | `font.heading`, `font.mono` | Reuse. |
| DM Mono label (`11px, letter-spacing 0.06em, uppercase, muted`) | `letterSpacing.wide` = `'0.06em'`, `fontSize.sm` = 11, `colors.muted` | Reuse via composition. |

**No new tokens expected.** The one possible exception is `shadow.canvasCard` for the dual-layer canvas shadow; otherwise keep it inline to avoid noise.

---

## §8 Responsive

| Breakpoint | Current | Reshell plan |
|---|---|---|
| ≥1100 | — | `grid-template-columns: 232px 1fr 320px` |
| 900–1099 | — | `grid-template-columns: 200px 1fr 280px` |
| <900 | Current: stacks via `flex-col md:flex-row` | Single-column stack: rail (max 180, horizontal scroll) → canvas → inspector (max 300). |

---

## Existing handlers / hooks (reuse verbatim)

- `useBrandSync` @ `components/creatives/hooks/useBrandSync.ts` — seeds state when brand switches or campaign loads.
- `useCreativeExport` @ `components/creatives/hooks/useCreativeExport.tsx` — returns `exportPng`, `exportAllSizes`, `exportAllVariations`, `exportAllDrafts`, `exportRef`.
- `generateCopy`, `generateBatch`, `stopBatch`, `generateImage` — all local to `CreativeBuilder`.
- `saveCurrentAsDraft`, `updateCurrentDraft`, `saveNewDraftToDB`, `loadDraft`, `loadVariation`, `saveVariationAsDraft`, `removeDraft`, `clearActiveDraft` — all local to `CreativeBuilder`.
- `buildCurrentDraft`, `captureStyle`, `applyStyle` — helpers, reuse.
- `generateAndUploadThumbnail` — post-save side effect, reuse.
- `MetaLaunchModal` @ `components/creatives/MetaLaunchModal.tsx` — render when `launchModalDraft !== null`.

---

## Orphaned files (exist but unused by reshell)

- `src/components/creatives/sidebar/ImagePicker.tsx` — not currently imported by `CreativeBuilder`. Can be retired or repurposed for the rail. **Judgment call** — cleanest to leave it alone and build the rail's media grid inline (it's trivial).
- `src/components/creatives/sidebar/ComparisonSidebar.tsx`, `InfographicSidebar.tsx`, `MissionSidebar.tsx` — also not currently imported. The reshell's Layout tab is the natural home for these per-template editors (see Open Q list).
