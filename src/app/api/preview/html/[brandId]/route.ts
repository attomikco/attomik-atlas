import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Proxy for landing-preview HTML. Supabase public storage deliberately
// serves every file as `text/plain` with a `sandbox` CSP to prevent XSS
// via uploaded HTML/SVG files — even when the stored mimetype metadata
// says `text/html`. Iframes load the raw Supabase URL as plain text
// (user sees HTML source, not rendered page). Workaround: fetch the
// object via the service-role client and re-serve it with the correct
// Content-Type. Vercel edge caching (`s-maxage=60`) restores the
// "served from CDN" perf profile we expected from Supabase.

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await params
  // Path-traversal guard: the brandId goes directly into the Storage
  // object path, so it must be a UUID and nothing else.
  if (!UUID_RE.test(brandId)) {
    return new NextResponse('Invalid brand id', { status: 400 })
  }

  const { data, error } = await admin.storage
    .from('landing-previews')
    .download(`${brandId}.html`)

  if (error || !data) {
    return new NextResponse('Preview not found', { status: 404 })
  }

  const html = await data.text()

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Public caching: 60s browser + Vercel edge. Regenerating the
      // preview upserts the Supabase object; the next request past 60s
      // picks up the new content. Matches the cacheControl we set on
      // the Storage object itself.
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  })
}
