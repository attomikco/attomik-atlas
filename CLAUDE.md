# CLAUDE.md — Attomik Atlas
# Read this file at the start of EVERY session before making any changes.

---

## WHAT THIS IS

Attomik Atlas is an AI-powered marketing tool for CPG brands. Brand teams generate ad creatives, copy, emails, and landing pages — all brand-aware. The core flow:

1. Enter brand URL → AI scrapes colors, fonts, logo, images, products
2. Animation plays while AI builds a full funnel
3. Preview shows: brand toolkit, ad creatives, copy, landing page, email
4. User creates account → brand saved → enters dashboard
5. Dashboard: Creative Studio, Copy Creator, Email, Landing Page, Campaigns, Insights

**Stack:** Next.js 16.2.1, TypeScript, Tailwind (minimal), Supabase, Vercel, Claude API (`claude-sonnet-4-20250514`), Puppeteer + @sparticuz/chromium-min, Resend

---

## CRITICAL DATA RULES

**`brand.notes` is `TEXT`, not `JSONB`.** Always `JSON.parse()` → merge in JS → `JSON.stringify()` → save. Never use Supabase jsonb operators (`||`) on this column.

The safe write pattern — use it every time, no exceptions:

```ts
// 1. Read — fresh from the DB, never from React state or a captured variable
const { data: brand } = await supabase
  .from('brands')
  .select('notes')
  .eq('id', brandId)
  .single()

// 2. Parse
const currentNotes = JSON.parse(brand?.notes || '{}')

// 3. Merge in JS
const updatedNotes = { ...currentNotes, ...newKeys }

// 4. Stringify + save
await supabase
  .from('brands')
  .update({ notes: JSON.stringify(updatedNotes) })
  .eq('id', brandId)
```

Anti-patterns that will corrupt or stomp data:
- `update({ notes: existingNotes || newJson })` — the JS `||` short-circuits; you'll persist whichever side won, not a merge.
- `update({ notes: brand.notes + ',' + moreJson })` — raw string concat is not JSON.
- Reading `brand.notes` from React state / a server prop / a variable captured earlier in a long-running request and merging against that — any parallel flow (OAuth callback, email save, Klaviyo push, Meta save, store install) that mutated `notes` between the stale read and the write will be silently stomped. Always re-read from the DB immediately before the merge.
- Any `.rpc('jsonb_merge_...')` / raw SQL `||` variant — the column is TEXT, so these won't merge, they'll cast.

The same rule applies to every other `TEXT` column that holds JSON (e.g. the `font_heading`/`font_body` strings that downstream code has to `JSON.parse` before use). If in doubt, treat it as TEXT.

---

## CRITICAL RULES — NEVER BREAK THESE

1. **Git: commit locally is OK, never push** — commit changes when asked, but never push to remote unless explicitly told to
2. **Always read files before editing** — never assume file contents
3. **Never hardcode hex colors** — always use `src/lib/design-tokens.ts`
4. **Never hardcode brand names, URLs, or images** — everything comes from brand hub data
5. **Inline styles preferred** over Tailwind for all new components
6. **One concern per prompt** — don't combine unrelated changes
7. **Never install new npm packages** without explicit instruction
8. **The Anthropic API model is always** `claude-sonnet-4-20250514`

---

## PROJECT STRUCTURE

```
src/
├── app/
│   ├── (app)/                    # Protected pages — require auth
│   │   ├── layout.tsx            # App shell with TopNav + BrandProvider
│   │   ├── dashboard/            # Main dashboard
│   │   ├── brand-setup/[brandId] # Brand Hub editor
│   │   ├── creatives/            # Creative Studio
│   │   ├── copy/                 # Copy Creator
│   │   ├── newsletter/           # Email editor
│   │   ├── landing-page/         # Landing page editor
│   │   ├── campaigns/            # Campaign management
│   │   ├── insights/             # Meta Ads CSV insights
│   │   └── new/                  # New funnel entry point
│   ├── (onboarding)/
│   │   └── onboarding/           # Wizard — public, no nav
│   ├── api/                      # All API routes
│   ├── preview/[id]/             # Funnel preview — public, shareable
│   ├── render/                   # Puppeteer screenshot target — public
│   └── page.tsx                  # Marketing homepage
├── components/
│   ├── ui/                       # Shared UI: TopNav, CampaignModeBar, modals
│   ├── creatives/                # Creative Studio components + templates
│   ├── campaigns/                # Campaign components + PreviewClient
│   ├── email/                    # EmailTemplateClient, EmailActions
│   ├── brands/                   # Brand Hub editor components
│   └── onboarding/               # OnboardingWizard
├── lib/
│   ├── design-tokens.ts          # ALL color/spacing/font values — source of truth
│   ├── brand-context.tsx         # Global brand + campaign state
│   ├── brand-images.ts           # Image filtering utilities
│   ├── email-master-template.ts  # Email HTML builder
│   ├── anthropic.ts              # buildBrandSystemPrompt()
│   └── supabase/                 # client.ts + server.ts
└── middleware.ts                 # Auth protection
```

---

## ROUTE GROUPS

| Route Group | Auth | Nav | Purpose |
|-------------|------|-----|---------|
| `/(app)/` | Required | TopNav | All dashboard pages |
| `/(onboarding)/` | Public | None | Onboarding wizard |
| `/preview/[id]` | Public | None | Shareable funnel preview |
| `/render` | Public | None | Puppeteer screenshot target |
| `/` | Public | None | Marketing homepage |

---

## GLOBAL STATE — BRAND CONTEXT

**File:** `src/lib/brand-context.tsx`
**Provider:** Wraps all `/(app)/` pages via `src/app/(app)/layout.tsx`

### Key values:
```ts
activeBrandId    // currently selected brand — persisted in localStorage
activeCampaignId // currently active campaign — persisted in localStorage
activeCampaign   // full campaign object { id, name, goal, offer, key_message, angle }
brands           // all brands for the current user
brandsLoaded     // true once initial load is complete
isSwitching      // true for 500ms after brand switch
```

### Priority order for activeBrandId on load:
1. URL param `?brand=` — ALWAYS wins
2. localStorage `attomik_active_brand_id`
3. First brand in user's list

