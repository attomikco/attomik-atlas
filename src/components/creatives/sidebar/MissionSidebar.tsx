'use client'
import { createClient } from '@/lib/supabase/client'
import type { BrandImage } from '@/types'

interface MissionSidebarProps {
  subtitle: string
  setSubtitle: (v: string) => void
  images: BrandImage[]
  selectedProductImageId: string | null
  setSelectedProductImageId: (id: string | null) => void
  inputCls: string
}

export default function MissionSidebar({ subtitle, setSubtitle, images, selectedProductImageId, setSelectedProductImageId, inputCls }: MissionSidebarProps) {
  const supabase = createClient()

  return (
    <div className="bg-paper border border-border rounded-card p-4 space-y-2.5">
      <label className="label block">Mission</label>
      <input className={inputCls} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Subtitle / mission statement" />
      {images.length > 0 && (
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wide font-semibold block mb-1">Product image</label>
          <div className="grid grid-cols-4 gap-1">
            {images.map(img => (
              <button key={img.id} onClick={() => setSelectedProductImageId(img.id === selectedProductImageId ? null : img.id)}
                className="aspect-square rounded-[3px] overflow-hidden border-2 transition-all"
                style={{ borderColor: selectedProductImageId === img.id ? '#00ff97' : '#e0e0e0' }}>
                <img src={supabase.storage.from('brand-images').getPublicUrl(img.storage_path).data.publicUrl}
                  alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
