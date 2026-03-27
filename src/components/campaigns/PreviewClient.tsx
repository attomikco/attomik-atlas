'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Plus, Info } from 'lucide-react'
import { Brand, Campaign, GeneratedContent, BrandImage } from '@/types'
import { createClient } from '@/lib/supabase/client'
import PlatformAdPreview from './PlatformAdPreview'
import OverlayTemplate from '@/components/creatives/templates/OverlayTemplate'
import SplitTemplate from '@/components/creatives/templates/SplitTemplate'
import StatTemplate from '@/components/creatives/templates/StatTemplate'
import TestimonialTemplate from '@/components/creatives/templates/TestimonialTemplate'
import UGCTemplate from '@/components/creatives/templates/UGCTemplate'
import GenerationModal, { ModalStep } from '@/components/ui/GenerationModal'
import CreativeReel from './CreativeReel'

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
  const [activating, setActivating] = useState(false)

  async function activateBrand() {
    setActivating(true)
    await supabase.from('brands').update({ status: 'active' }).eq('id', brand.id)
    sessionStorage.removeItem('attomik_draft_brand_id')
    sessionStorage.removeItem('attomik_draft_campaign_id')
    router.push(`/campaigns/${campaign.id}`)
  }

  async function navigateWithActivation(href: string) {
    if (brand.status === 'draft') {
      await supabase.from('brands').update({ status: 'active' }).eq('id', brand.id)
      sessionStorage.removeItem('attomik_draft_brand_id')
      sessionStorage.removeItem('attomik_draft_campaign_id')
    }
    router.push(href)
  }

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
  const [adVariations, setAdVariations] = useState<AdVariation[]>(existingAdVariation ? [existingAdVariation] : [])
  const adVariation = adVariations[0] || null
  const [landingBrief, setLandingBrief] = useState<LandingBrief | null>(existingLandingBrief)
  const [showModal, setShowModal] = useState(!hasContent)
  const [showReel, setShowReel] = useState(false)
  const [modalSteps, setModalSteps] = useState<ModalStep[]>([
    { id: 'ad-copy', label: 'Ad copy', status: hasContent ? 'done' : 'pending' },
    { id: 'landing', label: 'Landing page brief', status: hasContent ? 'done' : 'pending' },
    { id: 'creative', label: 'Creative', status: hasContent ? 'done' : 'pending' },
  ])

  // Brand image URLs
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null)
  const [lifestyleImageUrl, setLifestyleImageUrl] = useState<string | null>(null)
  const brandImageUrl = productImageUrl // backward compat

  // Brand font
  const brandAccent = brand.primary_color || '#1a1a1a'
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

  // Fetch brand images by tag
  useEffect(() => {
    function buildImageUrl(storagePath: string) {
      // Strip leading bucket name if accidentally included
      const cleanPath = storagePath.replace(/^brand-images\//, '')
      const { data } = supabase.storage.from('brand-images').getPublicUrl(cleanPath)
      console.log('[Preview] buildImageUrl:', { storagePath, cleanPath, url: data.publicUrl })
      return data.publicUrl
    }
    function loadImages(images: BrandImage[]) {
      console.log('[Preview] brand images:', images.map(i => ({ id: i.id, tag: i.tag, storage_path: i.storage_path })))
      const products = images.filter(i => i.tag === 'product')
      const lifestyle = images.filter(i => i.tag === 'lifestyle' || i.tag === 'background')
      if (products.length > 0) setProductImageUrl(buildImageUrl(products[0].storage_path))
      else if (images.length > 0) setProductImageUrl(buildImageUrl(images[0].storage_path))
      if (lifestyle.length > 0) setLifestyleImageUrl(buildImageUrl(lifestyle[0].storage_path))
      else if (products.length > 0) setLifestyleImageUrl(buildImageUrl(products[0].storage_path))
      else if (images.length > 0) setLifestyleImageUrl(buildImageUrl(images[0].storage_path))
    }
    if (brandImages.length > 0) {
      console.log('[Preview] Using server-provided brandImages:', brandImages.length)
      loadImages(brandImages)
    } else {
      console.log('[Preview] No server images, fetching client-side for brand:', brand.id)
      // Try immediately, then retry after 3s (images might still be uploading)
      const fetchImages = () => {
        supabase.from('brand_images').select('*').eq('brand_id', brand.id).order('created_at')
          .then(({ data }) => {
            console.log('[Preview] Client fetch got:', data?.length, 'images')
            if (data?.length) loadImages(data as BrandImage[])
          })
      }
      fetchImages()
      setTimeout(fetchImages, 3000) // retry after 3s
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
        if (data?.variations?.length > 0) {
          setAdVariations(data.variations)
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
  const creativeTriggered = useRef(false)
  useEffect(() => {
    if (creativeTriggered.current) return
    const adDone = modalSteps.find(s => s.id === 'ad-copy')?.status === 'done'
    const landDone = modalSteps.find(s => s.id === 'landing')?.status === 'done'
    if (adDone && landDone) {
      creativeTriggered.current = true
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
        onClose={() => { setShowModal(false); if (adVariation) setShowReel(true) }}
      />

      {showReel && adVariation && (
        <CreativeReel
          brand={brand}
          adVariation={adVariation}
          imageUrl={brandImageUrl}
          onComplete={() => setShowReel(false)}
        />
      )}

      {/* Top nav bar */}
      <div className="border-b border-border bg-paper sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-10 flex items-center justify-between h-14">
          <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
            <ArrowLeft size={14} /> Back to campaign
          </button>
          <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)}
            className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ color: APP_ACCENT }}>
            <Pencil size={13} /> Edit campaign
          </button>
        </div>
      </div>

      {brand.status === 'draft' && (
        <div className="max-w-5xl mx-auto px-4 md:px-10 mt-4">
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Info size={15} style={{ color: '#d97706' }} />
              <span style={{ fontSize: 14, color: '#92400e' }}>This funnel is saved as a draft. Activate it to access full editing.</span>
            </div>
            <button onClick={activateBrand} disabled={activating}
              style={{ background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
              {activating ? 'Activating...' : 'Activate & continue \u2192'}
            </button>
          </div>
        </div>
      )}

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

        {/* ═══ SECTION 1: Ad Creatives ═══ */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">1</span>
              <span className="font-bold text-xl">Ad Creatives</span>
            </div>
            <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)} className="text-sm text-muted hover:text-ink transition-colors">
              Edit in creative builder →
            </button>
          </div>

          {adVariation ? (() => {
            console.log('[Preview] productImageUrl:', productImageUrl)
            console.log('[Preview] lifestyleImageUrl:', lifestyleImageUrl)
            const CARD_H = 360
            const baseProps = {
              headline: adVariation.headline,
              bodyText: adVariation.primary_text.slice(0, 100),
              ctaText: landingBrief?.hero?.cta_text || 'Shop Now',
              brandColor: brandAccent,
              brandName: brand.name,
              headlineFont: fontFamily, headlineWeight: fh?.weight || '800',
              headlineTransform: fh?.transform || 'none',
              headlineColor: '#ffffff', bodyFont: fontFamily, bodyWeight: '400',
              bodyTransform: 'none', bodyColor: 'rgba(255,255,255,0.85)',
              headlineSizeMul: 1, bodySizeMul: 1,
              showOverlay: true, overlayOpacity: 0.35,
              textBanner: 'none' as const, textBannerColor: '#000',
              showCta: true, ctaColor: brand.accent_color || brandAccent,
              ctaFontColor: '#000', imagePosition: 'center',
            }
            // All cards 360px tall, width varies by aspect ratio
            const cards = [
              { label: 'Facebook Feed', srcW: 1080, srcH: 1080, Comp: OverlayTemplate, img: productImageUrl, pos: 'center' as const, tp: 'center' as const },
              { label: 'Instagram 4:5', srcW: 1080, srcH: 1350, Comp: SplitTemplate, img: productImageUrl, pos: 'center' as const, tp: 'center' as const },
              { label: 'Social Proof', srcW: 1080, srcH: 1080, Comp: TestimonialTemplate, img: lifestyleImageUrl || productImageUrl, pos: 'bottom' as const, tp: 'center' as const },
              { label: 'Statement', srcW: 1080, srcH: 1080, Comp: StatTemplate, img: productImageUrl, pos: 'center' as const, tp: 'center' as const },
              { label: 'Instagram Story', srcW: 1080, srcH: 1920, Comp: OverlayTemplate, img: productImageUrl, pos: 'center' as const, tp: 'bottom-left' as const },
            ]
            return (
              <>
                {/* Gallery — all cards same height */}
                <div className="flex gap-5 overflow-x-auto pb-4 -mx-4 md:-mx-10 px-4 md:px-10" style={{ scrollSnapType: 'x mandatory' }}>
                  {cards.map((c, i) => {
                    const scale = CARD_H / c.srcH
                    const cardW = Math.round(c.srcW * scale)
                    return (
                      <div key={i} className="flex-shrink-0 flex flex-col items-center" style={{ scrollSnapAlign: 'center' }}>
                        <div className="text-xs text-muted mb-2 font-medium">{c.label}</div>
                        <div className="border border-border overflow-hidden shadow-sm" style={{ width: cardW, height: CARD_H, borderRadius: 12, position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: c.srcW, height: c.srcH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                            <c.Comp {...baseProps} width={c.srcW} height={c.srcH} imageUrl={c.img} bgColor={c.img ? '#000' : brandAccent} textPosition={c.tp} imagePosition={c.pos} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Platform mockups — side by side */}
                <div className="text-center text-xs text-muted mb-4 font-medium mt-8">How your ad looks across platforms</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  {(['facebook', 'instagram', 'story'] as const).map(platform => {
                    const ph = platform === 'story' ? 1920 : 1080
                    const platformProps = { ...baseProps, width: 1080, height: ph, imageUrl: productImageUrl, bgColor: productImageUrl ? '#000' : brandAccent, textPosition: 'center' as const }
                    return (
                      <div key={platform} className="flex flex-col items-center">
                        <div className="label text-center mb-3">{platform === 'facebook' ? 'Facebook Feed' : platform === 'instagram' ? 'Instagram Feed' : 'Instagram Story'}</div>
                        <div style={{ maxWidth: platform === 'story' ? 220 : 340, width: '100%' }}>
                          <PlatformAdPreview
                            brand={brand}
                            creative={{ imageUrl: productImageUrl, headline: adVariation.headline, primaryText: adVariation.primary_text, ctaText: landingBrief?.hero?.cta_text || 'Shop Now' }}
                            TemplateComponent={OverlayTemplate}
                            templateProps={platformProps}
                            defaultPlatform={platform}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })() : (
            <div className="flex gap-4 overflow-hidden">
              {[1,2,3,4,5].map(i => <div key={i} className="flex-shrink-0 w-[280px]"><div className={skeleton + ' w-full aspect-square'} /></div>)}
            </div>
          )}
        </div>

        {/* ═══ SECTION 2: Ad Copy ═══ */}
        <div className="mt-12 pt-12 border-t border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">2</span>
              <span className="font-bold text-xl">Ad Copy</span>
            </div>
            <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)} className="text-sm text-muted hover:text-ink transition-colors">
              Edit copy →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => {
              const v = adVariations[i]
              return v ? (
                <div key={i} className="border border-border rounded-card p-5 bg-paper space-y-3">
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide">Variation {i + 1}</div>
                  <div className="font-bold text-base" style={headingStyle}>{v.headline}</div>
                  <p className="text-sm leading-relaxed bg-cream rounded-btn p-3">{v.primary_text}</p>
                  {v.description && <p className="text-sm text-muted bg-cream rounded-btn p-3">{v.description}</p>}
                  <div className="text-xs text-muted font-mono pt-2 border-t border-border">{v.primary_text.length} chars</div>
                </div>
              ) : (
                <div key={i} className="border border-dashed border-border rounded-card p-5 bg-paper flex flex-col items-center justify-center text-center" style={{ minHeight: 200 }}>
                  <div className={skeleton + ' w-8 h-8 rounded-full mb-2'} />
                  <div className="text-sm font-semibold text-muted">Variation {i + 1}</div>
                  <div className="text-xs text-muted mt-1">Generating...</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ═══ SECTION 3: Landing Page ═══ */}
        <div className="mt-12 pt-12 border-t border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">3</span>
              <span className="font-bold text-xl">Landing Page</span>
            </div>
            <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)} className="text-sm text-muted hover:text-ink transition-colors">
              View full brief →
            </button>
          </div>
          {landingBrief ? (
            <div className="max-w-3xl mx-auto border border-border rounded-card overflow-hidden">
              <div className="p-8 text-white" style={{ background: brand.secondary_color ? `linear-gradient(135deg, ${brandAccent}, ${brand.secondary_color})` : brandAccent }}>
                <div className="text-2xl font-black" style={headingStyle}>{landingBrief.hero.headline}</div>
                <div className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>{landingBrief.hero.subheadline}</div>
                <button className="text-sm font-bold mt-4 px-5 py-2 rounded-btn" style={{ background: brand.accent_color || '#fff', color: '#000' }}>{landingBrief.hero.cta_text}</button>
              </div>
              {landingBrief.benefits?.length > 0 && (
                <div className="p-5 bg-paper border-b border-border">
                  <div className="flex flex-wrap gap-2">
                    {landingBrief.benefits.slice(0, 4).map((b, i) => (
                      <span key={i} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ border: `1px solid ${brandAccent}40`, color: brandAccent }}>{b.headline}</span>
                    ))}
                  </div>
                </div>
              )}
              {landingBrief.social_proof && (
                <div className="p-6 bg-cream">
                  <div className="text-3xl font-black" style={{ color: brandAccent }}>{landingBrief.social_proof.stat}</div>
                  <p className="text-sm italic text-muted mt-2 leading-relaxed">{landingBrief.social_proof.testimonial}</p>
                  <p className="text-xs text-muted mt-1">{landingBrief.social_proof.attribution}</p>
                </div>
              )}
              <div className="p-6 bg-paper">
                {landingBrief.problem && (
                  <div className="mb-4">
                    <div className="font-semibold text-sm" style={{ ...headingStyle, color: brandAccent }}>{landingBrief.problem.headline}</div>
                    <div className="text-sm text-muted mt-1">{landingBrief.problem.body}</div>
                  </div>
                )}
                {landingBrief.solution && (
                  <div>
                    <div className="font-semibold text-sm" style={{ ...headingStyle, color: brandAccent }}>{landingBrief.solution.headline}</div>
                    <div className="text-sm text-muted mt-1">{landingBrief.solution.body}</div>
                  </div>
                )}
              </div>
              <div className="p-6 text-white text-center" style={{ background: brand.secondary_color ? `linear-gradient(135deg, ${brandAccent}, ${brand.secondary_color})` : brandAccent }}>
                <div className="font-bold text-lg" style={headingStyle}>{landingBrief.final_cta.headline}</div>
                <button className="text-sm font-bold mt-3 px-5 py-2 rounded-btn" style={{ background: brand.accent_color || '#fff', color: '#000' }}>{landingBrief.final_cta.cta_text}</button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-paper border border-border rounded-card p-8 space-y-4">
              <div className={skeleton + ' h-12 w-3/4'} />
              <div className={skeleton + ' h-4 w-full'} />
              <div className={skeleton + ' h-32 w-full'} />
              <p className="text-muted text-xs">Generating landing brief...</p>
            </div>
          )}
        </div>

        {/* ═══ Context banner ═══ */}
        <div className="mt-12 bg-ink rounded-card p-6 md:p-8 text-center" style={{ color: '#fff' }}>
          <div className="font-bold text-lg mb-1">Make it yours</div>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            This entire funnel was built from your brand context. Customize the copy, upload images, and refine everything.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)}
              className="text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90 inline-flex items-center gap-1.5"
              style={{ background: APP_ACCENT, color: '#000' }}>
              <Pencil size={13} /> Edit campaign
            </button>
            <button onClick={() => navigateWithActivation(`/brands/${brand.id}`)}
              className="text-sm font-bold px-5 py-2.5 rounded-btn border transition-colors hover:border-white inline-flex items-center gap-1.5"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <Plus size={13} /> Add context
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
