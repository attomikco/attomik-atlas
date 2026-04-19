import type { FontTransform, LetterSpacing } from '../types'

export type ExtractedFonts = {
  family: string | null
  transform: FontTransform
  letterSpacing: LetterSpacing
}

// brandName is used ONLY for text-transform inference via the brand's own casing.
// (Atlas uses `ogSiteName || name`; since decode preserves casing, passing the
// final name is equivalent for this heuristic.)
export function extractFonts(html: string, externalCSS: string[], brandName: string | null): ExtractedFonts {
  const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []
  const allCSS = [...styleBlocks, ...externalCSS].join(' ')

  // ── Font ────────────────────────────────────────────────────────
  let font: string | null = null
  const systemFonts = new Set(['arial', 'helvetica', 'verdana', 'georgia', 'times', 'times new roman', 'courier', 'courier new', 'sans-serif', 'serif', 'monospace', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'inherit', 'initial'])

  // Google Fonts link
  const gfLink = html.match(/fonts\.googleapis\.com\/css2?\?family=([^&"']+)/i)?.[1]
  if (gfLink) {
    font = decodeURIComponent(gfLink.split('&')[0]).replace(/\+/g, ' ').split(':')[0]
  }

  // @import Google Fonts
  if (!font) {
    const importMatch = allCSS.match(/@import\s+url\(['"]?[^)]*fonts\.googleapis\.com\/css2?\?family=([^&"')]+)/i)?.[1]
    if (importMatch) font = decodeURIComponent(importMatch.split('&')[0]).replace(/\+/g, ' ').split(':')[0]
  }

  // font-family in CSS
  if (!font) {
    const ffMatches = allCSS.match(/font-family\s*:\s*["']?([^;"'}\n]+)/gi) || []
    for (const m of ffMatches) {
      const families = m.replace(/font-family\s*:\s*/i, '').split(',')
      for (const f of families) {
        const clean = f.trim().replace(/["']/g, '').toLowerCase()
        // Brandpoof fix — Atlas grabs CSS custom properties from third-party widgets; port back upstream
        if (clean.startsWith('var(') || clean.includes('--')) continue
        if (!systemFonts.has(clean) && clean.length > 1) {
          font = f.trim().replace(/["']/g, '')
          break
        }
      }
      if (font) break
    }
  }

  // ── Font transform & letter-spacing ──────────────────────────
  let fontTransform: FontTransform = 'none'
  let letterSpacing: LetterSpacing = 'normal'

  const transformCounts: Record<string, number> = { uppercase: 0, lowercase: 0, capitalize: 0 }
  // Check heading-level selectors for text-transform
  const headingPatterns = /(?:h[1-3]|\.heading|header|nav|\[class\*="title"\]|\[class\*="heading"\]|\[class\*="hero"\]|\[class\*="brand"\]|\[class\*="logo"\]|\.title|\.hero|\.brand)[^{]*\{[^}]*text-transform\s*:\s*(uppercase|lowercase|capitalize)/gi
  let ttMatch
  while ((ttMatch = headingPatterns.exec(allCSS)) !== null) {
    const val = ttMatch[1].toLowerCase()
    if (val in transformCounts) transformCounts[val]++
  }
  // Also detect from brand name casing
  const brandText = brandName
  if (brandText) {
    if (brandText === brandText.toUpperCase() && brandText.length > 1) transformCounts.uppercase += 3
    else if (brandText === brandText.toLowerCase()) transformCounts.lowercase += 2
    else if (brandText === brandText.replace(/\b\w/g, c => c.toUpperCase())) transformCounts.capitalize += 1
  }
  const topTransform = Object.entries(transformCounts).sort((a, b) => b[1] - a[1])[0]
  if (topTransform && topTransform[1] > 0) fontTransform = topTransform[0] as FontTransform

  // Check letter-spacing on headings
  const lsMatch = allCSS.match(/(?:h[1-3]|\.heading|\.title|\.hero|header)[^{]*\{[^}]*letter-spacing\s*:\s*([^;}\s]+)/i)
  if (lsMatch) {
    const val = lsMatch[1]
    const em = parseFloat(val)
    if (val.includes('em')) {
      if (em >= 0.1) letterSpacing = 'wide'
      else if (em <= -0.02) letterSpacing = 'tight'
    }
  }
  // Also check if any wide spacing found anywhere in heading context
  if (letterSpacing === 'normal') {
    const wideCheck = allCSS.match(/letter-spacing\s*:\s*([0-9.]+)em/gi) || []
    for (const w of wideCheck) {
      const v = parseFloat(w.replace(/letter-spacing\s*:\s*/i, ''))
      if (v >= 0.1) { letterSpacing = 'wide'; break }
    }
  }

  return { family: font, transform: fontTransform, letterSpacing }
}
