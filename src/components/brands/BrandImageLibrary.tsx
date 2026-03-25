'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage, ImageTag } from '@/types'
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TAGS: ImageTag[] = ['product', 'lifestyle', 'ugc', 'background', 'seasonal', 'other']

interface Props {
  brandId: string
  images: BrandImage[]
}

export default function BrandImageLibrary({ brandId, images }: Props) {
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

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${brandId}/images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('brand-images')
        .upload(path, file)

      if (uploadError) {
        setError(uploadError.message)
        continue
      }

      // Read image dimensions
      let width: number | null = null
      let height: number | null = null
      try {
        const dims = await getImageDimensions(file)
        width = dims.width
        height = dims.height
      } catch { /* dimensions are optional */ }

      await supabase.from('brand_images').insert({
        brand_id: brandId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        tag: 'other' as ImageTag,
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
    <div className="bg-paper border border-border rounded-card p-6">
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
                <div className="text-xs truncate mb-1.5" title={image.file_name}>{image.file_name}</div>
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
