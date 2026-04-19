// resolveBlockBg — single source of truth for which theme background a
// rendered block shows. Honors a user-set block.style.bg first; otherwise
// falls back to the per-type (and per-variant where layout demands it)
// default table below. Each renderer now reads through this helper
// instead of hard-coding theme.paper / theme.cream / theme.ink, so the
// "alternation" of the default generated page can be tuned here without
// touching individual renderers.

import type { BackgroundKey, Block } from '../types.ts'
import type { PageTheme } from './getPageTheme.ts'

export type BgToken = 'paper' | 'cream' | 'ink' | 'accent'

function resolveToken(token: BgToken, theme: PageTheme): string {
  switch (token) {
    case 'paper': return theme.paper
    case 'cream': return theme.cream
    case 'ink':   return theme.ink
    case 'accent': return theme.accent
  }
}

// Keyed `${type}:${variant}`. Missing keys fall back to `paper` — safe
// for any block that doesn't care strongly about its canvas.
const DEFAULT_BG: Record<string, BgToken> = {
  'hero:overlay': 'ink',
  'hero:centered': 'cream',
  'hero:split': 'paper',

  // Problem sits directly below hero — keep it cream so a dark hero
  // overlay doesn't stack into another dark section.
  'problem:statement': 'cream',
  'problem:list': 'cream',

  'solution:statement': 'paper',
  'solution:image-left': 'paper',

  'benefits:3-col': 'cream',
  'benefits:2-col': 'cream',
  'benefits:stacked': 'paper',

  'stats:inline': 'ink',
  'stats:stacked': 'ink',

  'testimonial:single': 'cream',
  'testimonial:carousel': 'cream',

  'product:showcase': 'paper',
  'product:grid': 'paper',

  'gallery:grid-3': 'cream',
  'gallery:mosaic': 'cream',

  'video:embed': 'paper',
  'video:inline': 'paper',

  'richtext:default': 'paper',

  'faq:accordion': 'paper',
  'faq:two-col': 'paper',

  'finalcta:banner': 'accent',
  'finalcta:centered': 'accent',

  'footer:columns': 'ink',
  'footer:minimal': 'ink',
}

function mapKey(bg: BackgroundKey | undefined): BgToken | null {
  if (!bg || bg === 'custom') return null
  return bg
}

export function resolveBlockBg(block: Block, theme: PageTheme): string {
  const userBg = mapKey(block.style?.bg)
  if (userBg) return resolveToken(userBg, theme)
  const token = DEFAULT_BG[`${block.type}:${block.variant}`] ?? 'paper'
  return resolveToken(token, theme)
}

// Convenience accessor for renderers that want the token itself — e.g.
// when the renderer needs to flip text color conditionally on a dark bg.
export function resolveBlockBgToken(block: Block): BgToken {
  const userBg = mapKey(block.style?.bg)
  if (userBg) return userBg
  return DEFAULT_BG[`${block.type}:${block.variant}`] ?? 'paper'
}
