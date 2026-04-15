'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage, ImageTag } from '@/types'
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TAGS: ImageTag[] = ['product', 'shopify', 'lifestyle', 'background', 'ugc', 'seasonal', 'logo', 'press', 'other']

function getOrientation(w: number | null, h: number | null): string | null {
  if (!w || !h) return null
  const ratio = w / h
  if (ratio > 1.1) return 'landscape'
  if (ratio < 0.9) return 'portrait'
  return 'square'
}

/**
 * Classify an image by sampling 5 points (4 corners + center) on an offscreen canvas.
 * Returns 'product' if every sampled pixel is near-white (R,G,B > 240) or transparent
 * (alpha < 30). Otherwise returns 'lifestyle'. Silently returns 'lifestyle' on any
 * read failure (CORS, decode error, etc.) — never blocks an upload.
 */
async function classifyByBackground(file: File): Promise<'product' | 'lifestyle'> {
  try {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    // Small canvas is enough — we only sample 5 pixels
    const size = 100
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return 'lifestyle'
    ctx.drawImage(bitmap, 0, 0, size, size)
    bitmap.close()
    const samples: [number, number][] = [
      [2, 2], [size - 3, 2], [2, size - 3], [size - 3, size - 3], // 4 corners
      [Math.floor(size / 2), Math.floor(size / 2)],                // center
    ]
    for (const [x, y] of samples) {
      const px = ctx.getImageData(x, y, 1, 1).data
      const r = px[0], g = px[1], b = px[2], a = px[3]
      const isTransparent = a < 30
      const isNearWhite = r > 240 && g > 240 && b > 240
      if (!isTransparent && !isNearWhite) return 'lifestyle'
    }
    return 'product'
  } catch {
    return 'lifestyle'
  }
}

function buildFileName(slug: string, orientation: string | null, seq: number, ext: string) {
  const orient = orientation || 'img'
  const num = String(seq).padStart(3, '0')
  return `${slug}_${orient}_${num}.${ext}`
}

function nextSeqForOrientation(images: BrandImage[], orientation: string | null) {
  const orient = orientation || 'img'
  const pattern = new RegExp(`_${orient}_(\\d{3})\\.`)
  let max = 0
  for (const img of images) {
    const m = img.file_name.match(pattern)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max + 1
}

interface Props {
  brandId: string
  brandSlug: string
  images: BrandImage[]
}

export default function BrandImageLibrary({ brandId, brandSlug, images }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    // Track uploaded images so sequence numbers increment within the same batch
    const uploaded: BrandImage[] = [...images]

    for (const file of Array.from(files)) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()

      // Detect dimensions first so we can derive orientation for the name
      let width: number | null = null
      let height: number | null = null
      try {
        const dims = await getImageDimensions(file)
        width = dims.width
        height = dims.height
      } catch { /* dimensions are optional */ }

      const orientation = getOrientation(width, height)
      const seq = nextSeqForOrientation(uploaded, orientation)
      const fileName = buildFileName(brandSlug, orientation, seq, ext)
      const storagePath = `${brandId}/${fileName}`

      // Auto-classify: white/transparent bg → 'product', otherwise 'lifestyle'
      const autoTag: ImageTag = await classifyByBackground(file)

      const { error: uploadError } = await supabase.storage
        .from('brand-images')
        .upload(storagePath, file)

      if (uploadError) {
        setError(uploadError.message)
        continue
      }

      const newImage: BrandImage = {
        id: '', created_at: '', brand_id: brandId,
        file_name: fileName, storage_path: storagePath,
        mime_type: file.type, size_bytes: file.size,
        tag: autoTag, alt_text: null, width, height,
        source_url: null, source: null,
      }
      uploaded.push(newImage)

      await supabase.from('brand_images').insert({
        brand_id: brandId,
        file_name: fileName,
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
        tag: autoTag,
        width,
        height,
      })
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    router.refresh()
  }

  async function handleDelete(image: BrandImage) {
    setDeletingId(image.id)
    await supabase.storage.from('brand-images').remove([image.storage_path])
    await supabase.from('brand_images').delete().eq('id', image.id)
    setDeletingId(null)
    router.refresh()
  }

  async function handleTagChange(image: BrandImage, tag: ImageTag) {
    await supabase.from('brand_images').update({ tag }).eq('id', image.id)
    router.refresh()
  }

  function getPublicUrl(storagePath: string) {
    return supabase.storage.from('brand-images').getPublicUrl(storagePath).data.publicUrl
  }

  return (
    <div className="card bg-paper border border-border rounded-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="label">Image library</div>
        <span className="text-xs text-muted">{images.length} image{images.length !== 1 ? 's' : ''}</span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {images.map(image => (
            <div key={image.id} className="group relative bg-cream rounded-btn overflow-hidden border border-border">
              <div className="aspect-square relative">
                <img
                  src={getPublicUrl(image.storage_path)}
                  alt={image.alt_text || image.file_name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDelete(image)}
                  disabled={deletingId === image.id}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-btn bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger disabled:opacity-50"
                >
                  {deletingId === image.id
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Trash2 size={11} />}
                </button>
              </div>
              <div className="px-2.5 py-2">
                <div className="text-xs truncate mb-1" title={image.file_name}>{image.file_name}</div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {getOrientation(image.width, image.height) && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cream text-muted">
                      {getOrientation(image.width, image.height)}
                    </span>
                  )}
                  {image.width && image.height && (
                    <span className="text-[10px] text-muted">{image.width}&times;{image.height}</span>
                  )}
                </div>
                <select
                  value={image.tag}
                  onChange={e => handleTagChange(image, e.target.value as ImageTag)}
                  className="w-full text-[11px] border border-border rounded-btn px-1.5 py-1 bg-paper focus:outline-none focus:border-accent transition-colors cursor-pointer"
                >
                  {TAGS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 mb-4 text-muted">
          <ImageIcon size={24} className="mb-2 opacity-40" />
          <p className="text-sm">No images yet</p>
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-btn py-3 text-sm text-muted hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {uploading ? 'Uploading...' : 'Upload images'}
      </button>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  )
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src) }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}
