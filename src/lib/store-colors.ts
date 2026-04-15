// ─────────────────────────────────────────────────────────────────────────────
// store-colors.ts
// Shared types + helpers for the 9-slot theme color system used by the Store
// tool. The same shape powers generation (/api/brands/[id]/store/generate),
// the PATCH editor route, the store page editor UI, and the deploy route.
//
// NOTE on Shopify key names — the spec suggested short keys like `color_body`
// and `color_primary`, but our base theme (templates/store/base-settings.json)
// uses `color_background_body` / `color_foreground_body` / `color_background_primary`
// / `color_foreground_primary`, etc. We honor the real schema.
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  body: string
  text: string
  alternative_text: string
  primary_background: string
  primary_foreground: string
  secondary_background: string
  secondary_foreground: string
  tertiary_background: string
  tertiary_foreground: string
}

export const THEME_COLOR_KEYS: (keyof ThemeColors)[] = [
  'body',
  'text',
  'alternative_text',
  'primary_background',
  'primary_foreground',
  'secondary_background',
  'secondary_foreground',
  'tertiary_background',
  'tertiary_foreground',
]

export const THEME_COLOR_LABELS: Record<keyof ThemeColors, string> = {
  body: 'Body background',
  text: 'Body text',
  alternative_text: 'Alternative text',
  primary_background: 'Primary background',
  primary_foreground: 'Primary foreground',
  secondary_background: 'Secondary background',
  secondary_foreground: 'Secondary foreground',
  tertiary_background: 'Tertiary background',
  tertiary_foreground: 'Tertiary foreground',
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value)
}

export function parseThemeColors(value: unknown): ThemeColors | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const out: Partial<ThemeColors> = {}
  for (const key of THEME_COLOR_KEYS) {
    const raw = v[key]
    if (typeof raw !== 'string') return null
    out[key] = raw
  }
  return out as ThemeColors
}

// Accepts a partial, validates every field that IS present, and returns a
// sanitized object containing only valid hex entries. Used by the PATCH route
// to merge user updates into the stored colors object.
export function sanitizePartialColors(value: unknown): Partial<ThemeColors> {
  if (!value || typeof value !== 'object') return {}
  const v = value as Record<string, unknown>
  const out: Partial<ThemeColors> = {}
  for (const key of THEME_COLOR_KEYS) {
    const raw = v[key]
    if (isValidHex(raw)) out[key] = raw
  }
  return out
}

// Map the 9 slots to the actual Shopify theme settings keys the Attomik base
// theme uses (see templates/store/base-settings.json). Also sets `color_bar`
// to the body color for consistency — mirrors the legacy mapColorVariants
// behavior which defaulted the mobile bar to the body background.
export function colorsToThemeSettings(colors: ThemeColors): Record<string, string> {
  return {
    color_background_body: colors.body,
    color_foreground_body: colors.text,
    color_foreground_body_alt: colors.alternative_text,
    color_background_primary: colors.primary_background,
    color_foreground_primary: colors.primary_foreground,
    color_background_secondary: colors.secondary_background,
    color_foreground_secondary: colors.secondary_foreground,
    color_background_tertiary: colors.tertiary_background,
    color_foreground_tertiary: colors.tertiary_foreground,
    color_bar: colors.body,
  }
}

// Deterministic fallback colors derived from the brand's primary + secondary.
// Used when Claude's color generation fails for a variant, or when PATCH
// needs to seed a missing slot for legacy rows.
export function neutralColorsForVariant(
  primary: string,
  secondary: string,
  variant: 'light' | 'dark' | 'alt_light' | 'alt_dark'
): ThemeColors {
  const p = isValidHex(primary) ? primary : '#000000'
  const s = isValidHex(secondary) ? secondary : '#2c2c2c'
  if (variant === 'light' || variant === 'alt_light') {
    return {
      body: '#ffffff',
      text: '#1a1a1a',
      alternative_text: '#ffffff',
      primary_background: p,
      primary_foreground: '#ffffff',
      secondary_background: s,
      secondary_foreground: '#ffffff',
      tertiary_background: '#f5f5f5',
      tertiary_foreground: '#1a1a1a',
    }
  }
  return {
    body: variant === 'alt_dark' ? '#111111' : '#0a0a0a',
    text: variant === 'alt_dark' ? '#f0f0f0' : '#f5f5f5',
    alternative_text: variant === 'alt_dark' ? '#111111' : '#0a0a0a',
    primary_background: p,
    primary_foreground: '#ffffff',
    secondary_background: s,
    secondary_foreground: '#ffffff',
    tertiary_background: variant === 'alt_dark' ? '#1e1e1e' : '#1a1a1a',
    tertiary_foreground: variant === 'alt_dark' ? '#f0f0f0' : '#f5f5f5',
  }
}
