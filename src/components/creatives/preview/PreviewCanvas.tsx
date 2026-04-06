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
  updateCurrentDraft?: () => void
  clearActiveDraft?: () => void
  isEditingDraft?: boolean
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
  afterBatchSlot?: React.ReactNode
}

export default function PreviewCanvas({
  templateLabel, size, previewW, previewH, scale,
  TemplateComponent, templateProps, bodyFont, bodyText, headline, ctaText,
  fbPrimaryText, fbHeadline, fbDescription,
  saveCurrentAsDraft, updateCurrentDraft, clearActiveDraft, isEditingDraft,
  batchGenerating, batchCount, setBatchCount, generateBatch, stopBatch, variationsCount, imagesCount,
  setExportToast,
  exportPng, exportAllSizes, exporting, exportingAll, afterBatchSlot,
}: PreviewCanvasProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  return (
    <div className="bg-paper border border-border rounded-card p-5">
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes batchPulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes activePulse{0%,100%{border-color:rgba(0,255,151,0.2)}50%{border-color:rgba(0,255,151,0.6)}}
      `}</style>

      {/* Batch generate — FIRST */}
      <div style={{ marginBottom: 0 }}>
        {!batchGenerating ? (
          <div style={{ background: '#000', borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 15, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 3 }}>Batch Generate</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>AI creates {batchCount} unique variations — different copy, images & layouts</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[3, 5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setBatchCount(n)} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: batchCount === n ? '2px solid #00ff97' : '1px solid rgba(255,255,255,0.15)',
                    background: batchCount === n ? 'rgba(0,255,151,0.15)' : 'transparent',
                    color: batchCount === n ? '#00ff97' : 'rgba(255,255,255,0.4)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{n}</button>
                ))}
              </div>
              <button onClick={generateBatch} disabled={imagesCount === 0} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: imagesCount === 0 ? '#333' : '#00ff97', color: '#000',
                fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 14,
                padding: '10px 20px', borderRadius: 999, border: 'none',
                cursor: imagesCount === 0 ? 'not-allowed' : 'pointer',
                transition: 'transform 0.15s', whiteSpace: 'nowrap',
              }} onMouseEnter={e => { if (imagesCount > 0) e.currentTarget.style.transform = 'scale(1.03)' }}
                 onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Generate {batchCount}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#000', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,255,151,0.06) 0%, transparent 70%)', animation: 'batchPulse 2s ease-in-out infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, flexShrink: 0, border: '2px solid rgba(0,255,151,0.2)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <div>
                    <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>Creating {batchCount} variations...</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{variationsCount} of {batchCount} complete</div>
                  </div>
                </div>
                <button onClick={stopBatch} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Stop</button>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(variationsCount / batchCount) * 100}%`, background: '#00ff97', borderRadius: 2, transition: 'width 0.5s ease', boxShadow: '0 0 8px rgba(0,255,151,0.6)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Array.from({ length: batchCount }).map((_, i) => {
                  const isDone = i < variationsCount
                  const isActive = i === variationsCount
                  return (
                    <div key={i} style={{
                      width: 52, height: 52, borderRadius: 8,
                      border: isDone ? '2px solid rgba(0,255,151,0.4)' : isActive ? '2px solid rgba(0,255,151,0.2)' : '1px solid rgba(255,255,255,0.06)',
                      background: isDone ? 'rgba(0,255,151,0.08)' : isActive ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.3s ease', fontSize: isDone ? 16 : 11,
                      color: isDone ? '#00ff97' : 'rgba(255,255,255,0.15)',
                      animation: isActive ? 'activePulse 1s ease infinite' : 'none',
                    }}>
                      {isDone ? '✓' : isActive ? (
                        <div style={{ width: 14, height: 14, border: '2px solid rgba(0,255,151,0.2)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      ) : i + 1}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Variation strip slot */}
      {afterBatchSlot}

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

      {/* Preview canvas + FB copy */}
      <div className="flex flex-col sm:flex-row gap-4 items-start" ref={previewRef}>
        <div className="rounded-btn overflow-hidden border border-border shadow-sm flex-shrink-0 mx-auto sm:mx-0" style={{ width: previewW, height: previewH }}>
          <div style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <TemplateComponent {...templateProps} width={size.w} height={size.h} />
          </div>
        </div>
      </div>

      {/* Editing indicator */}
      {isEditingDraft && (
        <div className="flex items-center gap-2 mt-3 mb-1">
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', background: 'rgba(0,255,151,0.1)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(0,255,151,0.2)' }}>
            Editing saved creative
          </span>
          <button onClick={clearActiveDraft}
            style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Start new
          </button>
        </div>
      )}

      {/* Preview label + actions */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted">{templateLabel} &middot; {size.w}&times;{size.h}</span>

        {isEditingDraft ? (
          <>
            <button onClick={updateCurrentDraft}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill transition-all hover:opacity-80"
              style={{ background: '#111', color: '#4ade80' }}>
              <Bookmark size={11} /> Update
            </button>
            <button onClick={saveCurrentAsDraft}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill transition-all hover:opacity-80"
              style={{ border: '1px solid #ddd', color: '#333' }}>
              <Bookmark size={11} /> Save as new
            </button>
          </>
        ) : (
          <button onClick={saveCurrentAsDraft}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-pill transition-all hover:opacity-80"
            style={{ background: '#111', color: '#4ade80' }}>
            <Bookmark size={11} /> Save
          </button>
        )}

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
    </div>
  )
}
