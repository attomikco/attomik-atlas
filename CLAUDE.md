# CLAUDE.md — Attomik Marketing OS
# Read this file at the start of EVERY session before making any changes.

---

## WHAT THIS IS

Attomik Marketing OS is an AI-powered marketing tool for CPG brands. Brand teams generate ad creatives, copy, emails, and landing pages — all brand-aware. The core flow:

1. Enter brand URL → AI scrapes colors, fonts, logo, images, products
2. Animation plays while AI builds a full funnel
3. Preview shows: brand toolkit, ad creatives, copy, landing page, email
4. User creates account → brand saved → enters dashboard
5. Dashboard: Creative Studio, Copy Creator, Email, Landing Page, Campaigns, Insights

**Stack:** Next.js 16.2.1, TypeScript, Tailwind (minimal), Supabase, Vercel, Claude API (`claude-sonnet-4-20250514`), Puppeteer + @sparticuz/chromium-min, Resend

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
| `brand_insights` | Meta Ads CSV upload metadata per brand |
| `brand_insight_rows` | Individual parsed CSV rows for insights analysis |

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

Public routes (no auth):
- `/`, `/login`, `/auth`, `/onboarding`, `/preview/:path*`, `/api/:path*`, `/render`

Auth uses Supabase magic link. On auth → brand claimed with `user_id` → redirect to dashboard.

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
- `brand_insights` — upload metadata (per brand, per upload)
- `brand_insight_rows` — individual CSV rows

### Dedup constraint:
`(brand_id, date, campaign_name, ad_set_name, age, gender, placement)` — prevents duplicates across uploads

### Flow:
1. Upload Meta Ads CSV → parse client-side (no external CSV library)
2. Deduplicate against existing rows → insert new rows only
3. "Analyze with AI" → aggregate all rows for brand → send to Claude
4. AI returns: `{ summary, topInsights[], angles[], audiences[], offers[] }`
5. Each recommendation has "Launch Campaign" → creates campaign → enters campaign mode → navigates to Creative Studio

### AI response format (JSON only):
```json
{
  "summary": "2-3 sentence overview",
  "topInsights": ["insight 1", "insight 2", "insight 3"],
  "angles": [{ "angle": "string", "reasoning": "string" }],
  "audiences": [{ "segment": "string", "reasoning": "string" }],
  "offers": [{ "offer": "string", "reasoning": "string" }]
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

---

## ENVIRONMENT VARIABLES

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
RESEND_API_KEY
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
