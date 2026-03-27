'use client'
import { useState } from 'react'
import { Campaign, Brand, GeneratedContent } from '@/types'
import { Sparkles, Loader2, Copy, Check } from 'lucide-react'

interface LandingBrief {
  hero: { headline: string; subheadline: string; cta_text: string }
  problem: { headline: string; body: string }
  solution: { headline: string; body: string }
  benefits: { headline: string; body: string }[]
  social_proof: { headline: string; testimonial: string; attribution: string; stat: string }
  faq: { question: string; answer: string }[]
  final_cta: { headline: string; body: string; cta_text: string }
}

export default function LandingBriefTab({
  campaign,
  brand,
  content,
}: {
  campaign: Campaign
  brand: Brand
  content: GeneratedContent[]
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brief, setBrief] = useState<LandingBrief | null>(() => {
    if (content.length > 0) {
      try { return JSON.parse(content[0].content) } catch { return null }
    }
    return null
  })
  const [copiedAll, setCopiedAll] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/landing-brief`, { method: 'POST' })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json()
      setBrief(data)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function copyFullBrief() {
    if (!brief) return
    const sections = [
      `# HERO\nHeadline: ${brief.hero.headline}\nSubheadline: ${brief.hero.subheadline}\nCTA: ${brief.hero.cta_text}`,
      `# PROBLEM\n${brief.problem.headline}\n${brief.problem.body}`,
      `# SOLUTION\n${brief.solution.headline}\n${brief.solution.body}`,
      `# BENEFITS\n${brief.benefits.map(b => `• ${b.headline}: ${b.body}`).join('\n')}`,
      `# SOCIAL PROOF\n${brief.social_proof.headline}\n"${brief.social_proof.testimonial}" — ${brief.social_proof.attribution}\nStat: ${brief.social_proof.stat}`,
      `# FAQ\n${brief.faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`,
      `# FINAL CTA\n${brief.final_cta.headline}\n${brief.final_cta.body}\nCTA: ${brief.final_cta.cta_text}`,
    ]
    await navigator.clipboard.writeText(sections.join('\n\n---\n\n'))
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const sectionCls = "card bg-paper border border-border rounded-card p-5"
  const labelCls = "text-xs font-bold uppercase tracking-wide text-muted mb-2"
  const headCls = "text-lg font-bold mb-1"
  const bodyCls = "text-sm text-muted leading-relaxed"

  return (
    <div className="space-y-5">
      {/* Generate / copy header */}
      <div className="bg-paper border border-border rounded-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="label">Landing page brief</div>
            <p className="text-xs text-muted mt-1">AI-generated content sections for the landing page.</p>
          </div>
          <div className="flex items-center gap-2">
            {brief && (
              <button onClick={copyFullBrief}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-btn border border-border hover:border-ink transition-colors">
                {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                {copiedAll ? 'Copied' : 'Copy all'}
              </button>
            )}
            <button onClick={generate} disabled={loading}
              className="btn btn-primary flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? 'Generating...' : brief ? 'Regenerate' : 'Generate brief'}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-danger mt-3">{error}</p>}
      </div>

      {/* Loading */}
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

      {/* Brief sections */}
      {brief && !loading && (
        <>
          {/* Hero */}
          <div className={sectionCls}>
            <div className={labelCls}>Hero section</div>
            <div className="text-xl font-extrabold mb-1" style={{ letterSpacing: '-0.02em' }}>{brief.hero.headline}</div>
            <div className={bodyCls}>{brief.hero.subheadline}</div>
            <div className="inline-block mt-3 text-sm font-bold px-4 py-2 rounded-btn"
              style={{ background: brand.primary_color || '#000', color: '#fff' }}>
              {brief.hero.cta_text}
            </div>
          </div>

          {/* Problem + Solution side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={sectionCls}>
              <div className={labelCls}>Problem</div>
              <div className={headCls}>{brief.problem.headline}</div>
              <div className={bodyCls}>{brief.problem.body}</div>
            </div>
            <div className={sectionCls}>
              <div className={labelCls}>Solution</div>
              <div className={headCls}>{brief.solution.headline}</div>
              <div className={bodyCls}>{brief.solution.body}</div>
            </div>
          </div>

          {/* Benefits */}
          <div className={sectionCls}>
            <div className={labelCls}>Benefits</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              {brief.benefits.map((b, i) => (
                <div key={i}>
                  <div className="font-bold text-sm mb-1">{b.headline}</div>
                  <div className={bodyCls}>{b.body}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Proof */}
          <div className={sectionCls}>
            <div className={labelCls}>Social proof</div>
            <div className={headCls}>{brief.social_proof.headline}</div>
            <blockquote className="text-sm italic text-muted border-l-2 pl-3 mt-2 mb-2" style={{ borderColor: brand.primary_color || '#000' }}>
              &ldquo;{brief.social_proof.testimonial}&rdquo;
            </blockquote>
            <div className="text-xs font-semibold">{brief.social_proof.attribution}</div>
            <div className="mt-2 inline-block text-xs font-bold px-3 py-1 rounded-pill" style={{ background: '#f2f2f2' }}>
              {brief.social_proof.stat}
            </div>
          </div>

          {/* FAQ */}
          <div className={sectionCls}>
            <div className={labelCls}>FAQ</div>
            <div className="space-y-3 mt-2">
              {brief.faq.map((f, i) => (
                <div key={i}>
                  <div className="font-bold text-sm">{f.question}</div>
                  <div className={bodyCls}>{f.answer}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className={sectionCls + ' card-dark'} style={{ background: '#000', color: '#fff', borderColor: '#000' }}>
            <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#00ff97' }}>Final CTA</div>
            <div className="text-lg font-extrabold mb-1">{brief.final_cta.headline}</div>
            <div className="text-sm opacity-70 mb-3">{brief.final_cta.body}</div>
            <div className="inline-block text-sm font-bold px-4 py-2 rounded-btn"
              style={{ background: '#00ff97', color: '#000' }}>
              {brief.final_cta.cta_text}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
