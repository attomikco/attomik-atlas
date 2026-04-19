// Landing-preview HTML storage — one frozen HTML snapshot per brand in
// the `landing-previews` Supabase Storage bucket. Format: {brand_id}.html.
// Iframes load the HTML through a same-origin proxy at
// /api/preview/html/{brand_id}, NOT the raw Supabase URL, because
// Supabase's public CDN serves every file as `text/plain` with a
// sandbox CSP as anti-XSS hardening — which breaks iframe rendering.
// The proxy re-serves the same bytes with Content-Type: text/html.
// These helpers use the service-role admin client so they work from
// anonymous-funnel codepaths (onboarding wizard fires AI generation
// before the user has signed in) without tripping RLS.

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'landing-previews'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function objectPath(brandId: string): string {
  return `${brandId}.html`
}

// Pure URL construction — returns the same-origin proxy URL that
// re-serves the Storage object with the correct Content-Type. Relative
// on purpose: the only consumer is the iframe on /preview/:id, which
// is always same-origin, so the browser resolves the relative URL
// against the current host. Storing relative avoids baking dev vs prod
// hostnames into the DB.
export function getLandingPreviewUrl(brandId: string): string {
  return `/api/preview/html/${brandId}`
}

// Uploads the full HTML document to landing-previews/{brandId}.html,
// overwriting any existing file. Cache-Control allows a 60s window for
// freshness — regenerating a preview surfaces within a minute, repeat
// /preview/:id visits during the same session hit the CDN. Returns the
// proxy URL (not the raw Supabase URL — see file header for why).
export async function saveLandingPreviewHtml(
  brandId: string,
  html: string,
): Promise<{ url: string }> {
  const admin = getAdmin()
  const path = objectPath(brandId)

  // contentType is the bare MIME — the bucket's allowed_mime_types check
  // won't accept the parameterized form ("text/html; charset=utf-8").
  // Metadata is correct-serving side, but Supabase's public CDN still
  // overrides this at response time; the proxy route re-sets the header.
  const { error } = await admin.storage.from(BUCKET).upload(path, html, {
    upsert: true,
    contentType: 'text/html',
    cacheControl: '60',
  })
  if (error) throw error

  return { url: getLandingPreviewUrl(brandId) }
}

// Removes the brand's HTML file. Called from the brand-delete cleanup.
// Swallows "not found" since deleting a brand that never got past the
// onboarding scan won't have a preview file.
export async function deleteLandingPreviewHtml(brandId: string): Promise<void> {
  const admin = getAdmin()
  const path = objectPath(brandId)
  const { error } = await admin.storage.from(BUCKET).remove([path])
  if (!error) return
  if (/not ?found/i.test(error.message)) return
  throw error
}
