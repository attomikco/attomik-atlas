'use client'
import { Download, Bookmark } from 'lucide-react'
import { TEMPLATES } from '../templates/registry'
import type { Variation, Draft } from '../types'
import type { BrandImage } from '@/types'

interface VariationStripProps {
  variations: Variation[]
  activeVariation: number | null
  loadVariation: (i: number) => void
  saveVariationAsDraft: (i: number) => void
  savedDrafts: Draft[]
  size: { w: number; h: number }
  images: BrandImage[]
  getPublicUrl: (storagePath: string) => string
  thumbProps: (v: Variation, imgUrl: string | null) => Record<string, any>
  exportAllVariations: () => void
  exportingAll: boolean
  sizeId: string
}

export default function VariationStrip({
  variations, activeVariation, loadVariation, saveVariationAsDraft, savedDrafts,
  size, images, getPublicUrl, thumbProps, exportAllVariations, exportingAll, sizeId,
}: VariationStripProps) {
  if (variations.length === 0) return null

  return (
    <div className="bg-paper border border-border rounded-card p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="label">Generated ({variations.length})</div>
        <button onClick={exportAllVariations} disabled={exportingAll}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-ink transition-colors disabled:opacity-40">
          <Download size={11} /> Download all ({size.w}&times;{size.h})
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {variations.map((v, i) => {
          const vImg = images.find(img => img.id === v.imageId)
          const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
          const VTemplate = TEMPLATES.find(t => t.id === v.templateId)!.component
          const isSaved = savedDrafts.some(d => d.headline === v.headline && d.imageId === v.imageId)
          const thumbW = 100
          const thumbScale = thumbW / size.w
          const thumbH = Math.round(size.h * thumbScale)
          return (
            <div key={i} className="relative group">
              <button onClick={() => loadVariation(i)}
                className="rounded-[3px] overflow-hidden transition-all hover:opacity-90"
                style={{ width: thumbW, height: thumbH, border: activeVariation === i ? '2px solid #00ff97' : '1px solid #e0e0e0', display: 'block' }}>
                <div style={{ width: size.w, height: size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}>
                  <VTemplate {...thumbProps(v, vImgUrl) as any} />
                </div>
              </button>
              <button onClick={() => saveVariationAsDraft(i)}
                className={`absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full transition-all ${isSaved ? '' : 'opacity-0 group-hover:opacity-100'}`}
                style={{ background: isSaved ? '#00ff97' : 'rgba(0,0,0,0.6)', color: isSaved ? '#000' : '#fff' }}>
                <Bookmark size={8} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
