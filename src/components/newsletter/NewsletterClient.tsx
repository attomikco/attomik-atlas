'use client'
import { useState } from 'react'
import { ChevronDown, Copy, Check, Sparkles, Loader2, AlertCircle, Upload, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Brand {
  id: string
  name: string
  primary_color: string | null
  tone_keywords: string[] | null
  brand_voice: string | null
  target_audience: string | null
}

interface TemplateInfo {
  id: string
  file_name: string
  storage_path: string
}

const EMAIL_TYPES = [
  'Product launch', 'Promotional / sale', 'Seasonal campaign',
  'Welcome email', 'Re-engagement', 'Event / announcement',
  'Educational / content', 'Post-purchase', 'Abandoned cart',
]

export default function NewsletterClient({
  brands,
  templateMap,
  defaultBrandId,
}: {
  brands: Brand[]
  templateMap: Record<string, TemplateInfo>
  defaultBrandId?: string
}) {
  const [brandId, setBrandId]     = useState(defaultBrandId || brands[0]?.id || '')
  const [emailType, setEmailType] = useState('Promotional / sale')
  const [subject, setSubject]     = useState('')
  const [previewText, setPreviewText] = useState('')
  const [brief, setBrief]         = useState('')
  const [sections, setSections]   = useState('')
  const [tone, setTone]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [html, setHtml]           = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const [copiedSubject, setCopiedSubject] = useState(false)
  const [activeTab, setActiveTab] = useState<'html' | 'preview'>('preview')

  const brand = brands.find(b => b.id === brandId)
  const template = templateMap[brandId]

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  async function generate() {
    if (!brandId || !brief) return
    setLoading(true)
    setError(null)
    setHtml('')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, emailType, subject, previewText, brief, sections, tone }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setHtml(data.html)
      if (data.subject && !subject) setSubject(data.subject)
      if (data.preview_text && !previewText) setPreviewText(data.preview_text)
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copySubject() {
    await navigator.clipboard.writeText(subject)
    setCopiedSubject(true)
    setTimeout(() => setCopiedSubject(false), 1500)
  }

  return (
    <div className="grid grid-cols-5 gap-8">
      {/* LEFT — Brief */}
      <div className="col-span-2 space-y-5">
        {/* Brand */}
        <div>
          <label className="label block mb-1.5">Brand</label>
          <div className="relative">
            <select
              value={brandId}
              onChange={e => setBrandId(e.target.value)}
              className={inputCls + ' pr-8 appearance-none'}
            >
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Template status */}
        {template ? (
          <div className="flex items-center gap-2 bg-accent-light border border-success rounded-btn px-3 py-2.5">
            <Check size={14} className="text-success flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-success">Template loaded</div>
              <div className="text-xs text-muted truncate">{template.file_name}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-cream border border-border rounded-btn px-3 py-2.5">
            <AlertCircle size={14} className="text-muted flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold">No template uploaded</div>
              <div className="text-xs text-muted mt-0.5">
                Claude will generate clean HTML.{' '}
                <Link href={`/brands/${brandId}`} className="underline hover:text-ink transition-colors">
                  Upload your Klaviyo template →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Email type */}
        <div>
          <label className="label block mb-1.5">Email type</label>
          <div className="relative">
            <select
              value={emailType}
              onChange={e => setEmailType(e.target.value)}
              className={inputCls + ' pr-8 appearance-none'}
            >
              {EMAIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Subject line */}
        <div>
          <label className="label block mb-1.5">Subject line</label>
          <input
            type="text"
            className={inputCls}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Leave blank — Claude will suggest one"
          />
        </div>

        {/* Preview text */}
        <div>
          <label className="label block mb-1.5">Preview text</label>
          <input
            type="text"
            className={inputCls}
            value={previewText}
            onChange={e => setPreviewText(e.target.value)}
            placeholder="Leave blank — Claude will suggest one"
          />
        </div>

        {/* Brief */}
        <div>
          <label className="label block mb-1.5">Email brief *</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={4}
            value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="What is this email about? What's the main message, offer, or story you want to tell?"
          />
        </div>

        {/* Sections */}
        <div>
          <label className="label block mb-1.5">Sections to include</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={3}
            value={sections}
            onChange={e => setSections(e.target.value)}
            placeholder="e.g. hero with headline, 3 product highlights, testimonial, CTA button, PS line"
          />
        </div>

        {/* Tone override */}
        <div>
          <label className="label block mb-1.5">Tone override</label>
          <input
            type="text"
            className={inputCls}
            value={tone}
            onChange={e => setTone(e.target.value)}
            placeholder={brand?.tone_keywords?.join(', ') || 'e.g. warm, playful, urgent'}
          />
        </div>

        <button
          onClick={generate}
          disabled={loading || !brandId || !brief}
          className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: '#00ff97', color: '#000' }}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Writing email...</>
            : <><Sparkles size={15} /> Build newsletter</>
          }
        </button>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger-light rounded-btn px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* RIGHT — Output */}
      <div className="col-span-3">
        {!html && !loading && (
          <div className="bg-paper border border-border rounded-card flex items-center justify-center" style={{ minHeight: 500 }}>
            <div className="text-center">
              <Upload size={24} className="text-muted mx-auto mb-3" />
              <p className="text-muted text-sm leading-relaxed">
                Fill in the brief and hit build.<br />
                You'll get production-ready HTML<br />
                to paste straight into Klaviyo.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-paper border border-border rounded-card flex items-center justify-center" style={{ minHeight: 500 }}>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#00ff97', animation: `bounce 1s ease infinite ${delay}ms` }}
                  />
                ))}
              </div>
              <p className="text-muted text-sm">Writing your email...</p>
            </div>
          </div>
        )}

        {html && (
          <div className="bg-paper border border-border rounded-card overflow-hidden">
            {/* Subject + preview */}
            <div className="px-5 py-4 border-b border-border space-y-2">
              {subject && (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="label mr-2">Subject</span>
                    <span className="text-sm font-semibold">{subject}</span>
                  </div>
                  <button onClick={copySubject} className="text-muted hover:text-ink transition-colors flex-shrink-0 ml-3">
                    {copiedSubject ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              )}
              {previewText && (
                <div>
                  <span className="label mr-2">Preview</span>
                  <span className="text-sm text-muted">{previewText}</span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              {(['preview', 'html'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-5 py-3 text-sm font-semibold transition-colors border-b-2"
                  style={activeTab === tab
                    ? { borderBottomColor: '#00ff97', color: '#000' }
                    : { borderBottomColor: 'transparent', color: '#666' }}
                >
                  {tab === 'preview' ? 'Preview' : 'HTML'}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={copyHtml}
                className="flex items-center gap-1.5 text-sm font-semibold px-5 py-3 transition-colors"
                style={copied ? { color: '#007a48' } : { color: '#666' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy HTML'}
              </button>
            </div>

            {/* Content */}
            {activeTab === 'preview' ? (
              <div
                className="overflow-y-auto"
                style={{ maxHeight: 600, background: '#f2f2f2' }}
              >
                <iframe
                  srcDoc={html}
                  className="w-full border-none"
                  style={{ minHeight: 600 }}
                  title="Email preview"
                />
              </div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 600 }}>
                <pre
                  className="text-xs p-5 leading-relaxed font-mono text-muted"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {html}
                </pre>
              </div>
            )}

            {/* Footer actions */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-cream">
              <span className="text-xs text-muted">Ready to paste into Klaviyo → Campaigns → HTML editor</span>
              <button
                onClick={generate}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                <Sparkles size={12} /> Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
