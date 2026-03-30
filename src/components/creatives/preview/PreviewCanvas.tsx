'use client'
import { useRef } from 'react'
import { Bookmark, Sparkles, Download, Loader2 } from 'lucide-react'
import { ff } from '../templates/types'

interface PreviewCanvasProps {
  templateLabel: string
  size: { w: number; h: number }
  previewW: number
  previewH: number
  scale: number
  TemplateComponent: React.ComponentType<any>
  templateProps: Record<string, any>
  bodyFont: string
  bodyText: string
  headline: string
  ctaText: string
  fbPrimaryText: string
  fbHeadline: string
  fbDescription: string
  saveCurrentAsDraft: () => void
  // Batch controls
  batchGenerating: boolean
  batchCount: number
  setBatchCount: (n: number) => void
  generateBatch: () => void
  stopBatch: () => void
  variationsCount: number
  imagesCount: number
  setExportToast: (v: string | null) => void
  // Export
  exportPng: () => void
  exportAllSizes: () => void
  exporting: boolean
  exportingAll: boolean
}

export default function PreviewCanvas({
  templateLabel, size, previewW, previewH, scale,
  TemplateComponent, templateProps, bodyFont, bodyText, headline, ctaText,
  fbPrimaryText, fbHeadline, fbDescription,
  saveCurrentAsDraft,
  batchGenerating, batchCount, setBatchCount, generateBatch, stopBatch, variationsCount, imagesCount,
  setExportToast,
  exportPng, exportAllSizes, exporting, exportingAll,
}: PreviewCanvasProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  return (
    <div className="bg-paper border border-border rounded-card p-4">
      {/* Preview label */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{templateLabel} &middot; {size.w}&times;{size.h}</span>
          <button onClick={saveCurrentAsDraft}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill transition-all hover:opacity-80"
            style={{ background: '#111', color: '#4ade80' }}>
            <Bookmark size={11} /> Save
          </button>
          <button onClick={exportPng} disabled={exporting || exportingAll}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill hover:border-ink transition-all disabled:opacity-40"
            style={{ border: '1px solid #ddd', color: '#333' }}>
            {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            PNG
          </button>
          <button onClick={exportAllSizes} disabled={exporting || exportingAll}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill hover:opacity-80 transition-all disabled:opacity-40"
            style={{ background: '#111', color: '#4ade80' }}>
            {exportingAll ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            {exportingAll ? 'Generating...' : 'All sizes'}
          </button>
        </div>
        {/* Batch generate */}
        <div className="flex items-center gap-1.5">
          {batchGenerating ? (
            <button onClick={stopBatch}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill bg-ink text-paper hover:opacity-80 transition-opacity">
              Stop ({variationsCount}/{batchCount})
            </button>
          ) : (
            <>
              {[3, 5, 10, 15, 20].map(n => (
                <button key={n} onClick={() => setBatchCount(n)}
                  className="text-[11px] font-semibold w-6 h-6 rounded-full border transition-all"
                  style={batchCount === n
                    ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                    : { borderColor: '#e0e0e0', color: '#999' }}>
                  {n}
                </button>
              ))}
              <button onClick={generateBatch} disabled={imagesCount === 0}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill transition-opacity hover:opacity-80 disabled:opacity-40 ml-0.5"
                style={{ background: '#00ff97', color: '#000' }}>
                <Sparkles size={12} /> Batch
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview canvas + FB copy */}
      <div className="flex flex-col sm:flex-row gap-4 items-start" ref={previewRef}>
        <div className="rounded-btn overflow-hidden border border-border shadow-sm flex-shrink-0 mx-auto sm:mx-0" style={{ width: previewW, height: previewH }}>
          <div style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <TemplateComponent {...templateProps} width={size.w} height={size.h} />
          </div>
        </div>
        {/* FB Ad copy preview */}
        <div className="flex-1 min-w-0 text-sm space-y-3 pt-1" style={{ fontFamily: ff(bodyFont) }}>
          {[
            { label: 'Primary Text', value: fbPrimaryText || bodyText || 'Body text goes here' },
            { label: 'Headline', value: fbHeadline || headline || 'Your headline here' },
            { label: 'Description', value: fbDescription || ctaText || 'Shop Now' },
          ].map(({ label, value }) => (
            <div key={label} className={label !== 'Primary Text' ? 'border-t border-border pt-3' : ''}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-semibold">{label}</span>
                <button onClick={() => { navigator.clipboard.writeText(value); setExportToast(`${label} copied`); setTimeout(() => setExportToast(null), 1500) }}
                  className="text-[10px] text-muted hover:text-ink transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-black/5">
                  Copy
                </button>
              </div>
              <p className="text-ink text-[13px] leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
