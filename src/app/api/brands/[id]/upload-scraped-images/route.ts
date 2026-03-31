import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const imageRows: { brand_id: string; file_name: string; storage_path: string; tag: string; mime_type: string }[] = []

  async function proxyAndUpload(
    url: string,
    path: string,
    bucket: string = 'brand-images'
  ) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'image/*',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const blob = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'image/jpeg'

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType, upsert: true })

      if (error) return null

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return { publicUrl: data.publicUrl, contentType }
    } catch {
      return null
    }
  }

  const tasks: Promise<void>[] = []

  // Logo
  if (logoUrl) {
    tasks.push((async () => {
      const ext = logoUrl.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'png'
      const result = await proxyAndUpload(
        logoUrl,
        `${brandId}/logo_dark.${ext}`,
        'brand-assets'
      )
      if (result) {
        await supabase.from('brands')
          .update({ logo_url: result.publicUrl })
          .eq('id', brandId)
      } else {
        await supabase.from('brands')
          .update({ logo_url: logoUrl })
          .eq('id', brandId)
      }
    })())
  }

  // Product images
  ;(productImageUrls || []).forEach((url: string, idx: number) => {
    tasks.push((async () => {
      const ext = url.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'jpg'
      const path = `${brandId}/product_${idx}_${Date.now()}.${ext}`
      const result = await proxyAndUpload(url, path)
      if (result) {
        imageRows.push({
          brand_id: brandId,
          file_name: `product_${idx}.${ext}`,
          storage_path: path,
          tag: 'product',
          mime_type: result.contentType,
        })
      }
    })())
  })

  // Scraped images
  ;(scrapedImages || []).slice(0, 20).forEach(
    (img: { url: string; tag: string }, idx: number) => {
      tasks.push((async () => {
        const ext = img.url.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'jpg'
        const path = `${brandId}/scraped_${idx}_${Date.now()}.${ext}`
        const result = await proxyAndUpload(img.url, path)
        if (result) {
          imageRows.push({
            brand_id: brandId,
            file_name: `scraped_${idx}.${ext}`,
            storage_path: path,
            tag: img.tag,
            mime_type: result.contentType,
          })
        }
      })())
    }
  )

  // Run in batches of 10
  const BATCH_SIZE = 10
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    await Promise.allSettled(tasks.slice(i, i + BATCH_SIZE))
  }

  // Batch insert
  if (imageRows.length > 0) {
    await supabase.from('brand_images').insert(imageRows)
  }

  return NextResponse.json({ success: true, uploaded: imageRows.length })
}