### Critical rules:
- **Never fetch brand data before `brandsLoaded` is true**
- **Never bypass the context** — always use `useBrand()` hook
- **When switching brands**, campaign mode auto-clears if campaign belongs to old brand
- **URL param always overrides localStorage** — this is intentional and correct

### localStorage keys:
- `attomik_active_brand_id` — active brand
- `attomik_active_campaign_id` — active campaign

---

## SUPABASE TABLES

| Table | Purpose |
|-------|---------|
| `brands` | Brand profiles — colors, fonts, logo, products, notes (JSON) |
| `campaigns` | Campaign briefs — goal, offer, angle, key_message |
| `generated_content` | AI-generated copy, email, landing page HTML |
| `brand_images` | Scraped images with tags |
| `funnel_starts` | Anonymous onboarding sessions |
| `saved_creatives` | Saved ad creatives with full style snapshot |
| `campaign_assets` | Assets attached to campaigns |
| `brand_insights` | Upload/sync metadata per brand |
| `brand_insight_rows` | Individual Meta Ads data rows — performance + creative fields |
| `profiles` | One row per `auth.users` user — `full_name`, `job_title`. Auto-created by `handle_new_user()` trigger on signup. |
| `brand_members` | Brand team membership — `(brand_id, user_id)` unique, `role in ('owner', 'admin', 'member')`. **This table is the authority for brand access**, not `brands.user_id`. |
| `brand_invites` | Pending email invites — opaque `token` (default `gen_random_bytes(32)` hex), 7-day `expires_at`, `accepted_at` nullable. |

### Supabase storage buckets:
- `brand-images` — public — scraped brand images
- `brand-assets` — public — uploaded logos, PDFs
- `campaign-assets` — campaign-specific assets

### brand.notes JSON structure:
```ts
notes: {
  business_type: 'shopify' | 'ecommerce' | 'saas' | 'restaurant' | 'service' | 'brand'
  logo_url_light: string    // white version of logo for dark backgrounds
  what_you_do: string       // AI-generated brand knowledge
  who_buys: string
  brand_voice: string
  tone: string[]
  email_config: MasterEmailConfig
  klaviyo_api_key: string
  meta_access_token: string      // Meta Graph API long-lived token (60 days)
  meta_ad_account_id: string     // Ad account number, no "act_" prefix
  meta_token_saved_at: string    // ISO timestamp for expiry computation
  font_heading: { family, weight, transform, letterSpacing }
  font_body: { family, weight, transform }
}
```

**IMPORTANT:** `font_heading` and `font_body` may be stored as JSON strings in Supabase. Always parse them:
```ts
const font_heading = typeof b.font_heading === 'string'
  ? JSON.parse(b.font_heading)
  : b.font_heading
```

---

## BRAND DATA — IMAGE TAGGING

Images in `brand_images` table have tags:
- `shopify` — from Shopify CDN, highest priority for creatives
- `product` — website product images
- `lifestyle` — lifestyle/contextual images
- `logo` — brand logo
- `press` — media/publication logos
- `other` — everything else

**Utility:** `src/lib/brand-images.ts` exports:
`getShopifyImages()`, `getProductImages()`, `getLifestyleImages()`, `getLogoImages()`, `getPressImages()`

---

## AUTH & MIDDLEWARE

**File:** `src/middleware.ts`

Protected routes (require auth):
- `/dashboard/:path*`
- `/brand-setup/:path*`
- `/creatives/:path*`
- `/copy/:path*`
- `/campaigns/:path*`
- `/newsletter/:path*`
- `/landing-page/:path*`
- `/insights/:path*`
- `/settings/:path*`
- `/brands/:path*`

Public routes (no auth):
- `/`, `/login`, `/auth`, `/onboarding`, `/preview/:path*`, `/api/:path*`, `/render`
- **`/invite/:path*`** — intentionally public. The accept-invite page is served before the user has a session; it uses the service-role client to look up the invite by opaque token. Do not add this to the middleware matcher.

Auth uses Supabase magic link. On auth → brand claimed with `user_id` → redirect to dashboard.

---

## TEAM MEMBERSHIP & INVITES

**Tables:** `brand_members`, `brand_invites` (see SUPABASE TABLES above).

### Access model
- `brand_members` is the single source of truth for "can this user see/touch this brand". `brands.user_id` still exists and is written on first claim, but RLS no longer gates access through it — every `brands` select/update now goes through a `brand_members where user_id = auth.uid()` subquery.
- Roles: `owner` (full control, can delete brand, manage all members), `admin` (can invite + revoke invites), `member` (read/edit brand content, cannot manage people).
- Backfill on migration: every brand with a non-null `user_id` got an `owner` row in `brand_members`.

### RLS summary
- **`brand_members` select**: row visible if `user_id = auth.uid()` OR the caller is a member of the same brand.
- **`brand_members` insert**: caller must be `owner` or `admin` of that brand.
- **`brand_members` delete**: caller must be `owner` of that brand.
- **`brand_invites` select**: caller must be a member of the brand.
- **`brand_invites` insert/delete**: caller must be `owner` or `admin`.
- **`brands` select/update**: caller must be in `brand_members` for that brand.
- **`brands` delete**: caller must be `owner`.

### Key constraints
- `brand_members (brand_id, user_id)` is unique — no duplicate memberships.
- `brand_invites.token` is unique (default `encode(gen_random_bytes(32), 'hex')` — requires `pgcrypto`).
- "Last owner" cannot be removed (guarded in the member DELETE route, not in SQL).
- Owner role is not flippable via the PATCH role endpoint — ownership transfer is a separate future action.

### Invite flow
1. **POST** `/api/brands/[brandId]/invites` — validates email, checks for duplicate membership (via `auth.admin.listUsers`) and pending invites, inserts `brand_invites` row, sends email via `sendEmail()`. Returns 200 with a `warning` field (not an error) if the Resend send fails so the invite row is still available for resend.
2. **Email** lands with a big CTA linking to `/invite/<token>` (see `src/lib/invite-email.ts`).
3. **GET** `/invite/[token]` — public server component, fetches via admin client, rejects expired/accepted/not-found, hands off to `AcceptInviteClient`.
4. **POST** `/api/invites/[token]` — auth required, case-insensitive email match between `user.email` and `invite.email`, inserts `brand_members` via admin client (RLS would block otherwise), marks invite `accepted_at = now()`. Idempotent: re-accepting a completed invite returns `{ brand_id }` if the user is already a member.
5. **DELETE** `/api/brands/[brandId]/invites/[inviteId]` — owner/admin revoke.

