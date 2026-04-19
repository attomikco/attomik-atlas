/**
 * ATTOMIK DESIGN TOKENS — TypeScript constants
 *
 * Canonical source: src/app/globals.css :root
 * Use these in inline styles instead of hardcoded values.
 * CSS custom properties (var(--xxx)) are still valid in className-based styles.
 */

// ── COLORS ────────────────────────────────────────────────────
export const colors = {
  // Core
  ink: '#000000',
  paper: '#ffffff',
  cream: '#f2f2f2',
  creamDark: '#e8e8e8',

  // Accent (neon green)
  accent: '#00ff97',
  accentHover: '#00e085',
  accentDark: '#00cc78',
  accentLight: '#e6fff5',
  accentMid: 'rgba(0,255,151,0.12)',

  // Semantic
  success: '#00cc78',
  successLight: '#e6fff5',
  danger: '#b91c1c',
  dangerLight: '#fee2e2',
  warning: '#856404',
  warningLight: '#fff3cd',
  info: '#1d4ed8',
  infoLight: '#dbeafe',

  // Neutrals
  muted: '#555555',
  subtle: '#777777',
  disabled: '#bbbbbb',

  // Borders
  border: '#e0e0e0',
  borderStrong: '#c4c4c4',

  // Canvas surfaces (landing-page builder)
  canvasGray: '#e9e9e7',

  // Sidebar
  sidebarBg: '#000000',
  sidebarBorder: 'rgba(255,255,255,0.07)',

  // ── Dark UI (preview, modals, dark cards) ──
  darkBg: '#111',
  darkCard: '#1a1a1a',
  darkCardAlt: '#2a2a2a',

  // ── Accent opacity variants (commonly used in dark UI) ──
  accentAlpha6: 'rgba(0,255,151,0.06)',
  accentAlpha8: 'rgba(0,255,151,0.08)',
  accentAlpha10: 'rgba(0,255,151,0.1)',
  accentAlpha12: 'rgba(0,255,151,0.12)',
  accentAlpha15: 'rgba(0,255,151,0.15)',
  accentAlpha20: 'rgba(0,255,151,0.2)',
  accentAlpha25: 'rgba(0,255,151,0.25)',
  accentAlpha30: 'rgba(0,255,151,0.3)',
  accentAlpha40: 'rgba(0,255,151,0.4)',

  // ── White opacity variants (text on dark backgrounds) ──
  whiteAlpha5: 'rgba(255,255,255,0.05)',
  whiteAlpha8: 'rgba(255,255,255,0.08)',
  whiteAlpha10: 'rgba(255,255,255,0.1)',
  whiteAlpha12: 'rgba(255,255,255,0.12)',
  whiteAlpha15: 'rgba(255,255,255,0.15)',
  whiteAlpha20: 'rgba(255,255,255,0.2)',
  whiteAlpha30: 'rgba(255,255,255,0.3)',
  whiteAlpha40: 'rgba(255,255,255,0.4)',
  whiteAlpha45: 'rgba(255,255,255,0.45)',
  whiteAlpha50: 'rgba(255,255,255,0.5)',
  whiteAlpha55: 'rgba(255,255,255,0.55)',
  whiteAlpha60: 'rgba(255,255,255,0.6)',
  whiteAlpha65: 'rgba(255,255,255,0.65)',
  whiteAlpha70: 'rgba(255,255,255,0.7)',
  whiteAlpha80: 'rgba(255,255,255,0.8)',
  whiteAlpha85: 'rgba(255,255,255,0.85)',
  whiteAlpha90: 'rgba(255,255,255,0.9)',

  // ── Black opacity variants (shadows, overlays) ──
  blackAlpha6: 'rgba(0,0,0,0.06)',
  blackAlpha8: 'rgba(0,0,0,0.08)',
  blackAlpha10: 'rgba(0,0,0,0.1)',
  blackAlpha20: 'rgba(0,0,0,0.2)',
  blackAlpha25: 'rgba(0,0,0,0.25)',
  blackAlpha45: 'rgba(0,0,0,0.45)',
  blackAlpha50: 'rgba(0,0,0,0.5)',

  // ── Dark text (on light backgrounds) ──
  grayText: '#444',

  // ── Grays (inline styles) ──
  gray100: '#fafafa',
  gray150: '#f8f8f8',
  gray200: '#f5f5f5',
  gray250: '#f0f0f0',
  gray300: '#eee',
  gray400: '#ddd',
  gray450: '#ccc',
  gray500: '#bbb',
  gray600: '#aaa',
  gray700: '#999',
  gray750: '#888',
  gray800: '#666',

  // ── Brand-specific accent greens (used in badges/labels) ──
  brandGreen: '#00a86b',
  brandGreenDark: '#007a48',

  // ── Other (preview dark sections) ──
  previewCream: '#f8f7f4',

  // ── Template-specific ──
  emailBlue: '#60a5fa',
  violet: '#a78bfa',
  emerald: '#34d399',

  // ── Semantic (dark UI) ──
  dangerSoft: 'rgba(255,100,100,0.9)',
  accentLink: '#00cc7a',

  // ── Aliases / additions for Creative Studio compliance ──
  white: '#ffffff',
  gray333: '#333',
  gray900: '#111',
  tailGreen400: '#4ade80',
  dangerAlt: '#d4183d',
} as const

