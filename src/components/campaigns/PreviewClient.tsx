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
import MagicModal from '@/components/ui/MagicModal'
import CreativeReel from './CreativeReel'
import FunnelReadyModal from '@/components/ui/FunnelReadyModal'

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
  const [magicModal, setMagicModal] = useState<{ mode: 'adcopy' | 'landing'; isDone: boolean } | null>(null)
  const [showReel, setShowReel] = useState(false)
  const [showReadyModal, setShowReadyModal] = useState(false)
  const [previewReady, setPreviewReady] = useState(hasContent)

  // Brand image URLs
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null)
  const [lifestyleImageUrl, setLifestyleImageUrl] = useState<string | null>(null)
  const [allImageUrls, setAllImageUrls] = useState<string[]>([])
  const brandImageUrl = productImageUrl

  // Brand colors
  const brandPrimary = brand.primary_color || '#000000'
  const brandSecondary = brand.secondary_color || brandPrimary
  const brandAccent = brand.accent_color || brandSecondary
  function isLightColor(hex: string): boolean {
    const c = (hex || '').replace('#', ''); if (c.length < 6) return false
    const r = parseInt(c.slice(0,2),16); const g = parseInt(c.slice(2,4),16); const b = parseInt(c.slice(4,6),16)
    return (r*299+g*587+b*114)/1000 > 128
  }
  const textOnPrimary = isLightColor(brandPrimary) ? '#000000' : '#ffffff'
  const textOnAccent = isLightColor(brandAccent) ? '#000000' : '#ffffff'
  console.log('[Brand Colors Applied]', { primary: brandPrimary, secondary: brandSecondary, accent: brandAccent })

  // Brand font
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
      const allUrls = images.map(img => buildImageUrl(img.storage_path))
      setAllImageUrls(allUrls)
      console.log('[Preview] All image URLs:', allUrls.length)
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

  // Auto-generate if no content exists — sequential with MagicModal
  useEffect(() => {
    if (hasContent) return

    async function generate() {
      // Ad copy
      setMagicModal({ mode: 'adcopy', isDone: false })
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/ad-copy`, { method: 'POST' })
        const data = await res.json()
        if (data?.variations) setAdVariations(data.variations)
      } catch (e) { console.error('[Generation] Ad copy failed:', e) }
      setMagicModal({ mode: 'adcopy', isDone: true })
      await new Promise(r => setTimeout(r, 1500))
      setMagicModal(null)
      await new Promise(r => setTimeout(r, 300))

      // Landing brief
      setMagicModal({ mode: 'landing', isDone: false })
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/landing-brief`, { method: 'POST' })
        const data = await res.json()
        if (data?.hero) setLandingBrief(data)
      } catch (e) { console.error('[Generation] Landing failed:', e) }
      setMagicModal({ mode: 'landing', isDone: true })
      await new Promise(r => setTimeout(r, 1500))
      setMagicModal(null)
      await new Promise(r => setTimeout(r, 300))

      // Reel
      setShowReel(true)
    }
    generate()
  }, [])

  const headingStyle: React.CSSProperties = {
    fontFamily: fontFamily ? `${fontFamily}, sans-serif` : undefined,
    textTransform: (fh?.transform || 'none') as React.CSSProperties['textTransform'],
    letterSpacing: fh?.letterSpacing === 'wide' ? '0.12em' : fh?.letterSpacing === 'tight' ? '-0.02em' : 'normal',
  }

  // Cycle images across creative cards
  const img0 = allImageUrls[0] || productImageUrl || null
  const img1 = allImageUrls[1] || productImageUrl || null
  const img2 = allImageUrls[2] || lifestyleImageUrl || productImageUrl || null
  const img3 = allImageUrls[3] || productImageUrl || null
  const img4 = allImageUrls[4] || productImageUrl || null

  // Template props for ad creative
  const templateProps = adVariation ? {
    imageUrl: brandImageUrl,
    headline: adVariation.headline,
    bodyText: adVariation.primary_text.slice(0, 100),
    ctaText: landingBrief?.hero?.cta_text || 'Shop Now',
    brandColor: brandPrimary,
    brandName: brand.name,
    headlineFont: fontFamily,
    headlineWeight: brand.font_heading?.weight || '800',
    headlineTransform: brand.font_heading?.transform || 'none',
    headlineColor: '#ffffff',
    bodyFont: fontFamily,
    bodyWeight: '400',
    bodyTransform: 'none',
    bodyColor: 'rgba(255,255,255,0.85)',
    bgColor: brandPrimary,
    headlineSizeMul: 1,
    bodySizeMul: 1,
    showOverlay: !!brandImageUrl,
    overlayOpacity: brandImageUrl ? 0.3 : 0,
    textBanner: 'none' as const,
    textBannerColor: '#000',
    textPosition: 'center' as const,
    showCta: true,
    ctaColor: brandAccent,
    ctaFontColor: '#ffffff',
    imagePosition: 'center',
  } : null

  const skeleton = 'animate-pulse bg-cream rounded'

  return (
    <div className="min-h-screen" style={{ background: previewReady ? 'var(--cream, #f8f7f4)' : '#000', transition: 'background 0.5s ease' }}>
      {/* MagicModal */}
      <MagicModal
        isOpen={!!magicModal}
        mode={magicModal?.mode || 'adcopy'}
        isDone={magicModal?.isDone || false}
        brandName={brand.name}
        headline={adVariations[0]?.headline}
      />

      {showReel && adVariation && (
        <CreativeReel
          brand={brand}
          adVariation={adVariation}
          imageUrl={brandImageUrl}
          onComplete={() => { setShowReel(false); setShowReadyModal(true) }}
        />
      )}

      <FunnelReadyModal
        isOpen={showReadyModal}
        brandName={brand.name}
        onContinue={() => { setShowReadyModal(false); setPreviewReady(true) }}
      />

      {/* Preview content — hidden until ready */}
      <div style={{ visibility: previewReady ? 'visible' : 'hidden', opacity: previewReady ? 1 : 0, transition: 'opacity 0.5s ease' }}>

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
            const CARD_H = 320
            const baseProps = {
              headline: adVariation.headline,
              bodyText: adVariation.primary_text.slice(0, 100),
              ctaText: landingBrief?.hero?.cta_text || 'Shop Now',
              brandColor: brandPrimary,
              brandName: brand.name,
              headlineFont: fontFamily, headlineWeight: fh?.weight || '800',
              headlineTransform: fh?.transform || 'none',
              headlineColor: textOnPrimary, bodyFont: fontFamily, bodyWeight: '400',
              bodyTransform: 'none', bodyColor: textOnPrimary,
              headlineSizeMul: 1, bodySizeMul: 1,
              showOverlay: true, overlayOpacity: 0.35,
              textBanner: 'none' as const, textBannerColor: brandPrimary,
              showCta: true, ctaColor: brandAccent,
              ctaFontColor: textOnAccent, imagePosition: 'center',
              bgColor: brandPrimary,
            }
            const cards = [
              { label: 'Facebook Feed', srcW: 1080, srcH: 1080, Comp: OverlayTemplate, img: img0, pos: 'center' as const, tp: 'bottom-left' as const },
              { label: 'Instagram 4:5', srcW: 1080, srcH: 1350, Comp: SplitTemplate, img: img1, pos: 'center' as const, tp: 'center' as const },
              { label: 'Social Proof', srcW: 1080, srcH: 1080, Comp: TestimonialTemplate, img: img2, pos: 'bottom' as const, tp: 'center' as const },
              { label: 'Statement', srcW: 1080, srcH: 1080, Comp: StatTemplate, img: img3, pos: 'center' as const, tp: 'center' as const },
              { label: 'Instagram Story', srcW: 1080, srcH: 1920, Comp: OverlayTemplate, img: img4, pos: 'center' as const, tp: 'bottom-left' as const },
            ]
            return (
              <>
                {/* Gallery — all cards 320px tall */}
                <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'flex-start', width: 'fit-content', minWidth: '100%' }}>
                    {cards.map((c, i) => {
                      const scale = CARD_H / c.srcH
                      const cardW = Math.round(c.srcW * scale)
                      return (
                        <div key={i} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textAlign: 'center', fontWeight: 500 }}>{c.label}</div>
                          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, border: '1px solid #e0e0e0', width: cardW, height: CARD_H, flexShrink: 0 }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: c.srcW, height: c.srcH, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                              <c.Comp {...baseProps} width={c.srcW} height={c.srcH} imageUrl={c.img} bgColor={brandPrimary} textPosition={c.tp} imagePosition={c.pos} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Platform mockups — 3 columns */}
                <div style={{ fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 16, marginTop: 24, fontWeight: 500 }}>How your ad looks across platforms</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'flex-start', width: '100%' }}>
                  {(['facebook', 'instagram', 'story'] as const).map(platform => {
                    const fw = platform === 'story' ? 200 : 320
                    const ph = platform === 'story' ? 1920 : 1080
                    const platformProps = { ...baseProps, width: 1080, height: ph, imageUrl: img0, bgColor: brandPrimary, textPosition: 'center' as const }
                    return (
                      <div key={platform} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#888', marginBottom: 12, textAlign: 'center' }}>
                          {platform === 'facebook' ? 'Facebook Feed' : platform === 'instagram' ? 'Instagram Feed' : 'Instagram Story'}
                        </div>
                        <div style={{ maxWidth: fw, width: '100%' }}>
                          <PlatformAdPreview
                            brand={brand}
                            creative={{ imageUrl: img0, headline: adVariation.headline, primaryText: adVariation.primary_text, ctaText: landingBrief?.hero?.cta_text || 'Shop Now' }}
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
              <div className="p-8" style={{ background: brandPrimary, color: textOnPrimary }}>
                <div className="text-2xl font-black" style={headingStyle}>{landingBrief.hero.headline}</div>
                <div className="text-sm mt-2" style={{ opacity: 0.7 }}>{landingBrief.hero.subheadline}</div>
                <button className="text-sm font-bold mt-4 px-5 py-2 rounded-btn" style={{ background: brandAccent, color: textOnAccent }}>{landingBrief.hero.cta_text}</button>
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
              <div className="p-6 text-center" style={{ background: brandPrimary, color: textOnPrimary }}>
                <div className="font-bold text-lg" style={headingStyle}>{landingBrief.final_cta.headline}</div>
                <button className="text-sm font-bold mt-3 px-5 py-2 rounded-btn" style={{ background: brandAccent, color: textOnAccent }}>{landingBrief.final_cta.cta_text}</button>
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
      </div>{/* end preview gate */}
    </div>
  )
}