### Member management
- **DELETE** `/api/brands/[brandId]/members/[userId]` — owner only, cannot remove self, cannot remove last owner.
- **PATCH** `/api/brands/[brandId]/members/[userId]` — owner only, body `{ role: 'admin' | 'member' }`, cannot change own role, cannot demote an owner.

### ⚠️ `listUsers` pagination cap
Both the invite POST route and the team settings page resolve `auth.users` emails via `supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })`. **Above 200 total users, email resolution becomes incomplete** — existing members would appear as "email null" in the team list, and the duplicate-member pre-check during invite creation would miss them (the unique constraint + invite accept email-match still catch it at accept time, but the UX degrades). Fix when you grow past ~200: add an `email` column to `profiles` kept in sync via the `handle_new_user()` trigger, or create a `get_user_by_email` RPC. Search for `listUsers` in `src/app/api/brands/[brandId]/invites/route.ts` and `src/app/(app)/brands/[brandId]/settings/team/page.tsx`.

---

## TRANSACTIONAL EMAIL (RESEND)

**Helper:** `src/lib/resend.ts` — every outbound email in this codebase goes through `sendEmail({ to, subject, html, from? })`. Single place to change the domain, API key, or `from` header.

- **Default from**: `Attomik <invites@email.attomik.co>` (override via `RESEND_FROM` env var).
- **API key**: `RESEND_API_KEY` (server-only, no `NEXT_PUBLIC_` prefix).
- **Templates** live in `src/lib/` as plain HTML builders (e.g. `invite-email.ts`) — inline styles only, no external CSS, no media queries, HTML-escape all interpolated values.
- Current sends: brand team invites. No other transactional emails are wired up yet — add them via `sendEmail()`, not by re-instantiating `Resend`.

---

## DESIGN SYSTEM

**Source of truth:** `src/lib/design-tokens.ts` + `src/app/globals.css`

### Core palette:
```ts
colors.ink      = '#000000'   // primary text, dark backgrounds
colors.paper    = '#ffffff'   // page background
colors.cream    = '#f2f2f2'   // subtle backgrounds
colors.accent   = '#00ff97'   // neon green — CTAs, highlights
colors.muted    = '#555555'   // secondary text
colors.border   = '#e0e0e0'   // borders, dividers
```

### Typography:
- **Headings:** `font.heading` = Barlow, `fontWeight.heading` = 900, `textTransform: 'uppercase'`
- **Body/labels:** `font.mono` = DM Mono
- **All headings must be:** Barlow 900, uppercase, tight letter-spacing

### Rules:
- **Never hardcode hex values** — always import from `design-tokens.ts`
- **Inline styles preferred** over Tailwind classes for new components
- **CSS classes** from `globals.css` are fine for existing patterns (`.btn`, `.card`, `.badge` etc.)
- **Never use Tailwind** for colors — only use it for layout utilities if necessary

### Key composite styles available in design-tokens.ts:
```ts
styles.btnPrimary    // green accent button
styles.btnDark       // black button with green text
styles.headingDisplay // Barlow 900 uppercase
styles.label         // DM Mono uppercase label
styles.card          // standard white card
```

---

## CAMPAIGN MODE

When `activeCampaignId` is set:
- A black bar with green border appears below TopNav on: Creative Studio, Copy Creator, Email, Landing Page
- Shows campaign name/goal/offer + "Exit campaign ×" button
- **All AI generation prompts must inject campaign context:** `goal`, `offer`, `angle`, `key_message`
- Campaign mode clears when user clicks "Exit" or switches to a different brand

**File:** `src/components/ui/CampaignModeBar.tsx`

---

## CREATIVE STUDIO

**File:** `src/components/creatives/CreativeBuilder.tsx`

### Templates (9):
`Overlay`, `Split`, `Testimonial`, `Stat`, `Card` (UGC), `Grid`, `Info` (Infographic), `Compare`, `Mission`

All nine are registered in `src/components/creatives/templates/registry.ts`. The `infographic`, `comparison`, and `mission` ids were previously file-present-but-unregistered; they were re-enabled on 2026-04-13 alongside the Meta launch field additions.

### Sizes (3):
- `1:1` — 1080×1080
- `9:16` — 1080×1920
- `4:5` — 1080×1350

### Layout (3 columns):
- **Left:** Image thumbnails (product/lifestyle) — scrollable, fixed height
- **Center:** Live preview + batch generate bar + saved creatives strip
- **Right:** Style panel (position, overlay, fonts, colors, CTA) + Copy panel

### PNG Export:
1. `exportPngViaPuppeteer()` in `useCreativeExport.tsx`
2. POSTs template props to `/api/export/props` → gets UUID
3. POSTs to `/api/export/png` → launches Puppeteer → navigates to `/render?template=X&propsId=UUID`
4. `/render/page.tsx` fetches props, renders template at exact dimensions
5. Screenshot returned as PNG buffer
6. Falls back to html2canvas if Puppeteer fails

### Saved creatives:
- Persist to `saved_creatives` Supabase table with full style snapshot
- Show in the saved strip below the preview

### Meta ad launch fields (20260413_creatives_meta_fields.sql)
`saved_creatives` carries the data needed to launch each row as a Meta ad:

| Column | Purpose |
|---|---|
| `destination_url` | Per-creative landing page override. Blank → falls back to `brand.website` at launch time. |
| `cta_type` | Meta `call_to_action_type` enum: `SHOP_NOW`, `LEARN_MORE`, `SIGN_UP`, `BOOK_NOW`, `CONTACT_US`, `DOWNLOAD`, `GET_OFFER`, `WATCH_MORE`. Default `LEARN_MORE`. |
| `fb_primary_text` | Main ad body — 125 char target. Pre-filled from AI copy generation when available, editable in the Copy panel's "Meta Ad Copy" section. |
| `fb_headline` | Short benefit — 40 char target. |
| `fb_description` | Supporting context — 30 char target. |
| `thumbnail_url` | Public URL of a 1080×1080 PNG render. Populated by a client-triggered post-save render (see below). |
| `meta_ad_id` | Set when the creative is pushed to an Ad Account via the (future) Meta launch endpoint. |
| `meta_ad_status` | Same. |

