// Truncate a string at a sentence boundary within `max` characters.
//
//   - Strings at or under `max` return unchanged.
//   - Otherwise: slice at the last ".", "!", "?", or newline before `max`
//     and include the terminator. No ellipsis — the sentence already ends.
//   - Fallback for long unpunctuated runs: slice at the last whitespace
//     before `max` and append "…". If there's no whitespace either, hard
//     cut at `max` and append "…".
//
// Used by the website scraper to avoid storing mid-word-chopped product
// copy (the prior 200-char hard slice landed in places like "… ✓ H").
export function truncateAtSentenceBoundary(input: string, max = 400): string {
  if (!input) return ''
  if (input.length <= max) return input

  const window = input.slice(0, max)
  const sentenceEndMatches = Array.from(window.matchAll(/[.!?\n]/g))
  if (sentenceEndMatches.length) {
    const last = sentenceEndMatches[sentenceEndMatches.length - 1]
    const end = (last.index ?? 0) + 1
    return input.slice(0, end).trimEnd()
  }

  const lastSpace = window.lastIndexOf(' ')
  if (lastSpace > 0) return input.slice(0, lastSpace).trimEnd() + '…'
  return window + '…'
}
