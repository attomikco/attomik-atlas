'use client'
import { useState } from 'react'
import { Eye, EyeOff, Sparkles, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CTA_TYPE_LABELS, type CtaType } from '../types'

interface CopyEditorProps {
  headline: string
  setHeadline: (v: string) => void
  bodyText: string
  setBodyText: (v: string) => void
  ctaText: string
  setCtaText: (v: string) => void
  showCta: boolean
  setShowCta: (v: boolean) => void
  brandId: string
  setExportToast: (v: string | null) => void
  inputCls: string
  generateCopy: () => void
  generating: boolean
  // ── Meta ad launch fields ──
  destinationUrl: string
  setDestinationUrl: (v: string) => void
  ctaType: CtaType
  setCtaType: (v: CtaType) => void
  fbPrimaryText: string
  setFbPrimaryText: (v: string) => void
  fbHeadline: string
  setFbHeadline: (v: string) => void
  fbDescription: string
  setFbDescription: (v: string) => void
  // Read-only placeholder source (brand.website) for the Landing Page URL input
  brandWebsite: string | null
}

export default function CopyEditor({
  headline, setHeadline, bodyText, setBodyText, ctaText, setCtaText,
  showCta, setShowCta, brandId, setExportToast, inputCls,
  generateCopy, generating,
  destinationUrl, setDestinationUrl,
  ctaType, setCtaType,
  fbPrimaryText, setFbPrimaryText,
  fbHeadline, setFbHeadline,
  fbDescription, setFbDescription,
  brandWebsite,
}: CopyEditorProps) {
  const supabase = createClient()
  const [metaAdCopyOpen, setMetaAdCopyOpen] = useState(false)

  // Meta recommended character targets — shown as counters, not enforced.
  const FB_PRIMARY_LIMIT = 125
  const FB_HEADLINE_LIMIT = 40
  const FB_DESCRIPTION_LIMIT = 30

  const counterStyle = (current: number, target: number): React.CSSProperties => ({
    fontSize: 10,
    fontWeight: 600,
    color: current > target ? '#ef4444' : 'var(--muted)',
    marginLeft: 'auto',
  })

  return (
    <div className="bg-paper border border-border rounded-card p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="label">Copy</label>
        <div className="flex items-center gap-2">
          <button onClick={generateCopy} disabled={generating}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill hover:opacity-80 transition-opacity disabled:opacity-50"
            style={{ background: '#111', color: '#4ade80' }}>
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generating ? 'Writing...' : 'AI Copy'}
          </button>
          <button onClick={async () => {
            // Trim body text to 80-90 chars at word boundary
            let trimmedBody = bodyText.trim()
            if (trimmedBody.length > 90) {
              const cut = trimmedBody.slice(0, 90); const ls = cut.lastIndexOf(' ')
              trimmedBody = (ls > 80 ? cut.slice(0, ls) : cut).replace(/[.,;:!?—-]\s*$/, '').trim()
            }
            await supabase.from('brands').update({ default_headline: headline, default_body_text: trimmedBody, default_cta: ctaText }).eq('id', brandId)
            setExportToast('Saved as default'); setTimeout(() => setExportToast(null), 1500)
          }} className="text-[10px] text-muted hover:text-ink transition-colors font-semibold uppercase tracking-wide">
            Save as default
          </button>
        </div>
      </div>
      <input className={inputCls} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline" />
      <textarea className={inputCls} rows={2} style={{ minHeight: 60, resize: 'vertical' }} value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="Body text" />
      <div className="flex items-center gap-2">
        <input className={inputCls + (showCta ? '' : ' opacity-40')} value={ctaText}
          onChange={e => setCtaText(e.target.value)} placeholder="CTA text" disabled={!showCta} />
        <button onClick={() => setShowCta(!showCta)}
          className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors flex-shrink-0 px-1">
          {showCta ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
      </div>

      {/* ── CTA button type (Meta call_to_action_type) ── */}
      {/* Only meaningful when the creative actually has a CTA rendered. */}
      {showCta && (
        <div style={{ paddingTop: 4 }}>
          <label className="label" style={{ display: 'block', marginBottom: 6 }}>CTA Button Type</label>
          <select
            value={ctaType}
            onChange={e => setCtaType(e.target.value as CtaType)}
            className={inputCls}
            style={{ appearance: 'none', cursor: 'pointer', paddingRight: 28, backgroundImage: 'none' }}
          >
            {(Object.keys(CTA_TYPE_LABELS) as CtaType[]).map(key => (
              <option key={key} value={key}>{CTA_TYPE_LABELS[key]}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Landing page destination URL ── */}
      <div style={{ paddingTop: 4 }}>
        <label className="label" style={{ display: 'block', marginBottom: 6 }}>Landing Page URL</label>
        <input
          className={inputCls}
          type="url"
          value={destinationUrl}
          onChange={e => setDestinationUrl(e.target.value)}
          placeholder={brandWebsite || 'https://yourbrand.com/offer'}
        />
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
          Leave blank to use brand website on launch.
        </div>
      </div>

      {/* ── Meta Ad Copy collapsible ── */}
      <div style={{ paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setMetaAdCopyOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            width: '100%', background: 'none', border: 'none', padding: '6px 0',
            cursor: 'pointer', color: '#000',
          }}
          className="label"
        >
          {metaAdCopyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Meta Ad Copy
        </button>
        {metaAdCopyOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
            {/* Primary text */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <label className="label">Primary Text</label>
                <span style={counterStyle(fbPrimaryText.length, FB_PRIMARY_LIMIT)}>
                  {fbPrimaryText.length} / {FB_PRIMARY_LIMIT}
                </span>
              </div>
              <textarea
                className={inputCls}
                rows={3}
                style={{ minHeight: 72, resize: 'vertical' }}
                value={fbPrimaryText}
                onChange={e => setFbPrimaryText(e.target.value)}
                placeholder="Main ad body shown above the creative"
              />
            </div>
            {/* Headline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <label className="label">Headline</label>
                <span style={counterStyle(fbHeadline.length, FB_HEADLINE_LIMIT)}>
                  {fbHeadline.length} / {FB_HEADLINE_LIMIT}
                </span>
              </div>
              <input
                className={inputCls}
                value={fbHeadline}
                onChange={e => setFbHeadline(e.target.value)}
                placeholder="Short, benefit-focused"
              />
            </div>
            {/* Description */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <label className="label">Description</label>
                <span style={counterStyle(fbDescription.length, FB_DESCRIPTION_LIMIT)}>
                  {fbDescription.length} / {FB_DESCRIPTION_LIMIT}
                </span>
              </div>
              <input
                className={inputCls}
                value={fbDescription}
                onChange={e => setFbDescription(e.target.value)}
                placeholder="Supporting context"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