Labels for `cta_type` values live in `CTA_TYPE_LABELS` (`src/components/creatives/types.ts`). When adding a field, update both the SQL, the `SavedCreative` type, the `/api/creatives/save` POST insert object, and the `/api/creatives/[id]/update` PATCH handler (which now accepts a partial patch of any subset of columns).

### Post-save thumbnail generation

After a creative is saved, the client fires `generateAndUploadThumbnail` in `CreativeBuilder.tsx` **without awaiting**:

1. Calls `fetchPngViaPuppeteer()` (the existing PNG export pipeline) at 1080×1080 with the current template props
2. Uploads the PNG to Supabase Storage: `brand-assets/thumbnails/{brand_id}/{creative_id}.png` (upsert)
3. PATCHes the `saved_creatives` row with `thumbnail_url = <public url>`

All failures are logged and swallowed — the save itself never fails because of a thumbnail issue. This is client-triggered rather than server-side fire-and-forget because Vercel serverless tears down the function once `NextResponse` returns.

---

## EMAIL SYSTEM

**Files:**
- `src/lib/email-master-template.ts` — `buildMasterEmail()` function
- `src/components/email/EmailTemplateClient.tsx` — editor UI
- `src/app/(app)/newsletter/page.tsx` — page

### How the email builder works:
- `buildMasterEmail(brand, config, productImages, lifestyleImages)` generates full HTML
- Uses template literal — direct JS expressions, NO placeholder strings, NO replaceAll
- Colors derived from `buildEmailPalette(brand, emailColors)` — brand colors are the base, emailColors are user overrides
- Users can customize colors in the Email page sidebar — saved as part of the master template config
- "Reset to Brand Hub colors" button reverts to auto-derived palette
- Fonts from `brand.font_heading?.family` and `brand.font_body?.family`
- Logo: `darkLogo` (white version) for dark sections, `lightLogo` (color version) for light sections

### Email color palette:
```ts
palette.darkBg       // brand primary color — dark section backgrounds
palette.darkText     // text on dark backgrounds (white if primary is dark)
palette.altDarkBg    // slightly lighter/darker variant of primary
palette.lightBg      // near-white light section background
palette.accent       // brand accent color
palette.accentText   // text on accent backgrounds
```

### Critical email rules:
- **Zero hardcoded brand content in template** — no Jolene, no Afterdream, nothing
- **No media queries in email HTML** — email renders the same on all screen sizes
- **Colors always from buildEmailPalette** — never hardcoded, never from saved config
- **Fonts parsed from JSON** before use — `font_heading` and `font_body` may be strings in DB

### Klaviyo integration:
- API key stored in `brand.notes.klaviyo_api_key`
- Push endpoint: `/api/campaigns/[id]/email/klaviyo`

---

## LANDING PAGE SYSTEM

**File:** `src/app/api/campaigns/[id]/landing-html/route.ts`

- Generates full branded HTML landing page from campaign brief
- Editor at `/(app)/landing-page/` with collapsible sidebar + live iframe preview
- Preview debounced 800ms
- In campaign mode: "Generate from Brand Hub" uses campaign brief fields

---

## INSIGHTS PAGE

**File:** `src/app/(app)/insights/page.tsx`

### Tables:
- `brand_insights` — upload/sync metadata (per brand, per upload or sync)
- `brand_insight_rows` — individual data rows (CSV or Meta API)

### brand_insight_rows key columns:
```
ad_id, ad_name, campaign_name, ad_set_name, date, impressions, clicks,
ctr, spend, purchases, purchase_value, roas, creative_title, creative_body,
creative_image_url, creative_cta, sync_source ('csv' | 'meta_api')
```

### Dedup constraint:
`(brand_id, date, campaign_name, ad_set_name, ad_name)` — prevents duplicates across uploads/syncs.
Always deduplicate before insert using a seen Set on the same key.

### Flow:
1. **Primary:** Sync from Meta API (if credentials configured) — fetches performance + creative data
2. **Fallback:** Upload Meta Ads CSV → parse client-side (no external CSV library)
3. Deduplicate against existing rows → insert new rows only
4. "Analyze with AI" → aggregate all rows for brand → send to Claude
5. AI returns: `{ summary, working[], opportunities[] }`
6. Each "working" item has "Use in Attomik" → copies prompt to clipboard

### AI response format (JSON only):
```json
{
  "summary": "2-3 sentence overview",
  "working": [{ "title": "string", "insight": "string", "attomikPrompt": "string" }],
  "opportunities": [{ "title": "string", "insight": "string", "action": "pause|scale|test|optimize", "recommendation": "string" }]
}
```

---

