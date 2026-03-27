'use client'
import { useState } from 'react'
import { Campaign, Brand, GeneratedContent } from '@/types'
import { Sparkles, Loader2, Copy, Check } from 'lucide-react'

interface AdVariation { primary_text: string; headline: string; description: string }

export default function AdCopyTab({
  campaign,
  brand,
  content,
}: {
  campaign: Campaign
  brand: Brand
  content: GeneratedContent[]
}) {
  const [loading, setLoading] = useState(false)
  const [freshVariations, setFreshVariations] = useState<AdVariation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  // Parse saved content into variations
  const savedVariations: AdVariation[] = content.map(c => {
    try { return JSON.parse(c.content) } catch { return null }
  }).filter(Boolean)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/ad-copy`, { method: 'POST' })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setFreshVariations(data.variations)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(c => ({ ...c, [key]: true }))
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 1500)
  }

  async function copyAll(v: AdVariation, key: string) {
    const text = `PRIMARY TEXT:\n${v.primary_text}\n\nHEADLINE:\n${v.headline}\n\nDESCRIPTION:\n${v.description}`
    await copyText(text, key)
  }

  function charCount(text: string, limit: number) {
    const len = text.length
    return (
      <span className={`text-xs font-mono ${len > limit ? 'text-danger' : len > limit * 0.85 ? 'text-amber-500' : 'text-muted'}`}>
        {len}/{limit}
      </span>
    )
  }

  function VariationCard({ v, i, prefix }: { v: AdVariation; i: number; prefix: string }) {
    return (
      <div className="card bg-paper border border-border rounded-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="avatar avatar-sm w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#000', color: '#00ff97' }}>{i + 1}</span>
            <span className="font-bold text-sm">Variation {i + 1}</span>
          </div>
          <button onClick={() => copyAll(v, `${prefix}-all-${i}`)}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors border border-border rounded-btn px-3 py-1.5">
            {copied[`${prefix}-all-${i}`] ? <Check size={12} /> : <Copy size={12} />}
            {copied[`${prefix}-all-${i}`] ? 'Copied' : 'Copy all'}
          </button>
        </div>

        {[
          { label: 'Primary text', text: v.primary_text, limit: 125, key: `${prefix}-pt-${i}` },
          { label: 'Headline', text: v.headline, limit: 27, key: `${prefix}-hl-${i}` },
          { label: 'Description', text: v.description, limit: 27, key: `${prefix}-desc-${i}` },
        ].map(({ label, text, limit, key }) => (
          <div key={key} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="label">{label}</span>
              <div className="flex items-center gap-2">
                {charCount(text, limit)}
                <button onClick={() => copyText(text, key)} className="text-muted hover:text-ink transition-colors">
                  {copied[key] ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
            <div className={`bg-cream rounded-btn p-3 text-sm ${label === 'Headline' ? 'font-semibold' : label === 'Description' ? 'text-muted' : 'leading-relaxed'}`}>
              {text}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Generate button */}
      <div className="card bg-paper border border-border rounded-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="label">Facebook ad copy</div>
            <p className="text-xs text-muted mt-1">Generate 3 variations using the campaign brief.</p>
          </div>
          <button onClick={generate} disabled={loading}
            className="btn btn-primary flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Generating...' : 'Generate 3 variations'}
          </button>
        </div>
        {error && <p className="form-error text-sm text-danger mt-3">{error}</p>}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-paper border border-border rounded-card flex items-center justify-center py-16">
          <div className="flex items-center gap-2">
            {[0, 150, 300].map(delay => (
              <span key={delay} className="w-2 h-2 rounded-full"
                style={{ background: '#00ff97', animation: `bounce 1s ease infinite ${delay}ms` }} />
            ))}
          </div>
        </div>
      )}

      {/* Fresh variations */}
      {freshVariations.length > 0 && (
        <div>
          <div className="label mb-3">New variations</div>
          <div className="space-y-4">
            {freshVariations.map((v, i) => <VariationCard key={`fresh-${i}`} v={v} i={i} prefix="fresh" />)}
          </div>
        </div>
      )}

      {/* Saved variations */}
      {savedVariations.length > 0 && (
        <div>
          <div className="label mb-3">Saved variations ({savedVariations.length})</div>
          <div className="space-y-4">
            {savedVariations.map((v, i) => <VariationCard key={`saved-${i}`} v={v} i={i} prefix="saved" />)}
          </div>
        </div>
      )}
    </div>
  )
}
