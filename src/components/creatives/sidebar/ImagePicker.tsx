'use client'
import { useState } from 'react'
import { Check, ImageIcon, ChevronDown } from 'lucide-react'
import type { BrandImage } from '@/types'

interface ImagePickerProps {
  images: BrandImage[]
  selectedImageId: string | null
  setSelectedImageId: (id: string | null) => void
  brandColor: string
  getPublicUrl: (storagePath: string) => string
}

function ImageGroup({ label, images, selectedImageId, setSelectedImageId, brandColor, getPublicUrl }: {
  label: string
  images: BrandImage[]
  selectedImageId: string | null
  setSelectedImageId: (id: string | null) => void
  brandColor: string
  getPublicUrl: (storagePath: string) => string
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? images : images.slice(0, 8)

  if (images.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>
        {label} ({images.length})
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {visible.map(img => (
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
      {images.length > 8 && (
        <button onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors font-semibold mt-2 mx-auto">
          <ChevronDown size={12} style={{ transform: showAll ? 'rotate(180deg)' : undefined }} />
          {showAll ? 'Show less' : `Show all ${images.length}`}
        </button>
      )}
    </div>
  )
}

export default function ImagePicker({ images, selectedImageId, setSelectedImageId, brandColor, getPublicUrl }: ImagePickerProps) {
  const productImages = images.filter(i => i.tag === 'product')
  const lifestyleImages = images.filter(i => i.tag === 'lifestyle' || i.tag === 'background')
  // Exclude press_logo (publication logos like Forbes/BEVNET) and logo from
  // the "Other" rail — they'd otherwise appear as selectable creative
  // backgrounds. press/generated are excluded for the same reason.
  const otherImages = images.filter(i =>
    i.tag !== 'product' && i.tag !== 'lifestyle' && i.tag !== 'background'
    && i.tag !== 'press_logo' && i.tag !== 'press' && i.tag !== 'logo' && i.tag !== 'generated'
  )

  return (
    <div className="bg-paper border border-border rounded-card p-4">
      <label className="label block mb-2">Image ({images.length})</label>
      {images.length > 0 ? (
        <>
          <ImageGroup label="Product" images={productImages} selectedImageId={selectedImageId} setSelectedImageId={setSelectedImageId} brandColor={brandColor} getPublicUrl={getPublicUrl} />
          <ImageGroup label="Lifestyle" images={lifestyleImages} selectedImageId={selectedImageId} setSelectedImageId={setSelectedImageId} brandColor={brandColor} getPublicUrl={getPublicUrl} />
          {otherImages.length > 0 && (
            <ImageGroup label="Other" images={otherImages} selectedImageId={selectedImageId} setSelectedImageId={setSelectedImageId} brandColor={brandColor} getPublicUrl={getPublicUrl} />
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted border border-dashed border-border rounded-btn px-3 py-4 justify-center">
          <ImageIcon size={13} /> No images for this brand
        </div>
      )}
    </div>
  )
}