## API ROUTES

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ads` | POST | Generate Facebook ad copy variations |
| `/api/brands/[id]/delete` | DELETE | Delete brand + all related data |
| `/api/brands/[id]/generate-voice` | POST | Generate brand voice from website |
| `/api/brands/[id]/landing-preview` | POST | Generate landing page preview |
| `/api/brands/[id]/upload-scraped-images` | POST | Upload images from scraping |
| `/api/brands/detect-website` | POST | Scrape brand data from URL |
| `/api/brands/parse-pdf` | POST | Parse brand guidelines PDF |
| `/api/brands/proxy-image` | GET | Proxy external images for scraping |
| `/api/campaigns/[id]/ad-copy` | POST | Generate ad copy for campaign |
| `/api/campaigns/[id]/email` | POST | Generate email for campaign |
| `/api/campaigns/[id]/email/klaviyo` | POST | Push email to Klaviyo |
| `/api/campaigns/[id]/landing-brief` | POST | Generate landing page brief |
| `/api/campaigns/[id]/landing-html` | POST | Generate full landing page HTML |
| `/api/creatives/save` | POST | Save creative to DB |
| `/api/creatives/[id]/delete` | DELETE | Delete saved creative |
| `/api/creatives/[id]/update` | PATCH | Update saved creative |
| `/api/creatives/by-brand/[brandId]` | GET | Get all creatives for brand |
| `/api/email/generate-template` | POST | AI-generate email content from brand hub |
| `/api/export/png` | POST | Puppeteer screenshot API |
| `/api/export/props` | POST/GET | Temp props store for Puppeteer |
| `/api/generate` | POST | Main generation endpoint |
| `/api/insights/analyze` | POST | Analyze brand insight rows with AI |
| `/api/insights/sync-meta` | POST | Sync Meta Ads data via Graph API |
| `/api/landing-page/generate-brief` | POST | Generate landing page brief |
| `/api/newsletter` | POST | Newsletter generation |

---

## ONBOARDING FLOW

1. URL input on homepage → `/onboarding?url=...`
2. Wizard step 1: URL scan — detects brand (colors, fonts, logo, images, products, business type)
3. Wizard step 2: Brand review — user confirms detected data
4. Wizard step 3: Campaign name
5. "Build my funnel" → MagicModal animation plays
6. Brand + campaign created in DB (anonymous — no `user_id` yet)
7. Redirect to `/preview/[id]`
8. Preview: Brand Toolkit, Brand Knowledge, Ad Creatives, Copy, Landing Page, Email
9. Click any action → AccountModal (magic link auth)
10. On auth → brand claimed with `user_id` → redirect to dashboard

---

## LOGO HANDLING

- `brand.logo_url` — color logo, used on light backgrounds
- `brand.notes.logo_url_light` — white version, used on dark backgrounds
- If `logo_url_light` doesn't exist, apply `filter: brightness(0) invert(1)` to `logo_url` as fallback
- Use `isLight(hex)` to determine if background is light or dark:
```ts
const isLight = (hex: string) => {
  const c = (hex || '').replace('#', '')
  if (c.length < 6) return false
  return (parseInt(c.slice(0,2),16)*299 + parseInt(c.slice(2,4),16)*587 + parseInt(c.slice(4,6),16)*114) / 1000 > 128
}
```
- Light background → use `logo_url` (color logo, no filter)
- Dark background → use `logo_url_light` if available, else `logo_url` with invert filter

---

## TOPNAV

**File:** `src/components/ui/TopNav.tsx`

### Nav links (in order):
`Dashboard | Brand Hub | Creative Studio | Copy Creator | Email | Landing Page | Campaigns | Insights`

### Brand switcher:
- Shows active brand with color swatch + logo
- Dropdown lists all user brands
- Switching brands updates `activeBrandId` in context + localStorage
- On `/brand-setup` pages: also navigates to new brand URL
- On dashboard: also updates URL param

### URL param injection:
Every nav link includes `?brand=activeBrandId` via `getBrandNavHref()`. This ensures correct brand loads on page refresh.

---

## META ADS INTEGRATION

### Credentials
Stored per brand in `brand.notes` JSON:
- `meta_access_token` — long-lived token (60 days), generated at developers.facebook.com/tools/explorer
- `meta_ad_account_id` — just the number, no `act_` prefix
- `meta_token_saved_at` — ISO timestamp, used to compute expiry warning (14 days before 60-day expiry)

Required token permissions: `ads_read`, `ads_management`, `business_management`

### Sync API — /api/insights/sync-meta
- POST with `{ brandId }`
- Auth: checks Supabase session
- Smart date preset: `this_year` on first sync (0 existing meta_api rows), `last_30d` on subsequent
- Fetches from Meta Graph API v19.0 (auto-upgraded to v25.0 by Meta)
- Follows pagination via `paging.next`
- Creative fetch is TWO steps:
  1. Batch fetch `creative{id,title,body,thumbnail_url,image_url,call_to_action_type}` per ad_id
  2. For ads that only return creative ID (no content), batch fetch the creative object by ID
- Upsert pattern: delete existing rows for date range, insert fresh (ignoreDuplicates: true)
- Always deduplicate rows before insert using a Set on (brand_id|date|campaign_name|ad_set_name|ad_name)
- brand_insights record: delete old meta_api record for brand, insert fresh after sync

### Creative image URLs
- Come from Meta CDN (fbcdn.net) — expire in ~24 hours
- Do NOT store long-term — always re-fetch on sync
- May be null for older ads or ads without image creatives
- Render with onError handler to hide broken images gracefully

### Data mapping from Meta API
- `purchases` = `actions` array where `action_type === 'purchase'` → value
- `purchase_value` = `action_values` array where `action_type === 'purchase'` → value
- `roas` = purchase_value / spend (computed locally)
- `cpa` = spend / purchases (computed locally)
- `date` = `date_start` field (YYYY-MM-DD)
- `ad_set_name` = `adset_name` (Meta uses no underscore)

### Brand Hub — Integrations section
- Meta token + ad account ID fields added to BrandSetupClient.tsx
- Saved to brand.notes JSON in saveAll() function
- Token expiry warning shown when < 14 days remaining
- "✓ Connected" indicator when both fields are filled

### Insights page sync flow
1. On load: check brand.notes for meta credentials → set hasMetaCredentials
2. If connected: show black "Sync from Meta" card as primary CTA
3. If not connected: show grey card with "Connect →" link to Brand Hub
4. CSV upload collapsed under "Or upload CSV manually ▾" details element
5. After sync: refresh upload history + aggregated table data

### CRITICAL: never use SDK
Always use direct fetch to Meta Graph API — no facebook-nodejs-business-sdk or similar.

---

## STORE (Shopify theme factory)

**Store is accessed via the user avatar dropdown → Admin → Store.** Only visible to `pablo@attomik.co`. The gate is a hardcoded email check in `src/components/ui/TopNav.tsx` (`SUPER_ADMIN_EMAIL` constant); the Admin section of the avatar dropdown only renders when `user.email === SUPER_ADMIN_EMAIL`. The `/store` routes themselves are still protected by the existing `/store/:path*` middleware matcher, so non-admin users can't reach the feature even if they type the URL — they just won't see it in the nav. When Store is ready to expose to clients, move the gate to role-based access via `brand_members.role` (e.g. owner/admin only) rather than a hardcoded email.

The Store tool generates and deploys a Shopify theme for each brand. It ports the legacy `attomik-factory` app into Attomik Atlas, replacing the CLI-based deploy with direct Admin REST Asset API calls. Scraping is gone — brand data comes from `brands` + `brand_images`.

### `store_themes` table (`supabase/migrations/20260415_store_themes.sql`)

One row per brand, unique on `brand_id`. Created on the first successful `/generate` call.

| Column | Purpose |
|---|---|
| `id` | uuid pk |
| `brand_id` | fk → `brands.id`, unique |
| `name` | display label, defaults to `"Default theme"` |
| `color_variants` | jsonb — array of `{ name, theme_settings }` covering `light`/`dark`/`alt_light`/`alt_dark`. Each `theme_settings` is the merged `base-settings.json` + Claude-generated color tokens. |
| `selected_variant` | int — index into `color_variants` used for deploys and the future editor |
| `index_json` | jsonb — merged `templates/index.json` with image URLs injected |
| `product_json` | jsonb — merged `templates/product.json` |
| `footer_group_json` | jsonb — merged `sections/footer-group.json` |
| `about_json` | jsonb — merged `templates/page.about.json`. Deploys to `templates/page.about.json` on the Shopify theme. Nullable — legacy rows generated before migration `20260416_store_themes_about.sql` read back NULL until their next `/generate`. |
| `image_assignments` | jsonb — `ImageAssignment[]` mapping image-map slots to `brand_images` URLs |
| `shopify_theme_id` | bigint — remote Shopify theme ID the last deploy targeted |
| `shopify_theme_name` | text — remote Shopify theme display name |
| `last_deployed_at` | timestamptz |
| `last_deploy_status` | `'idle' \| 'deploying' \| 'success' \| 'failed'` |
| `last_deploy_error` | text — populated when status is `failed` |

RLS policy `store_themes_member_access` grants all operations to any row in `brand_members` for the brand.

### `brand.notes` Shopify keys

Credentials and install state live in `brand.notes` JSON (same pattern as Klaviyo + Meta). **Never add Shopify columns to `brands` — always merge into `notes`.**

| Key | Value |
|---|---|
| `shopify_store_url` | normalized host (no `https://`, no trailing slash), e.g. `jolene-coffee.myshopify.com` |
| `shopify_access_token` | Offline admin API access token obtained via OAuth. Server-only — the GET credentials route strips this before returning. |
| `shopify_api_version` | always `'2024-10'` — imported from `SHOPIFY_API_VERSION` in `src/lib/shopify.ts` |
| `shopify_token_saved_at` | ISO timestamp written by the OAuth callback (or legacy POST credentials call) |
| `shopify_base_theme_installed_at` | ISO timestamp set by `install-base-theme` after a clean run |

