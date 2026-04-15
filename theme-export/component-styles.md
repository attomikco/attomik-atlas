# Attomik Design System — Component Styles

Every class defined in `src/app/globals.css`, grouped by category.
Pair with `theme.css` (CSS custom properties) for a drop-in starter.

---

## Reset & Base

| Selector | Purpose |
|---|---|
| `*, *::before, *::after` | `box-sizing:border-box`, reset margin/padding |
| `html, body` | Barlow, paper bg, ink text, antialiased |
| `a` | Inherit color, no underline |
| `button` | Inherit font family |
| `::-webkit-scrollbar` | 5px thin, border-color thumb |
| `*:focus-visible` | 2px accent outline, 2px offset |

## Typography

| Class / Selector | Purpose |
|---|---|
| `h1`–`h6` | Barlow 800, tight letter-spacing, line-height 1.1 |
| `h1` | `text-2xl` (26px) |
| `h2` | `text-xl` (22px) |
| `h3` | `text-lg` (20px), 700 |
| `h4` | `text-md` (17px), 700 |
| `p` | `text-base` (16px), line-height 1.6 |
| `.label` | Uppercase 12.8px, 600, muted, letter-spacing 0.07em |
| `.caption` | 14px, muted, line-height 1.5 |
| `.mono` | DM Mono font |

## Logo helpers

| Class | Purpose |
|---|---|
| `.logo-sidebar` | Height `--logo-sidebar-h` (38px), block |
| `.logo-topbar` | Height `--logo-topbar-h` (26px), block |
| `.logo-mark-sm` | 20×20 icon mark |
| `.logo-mark-md` | 32×32 icon mark |
| `.logo-mark-lg` | 56×56 icon mark |

## Layout

| Class | Purpose |
|---|---|
| `.app-layout` | Flex container — sidebar + main |
| `.sidebar` | Fixed 260px dark sidebar, full height |
| `.sidebar-logo` | Logo area with bottom border |
| `.sidebar-nav` | Scrollable nav list |
| `.sidebar-footer` | Bottom pinned footer |
| `.main` | Content area, offset by `--sidebar-w` |
| `.topbar` | Sticky topbar, paper bg, bottom border |
| `.topbar.topbar-scrolled` | Shadow applied on scroll (JS toggles class) |
| `.topbar-actions` | Right-side actions row |
| `.topbar-title` | Title group, flex-1 |
| `.topbar-title h1` | `text-2xl`, 800 |
| `.page-content` | 32px vertical / 40px horizontal padding wrapper |
| `.page-header` | Title + actions row, flex-wrap, gap |
| `.page-header-sticky` | Sticky variant, sticks below topbar |
| `.page-header-sticky.is-stuck` | Shadow when stuck |
| `.section-header` | Section divider row with bar + title + line |
| `.section-header-bar` | 3px wide accent vertical bar |
| `.section-header-title` | Section title text, `text-xl` 800 |
| `.section-header-line` | Flex-1 horizontal rule |
| `.section-header-sticky` | Sticks below topbar on scroll |
| `.divider` | 1px horizontal rule, 24px vertical margin |

## Grids

| Class | Purpose |
|---|---|
| `.grid-2` | 2-col grid, gap 16px |
| `.grid-3` | 3-col grid, gap 16px |
| `.grid-4` | 4-col grid, gap 16px |
| `.grid-5` | 5-col grid, gap 16px |

## Navigation

| Class | Purpose |
|---|---|
| `.nav-item` | Sidebar link — 50% white text, left border, hover lifts |
| `.nav-item:hover` | 85% white text, white alpha 5% bg |
| `.nav-item.active` | Accent text, accent left border, accent-mid bg |
| `.mobile-menu-btn` | Fixed hamburger button (hidden on desktop) |
| `.sidebar-overlay` | Dim backdrop behind open mobile sidebar |

## Buttons

| Class | Purpose |
|---|---|
| `.btn` | Base — inline-flex, gap, 10/20 padding, sans 700, radius sm |
| `.btn:disabled` | opacity 0.45, no pointer events |
| `.btn-primary` | Accent bg, ink text, lifts + accent shadow on hover |
| `.btn-secondary` | Cream bg, ink text, border |
| `.btn-dark` | Ink bg, accent text, lifts on hover |
| `.btn-ghost` | Transparent, muted text, cream on hover |
| `.btn-danger` | Danger-light bg, danger text |
| `.btn-outline` | Transparent, ink border, inverts on hover |
| `.btn-xs` | 5/10 padding, `text-xs`, radius xs |
| `.btn-sm` | 7/12 padding, `text-sm` |
| `.btn-lg` | 12/28 padding, `text-md` |
| `.btn-xl` | 16/32 padding, `text-lg` |
| `.btn-icon` | Square 1:1 icon button |

