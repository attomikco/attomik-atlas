// getPageTheme — resolve the rendered page's theme from a Brand row.
//
// The rendered landing page (the scaled white paper inside Canvas) uses the
// brand's primary_color + accent_color as the ink/accent swap, plus the
// brand's heading + body fonts. Neutral substrate (paper, cream, grays,
// borders) stays Attomik-token-sourced — those are not brand-themed per
// the Phase 5b decision.
//
// The builder chrome (TopBar, LeftRail, Inspector, canvas gray field,
// selection outlines) keeps Attomik's tokens directly and does NOT read
// from PageTheme. That separation is what makes the builder feel like
// "Attomik-product-holding-a-brand's-page" rather than the whole UI
// re-skinning per brand.

import type { Brand } from '../../../types/index.ts'
import { colors, font } from '../../../lib/design-tokens.ts'
// Type-only import keeps the Node strip-types loader happy — brandImageBundle
// transitively pulls in @/types via lib/brand-images.ts, which the loader
// can't resolve. Runtime fallback literal is defined below.
import type { BrandImageBundle } from './brandImageBundle.ts'

const EMPTY_IMAGE_BUNDLE: BrandImageBundle = {
  hero: '',
  solution: '',
  productList: [],
  lifestyle: [],
}

export interface PageTheme {
  // Core brand swaps
  ink: string              // brand.primary_color — replaces handoff black
  accent: string           // brand.accent_color — replaces handoff neon green
  secondary: string        // brand.secondary_color (optional; falls back to inkMid)

  // Derived tints from accent
  accentMid: string        // rgba(accent, 0.12)
  accentTintBorder: string // rgba(accent, 0.35)

  // Derived tints from ink
  inkMid: string           // rgba(ink, 0.6) — secondary text on light bg
  inkSoft: string          // rgba(ink, 0.4)

  // Neutral substrate — NOT brand-themed (fixed decision)
  paper: string
  cream: string
  creamDark: string
  mutedText: string
  border: string

  // Fonts
  fontHeading: string      // brand.font_heading.family + fallbacks
  fontBody: string         // brand.font_body.family + fallbacks
  fontMono: string         // Attomik signature — stays DM Mono

  // Font URLs the page needs loaded. Consumed by useBrandFonts.
  googleFonts: string[]

  // Pre-picked brand images for hero / solution / product / gallery slots.
  // Empty bundle when no rows available — renderers fall back to <Ph>.
  images: BrandImageBundle
}

export interface PageThemeValidation {
  valid: boolean
  missing: string[]
  theme: PageTheme | null
}

// ── Hex → rgba ─────────────────────────────────────────────────────
// Small, local. hexToRgbStr already exists inside email-master-template
// but it's not exported and that file is email-specific — adding a tiny
// parser here avoids cross-module coupling for 6 lines of math.
function hexToRgbParts(raw: string): { r: number; g: number; b: number } | null {
  if (!raw) return null
  let hex = raw.trim().replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  if (hex.length !== 6) return null
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null
  return { r, g, b }
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const parts = hexToRgbParts(hex)
  if (!parts) return `rgba(0,0,0,${alpha})`
  return `rgba(${parts.r},${parts.g},${parts.b},${alpha})`
}

// ── Font helpers ───────────────────────────────────────────────────
// brand.font_heading is FontStyle | null but can also be stored as a
// JSON string in some codepaths (see CLAUDE.md). Guard for both.
function parseFont(f: unknown): { family?: string } | null {
  if (!f) return null
  if (typeof f === 'string') {
    try { return JSON.parse(f) as { family?: string } } catch { return null }
  }
  if (typeof f === 'object') return f as { family?: string }
  return null
}

function googleFontUrl(family: string): string {
  const cleaned = family.replace(/ /g, '+')
  return `https://fonts.googleapis.com/css2?family=${cleaned}:wght@400;500;600;700;800;900&display=swap`
}

// ── Resolver ───────────────────────────────────────────────────────
export function getPageTheme(
  brand: Brand,
  images: BrandImageBundle = EMPTY_IMAGE_BUNDLE,
): PageThemeValidation {
  const missing: string[] = []
  if (!brand.primary_color) missing.push('primary_color')
  if (!brand.accent_color) missing.push('accent_color')
  if (missing.length) return { valid: false, missing, theme: null }

  const ink = brand.primary_color as string
  const accent = brand.accent_color as string
  const secondary = brand.secondary_color || rgbaFromHex(ink, 0.6)

  const headingFamily = parseFont(brand.font_heading)?.family
    || brand.font_primary?.split('|')[0]
    || ''
  const bodyFamily = parseFont(brand.font_body)?.family
    || brand.font_secondary
    || headingFamily
    || ''

  const googleFonts: string[] = []
  if (headingFamily) googleFonts.push(googleFontUrl(headingFamily))
  if (bodyFamily && bodyFamily !== headingFamily) googleFonts.push(googleFontUrl(bodyFamily))

  const fontHeading = headingFamily
    ? `'${headingFamily}', ${font.heading}`
    : font.heading
  const fontBody = bodyFamily
    ? `'${bodyFamily}', system-ui, sans-serif`
    : 'system-ui, sans-serif'

  const theme: PageTheme = {
    ink,
    accent,
    secondary,

    accentMid: rgbaFromHex(accent, 0.12),
    accentTintBorder: rgbaFromHex(accent, 0.35),
    inkMid: rgbaFromHex(ink, 0.6),
    inkSoft: rgbaFromHex(ink, 0.4),

    paper: colors.paper,
    cream: colors.cream,
    creamDark: colors.creamDark,
    mutedText: colors.muted,
    border: colors.border,

    fontHeading,
    fontBody,
    fontMono: font.mono,

    googleFonts,

    images,
  }

  return { valid: true, missing: [], theme }
}