### Shopify OAuth (how the token is obtained)

Tokens come from a non-embedded OAuth authorization-code flow with offline access — **never paste-a-token**. Two public API routes bounce the user between Attomik and Shopify:

| Route | Purpose |
|---|---|
| `GET /api/shopify/install?shop=<myshopify.com>&brandId=<uuid>` | Validates the shop host, generates a nonce, writes a signed `shopify_oauth_state` httpOnly cookie (`{ nonce, brandId, shop }`, 10-min TTL), and 302s to `https://<shop>/admin/oauth/authorize` with scopes `read_themes,write_themes,read_content,write_content`. |
| `GET /api/shopify/callback` | Verifies the nonce from the cookie, re-verifies the shop host, runs Shopify's HMAC-SHA256 check (remove `hmac`, sort remaining params alphabetically, join as `k=v&k=v`, HMAC with `SHOPIFY_CLIENT_SECRET`, constant-time compare the hex digest), exchanges `code` for an offline `access_token` at `https://<shop>/admin/oauth/access_token`, merges the Shopify keys into `brand.notes` via the service-role admin client, clears the state cookie, and 302s to `/store?brand=<brandId>&connected=true`. Any failure redirects to `/store?brand=<brandId>&oauth_error=<reason>` so the UI can surface the error. |

**Both routes are explicitly public** in `src/middleware.ts` (`isPublic` treats `/api/shopify/install` and `/api/shopify/callback` as public, in addition to the blanket `/api/` allowance). They must bypass auth because the callback arrives from Shopify's servers and the install route is hit before any session guarantees.

**Required env vars** (see `.env.local`):

| Key | Value |
|---|---|
| `SHOPIFY_CLIENT_ID` | Client ID from the Shopify Dev Dashboard app |
| `SHOPIFY_CLIENT_SECRET` | Client secret from the Shopify Dev Dashboard — server-only, never expose with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | Full public origin of the Attomik Atlas app, e.g. `https://app.attomik.co`. Used to build the `redirect_uri` the install route passes to Shopify. Must match the registered redirect URI in the Dev Dashboard exactly (including protocol, host, and no trailing slash). |

**Shopify Dev Dashboard setup:**
- **Redirect URL** (must be registered): `{NEXT_PUBLIC_APP_URL}/api/shopify/callback`
- **Scopes:** `read_themes`, `write_themes`, `read_content`, `write_content`
- **App type:** non-embedded (no App Bridge, no embedded admin surfaces)
- **Access token type:** offline (no token refresh — the token lives until the merchant uninstalls the app)

**Disconnect:** `DELETE /api/brands/[id]/store/credentials` (any brand member) strips all `shopify_*` keys from `brand.notes` without touching other integrations. The Store page exposes this as a "Disconnect" button on the connected banner.

**Why no SDK:** Shopify's OAuth handshake is simple enough that plain `fetch()` + `crypto.createHmac` is shorter than pulling in `@shopify/shopify-api` and fighting its runtime assumptions. Keep it that way.

### Generate pipeline (5 steps)

Route: `POST /api/brands/[id]/store/generate` (any brand member).

