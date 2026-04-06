'use client'
import { Download, X } from 'lucide-react'
import { TEMPLATES, SIZES } from '../templates/registry'
import type { Draft, Variation } from '../types'
import type { BrandImage } from '@/types'

interface DraftStripProps {
  savedDrafts: Draft[]
  activeDraft: number | null
  loadDraft: (i: number) => void
  removeDraft: (i: number) => void
  size: { w: number; h: number }
  images: BrandImage[]
  getPublicUrl: (storagePath: string) => string
  thumbProps: (v: Variation, imgUrl: string | null, w?: number, h?: number) => Record<string, any>
  exportAllDrafts: () => void
  exportingAll: boolean
}

export default function DraftStrip({
  savedDrafts, activeDraft, loadDraft, removeDraft,
  size, images, getPublicUrl, thumbProps, exportAllDrafts, exportingAll,
}: DraftStripProps) {
  if (savedDrafts.length === 0) return null

  return (
    <div className="bg-paper border border-border rounded-card p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="label">Saved ({savedDrafts.length})</div>
        <button onClick={exportAllDrafts} disabled={exportingAll}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-ink transition-colors disabled:opacity-40">
          <Download size={11} /> Download all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {savedDrafts.map((d, i) => {
          const dImg = d.imageId ? images.find(img => img.id === d.imageId) : null
          const dImgUrl = dImg ? getPublicUrl(dImg.storage_path) : (d as any).imageUrl || null
          const DTemplate = TEMPLATES.find(t => t.id === d.templateId)!.component
          const dSize = SIZES.find(s => s.id === d.sizeId) || size
          const dSizeLabel = SIZES.find(s => s.id === d.sizeId)?.label || d.sizeId
          const fixedH = 120
          const dThumbScale = fixedH / dSize.h
          const dThumbW = Math.round(dSize.w * dThumbScale)
          return (
            <div key={i} className="relative group" style={{ height: fixedH }}>
              <button onClick={() => loadDraft(i)}
                className="rounded-[3px] overflow-hidden transition-all hover:opacity-90"
                style={{ width: dThumbW, height: fixedH, border: activeDraft === i ? '2px solid #4ade80' : '1px solid #e0e0e0', display: 'block' }}>
                <div style={{ width: dSize.w, height: dSize.h, transform: `scale(${dThumbScale})`, transformOrigin: 'top left' }}>
                  <DTemplate {...thumbProps(d, dImgUrl, dSize.w, dSize.h) as any} />
                </div>
              </button>
              <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold bg-black/60 text-white px-1 rounded">{dSizeLabel}</span>
              <button onClick={() => removeDraft(i)}
                className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger">
                <X size={8} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
