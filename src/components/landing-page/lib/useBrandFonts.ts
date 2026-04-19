'use client'
// Inject the brand's Google Fonts <link> tags into <head> so heading +
// body families are rendered correctly inside the canvas paper.
//
// Reuses the pattern already in src/components/campaigns/PreviewClient.tsx
// (line 430) and src/components/onboarding/OnboardingWizard.tsx (line 127) —
// single <link> element per font, keyed by id, href updated in place
// when the family changes. No cleanup on unmount so fonts remain cached
// for sibling tabs (matches existing behavior).

import { useEffect } from 'react'

const LINK_ID_PREFIX = 'lpb-brand-font-'

export function useBrandFonts(googleFontUrls: string[]) {
  useEffect(() => {
    googleFontUrls.forEach((url, idx) => {
      const id = `${LINK_ID_PREFIX}${idx}`
      let link = document.getElementById(id) as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }
      if (link.href !== url) link.href = url
    })
  }, [googleFontUrls])
}