1. **Brief from brand** — `buildBriefFromBrand()` reads `brand.name`, `primary_color`, `secondary_color`, parsed `font_heading`/`font_body`, `mission`, `target_audience`, `tone_keywords`, `competitors`, `values`, `products`, `notes.business_type`, `notes.what_you_do`. No scraper.
2. **Image pool** — `brand_images` rows are bucketed via `bucketBrandImages()`. The factory's `ROLE_TAG_PRIORITY` map is rewritten to use Attomik Atlas tags (`shopify` first on product slots so Shopify brands use the clean `/products.json` shots). Round-robin `takeForRole()` assigns images to slots defined in `templates/store/image-map.json`.
3. **Color variants** — `generateColorVariants()` calls `claude-sonnet-4-20250514` with an inline prompt (no prompt file) asking for 4 variants in a fixed JSON shape, mapped via `mapColorVariants()` to theme-settings keys. On Claude failure, `neutralVariantsFallback()` seeds 4 variants from the brand's primary + secondary.
4. **Variables (184)** — `generateVariableValues()` prepends `buildBrandSystemPrompt(brand)` so the generator inherits the Attomik Atlas brand voice, then appends `templates/store/prompts/design-rules.md`, the brief block, optional `CAMPAIGN CONTEXT` block (when the POST body carries `activeCampaignId`), and the factory's long-form generation rules (nav, announcement bar, footer, PDP badge/checklist/perks/variant cards, colors). Claude returns a JSON map keyed by variable name. Truncation repair kicks in if `stop_reason !== 'end_turn'`.
5. **Template merge + persist** — `applyValuesToTemplate()` does pure string substitution into `base-template.json`, `base-pdp.json`, `base-footer-group.json`, and `base-about.json`, then `base-settings.json` is merged under each color variant. `injectImageAssignments()` runs against both `index_json` and `about_json` (the `image-map.json` entries for `about_hero` / `about_founder` / `about_cta` partition into the about JSON naturally). The final row is `upsert(... onConflict: 'brand_id')` into `store_themes`, populating `index_json` / `product_json` / `footer_group_json` / `about_json`.

`templates/store/` holds the 4 base templates the generator substitutes into (`base-template.json` → homepage, `base-pdp.json` → PDP, `base-footer-group.json` → footer, `base-about.json` → about page) plus `base-settings.json`, `variable-map.json`, `image-map.json`, and `prompts/design-rules.md`.

### Deploy flow (Admin Asset API, no CLI)

The factory shelled out to `shopify theme push`. Attomik Atlas never uses the Shopify CLI — it calls the REST Asset API directly via `src/lib/shopify.ts`. All Shopify helpers use plain `fetch()` — no SDK, no new dependencies.

**`src/lib/shopify.ts` exports:** `SHOPIFY_API_VERSION`, `shopifyHeaders()`, `validateCredentials()` (GET `/admin/api/{v}/shop.json`), `listThemes()` (GET `/themes.json`), `createTheme()` (POST `/themes.json` with `{ theme: { name, role: 'unpublished' } }` — always forces `unpublished`, never `main`), `getAsset()`, `putAsset()` (text/JSON), `putBinaryAsset()` (base64). `putAsset` + `putBinaryAsset` carry a one-shot retry on 429/5xx responses (`isRetryableStatus`) with a 1s backoff. All functions throw with the Shopify error message on non-2xx.

**Routes under `/api/brands/[id]/store/` (all use Next.js route params):**

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `credentials` | POST | Validate + save `shopify_store_url` + `shopify_access_token` into `brand.notes`. Never returns the token. | Any brand member |
| `credentials` | GET | Re-validates the stored token live and returns `{ connected, shop_name, shopify_store_url, shopify_token_saved_at, shopify_base_theme_installed_at }`. Token is never in the response. | Any brand member |
| `generate` | POST | Run the 5-step pipeline and upsert `store_themes`. Body can include `{ activeCampaignId }` to inject campaign goal/offer/angle/key_message into the Step 4 prompt. | Any brand member |
| `themes` | GET | Returns the target store's themes via `listThemes()`, shape `{ themes: [{ id, name, role, preview_url }, ...] }`. | **Owner/admin** |
| `create-theme` | POST | Creates a new unpublished theme on Shopify via `createTheme(shop, token, name)` and upserts `store_themes.shopify_theme_id` + `shopify_theme_name` so the selection is persisted. Body: `{ name }`. Returns `{ ok: true, theme: { id, name, role } }`. Never sets `role: 'main'` (the helper hard-codes `unpublished`). If the Shopify create succeeds but the local upsert fails, returns 500 with both the error and the remote `theme` so the user sees the orphaned theme. | **Owner/admin** |
| `target-theme` | PATCH | Persists `{ shopify_theme_id, shopify_theme_name }` to the `store_themes` row (upsert on `brand_id`, partial update — other columns like `color_variants` / `index_json` are preserved). Used by the UI to save a target selection before install or deploy so later calls can fall back to the stored value. | **Owner/admin** |
| `install-base-theme` | POST | Walks `src/theme/` recursively and PUTs every file to the selected Shopify theme via the Asset API. **Sequential** processing with a 600ms throttle between calls (Shopify theme-assets bucket is 2/sec — prior concurrency=3 produced cascading 429s). Streams NDJSON progress events (`{ done, total, file }`, final `{ done: total, total, complete: true }` on success or `{ done: total, total, failedFiles, warning: true }` on partial failure). Each file failure is logged to `console.error` and the loop continues — a partial install does NOT set `shopify_base_theme_installed_at`, so the UI can show a retry panel listing the failed files. Catastrophic throws emit `{ error: true, file: null, message, done, total }` before the stream closes. Runtime ~2–3 min for 217 files. | **Owner/admin** |
| `deploy` | POST | PUTs the 5 generated JSONs (`templates/index.json`, `templates/product.json`, `sections/footer-group.json`, `templates/page.about.json`, `config/settings_data.json`) to the selected Shopify theme. Updates `store_themes.last_deploy_*`. Returns `{ preview_url }`. **Refuses `role='main'`** — return 400. Body: `{ themeId }` — optional; when omitted, falls back to `store_themes.shopify_theme_id` so callers that previously set the target via `create-theme` or `target-theme` don't need to re-pass it. `templates/page.about.json` is only pushed when `about_json` is present on the row (legacy rows without it are skipped). | **Owner/admin** |
| `pull-settings` | POST | GETs `config/settings_data.json` from the selected Shopify theme, unwraps the `current` key, and merges it into `store_themes.color_variants[selected_variant].theme_settings`. | **Owner/admin** |

**`src/lib/authorize-store.ts`** exposes `authorizeOwnerOrAdmin(brandId)` — mirrors the existing `authorizeOwner` pattern in `/api/brands/[id]/members/[userId]/route.ts` but widens the allow-list to both `owner` and `admin` roles.

