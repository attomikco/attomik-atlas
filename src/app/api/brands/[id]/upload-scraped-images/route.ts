import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { imageSize } from 'image-size'
import { resizeBufferForUpload, swapExtension } from '@/lib/resize-image-server'

// Tags we're willing to auto-override via background detection. If the scrape
// already classified an image as shopify/logo/press/product, we trust that.
const OVERRIDABLE_TAGS = new Set(['other', 'lifestyle', 'background'])

// Service-role client for storage uploads to buckets with strict RLS policies
// (brand-assets). brand_images table inserts still use the user-scoped client
// so RLS continues to protect DB-level access.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Returns true if the URL or alt text explicitly says "logo" / "wordmark" /
 * "emblem". Case-insensitive substring match. Used as a belt-and-suspenders
 * rescue at the upload stage, in case the scraper's classifier missed it.
 */
function isLogoByUrl(url: string, alt?: string | null): boolean {
  return /logo|wordmark|emblem/i.test(url) || /logo|wordmark|emblem/i.test(alt || '')
}

/**
 * Analyze a proxied image buffer: extract dimensions (image-size) and sample
 * 5 pixels (4 corners + center) for white/transparent background detection (sharp).
 */
async function analyzeBuffer(buffer: Buffer, label: string): Promise<{
  width: number | null
  height: number | null
  hasProductBackground: boolean
}> {
  let width: number | null = null
  let height: number | null = null
  let hasProductBackground = false

  try {
    const dims = imageSize(buffer)
    width = dims.width ?? null
    height = dims.height ?? null
  } catch (e) {
    console.warn(`[upload-scraped] image-size failed for ${label}:`, e instanceof Error ? e.message : e)
  }

  try {
    const { data, info } = await sharp(buffer)
      .resize(100, 100, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const w = info.width
    const samples: [number, number][] = [
      [2, 2],
      [w - 3, 2],
      [2, w - 3],
      [w - 3, w - 3],
      [Math.floor(w / 2), Math.floor(w / 2)],
    ]
    let allProduct = true
    for (const [x, y] of samples) {
      const idx = (y * w + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const a = data[idx + 3]
      const isTransparent = a < 30
      const isNearWhite = r > 240 && g > 240 && b > 240
      if (!isTransparent && !isNearWhite) {
        allProduct = false
        break
      }
    }
    hasProductBackground = allProduct
  } catch (e) {
    console.warn(`[upload-scraped] sharp analyze failed for ${label}:`, e instanceof Error ? e.message : e)
  }

  return { width, height, hasProductBackground }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()

  const {
    logoUrl,
    productImageUrls,
    scrapedImages,
  } = await req.json()

  type ImageRow = {
    brand_id: string
    file_name: string
    storage_path: string
    tag: string
    mime_type: string
    alt_text?: string | null
    width?: number | null
    height?: number | null
    source_url?: string | null
  }
  const imageRows: ImageRow[] = []

  let siteOrigin = ''
  try {
    const firstUrl = scrapedImages?.[0]?.url || productImageUrls?.[0] || logoUrl || ''
    if (firstUrl) siteOrigin = new URL(firstUrl).origin
  } catch {}

  async function proxyAndUpload(
    url: string,
    path: string,
    bucket: string = 'brand-images'
  ): Promise<{
    publicUrl: string
    contentType: string
    buffer: Buffer
    storagePath: string
    width: number | null
    height: number | null
    hasProductBackground: boolean
  } | null> {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': siteOrigin || url,
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        signal: AbortSignal.timeout(12000),
        redirect: 'follow',
      })
      if (!res.ok) {
        console.error(`[upload-scraped] fetch ${res.status} ${res.statusText}  ${url.slice(0, 120)}`)
        return null
      }
      const arrayBuffer = await res.arrayBuffer()
      if (arrayBuffer.byteLength < 100) {
        console.error(`[upload-scraped] image too small (${arrayBuffer.byteLength}B)  ${url.slice(0, 120)}`)
        return null
      }
      const rawBuffer = Buffer.from(arrayBuffer)
      const srcContentType = res.headers.get('content-type') || 'image/jpeg'

      // Wider `Buffer<ArrayBufferLike>` annotation so sharp's return type
      // (ArrayBufferLike) can be reassigned to this slot — Buffer.from on an
      // ArrayBuffer narrows to `Buffer<ArrayBuffer>` otherwise.
      let finalBuffer: Buffer<ArrayBufferLike> = rawBuffer
      let finalContentType = srcContentType
      let finalPath = path
      let width: number | null = null
      let height: number | null = null
      let hasProductBackground = false

      // Only the brand-images bucket gets the analyze + resize treatment.
      // brand-assets (logos, guidelines PDFs, etc.) is small and heterogeneous
      // — we don't want sharp to choke on an SVG logo or recompress a PDF.
      if (bucket === 'brand-images') {
        const analysis = await analyzeBuffer(rawBuffer, url.slice(-40))
        width = analysis.width
        height = analysis.height
        hasProductBackground = analysis.hasProductBackground

        // Preserve PNG alpha only for images that look like cutouts (white /
        // transparent corners + center). Everything else flattens to JPEG q85.
        const sourceIsPng = /image\/png/i.test(srcContentType) || /\.png(\?|$)/i.test(url)
        const keepAlpha = sourceIsPng && hasProductBackground

        try {
          const resized = await resizeBufferForUpload(rawBuffer, keepAlpha)
          finalBuffer = resized.buffer
          finalContentType = resized.mimeType
          width = resized.width
          height = resized.height
          finalPath = swapExtension(path, resized.ext)
        } catch (e) {
          // Fall back to the original bytes — upload must not break on an
          // unusual format (AVIF, weird SVG, truncated stream, etc).
          console.warn(`[upload-scraped] resize failed, uploading original  ${url.slice(0, 120)}:`, e instanceof Error ? e.message : e)
        }
      }

      // brand-assets bucket has stricter RLS that rejects user-scoped uploads;
      // use the service-role client for it. brand-images bucket works fine with
      // the user-scoped client.
      const storageClient = bucket === 'brand-assets' ? supabaseAdmin : supabase

      const { error } = await storageClient.storage
        .from(bucket)
        .upload(finalPath, finalBuffer, { contentType: finalContentType, upsert: true })

      if (error) {
        console.error(`[upload-scraped] storage upload failed: ${error.message}  ${finalPath}`)
        return null
      }

      const { data } = storageClient.storage.from(bucket).getPublicUrl(finalPath)
      return {
        publicUrl: data.publicUrl,
        contentType: finalContentType,
        buffer: finalBuffer,
        storagePath: finalPath,
        width,
        height,
        hasProductBackground,
      }
    } catch (err) {
      console.error(`[upload-scraped] exception for ${url.slice(0, 120)}:`, err instanceof Error ? err.message : err)
      return null
    }
  }

  // Track URLs we've already queued to prevent the same image being inserted
  // twice (e.g. the logo also appearing as a scraped img, or a product image
  // appearing in both productImageUrls and scrapedImages).
  const seenUrls = new Set<string>()
  const tasks: Promise<void>[] = []

  // ── Logo — store in brand-assets, update brands.logo_url ─────────────
  if (logoUrl) {
    seenUrls.add(logoUrl)
    tasks.push((async () => {
      const ext = logoUrl.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'png'
      const result = await proxyAndUpload(
        logoUrl,
        `${brandId}/logo_dark.${ext}`,
        'brand-assets'
      )
      if (result) {
        await supabase.from('brands').update({ logo_url: result.publicUrl }).eq('id', brandId)
        console.log(`[upload-scraped] LOGO proxied → brand.logo_url updated  ${logoUrl.slice(0, 100)}`)
      } else {
        await supabase.from('brands').update({ logo_url: logoUrl }).eq('id', brandId)
        console.log(`[upload-scraped] LOGO proxy failed, using raw URL  ${logoUrl.slice(0, 100)}`)
      }
    })())
  }

  // ── Product images from detected products (typically Shopify product API) ──
  // Each entry in productImageUrls is the PRIMARY (first) image for one
  // product — the wizard/re-scrape builds it from `products.map(p => p.image)`
  // so there's exactly one URL per product. All entries are first-images and
  // receive tag='shopify' here. Additional variant images (2nd, 3rd shots
  // per product) come through the scrapedImages array instead, where the
  // scraper has already tagged them as 'lifestyle' via the new
  // 'shopify-product-variant' source handled in rule 11.
  ;(productImageUrls || []).forEach((url: string, idx: number) => {
    if (!url || seenUrls.has(url)) return
    seenUrls.add(url)
    tasks.push((async () => {
      const ext = url.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'jpg'
      // LOGO RESCUE — defensive guard for the edge case where a product URL
      // actually points to a logo (e.g. Shopify admin uploaded the logo as a
      // "Gift Card" product image).
      if (isLogoByUrl(url)) {
        const path = `${brandId}/logo_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
        const result = await proxyAndUpload(url, path, 'brand-assets')
        console.log(`[upload-scraped] PRODUCT_URL  ${url.slice(0, 100)}  → logo (logo-url rescue)  ${result ? 'stored' : 'failed'}`)
        return
      }
      const isShopify = /cdn\.shopify\.com|myshopify|\/cdn\/shop\/files\//i.test(url)
      const prefix = isShopify ? 'shopify' : 'product'
      const path = `${brandId}/${prefix}_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
      const result = await proxyAndUpload(url, path)
      if (!result) {
        console.log(`[upload-scraped] PRODUCT_URL failed  ${url.slice(0, 100)}`)
        return
      }
      const finalTag = isShopify ? 'shopify' : 'product'
      // Derive file_name from the (possibly rewritten) storage_path so the
      // DB row stays in sync if resize swapped PNG → JPEG.
      const fileName = result.storagePath.split('/').pop() || `${prefix}_${idx}.${ext}`
      console.log(`[upload-scraped] PRODUCT_URL  ${url.slice(0, 100)}  → ${finalTag}  (${result.width}×${result.height})`)
      imageRows.push({
        brand_id: brandId,
        file_name: fileName,
        storage_path: result.storagePath,
        tag: finalTag,
        mime_type: result.contentType,
        width: result.width,
        height: result.height,
        source_url: url,
      })
    })())
  })

  // ── Scraped images — preserve tag and alt_text from detection ────────
  ;(scrapedImages || []).slice(0, 25).forEach(
    (img: { url: string; tag: string; alt?: string | null }, idx: number) => {
      if (!img.url || seenUrls.has(img.url)) return
      seenUrls.add(img.url)
      tasks.push((async () => {
        const ext = img.url.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'jpg'

        // LOGO RESCUE — if the URL (or alt) literally says "logo", override the
        // scraper's tag at the upload stage. Catches cases where the classifier
        // missed it (URL encoding, alt differences, srcset variants, etc).
        const rescuedToLogo = img.tag !== 'logo' && isLogoByUrl(img.url, img.alt)
        const earlyTag = rescuedToLogo ? 'logo' : img.tag

        const prefix = earlyTag === 'logo' ? 'logo'
          : earlyTag === 'shopify' ? 'shopify'
          : earlyTag === 'product' ? 'product'
          : earlyTag === 'lifestyle' ? 'lifestyle'
          : earlyTag === 'press' ? 'press'
          : 'scraped'
        const path = `${brandId}/${prefix}_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
        const isLogo = earlyTag === 'logo'
        const bucket = isLogo ? 'brand-assets' : 'brand-images'
        const result = await proxyAndUpload(img.url, path, bucket)
        if (!result) {
          console.log(`[upload-scraped] SCRAPED(${earlyTag}) failed  ${img.url.slice(0, 100)}`)
          return
        }
        // Override only ambiguous tags when we see a white/transparent background.
        // Trust shopify/product/logo/press as-is.
        let finalTag = earlyTag
        let overrideReason = ''
        if (rescuedToLogo) {
          overrideReason = ' (logo-url rescue)'
        }
        if (OVERRIDABLE_TAGS.has(finalTag) && result.hasProductBackground) {
          finalTag = 'product'
          overrideReason = overrideReason ? `${overrideReason} + white-bg` : ' (white-bg override)'
        }
        console.log(`[upload-scraped] SCRAPED  ${img.url.slice(0, 100)}  → ${img.tag} → ${finalTag}${overrideReason}  (${result.width}×${result.height})`)
        // Logo-tagged scraped images are stored in brand-assets (not brand_images)
        // since brand_images is reserved for creative content. Skip the DB insert.
        if (isLogo) return
        const fileName = result.storagePath.split('/').pop() || `${prefix}_${idx}.${ext}`
        imageRows.push({
          brand_id: brandId,
          file_name: fileName,
          storage_path: result.storagePath,
          tag: finalTag,
          mime_type: result.contentType,
          alt_text: img.alt || null,
          width: result.width,
          height: result.height,
          source_url: img.url,
        })
      })())
    }
  )

  // Run in batches of 5 (fewer concurrent fetches = less likely to get rate-limited)
  const BATCH_SIZE = 5
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    await Promise.allSettled(tasks.slice(i, i + BATCH_SIZE))
  }

  // Deduplicate by source_url one more time (defensive — the tasks push async so
  // a duplicate could theoretically race past seenUrls in edge cases).
  const bySourceUrl = new Map<string, ImageRow>()
  const dedupedRows: ImageRow[] = []
  for (const row of imageRows) {
    const key = row.source_url || row.storage_path
    if (bySourceUrl.has(key)) continue
    bySourceUrl.set(key, row)
    dedupedRows.push(row)
  }

  // DB CHECK constraint (migration 20260411_fix_brand_images_tags.sql):
  // product | lifestyle | background | ugc | seasonal | other | logo | press | shopify
  const ALLOWED_TAGS = new Set([
    'product', 'lifestyle', 'background', 'ugc', 'seasonal', 'other', 'logo', 'press', 'shopify',
  ])
  for (const row of dedupedRows) {
    if (!ALLOWED_TAGS.has(row.tag)) {
      console.warn(`[upload-scraped] unknown tag "${row.tag}" → "other"  ${row.source_url?.slice(0, 100)}`)
      row.tag = 'other'
    }
  }

  // ── Batch insert + verify actual success per row ──
  let insertedCount = 0
  if (dedupedRows.length > 0) {
    const { data: batchInserted, error: batchErr } = await supabase
      .from('brand_images')
      .insert(dedupedRows)
      .select('id')

    if (batchErr) {
      console.error(`[upload-scraped] batch insert failed: ${batchErr.message}. Falling back to row-by-row.`)
      for (const row of dedupedRows) {
        const { error: rowErr } = await supabase.from('brand_images').insert(row)
        if (rowErr) {
          console.error(`[upload-scraped] row insert failed: ${rowErr.message}  tag=${row.tag} source_url=${row.source_url?.slice(0, 100)}`)
        } else {
          insertedCount++
        }
      }
    } else {
      insertedCount = batchInserted?.length ?? dedupedRows.length
    }
  }

  console.log(`[upload-scraped] Summary: tasks=${tasks.length} rows=${dedupedRows.length} inserted=${insertedCount}`)
  return NextResponse.json({
    success: true,
    inserted: insertedCount,
    attempted: tasks.length,
    // Legacy field — still returned so old callers don't break
    uploaded: insertedCount,
  })
}
