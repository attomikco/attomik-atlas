'use client'
import { Check, ImageIcon } from 'lucide-react'
import type { BrandImage } from '@/types'

interface ImagePickerProps {
  images: BrandImage[]
  selectedImageId: string | null
  setSelectedImageId: (id: string | null) => void
  brandColor: string
  getPublicUrl: (storagePath: string) => string
}

export default function ImagePicker({ images, selectedImageId, setSelectedImageId, brandColor, getPublicUrl }: ImagePickerProps) {
  return (
    <div className="bg-paper border border-border rounded-card p-4">
      <label className="label block mb-2">Image</label>
      {images.length > 0 ? (
        <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto">
          {images.map(img => (
            <button key={img.id}
              onClick={() => setSelectedImageId(img.id === selectedImageId ? null : img.id)}
              className="relative aspect-square rounded-[4px] overflow-hidden border-2 transition-all"
              style={{ borderColor: img.id === selectedImageId ? brandColor : 'transparent' }}>
              <img src={getPublicUrl(img.storage_path)} alt={img.file_name} className="w-full h-full object-cover" loading="lazy" />
              {img.id === selectedImageId && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted border border-dashed border-border rounded-btn px-3 py-4 justify-center">
          <ImageIcon size={13} /> No images for this brand
        </div>
      )}
    </div>
  )
}