### `src/theme/` — live Shopify theme source

`src/theme/` is a first-class source directory, not a static asset bundle. It's ported verbatim from `attomik-factory/theme/` (minus `.claude/` and `tmux-*.log`) and is edited directly in Attomik Atlas — add snippets, tweak sections, update assets in place. `install-base-theme` walks this directory and pushes it to Shopify via the Asset API. Binary extensions (`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `ico`, `woff`, `woff2`, `eot`, `ttf`, `otf`, `mp3`, `wav`, `mp4`, `mov`, `pdf`) are base64-encoded via `putBinaryAsset`; everything else is uploaded as utf-8 text via `putAsset`.

Next.js's file tracer bundles `src/theme/` with the serverless function automatically because the install route reads paths via `join(process.cwd(), 'src/theme')` — a static prefix the tracer picks up.

### Deploy safety rules

- **Never deploy to a theme with `role='main'`.** The deploy route validates the target against `listThemes()` and returns `400` if the role is `main`. Always push to an unpublished/development theme, preview it, then manually publish in Shopify Admin.
- **Install the base theme before deploying generated JSONs.** The deploy route only pushes 5 files — it assumes the sections/snippets/layout/assets the templates reference are already on the target theme. The `/store` page disables the Deploy button until `shopify_base_theme_installed_at` is set.
- **Owner/admin only** for `install-base-theme`, `deploy`, `pull-settings`, and `themes`. Generation and credential management are open to any brand member because they don't touch the remote store.
- **Store the access token server-side only.** The GET credentials route strips it before returning; never surface it to a client component.

### Templates & prompts (`templates/store/`)

| File | Source | Used by |
|---|---|---|
| `base-template.json` | factory | Step 3 — homepage merge target |
| `base-pdp.json` | factory | Step 3 — PDP merge target |
| `base-footer-group.json` | factory | Step 3 — footer group merge target |
| `base-about.json` | factory (+ 3 injected `{{image}}` placeholders: `about_hero_image_background`, `about_founder_image`, `about_cta_image_background`) | Step 3 — about page merge target |
| `base-settings.json` | factory | Step 5 — merged under each color variant |
| `variable-map.json` | factory | Step 4 — variable definitions, type, instructions. About section carries 16 copy placeholders + 3 image placeholders. |
| `image-map.json` | factory + 3 about entries (`about_hero` / `about_founder.blocks.founder_image` / `about_cta`) | Step 2 — image slot definitions (section_id, block_id, setting_id, role). Entries for about sections land in `about_json` at deploy time; `injectImageAssignments()` partitions them by which JSON root actually contains the target section. |
| `prompts/design-rules.md` | factory | Step 4 — appended to the system prompt after `buildBrandSystemPrompt()` |

---

## COMMON GOTCHAS

1. **Brand images showing wrong brand after reload**
   - Root cause: `activeBrandId` not yet set from URL param when image fetch fires
   - Fix: Always guard data fetches with `if (!activeBrandId || !brandsLoaded) return`

2. **Font fields as JSON strings**
   - `brand.font_heading` and `brand.font_body` may come from DB as JSON strings
   - Always parse: `typeof x === 'string' ? JSON.parse(x) : x`

3. **Email colors showing wrong**
   - `emailColors` in saved config are user overrides from the master template editor
   - Base colors always derived from brand, emailColors override specific values
   - "Reset to Brand Hub colors" in sidebar reverts to auto-derived palette

4. **Puppeteer PNG export fails**
   - Falls back to html2canvas automatically
   - `/render` page must be public (no auth) — it is, see middleware

5. **Campaign mode not injecting into AI prompts**
   - Check that `activeCampaign` from `useBrand()` is being passed to the generation call
   - All generation endpoints should accept and use: `goal`, `offer`, `angle`, `key_message`

6. **Brand images tagged wrong**
   - Shopify images have highest priority for creatives
   - Use utilities from `src/lib/brand-images.ts`, don't filter manually

7. **Supabase RLS blocking inserts**
   - All new tables need RLS policies scoped to `user_id = auth.uid()` or brand ownership
   - Check migration files in `supabase/migrations/`

8. **`notes` field is a JSON string**
   - Always parse: `const notes = b.notes ? JSON.parse(b.notes) : {}`
   - Never assume it's already an object

9. **Meta API creative images expire in ~24 hours**
   - Never rely on stored image URLs being valid
   - Always re-sync to get fresh URLs
   - Use onError on img tags to hide broken images

10. **Meta API returns creative ID only for some ads**
    - Two-step fetch required: first get creative ID, then fetch full creative by ID
    - Some ads may never return image URLs (video ads return thumbnail_url instead)

11. **Meta API duplicate rows**
    - Meta insights can return duplicate rows for same ad/date combination
    - Always deduplicate before insert using a Set
    - Use ignoreDuplicates: true on upsert to handle any remaining conflicts

12. **Meta API version**
    - We call v19.0 but Meta auto-upgrades to v25.0
    - Don't change the version — let Meta handle upgrades

---

## ENVIRONMENT VARIABLES

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_APP_URL       # used by invite flow for outbound links; falls back to NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
RESEND_API_KEY
RESEND_FROM               # optional; defaults to "Attomik <invites@email.attomik.co>"
```

---

## CURRENT TEST BRANDS

| Brand | URL | Type |
|-------|-----|------|
| Afterdream | drinkafterdream.com | THC beverages, Shopify |
| La Monjita | lamonjita.co | Mexican food products, Shopify |
| Jolene Coffee | jolenecoffee.com | RTD coffee, Shopify |
| Gameplan Skincare | gameplanskincare.com | Sport skincare, Shopify |
| WESAKE | wesake.co | Premium sake, Shopify |

---

## BEFORE EVERY CHANGE — CHECKLIST

- [ ] Read all files you're about to modify
- [ ] Check if brand context is involved — use `useBrand()`, never bypass
- [ ] Check if colors are involved — use design tokens, never hardcode
- [ ] Check if brand-specific content might be hardcoded — it shouldn't be
- [ ] Check if fonts need JSON parsing
- [ ] Check if the change affects multiple components (read all of them)
- [ ] Commit locally when asked — never push unless explicitly told
