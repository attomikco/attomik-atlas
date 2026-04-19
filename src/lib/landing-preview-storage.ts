// Landing-preview HTML storage — one frozen HTML snapshot per brand in
// the `landing-previews` Supabase Storage bucket. Format: {brand_id}.html.
// Public bucket so the iframe on /preview/:id can load the URL directly
// with no auth; writes gate via brand_members RLS (see the 20260419
// migration). These helpers use the service-role admin client so they
// work from anonymous-funnel codepaths (onboarding wizard fires AI
// generation before the user has signed in) without tripping RLS.

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

// Uploads the full HTML document to landing-previews/{brandId}.html,
// overwriting any existing file. Cache-Control allows a 60s window for
// CDN freshness — short enough that regenerating a preview surfaces
// within a minute, long enough that repeat /preview/:id visits during
// the same session hit the CDN. Returns the public URL.
export async function saveLandingPreviewHtml(
  brandId: string,
  html: string,
): Promise<{ url: string }> {
  const admin = getAdmin()
  const path = objectPath(brandId)

  const { error } = await admin.storage.from(BUCKET).upload(path, html, {
    upsert: true,
    contentType: 'text/html; charset=utf-8',
    cacheControl: '60',
  })
  if (error) throw error

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

// Pure URL construction — no network call, no auth. Safe to call from
// anywhere (server, client, tests) as long as NEXT_PUBLIC_SUPABASE_URL
// is defined. Returns the public URL even if the object doesn't exist
// yet; callers that need an existence check should fetch it.
export function getLandingPreviewUrl(brandId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return `${base}/storage/v1/object/public/${BUCKET}/${objectPath(brandId)}`
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
