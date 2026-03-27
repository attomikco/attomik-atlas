'use client'
import { useState } from 'react'
import { ChevronDown, Copy, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react'

const OBJECTIVES = [
  'Traffic', 'Conversions', 'Awareness', 'Engagement',
  'Lead generation', 'Retargeting', 'App installs',
]

const PLACEMENTS = ['Feed', 'Stories', 'Reels', 'Right column', 'All placements']

// Meta character limits
const LIMITS = {
  primary_text: 500,   // shown limit: 125
  headline: 27,
  description: 27,
}

interface AdVariation {
  primary_text: string
  headline: string
  description: string
}

interface Brand {
  id: string
  name: string
  primary_color: string | null
  tone_keywords: string[] | null
  target_audience: string | null
  brand_voice: string | null
}

interface CopiedState {
  [key: string]: boolean
}

export default function FacebookAdClient({
  brands,
  defaultBrandId,
}: {
  brands: Brand[]
  defaultBrandId?: string
}) {
  const [brandId, setBrandId]       = useState(defaultBrandId || brands[0]?.id || '')
  const [objective, setObjective]   = useState('Conversions')
  const [placement, setPlacement]   = useState('Feed')
  const [offer, setOffer]           = useState('')
  const [audience, setAudience]     = useState('')
  const [cta, setCta]               = useState('')
  const [notes, setNotes]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [variations, setVariations] = useState<AdVariation[]>([])
  const [error, setError]           = useState<string | null>(null)
  const [copied, setCopied]         = useState<CopiedState>({})

  const brand = brands.find(b => b.id === brandId)

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  async function generate() {
    if (!brandId || !offer) return
    setLoading(true)
    setError(null)
    setVariations([])

    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, objective, placement, offer, audience, cta, notes }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const data = await res.json()
      setVariations(data.variations)
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  async function copyField(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(c => ({ ...c, [key]: true }))
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 1500)
  }

  async function copyAll(variation: AdVariation, index: number) {
    const text = `PRIMARY TEXT:\n${variation.primary_text}\n\nHEADLINE:\n${variation.headline}\n\nDESCRIPTION:\n${variation.description}`
    await navigator.clipboard.writeText(text)
    setCopied(c => ({ ...c, [`all-${index}`]: true }))
    setTimeout(() => setCopied(c => ({ ...c, [`all-${index}`]: false })), 1500)
  }

  function charCount(text: string, limit: number) {
    const len = text.length
    const over = len > limit
    return (
      <span className={`text-xs font-mono ${over ? 'text-danger' : len > limit * 0.85 ? 'text-amber-500' : 'text-muted'}`}>
        {len}/{limit}
      </span>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
      {/* LEFT — Controls */}
      <div className="lg:col-span-2 space-y-5">
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
          {brand?.tone_keywords && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {brand.tone_keywords.slice(0, 3).map(kw => (
                <span key={kw} className="text-xs px-2 py-0.5 bg-cream rounded-pill text-muted">{kw}</span>
              ))}
            </div>
          )}
        </div>

        {/* Objective */}
        <div>
          <label className="label block mb-1.5">Campaign objective</label>
          <div className="relative">
            <select
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className={inputCls + ' pr-8 appearance-none'}
            >
              {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Placement */}
        <div>
          <label className="label block mb-1.5">Placement</label>
          <div className="flex flex-wrap gap-1.5">
            {PLACEMENTS.map(p => (
              <button
                key={p}
                onClick={() => setPlacement(p)}
                className="text-xs px-2.5 py-1 rounded-pill border transition-all duration-150 font-semibold"
                style={placement === p
                  ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                  : { borderColor: '#e0e0e0', color: '#666' }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Offer */}
        <div>
          <label className="label block mb-1.5">Offer / product *</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={3}
            value={offer}
            onChange={e => setOffer(e.target.value)}
            placeholder="e.g. 20% off our summer rosé 4-pack, limited time. Free shipping over $40."
          />
        </div>

        {/* Audience override */}
        <div>
          <label className="label block mb-1.5">
            Audience
            {brand?.target_audience && (
              <span className="ml-2 text-xs text-muted font-normal normal-case tracking-normal">
                (brand default loaded)
              </span>
            )}
          </label>
          <input
            type="text"
            className={inputCls}
            value={audience}
            onChange={e => setAudience(e.target.value)}
            placeholder={brand?.target_audience || 'e.g. women 25–40 who love wine and entertaining'}
          />
        </div>

        {/* CTA */}
        <div>
          <label className="label block mb-1.5">CTA button</label>
          <div className="relative">
            <select
              value={cta}
              onChange={e => setCta(e.target.value)}
              className={inputCls + ' pr-8 appearance-none'}
            >
              <option value="">Shop Now (default)</option>
              <option>Shop Now</option>
              <option>Learn More</option>
              <option>Sign Up</option>
              <option>Get Offer</option>
              <option>Order Now</option>
              <option>Subscribe</option>
              <option>Book Now</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Extra notes */}
        <div>
          <label className="label block mb-1.5">Additional notes</label>
          <input
            type="text"
            className={inputCls}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. mention summer, keep it punchy, avoid emojis"
          />
        </div>

        <button
          onClick={generate}
          disabled={loading || !brandId || !offer}
          className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
            : <><Sparkles size={15} /> Generate 3 variations</>
          }
        </button>

        {error && (
          <div className="alert alert-error flex items-center gap-2 text-sm text-danger bg-danger-light rounded-btn px-3 py-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* RIGHT — Output */}
      <div className="lg:col-span-3">
        {variations.length === 0 && !loading && (
          <div className="bg-paper border border-border rounded-card flex items-center justify-center" style={{ minHeight: 400 }}>
            <p className="text-muted text-sm text-center leading-relaxed">
              Fill in the brief on the left<br />and hit generate to get 3 variations.
            </p>
          </div>
        )}

        {loading && (
          <div className="bg-paper border border-border rounded-card flex items-center justify-center" style={{ minHeight: 400 }}>
            <div className="flex items-center gap-2">
              {[0, 150, 300].map(delay => (
                <span
                  key={delay}
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#00ff97', animation: `bounce 1s ease infinite ${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {variations.length > 0 && (
          <div className="space-y-5">
            {variations.map((v, i) => (
              <div key={i} className="card bg-paper border border-border rounded-card p-6">
                {/* Variation header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#000', color: '#00ff97' }}
                    >
                      {i + 1}
                    </span>
                    <span className="font-bold text-sm">Variation {i + 1}</span>
                  </div>
                  <button
                    onClick={() => copyAll(v, i)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors border border-border rounded-btn px-3 py-1.5"
                  >
                    {copied[`all-${i}`] ? <Check size={12} /> : <Copy size={12} />}
                    {copied[`all-${i}`] ? 'Copied all' : 'Copy all'}
                  </button>
                </div>

                {/* Primary text */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="label">Primary text</span>
                    <div className="flex items-center gap-2">
                      {charCount(v.primary_text, 125)}
                      <button
                        onClick={() => copyField(v.primary_text, `pt-${i}`)}
                        className="text-muted hover:text-ink transition-colors"
                      >
                        {copied[`pt-${i}`] ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-cream rounded-btn p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {v.primary_text}
                  </div>
                  {v.primary_text.length > 125 && (
                    <p className="text-xs text-muted mt-1">
                      First 125 chars shown in feed — full text visible after &quot;See more&quot;
                    </p>
                  )}
                </div>

                {/* Headline */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="label">Headline</span>
                    <div className="flex items-center gap-2">
                      {charCount(v.headline, LIMITS.headline)}
                      <button
                        onClick={() => copyField(v.headline, `hl-${i}`)}
                        className="text-muted hover:text-ink transition-colors"
                      >
                        {copied[`hl-${i}`] ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-cream rounded-btn p-3 text-sm font-semibold">
                    {v.headline}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="label">Description</span>
                    <div className="flex items-center gap-2">
                      {charCount(v.description, LIMITS.description)}
                      <button
                        onClick={() => copyField(v.description, `desc-${i}`)}
                        className="text-muted hover:text-ink transition-colors"
                      >
                        {copied[`desc-${i}`] ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-cream rounded-btn p-3 text-sm text-muted">
                    {v.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
