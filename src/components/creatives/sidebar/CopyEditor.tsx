'use client'
import { Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
}

export default function CopyEditor({
  headline, setHeadline, bodyText, setBodyText, ctaText, setCtaText,
  showCta, setShowCta, brandId, setExportToast, inputCls,
  generateCopy, generating,
}: CopyEditorProps) {
  const supabase = createClient()

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
    </div>
  )
}