// ── FONTS ─────────────────────────────────────────────────────
export const font = {
  heading: 'Barlow, sans-serif',
  mono: 'DM Mono, monospace',
} as const

// ── FONT WEIGHTS ──────────────────────────────────────────────
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  heading: 900,
} as const

// ── FONT SIZES (px) ──────────────────────────────────────────
export const fontSize = {
  '2xs': 9,
  xs: 10,
  sm: 11,
  caption: 12,
  body: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 17,
  '2xl': 18,
  '3xl': 20,
  '4xl': 22,
  '5xl': 24,
  '6xl': 26,
  '7xl': 28,
  '8xl': 32,
  '9xl': 36,
  '10xl': 42,
  '11xl': 56,
  display: 96,
} as const

// ── SPACING (px) ──────────────────────────────────────────────
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const

// ── BORDER RADIUS (px) ───────────────────────────────────────
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 20,
  '5xl': 24,
  pill: 999,
} as const

// ── Z-INDEX ──────────────────────────────────────────────────
export const zIndex = {
  thumb: 1,
  reel: 10,
  topbar: 50,
  sidebar: 100,
  dropdown: 100,
  reelOverlay: 150,
  modal: 200,
  toast: 300,
} as const

// ── SHADOWS ──────────────────────────────────────────────────
export const shadow = {
  xs: '0 1px 3px rgba(0,0,0,0.06)',
  sm: '0 2px 8px rgba(0,0,0,0.08)',
  md: '0 4px 16px rgba(0,0,0,0.1)',
  lg: '0 8px 32px rgba(0,0,0,0.12)',
  xl: '0 4px 32px rgba(0,0,0,0.08)',
  cardHover: '0 4px 20px rgba(0,0,0,0.08)',
  heavy: '0 8px 40px rgba(0,0,0,0.12)',
  dark: '0 4px 16px rgba(0,0,0,0.3)',
  modal: '0 20px 60px rgba(0,0,0,0.2)',
  accent: '0 4px 20px rgba(0,255,151,0.25)',
  accentBtn: '0 2px 12px rgba(0,255,151,0.3)',
  dropdown: '0 8px 24px rgba(0,0,0,0.1)',
  picker: '0 8px 32px rgba(0,0,0,0.25)',
  card: '0 2px 16px rgba(0,0,0,0.05)',
} as const

// ── TRANSITIONS ──────────────────────────────────────────────
export const transition = {
  fast: '0.1s ease',
  base: '0.15s ease',
  normal: '0.2s ease',
  slow: '0.25s ease',
  modal: '0.3s ease',
  overlay: '0.4s ease',
} as const

// ── LETTER SPACING ───────────────────────────────────────────
export const letterSpacing = {
  tight: '-0.03em',
  snug: '-0.02em',
  slight: '-0.01em',
  normal: '0',
  label: '0.04em',
  wide: '0.06em',
  wider: '0.08em',
  caps: '0.1em',
  widest: '0.12em',
  xwide: '0.14em',
} as const

// ── LAYOUT ───────────────────────────────────────────────────
export const layout = {
  sidebarWidth: 260,
  topbarHeight: 64,
  navHeight: 72,
  maxContentWidth: 1200,
} as const