## Cards

| Class | Purpose |
|---|---|
| `.card` | Paper bg, border, radius xl (12px), 24px padding |
| `.card-sm` | 16px padding, radius lg |
| `.card-lg` | 32px padding, radius 2xl (16px) |
| `.card-dark` | Ink bg, white text |
| `.card-accent` | Accent bg, ink text |
| `.card-muted` | Cream bg |
| `.card-interactive` | Hover lifts with shadow + border change |
| `.kpi-card` | KPI value card (same as .card but semantically a KPI block) |
| `.kpi-card.accent` | Ink bg variant |
| `.kpi-label` | Uppercase label, muted (white 40% on accent variant) |
| `.kpi-value` | 34px 800, tight tracking, font-sans |
| `.kpi-card.accent .kpi-value` | Accent text on ink bg |
| `.kpi-sub` | Subtle supporting text |

## Badges

| Class | Purpose |
|---|---|
| `.badge` | Pill — 3/9 padding, `text-xs`, uppercase, 700 |
| `.badge-green` / `.badge-paid` / `.badge-active` / `.badge.status-active` | Accent-light bg, brand-green-dark text |
| `.badge-red` / `.badge-failed` / `.badge-refunded` | Danger variants |
| `.badge-yellow` / `.badge-pending` / `.badge-draft` / `.badge.status-draft` / `.badge.status-in_review` / `.badge.status-paused` | Warning variants |
| `.badge-blue` / `.badge.status-approved` / `.badge.status-scheduled` | Info variants |
| `.badge-black` | Ink bg, accent text |
| `.badge-gray` / `.badge-cancelled` / `.badge-inactive` / `.badge.status-archived` / `.badge.status-offboarded` | Cream bg, muted text |
| `.badge-live` | Solid accent bg, ink text |
| `.badge-admin` | Ink bg, accent text |
| `.badge-member` | Cream bg, ink text |
| `.badge-viewer` | Cream bg, muted text |
| `.badge.status-sent` | Accent-light bg, brand-green-dark text |
| `.badge-shopify` | `#f0f7e6` bg, `#3d7a00` text |
| `.badge-amazon` | `#fff3e0` bg, `#b35900` text |
| `.badge-walmart` | `#e3f0ff` bg, `#0057a8` text |
| `.badge-meta` | `#e8eeff` bg, `#1877f2` text |
| `.badge-google` | `#e8f0fe` bg, `#1a73e8` text |
| `.badge-tiktok` | Cream bg, ink text |
| `.pill-up` | Trend-up pill — accent-light bg, green text, 800 |
| `.pill-down` | Trend-down pill — danger-light bg, danger text, 800 |

## Forms

| Class / Selector | Purpose |
|---|---|
| `.form-group` | Stacked field wrapper, 4px gap |
| `.form-label` | Uppercase 12.8px, muted |
| `.form-hint` | 14px, subtle |
| `.form-error` | 14px, danger, 500 |
| `input, select, textarea` | Sans 16px, paper bg, border, radius sm, 10/12 padding |
| `input:focus, select:focus, textarea:focus` | Accent border + 3px accent glow |
| `input::placeholder` | Disabled color |
| `.input-group` | Relative wrapper for prefix icons |
| `.input-group .input-prefix` | Absolute-positioned prefix icon (left 12px) |
| `.input-group input` | Left padding 36px to clear prefix |
| `.search-input` | Cream bg, borderless until focus |

## Tables

| Class / Selector | Purpose |
|---|---|
| `.table-wrapper` | Bordered container with radius xl, overflow hidden |
| `.table-scroll` | Horizontal scroll container |
| `table` | 100% width, collapsed borders |
| `thead th` | Cream bg, uppercase label, muted, 12/24 padding |
| `tbody td` | 13/24 padding, `text-base`, cream bottom border |
| `tbody tr:hover` | `#fafafa` bg |
| `.td-mono` | DM Mono, `text-sm` |
| `.td-muted` | Muted color, `text-sm` |
| `.td-strong` | Font-weight 700 |
| `.td-right` | Right-aligned |
| `.table-sticky thead th` | Position sticky top 0, cream bg, 1px bottom shadow |
| `.table-pin-first tbody td:first-child` / `.table-pin-first thead th:first-child` | Sticky left 0 first column |

## Tabs & Toggles

