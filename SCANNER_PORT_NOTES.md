# Scanner Port Notes (Brandpoof → Atlas)

## What changed
- `src/app/api/brands/detect-website/route.ts` — rewritten as thin wrapper around `scanUrl` from `@/lib/scanner`
- `src/lib/scanner/` — new library structure (copied verbatim from Brandpoof)
  - `index.ts`, `fetch.ts`, `types.ts`
  - `extractors/name.ts`, `colors.ts`, `fonts.ts`, `ogImage.ts`, `logo.ts`, `platform.ts`, `products.ts`, `images.ts`, `businessType.ts`
  - `helpers/color.ts`, `decodeHtml.ts`, `truncate.ts`, `url.ts`
- `src/lib/decodeHtml.ts` — deleted (no external importers; scanner uses its own copy at `src/lib/scanner/helpers/decodeHtml.ts`)
- `src/lib/truncate.ts` — deleted (same reason)

## Bug fixes included
1. **Name cleaner** — titles like "BRAND | Some Tagline" now return "BRAND" not the full title
2. **Font extractor** — rejects CSS custom properties (`var(--...)`), fixes Okendo-widget false positives
3. **Logo fallback** — JSON-LD-only logos now recovered via image classifier
4. **Image URL harvester** — rejects srcset= parsing artifacts
5. **decodeHtml** — handles double-encoded ampersands

## Behavior changes
- Degraded shape on error is now consistent across all failure paths (previously 3 different shapes). The thin wrapper still returns Atlas's original empty-URL shape `{ name: null, colors: [], font: null, ogImage: null, logo: null }` for the `!url` fast-path, and Atlas's original outer-catch shape if the JSON parse or `scanUrl` throws. Inside `scanUrl` the fetch-failure and outer-catch both emit the full `DEGRADED` object (all fields present, arrays empty).
- Any caller relying on specific missing fields in specific error branches may need updates — see caller audit report.

## How to verify
- Scan https://graza.co — expect name: "GRAZA", logo recovered, font: null
- Scan https://drink.haus — expect clean logo URL, no srcSet= garbage in images array
