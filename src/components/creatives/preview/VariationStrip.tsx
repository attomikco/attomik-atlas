'use client'
import { Bookmark } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const gridRef = useRef<HTMLDivElement | null>(null)
  const [thumbW, setThumbW] = useState(100)

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const GAP = 8
    const COLS = 5
    const measure = () => {
      const w = el.clientWidth
      setThumbW(Math.floor((w - GAP * (COLS - 1)) / COLS))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (variations.length === 0) return null

  return (
    <div style={{ background: '#000', borderRadius: 16, padding: '16px 20px', marginTop: 16 }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>
            {variations.length} Variations Ready
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Click to load · bookmark to save</div>
        </div>
        <button onClick={exportAllVariations} disabled={exportingAll} style={{
          background: exportingAll ? '#333' : '#00ff97', color: '#000',
          fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 12,
          padding: '8px 18px', borderRadius: 999, border: 'none',
          cursor: exportingAll ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {exportingAll ? (
            <><div style={{ width: 10, height: 10, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Exporting...</>
          ) : `↓ Download all ${variations.length}`}
        </button>
      </div>
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {variations.map((v, i) => {
          const vImg = images.find(img => img.id === v.imageId)
          const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
          const VTemplate = TEMPLATES.find(t => t.id === v.templateId)!.component
          const isSaved = savedDrafts.some(d => d.headline === v.headline && d.imageId === v.imageId)
          const thumbScale = thumbW / size.w
          const thumbH = Math.round(size.h * thumbScale)
          return (
            <div key={i} className="relative group">
              <button onClick={() => loadVariation(i)}
                className="rounded-[4px] overflow-hidden transition-all hover:opacity-90"
                style={{ width: thumbW, height: thumbH, border: activeVariation === i ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)', display: 'block' }}>
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