| Class | Purpose |
|---|---|
| `.tabs` | Bottom-border container |
| `.tab-btn` | Tab button — 12/20 padding, 2px underline placeholder |
| `.tab-btn:hover` | Ink text |
| `.tab-btn.active` | Ink text, accent underline |
| `.tab-btn .tab-count` | Inline rounded count pill (cream bg) |
| `.tab-btn.active .tab-count` | Accent-mid bg, ink text |
| `.toggle-group` | Segmented control — cream bg, 3px padding |
| `.toggle-btn` | Segmented button — 7/16 padding, 600, muted |
| `.toggle-btn.active` | Ink bg, accent text, xs shadow |

## Modals

| Class | Purpose |
|---|---|
| `.modal-overlay` | Fixed dim backdrop — black 45%, blur(3px), fade-in animation |
| `.modal` | Paper panel, radius 2xl, 32px padding, modal shadow, slide-in |
| `.modal-header` | Title + close button row |
| `.modal-title` | `text-xl`, 800, tighter tracking |
| `.modal-close` | 30×30 cream square button, muted → ink on hover |
| `.modal-footer` | Right-aligned actions row with top border |

## Alerts & Toasts

| Class | Purpose |
|---|---|
| `.alert` | Flex alert box — 12/16 padding, radius md |
| `.alert-success` | Accent-light bg, `#b3f5db` border, `#007a48` text |
| `.alert-error` | Danger-light bg, `#fca5a5` border, danger text |
| `.alert-warning` | Warning-light bg, `#fde68a` border, warning text |
| `.alert-info` | Info-light bg, `#93c5fd` border, info text |
| `.toast` | Fixed bottom-right, ink bg, white text, lg shadow, slide-in |
| `.toast-success` | 3px accent left border |
| `.toast-error` | 3px `#f87171` left border |

## Loading

| Class | Purpose |
|---|---|
| `.skeleton` | Shimmer gradient (cream → cream-dark → cream), 1.4s loop |
| `.spinner` | 18×18 ring, ink top, spin 0.7s |
| `.spinner-accent` | Accent top color |
| `.spinner-sm` | 14×14, 1.5px border |
| `.spinner-lg` | 24×24 |
| `.pulse-dot` | 8×8 accent dot, pulses 1.8s |

## Avatars

| Class | Purpose |
|---|---|
| `.avatar` | Round, accent bg, ink text, 800 |
| `.avatar-sm` | 32×32, 0.75rem |
| `.avatar-md` | 40×40, 0.875rem |
| `.avatar-lg` | 48×48, 1rem |
| `.avatar-dark` | Ink bg, accent text |
| `.avatar-gray` | Cream bg, muted text |

## Utilities

| Class | Purpose |
|---|---|
| `.flex` / `.flex-col` | Display flex (+ column) |
| `.items-center` | Align items center |
| `.justify-between` | Justify space-between |
| `.gap-2` / `.gap-3` / `.gap-4` | Gap 8 / 12 / 16 |
| `.flex-1` | Flex grow 1 |
| `.shrink-0` | Flex-shrink 0 |
| `.truncate` | Single-line ellipsis |
| `.w-full` | Width 100% |
| `.font-bold` / `.font-extrabold` | Weight 700 / 800 |
| `.text-muted` / `.text-accent` / `.text-danger` | Color shortcuts |
| `.animate-fade` | Fade-in + translateY on mount |
| `.hide-mobile` | Hidden at ≤768px |
| `.show-mobile` | Hidden above 768px |
| `.drawer` | (Mobile overrides) Full-width bottom sheet variant |
| `.form-grid-2` | (Mobile) Collapses to single column at ≤768px |

## Responsive / Sticky

| Selector | Purpose |
|---|---|
| `@media (max-width: 1024px)` | Tablet — sidebar 220px, content padding shrinks, grid-4/5 halve |
| `@media (max-width: 768px)` | Mobile — sidebar becomes drawer, grids collapse to 2, mobile-menu-btn shown, modal goes full-bleed |
| `@media (max-width: 480px)` | Small mobile — all grids 1 col, KPI values shrink |
| `@media (hover: none) and (pointer: coarse)` | Touch targets 44px min on buttons/inputs/nav |
| `@media print` | Hides sidebar/topbar/buttons, resets margins |

## Keyframes

| Name | Purpose |
|---|---|
| `@keyframes fadeOverlay` | Modal backdrop fade-in |
| `@keyframes slideModal` | Modal slide + fade-in |
| `@keyframes slideToast` | Toast slide-up + fade-in |
| `@keyframes shimmer` | Skeleton shimmer loop |
| `@keyframes spin` | Spinner rotation |
| `@keyframes pulseDot` | Pulse-dot scale loop |
| `@keyframes fadeIn` | `.animate-fade` helper |
