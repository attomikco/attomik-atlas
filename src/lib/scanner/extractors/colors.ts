import { colorDistance, hexToHsl } from '../helpers/color'

export type ExtractedColors = {
  primary: string | null
  secondary: string | null
  accent: string | null
  colors: string[]       // [primary, secondary, accent] — matches brand setup mapping
  allColors: string[]    // top 12 visually distinct colors
}

export function extractColors(html: string, externalCSS: string[]): ExtractedColors {
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
  const inlineStyles = (html.match(/style=["'][^"']+["']/gi) || []).join(' ')
  const allCSS = [...styleBlocks, ...externalCSS].join(' ')
  const styleText = allCSS + ' ' + inlineStyles

  // Extract hex colors
  const WHITES = new Set(['#ffffff', '#fefefe', '#f9f9f9', '#f8f8f8', '#fcfcfc'])
  const BLACKS = new Set(['#000000', '#111111', '#222222'])
  const colorCounts = new Map<string, number>()

  const hexMatches = styleText.match(/#[0-9a-fA-F]{6}\b/g) || []
  for (const raw of hexMatches) {
    const hex = raw.toLowerCase()
    if (WHITES.has(hex) || BLACKS.has(hex)) continue
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    // Skip near-grays (R, G, B all within 20 of each other)
    if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) continue
    // Skip very light colors (all channels > 220)
    if (r > 220 && g > 220 && b > 220) continue
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
  }

  // Also extract rgb() values
  const rgbMatches = styleText.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g) || []
  for (const m of rgbMatches) {
    const parts = m.match(/(\d{1,3})/g)
    if (!parts || parts.length < 3) continue
    const r = parseInt(parts[0]), g = parseInt(parts[1]), b = parseInt(parts[2])
    if (r > 255 || g > 255 || b > 255) continue
    // Skip if opacity 0
    if (/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(m)) continue
    const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
    if (WHITES.has(hex) || BLACKS.has(hex)) continue
    if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) continue
    if (r > 220 && g > 220 && b > 220) continue
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
  }

  // ── Smart color role classification ──
  // Instead of blindly picking the 3 most frequent, classify into roles:
  //   primary   = most frequent DARK, saturated color (brand hero)
  //   secondary = most frequent color that differs in hue from primary (CTAs, highlights)
  //   accent    = most frequent LIGHT color (backgrounds, cards)
  const sorted = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex, count]) => ({ hex, count, ...hexToHsl(hex) }))

  // Pick primary: darkest saturated color with high frequency (l < 0.6 and s > 0.15)
  // Falls back to most frequent color overall
  const darkSaturated = sorted.filter(c => c.l < 0.6 && c.s > 0.15)
  const primary = darkSaturated[0] || sorted[0]

  // Pick secondary: saturated color with hue distance > 30° from primary, distinct visually
  const hueDist = (h1: number, h2: number) => Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2))
  const hueDiverse = sorted.filter(c =>
    c.hex !== primary?.hex &&
    c.s > 0.2 &&
    colorDistance(c.hex, primary?.hex || '') > 50 &&
    (primary ? hueDist(c.h, primary.h) > 30 || Math.abs(c.l - primary.l) > 0.25 : true)
  )
  const secondary = hueDiverse[0] || sorted.find(c => c.hex !== primary?.hex) || null

  // Pick accent: lightest color (l > 0.7) that's distinct from primary and secondary
  const lightColors = sorted.filter(c =>
    c.l > 0.7 &&
    c.hex !== secondary?.hex &&
    colorDistance(c.hex, primary?.hex || '') > 60
  )
  const accent = lightColors[0] || null

  // Return in order: [primary, secondary, accent] — matching brand setup mapping
  const colors: string[] = []
  if (primary) colors.push(primary.hex)
  if (secondary) colors.push(secondary.hex)
  else if (colors.length === 1) colors.push(colors[0]) // fallback secondary = primary
  if (accent) colors.push(accent.hex)
  else if (primary) colors.push(primary.l < 0.5 ? '#f8f7f4' : '#1a1a1a') // synth light/dark counterpart

  // Full palette: top 12 visually distinct scraped colors for the picker
  const allColors: string[] = []
  for (const c of sorted) {
    if (allColors.length >= 12) break
    if (allColors.some(existing => colorDistance(c.hex, existing) < 35)) continue
    allColors.push(c.hex)
  }

  return {
    primary: primary?.hex || null,
    secondary: secondary?.hex || null,
    accent: accent?.hex || null,
    colors,
    allColors,
  }
}
