'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { Brand, Campaign, GeneratedContent, BrandImage } from '@/types'
import { createClient } from '@/lib/supabase/client'
import PlatformAdPreview from './PlatformAdPreview'
import OverlayTemplate from '@/components/creatives/templates/OverlayTemplate'
import GenerationModal, { ModalStep } from '@/components/ui/GenerationModal'

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

const APP_ACCENT = '#00ff97'

export default function PreviewClient({
  campaign,
  brand,
  generatedContent,
  brandImages,
}: {
  campaign: Campaign
  brand: Brand
  generatedContent: GeneratedContent[]
  brandImages: BrandImage[]
}) {
  const router = useRouter()
  const supabase = createClient()

  // Derived content
  const adCopyContent = generatedContent.filter(c => c.type === 'fb_ad')
  const landingContent = generatedContent.filter(c => c.type === 'landing_brief')

  const hasContent = adCopyContent.length > 0 || landingContent.length > 0

  // Parse existing content
  const existingAdVariation: AdVariation | null = adCopyContent.length > 0
    ? (() => {
        try {
          const parsed = JSON.parse(adCopyContent[0].content)
          return parsed?.variations?.[0] || parsed
        } catch { return null }
      })()
    : null

  const existingLandingBrief: LandingBrief | null = landingContent.length > 0
    ? (() => {
        try { return JSON.parse(landingContent[0].content) } catch { return null }
      })()
    : null

  // Generation state
  const [adVariation, setAdVariation] = useState<AdVariation | null>(existingAdVariation)
  const [landingBrief, setLandingBrief] = useState<LandingBrief | null>(existingLandingBrief)
  const [showModal, setShowModal] = useState(!hasContent)
  const [modalSteps, setModalSteps] = useState<ModalStep[]>([
    { id: 'ad-copy', label: 'Ad copy', status: hasContent ? 'done' : 'pending' },
    { id: 'landing', label: 'Landing page brief', status: hasContent ? 'done' : 'pending' },
    { id: 'creative', label: 'Creative', status: hasContent ? 'done' : 'pending' },
  ])

  // Brand image URL
  const [brandImageUrl, setBrandImageUrl] = useState<string | null>(null)

  // Brand font
  const brandAccent = brand.primary_color || '#000'
  const fh = brand.font_heading
  const fontFamily = fh?.family || brand.font_primary?.split('|')[0] || ''

  // Load Google Font
  useEffect(() => {
    if (!fontFamily) return
    const id = 'preview-font'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link) }
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;500;600;700;800;900&display=swap`
  }, [fontFamily])

  // Fetch first brand image
  useEffect(() => {
    function getImageUrl(storagePath: string) {
      return supabase.storage.from('brand-images').getPublicUrl(storagePath).data.publicUrl
    }
    if (brandImages.length > 0) {
      const url = getImageUrl(brandImages[0].storage_path)
      console.log('[Preview] Brand image URL:', url)
      setBrandImageUrl(url)
    } else {
      supabase.from('brand_images').select('storage_path').eq('brand_id', brand.id).limit(1)
        .then(({ data }) => {
          if (data?.[0]) {
            const url = getImageUrl(data[0].storage_path)
            console.log('[Preview] Brand image URL (fetched):', url)
            setBrandImageUrl(url)
          }
        })
    }
  }, [brand.id, brandImages])

  // Auto-generate if no content exists
  useEffect(() => {
    if (hasContent) return

    function updateStep(stepId: string, status: ModalStep['status']) {
      setModalSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s))
    }

    async function runSequential() {
      // Step 1: Ad copy
      updateStep('ad-copy', 'loading')
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/ad-copy`, { method: 'POST' })
        const data = await res.json()
        if (data?.variations?.[0]) {
          setAdVariation(data.variations[0])
          updateStep('ad-copy', 'done')
        } else {
          updateStep('ad-copy', 'error')
        }
      } catch { updateStep('ad-copy', 'error') }

      // Step 2: Landing brief (only after ad copy finishes)
      updateStep('landing', 'loading')
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/landing-brief`, { method: 'POST' })
        const data = await res.json()
        if (data?.hero) {
          setLandingBrief(data)
          updateStep('landing', 'done')
        } else {
          updateStep('landing', 'error')
        }
      } catch { updateStep('landing', 'error') }
    }
    runSequential()
  }, [])

  // Mark creative done once ad-copy and landing are done
  useEffect(() => {
    const adDone = modalSteps.find(s => s.id === 'ad-copy')?.status === 'done'
    const landDone = modalSteps.find(s => s.id === 'landing')?.status === 'done'
    const creativePending = modalSteps.find(s => s.id === 'creative')?.status !== 'done'
    if (adDone && landDone && creativePending) {
      setModalSteps(prev => prev.map(s => s.id === 'creative' ? { ...s, status: 'loading' } : s))
      setTimeout(() => {
        setModalSteps(prev => prev.map(s => s.id === 'creative' ? { ...s, status: 'done' } : s))
      }, 1500)
    }
  }, [modalSteps])

  const headingStyle: React.CSSProperties = {
    fontFamily: fontFamily ? `${fontFamily}, sans-serif` : undefined,
    textTransform: (fh?.transform || 'none') as React.CSSProperties['textTransform'],
    letterSpacing: fh?.letterSpacing === 'wide' ? '0.12em' : fh?.letterSpacing === 'tight' ? '-0.02em' : 'normal',
  }

  // Template props for ad creative
  const templateProps = adVariation ? {
    imageUrl: brandImageUrl,
    headline: adVariation.headline,
    bodyText: adVariation.primary_text.slice(0, 100),
    ctaText: landingBrief?.hero?.cta_text || 'Shop Now',
    brandColor: brandAccent,
    brandName: brand.name,
    headlineFont: fontFamily,
    headlineWeight: brand.font_heading?.weight || '800',
    headlineTransform: brand.font_heading?.transform || 'none',
    headlineColor: '#ffffff',
    bodyFont: fontFamily,
    bodyWeight: '400',
    bodyTransform: 'none',
    bodyColor: 'rgba(255,255,255,0.85)',
    bgColor: brandImageUrl ? '#000' : brandAccent,
    headlineSizeMul: 1,
    bodySizeMul: 1,
    showOverlay: !!brandImageUrl,
    overlayOpacity: brandImageUrl ? 0.3 : 0,
    textBanner: 'none' as const,
    textBannerColor: '#000',
    textPosition: 'center' as const,
    showCta: true,
    ctaColor: brand.accent_color || brandAccent,
    ctaFontColor: '#ffffff',
    imagePosition: 'center',
  } : null

  const skeleton = 'animate-pulse bg-cream rounded'

  return (
    <div className="min-h-screen bg-paper">
      {/* Generation modal */}
      <GenerationModal
        isOpen={showModal}
        steps={modalSteps}
        brandName={brand.name}
        onClose={() => setShowModal(false)}
      />

      {/* Top nav bar */}
      <div className="border-b border-border bg-paper sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-10 flex items-center justify-between h-14">
          <Link href={`/campaigns/${campaign.id}`}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
            <ArrowLeft size={14} /> Back to campaign
          </Link>
          <Link href={`/campaigns/${campaign.id}`}
            className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ color: APP_ACCENT }}>
            <Pencil size={13} /> Edit campaign
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-10 py-8 space-y-8">
        {/* Hero section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cream rounded-full border border-border text-sm">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: brand.primary_color || '#e0e0e0' }} />
            <span className="font-medium">{brand.name}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">{campaign.name}</h1>
          {campaign.angle && <p className="text-muted max-w-lg mx-auto">{campaign.angle}</p>}
        </div>

        {/* Three-column funnel flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Ad Creative */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">1</span>
              <span className="label">Ad Creative</span>
            </div>
            {adVariation && templateProps ? (
              <PlatformAdPreview
                brand={brand}
                creative={{
                  imageUrl: null,
                  headline: adVariation.headline,
                  primaryText: adVariation.primary_text,
                  ctaText: landingBrief?.hero?.cta_text || 'Shop Now',
                }}
                TemplateComponent={OverlayTemplate}
                templateProps={templateProps}
              />
            ) : (
              <div className="bg-paper border border-border rounded-card p-6 space-y-4">
                <div className={skeleton + ' h-8 w-2/3'} />
                <div className={skeleton + ' h-48 w-full'} />
                <div className={skeleton + ' h-4 w-full'} />
                <div className={skeleton + ' h-4 w-3/4'} />
                <p className="text-muted text-xs mt-2">Generating ad creative...</p>
              </div>
            )}
          </div>

          {/* Card 2: Ad Copy */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">2</span>
              <span className="label">Ad Copy</span>
            </div>
            {adVariation ? (
              <div className="border border-border rounded-card p-5 bg-paper space-y-4">
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Headline</div>
                  <div className="font-bold text-base" style={headingStyle}>{adVariation.headline}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Primary Text</div>
                  <p className="text-sm leading-relaxed">{adVariation.primary_text}</p>
                </div>
                {adVariation.description && (
                  <div>
                    <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Description</div>
                    <p className="text-sm text-muted">{adVariation.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-paper border border-border rounded-card p-6 space-y-4">
                <div className={skeleton + ' h-5 w-1/2'} />
                <div className={skeleton + ' h-4 w-full'} />
                <div className={skeleton + ' h-4 w-full'} />
                <div className={skeleton + ' h-4 w-3/4'} />
                <p className="text-muted text-xs mt-2">Generating ad copy...</p>
              </div>
            )}
          </div>

          {/* Card 3: Landing Page */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">3</span>
              <span className="label">Landing Page</span>
            </div>
            {landingBrief ? (
              <div className="border border-border rounded-card overflow-hidden" style={{ maxHeight: 480, overflowY: 'auto' }}>
                {/* Hero */}
                <div className="p-5 text-white" style={{
                  background: brand.secondary_color
                    ? `linear-gradient(135deg, ${brandAccent}, ${brand.secondary_color})`
                    : brandAccent
                }}>
                  <div className="text-lg font-black" style={headingStyle}>{landingBrief.hero.headline}</div>
                  <div className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{landingBrief.hero.subheadline}</div>
                  <button className="text-xs font-bold mt-3 px-3 py-1.5 rounded-btn" style={{
                    background: brand.accent_color || '#fff',
                    color: '#000',
                  }}>
                    {landingBrief.hero.cta_text}
                  </button>
                </div>
                {/* Benefits */}
                {landingBrief.benefits?.length > 0 && (
                  <div className="p-3 bg-paper border-b border-border">
                    <div className="flex flex-wrap gap-1.5">
                      {landingBrief.benefits.slice(0, 3).map((b, i) => (
                        <span key={i} className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ border: `1px solid ${brandAccent}40`, color: brandAccent }}>{b.headline}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Social proof */}
                {landingBrief.social_proof && (
                  <div className="p-4 bg-cream">
                    <div className="text-xl font-black" style={{ color: brandAccent }}>{landingBrief.social_proof.stat}</div>
                    <p className="text-xs italic text-muted mt-1 leading-relaxed">
                      {landingBrief.social_proof.testimonial?.length > 80
                        ? landingBrief.social_proof.testimonial.slice(0, 80) + '...'
                        : landingBrief.social_proof.testimonial}
                    </p>
                  </div>
                )}
                {/* Problem / Solution */}
                <div className="p-3 bg-paper">
                  {landingBrief.problem && (
                    <div className="mb-2">
                      <div className="font-semibold text-xs" style={headingStyle}>{landingBrief.problem.headline}</div>
                      <div className="text-[10px] text-muted mt-0.5">{landingBrief.problem.body}</div>
                    </div>
                  )}
                  {landingBrief.solution && (
                    <div className="mb-2">
                      <div className="font-semibold text-xs" style={headingStyle}>{landingBrief.solution.headline}</div>
                      <div className="text-[10px] text-muted mt-0.5">{landingBrief.solution.body}</div>
                    </div>
                  )}
                </div>
                {/* Final CTA */}
                <div className="p-4 text-white text-center" style={{
                  background: brand.secondary_color
                    ? `linear-gradient(135deg, ${brandAccent}, ${brand.secondary_color})`
                    : brandAccent
                }}>
                  <div className="font-bold text-sm" style={headingStyle}>{landingBrief.final_cta.headline}</div>
                  <button className="text-xs font-bold mt-2 px-3 py-1.5 rounded-btn" style={{ background: brand.accent_color || '#fff', color: '#000' }}>
                    {landingBrief.final_cta.cta_text}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-paper border border-border rounded-card p-6 space-y-4">
                <div className={skeleton + ' h-10 w-3/4'} />
                <div className={skeleton + ' h-4 w-full'} />
                <div className={skeleton + ' h-8 w-1/3'} />
                <div className={skeleton + ' h-20 w-full'} />
                <p className="text-muted text-xs mt-2">Generating landing brief...</p>
              </div>
            )}
          </div>
        </div>

        {/* Context banner */}
        <div className="bg-ink rounded-card p-6 text-center" style={{ color: '#fff' }}>
          <div className="font-bold text-lg mb-1">Make it yours</div>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            This entire funnel was built from your brand context. Customize the copy, upload images, and refine everything.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href={`/campaigns/${campaign.id}`}
              className="text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
              style={{ background: APP_ACCENT, color: '#000' }}>
              <Pencil size={13} /> Edit campaign
            </Link>
            <Link href={`/brands/${brand.id}`}
              className="text-sm font-bold px-5 py-2.5 rounded-btn border transition-colors hover:border-white inline-flex items-center gap-1.5"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <Plus size={13} /> Add context
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
