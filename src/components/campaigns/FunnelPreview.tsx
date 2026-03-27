'use client'
import { useRouter } from 'next/navigation'
import { Brand } from '@/types'

interface AdVariation {
  primary_text: string
  headline: string
  description: string
}

interface LandingBrief {
  hero: { headline: string; subheadline: string; cta_text: string }
  problem: { headline: string; body: string }
  solution: { headline: string; body: string }
  benefits: { headline: string; body: string }[]
  social_proof: { headline: string; testimonial: string; attribution: string; stat: string }
  final_cta: { headline: string; body: string; cta_text: string }
}

interface FunnelPreviewProps {
  adVariation: AdVariation | null
  landingBrief: LandingBrief | null
  brand: Brand
  onDismiss: () => void
}

const skeleton = "animate-pulse bg-cream rounded"

export default function FunnelPreview({ adVariation, landingBrief, brand, onDismiss }: FunnelPreviewProps) {
  const router = useRouter()
  const accent = brand.primary_color || '#00ff97'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top banner */}
      <div className="bg-ink rounded-card p-6 flex items-center justify-between gap-4" style={{ color: '#fff' }}>
        <div>
          <div className="font-bold text-xl">✦ Your funnel is ready.</div>
          <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Built from your brand in seconds. Now make it yours.
          </div>
        </div>
        <button onClick={onDismiss}
          className="text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90 flex-shrink-0"
          style={{ background: accent, color: '#000' }}>
          Edit & customize →
        </button>
      </div>

      {/* Two column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Ad Creative */}
        <div>
          <div className="label mb-3">Ad Creative</div>
          {adVariation ? (
            <div className="bg-paper border border-border rounded-card overflow-hidden">
              {/* FB header */}
              <div className="flex items-center gap-2.5 p-3 border-b border-border">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: accent, color: '#000' }}>
                  {brand.name?.[0] || 'B'}
                </div>
                <div>
                  <div className="font-semibold text-sm">{brand.name}</div>
                  <div className="text-muted text-xs">Sponsored</div>
                </div>
              </div>
              {/* Image placeholder */}
              <div className="aspect-square flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accent}22, ${accent}44)` }}>
                <span className="text-6xl font-black" style={{ color: accent, opacity: 0.15 }}>{brand.name?.[0] || 'B'}</span>
              </div>
              {/* Ad copy */}
              <div className="p-4 space-y-2">
                <p className="text-sm leading-relaxed">{adVariation.primary_text}</p>
                <p className="font-bold">{adVariation.headline}</p>
                <p className="text-muted text-sm">{adVariation.description}</p>
              </div>
              {/* CTA */}
              <div className="border-t border-border">
                <div className="text-sm font-semibold py-2.5 text-center text-muted">
                  {landingBrief?.hero?.cta_text || 'Shop Now'}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-paper border border-border rounded-card p-6 space-y-4">
              <div className={skeleton + ' h-8 w-2/3'} />
              <div className={skeleton + ' h-48 w-full'} />
              <div className={skeleton + ' h-4 w-full'} />
              <div className={skeleton + ' h-4 w-3/4'} />
              <div className={skeleton + ' h-5 w-1/2'} />
              <p className="text-muted text-xs mt-2">Generating ad copy...</p>
            </div>
          )}
        </div>

        {/* Right: Landing Page */}
        <div>
          <div className="label mb-3">Landing Page</div>
          {landingBrief ? (
            <div className="border border-border rounded-card overflow-hidden" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {/* Hero */}
              <div className="p-6 bg-ink text-white">
                <div className="text-xl font-black">{landingBrief.hero.headline}</div>
                <div className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{landingBrief.hero.subheadline}</div>
                <button className="text-sm font-bold mt-4 px-4 py-2 rounded-btn" style={{ background: accent, color: '#000' }}>
                  {landingBrief.hero.cta_text}
                </button>
              </div>
              {/* Benefits strip */}
              {landingBrief.benefits?.length > 0 && (
                <div className="p-4 bg-paper border-b border-border">
                  <div className="flex flex-wrap gap-2">
                    {landingBrief.benefits.slice(0, 3).map((b, i) => (
                      <span key={i} className="rounded-full border border-border px-3 py-1 text-xs font-semibold">{b.headline}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Social proof */}
              {landingBrief.social_proof && (
                <div className="p-5 bg-cream">
                  <div className="text-2xl font-black">{landingBrief.social_proof.stat}</div>
                  <p className="text-sm italic text-muted mt-2 leading-relaxed">
                    {landingBrief.social_proof.testimonial?.length > 120
                      ? landingBrief.social_proof.testimonial.slice(0, 120) + '...'
                      : landingBrief.social_proof.testimonial}
                  </p>
                  <p className="text-xs text-muted mt-1">{landingBrief.social_proof.attribution}</p>
                </div>
              )}
              {/* Problem / Solution as FAQ-like sections */}
              <div className="p-4 bg-paper">
                {landingBrief.problem && (
                  <div className="mb-3">
                    <div className="font-semibold text-sm">{landingBrief.problem.headline}</div>
                    <div className="text-xs text-muted mt-1">{landingBrief.problem.body}</div>
                  </div>
                )}
                {landingBrief.solution && (
                  <div className="mb-3">
                    <div className="font-semibold text-sm">{landingBrief.solution.headline}</div>
                    <div className="text-xs text-muted mt-1">{landingBrief.solution.body}</div>
                  </div>
                )}
                <p className="text-xs text-muted mt-3">+ 2 more sections</p>
              </div>
              {/* Final CTA */}
              <div className="p-5 bg-ink text-white text-center">
                <div className="font-bold">{landingBrief.final_cta.headline}</div>
                <button className="text-sm font-bold mt-3 px-4 py-2 rounded-btn" style={{ background: accent, color: '#000' }}>
                  {landingBrief.final_cta.cta_text}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-paper border border-border rounded-card p-6 space-y-4">
              <div className={skeleton + ' h-10 w-3/4'} />
              <div className={skeleton + ' h-4 w-full'} />
              <div className={skeleton + ' h-8 w-1/3'} />
              <div className={skeleton + ' h-24 w-full'} />
              <div className={skeleton + ' h-16 w-full'} />
              <div className={skeleton + ' h-4 w-2/3'} />
              <p className="text-muted text-xs mt-2">Generating landing brief...</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-paper border border-border rounded-card p-6 text-center">
        <div className="font-bold text-base mb-1">✦ This entire funnel was built from your brand context.</div>
        <p className="text-muted text-sm mb-4">Add more context, upload images, and refine the copy to make it perfectly on-brand.</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onDismiss}
            className="text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90"
            style={{ background: accent, color: '#000' }}>
            Edit campaign brief
          </button>
          <button onClick={() => router.push(`/brands/${brand.id}`)}
            className="text-sm font-bold px-5 py-2.5 rounded-btn border border-border hover:border-ink transition-colors">
            Add brand images
          </button>
        </div>
      </div>
    </div>
  )
}
