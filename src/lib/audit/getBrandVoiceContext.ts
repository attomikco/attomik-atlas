// Thin shim — maps a brand row to the BrandVoiceContext the copy analyzer
// expects. Pure function, no I/O. Intentionally simple: the audit backend
// doesn't care about mission/vision/products/etc. for copy grading, only the
// direct voice/tone/avoid triple.

import type { Brand } from '@/types'
import type { BrandVoiceContext } from './types.ts'

const FALLBACK_VOICE =
  'No brand voice profile available — score conservatively against generic professional copy.'

export function getBrandVoiceContext(brand: Brand): BrandVoiceContext {
  const voiceDescription = brand.brand_voice ?? FALLBACK_VOICE
  const toneAttributes = brand.tone_keywords ?? []
  const forbiddenPhrases = brand.avoid_words ?? undefined
  return { voiceDescription, toneAttributes, forbiddenPhrases }
}
