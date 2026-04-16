import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resizeBufferForUpload } from '@/lib/resize-image-server'

// One-shot admin route for shrinking oversized brand_images uploaded before
// the client + scrape resize pipelines were added. Processes a single brand
// (brandId=<uuid>) or every brand (brandId=all). For each image: HEADs the
// public URL, skips if already under 200 KB, otherwise downloads, resizes
// via sharp (1600px longest edge, JPEG q85 unless the row is a product-ish
// PNG that needs to keep alpha), overwrites the same storage_path with
// upsert, and updates the DB row's mime_type/size_bytes/width/height.

const SUPER_ADMIN_EMAIL = 'pablo@attomik.co'
const SKIP_UNDER_BYTES = 200_000

// Vercel function timeout — maxed out so a single brand with ~100 images can
// finish in one call. Split the brand set manually if a backfill still times
// out (pass brandId=<uuid> per brand instead of brandId=all).
export const maxDuration = 300

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface BrandImageRow {
  id: string
  brand_id: string
  storage_path: string
  mime_type: string | null
  tag: string | null
}

interface BackfillError {
  id: string
  storage_path: string
  reason: string
}

export async function POST(req: NextRequest) {
  // Super-admin gate. Matches the hardcoded email check in TopNav so the
  // /store surface and this backfill route share one trust boundary until
  // we move to role-based admin access.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (user.email !== SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const brandId = url.searchParams.get('brandId')
  if (!brandId) {
    return NextResponse.json(
      { error: 'brandId query param required (use "all" to process every brand)' },
      { status: 400 },
    )
  }

  // Use the service-role client so a super-admin backfill isn't gated by
  // brand_members RLS — the admin may not be a member of every brand.
  let query = supabaseAdmin
    .from('brand_images')
    .select('id, brand_id, storage_path, mime_type, tag')
    .order('brand_id', { ascending: true })

  if (brandId !== 'all') {
    query = query.eq('brand_id', brandId)
  }

  const { data: rows, error: fetchErr } = await query
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const total = rows?.length ?? 0
  const errors: BackfillError[] = []
  let processed = 0
  let skipped = 0

  for (const row of (rows ?? []) as BrandImageRow[]) {
    try {
      // Cheap HEAD check — skip anything already small enough. Works against
      // the public CDN URL so we don't pay a download for no-ops.
      const { data: urlData } = supabaseAdmin.storage
        .from('brand-images')
        .getPublicUrl(row.storage_path)
      const publicUrl = urlData.publicUrl

      let currentSize: number | null = null
      try {
        const head = await fetch(publicUrl, { method: 'HEAD' })
        if (head.ok) {
          const cl = head.headers.get('content-length')
          if (cl) currentSize = parseInt(cl, 10)
        }
      } catch { /* fall through to download */ }

      if (currentSize != null && currentSize < SKIP_UNDER_BYTES) {
        skipped++
        continue
      }

      // Download via the storage SDK so we work on private objects too, not
      // just ones reachable via the public URL.
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from('brand-images')
        .download(row.storage_path)

      if (dlErr || !blob) {
        errors.push({
          id: row.id,
          storage_path: row.storage_path,
          reason: `download: ${dlErr?.message || 'empty body'}`,
        })
        continue
      }

      const arrayBuffer = await blob.arrayBuffer()
      // Second chance to skip — HEAD may not have returned content-length.
      if (arrayBuffer.byteLength < SKIP_UNDER_BYTES) {
        skipped++
        continue
      }

      // Keep PNG alpha only for product-ish cutouts whose DB row still claims
      // to be a PNG. Every other row flattens to JPEG q85 — the same rule the
      // client-side uploader and the scrape pipeline use.
      const isPng = (row.mime_type || '').toLowerCase().includes('png')
      const productLike = row.tag === 'product' || row.tag === 'shopify' || row.tag === 'logo'
      const keepAlpha = isPng && productLike

      const resized = await resizeBufferForUpload(Buffer.from(arrayBuffer), keepAlpha)

      // Overwrite in place. The URL's trailing extension may now disagree
      // with the stored content-type (e.g. a .png path now serving JPEG
      // bytes) — that's fine: Supabase Storage serves the content-type we
      // pass on upload, and every consumer in this codebase treats the URL
      // as an opaque blob rather than parsing the extension.
      const { error: upErr } = await supabaseAdmin.storage
        .from('brand-images')
        .upload(row.storage_path, resized.buffer, {
          contentType: resized.mimeType,
          upsert: true,
        })

      if (upErr) {
        errors.push({
          id: row.id,
          storage_path: row.storage_path,
          reason: `upload: ${upErr.message}`,
        })
        continue
      }

      const { error: dbErr } = await supabaseAdmin
        .from('brand_images')
        .update({
          mime_type: resized.mimeType,
          size_bytes: resized.buffer.length,
          width: resized.width,
          height: resized.height,
        })
        .eq('id', row.id)

      if (dbErr) {
        errors.push({
          id: row.id,
          storage_path: row.storage_path,
          reason: `db update: ${dbErr.message}`,
        })
        continue
      }

      processed++
    } catch (err) {
      errors.push({
        id: row.id,
        storage_path: row.storage_path,
        reason: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  return NextResponse.json({ total, processed, skipped, errors })
}
