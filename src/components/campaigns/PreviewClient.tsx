'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Plus, Info } from 'lucide-react'
import { Brand, Campaign, GeneratedContent, BrandImage } from '@/types'
import { createClient } from '@/lib/supabase/client'
import OverlayTemplate from '@/components/creatives/templates/OverlayTemplate'
import SplitTemplate from '@/components/creatives/templates/SplitTemplate'
import StatTemplate from '@/components/creatives/templates/StatTemplate'
import TestimonialTemplate from '@/components/creatives/templates/TestimonialTemplate'
import UGCTemplate from '@/components/creatives/templates/UGCTemplate'
import GridTemplate from '@/components/creatives/templates/GridTemplate'
import MagicModal from '@/components/ui/MagicModal'
import CreativeReel from './CreativeReel'
import FunnelReadyModal from '@/components/ui/FunnelReadyModal'
import AttomikLogo from '@/components/ui/AttomikLogo'
import BrandControlBar from './BrandControlBar'

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

  // Parse existing content — extract ALL variations (handles both formats)
  const existingAdVariations: AdVariation[] = adCopyContent.length > 0
    ? (() => {
        try {
          // Try first row — may contain {variations: [...]} or a single variation
          const parsed = JSON.parse(adCopyContent[0].content)
          if (parsed?.variations && Array.isArray(parsed.variations)) return parsed.variations.slice(0, 3)
          // Old format: each row is a single variation
          const all: AdVariation[] = [parsed].filter(Boolean)
          for (let i = 1; i < Math.min(adCopyContent.length, 3); i++) {
            try { all.push(JSON.parse(adCopyContent[i].content)) } catch {}
          }
          return all
        } catch { return [] }
      })()
    : []

  const existingLandingBrief: LandingBrief | null = landingContent.length > 0
    ? (() => {
        try { return JSON.parse(landingContent[0].content) } catch { return null }
      })()
    : null

  // Generation state
  const [adVariations, setAdVariations] = useState<AdVariation[]>(existingAdVariations)
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
  const [imagesLoaded, setImagesLoaded] = useState(brandImages.length > 0)
  const brandImageUrl = productImageUrl

  // Brand colors (editable state)
  const [brandPrimary, setBrandPrimary] = useState(brand.primary_color || '#000000')
  const [brandSecondary, setBrandSecondary] = useState(brand.secondary_color || brand.primary_color || '#000000')
  const [brandAccent, setBrandAccent] = useState(brand.accent_color || brand.secondary_color || brand.primary_color || '#000000')
  function isLightColor(hex: string): boolean {
    const c = (hex || '').replace('#', ''); if (c.length < 6) return false
    const r = parseInt(c.slice(0,2),16); const g = parseInt(c.slice(2,4),16); const b = parseInt(c.slice(4,6),16)
    return (r*299+g*587+b*114)/1000 > 128
  }
  const textOnPrimary = isLightColor(brandPrimary) ? '#000000' : '#ffffff'
  const textOnAccent = isLightColor(brandAccent) ? '#000000' : '#ffffff'

  // Brand font (editable state)
  const fh = brand.font_heading
  const [fontFamily, setFontFamily] = useState(fh?.family || brand.font_primary?.split('|')[0] || '')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [savingBrand, setSavingBrand] = useState(false)

  async function saveBrandColors() {
    setSavingBrand(true)
    await supabase.from('brands').update({
      primary_color: brandPrimary,
      secondary_color: brandSecondary,
      accent_color: brandAccent,
      font_primary: fontFamily,
    }).eq('id', brand.id)
    setSavingBrand(false)
  }

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
      setImagesLoaded(true)
    } else {
      console.log('[Preview] No server images, fetching client-side for brand:', brand.id)
      // Try immediately, then retry after 3s (images might still be uploading)
      const fetchImages = () => {
        supabase.from('brand_images').select('*').eq('brand_id', brand.id).order('created_at')
          .then(({ data }) => {
            console.log('[Preview] Client fetch got:', data?.length, 'images')
            if (data?.length) { loadImages(data as BrandImage[]); setImagesLoaded(true) }
          })
      }
      fetchImages()
      // Retry every 2s up to 5 times, then force-unlock
      let retries = 0
      const retryInterval = setInterval(async () => {
        retries++
        const { data } = await supabase
          .from('brand_images')
          .select('*')
          .eq('brand_id', brand.id)
          .order('created_at')
        if (data && data.length > 0) {
          loadImages(data as BrandImage[])
          setImagesLoaded(true)
          clearInterval(retryInterval)
          // Final fetch after 3s to catch stragglers
          setTimeout(() => {
            supabase.from('brand_images').select('*')
              .eq('brand_id', brand.id).order('created_at')
              .then(({ data: final }) => {
                if (final && final.length > (data?.length || 0)) {
                  loadImages(final as BrandImage[])
                }
              })
          }, 3000)
        } else if (retries >= 10) {
          setImagesLoaded(true)
          clearInterval(retryInterval)
        }
      }, 2000)
    }
  }, [brand.id, brandImages])

  // Safety timeout — force-unlock preview if modal sequence breaks
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!previewReady) {
        console.warn('[Preview] Safety timeout — forcing previewReady')
        setPreviewReady(true)
      }
    }, 30000)
    return () => clearTimeout(timeout)
  }, [previewReady])

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
      await new Promise(r => setTimeout(r, 600))

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
      await new Promise(r => setTimeout(r, 600))

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

  // Cycle images across creative cards (offset by activeImageIndex)
  const getImg = (offset: number) =>
    allImageUrls.length > 0
      ? allImageUrls[(activeImageIndex + offset) % allImageUrls.length]
      : productImageUrl || null
  const img0 = getImg(0)
  const img1 = getImg(1)
  const img2 = getImg(2)
  const img3 = getImg(3)
  const img4 = getImg(4)
  const img5 = getImg(5)
  const img6 = getImg(6)
  const img7 = getImg(7)
  const img8 = getImg(8)

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
    <div className="min-h-screen" style={{ background: '#000' }}>
      {/* Persistent black screen gate */}
      {!previewReady && (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 150, pointerEvents: 'none' }} />
      )}

      {/* MagicModal */}
      <MagicModal
        isOpen={!!magicModal}
        mode={magicModal?.mode || 'adcopy'}
        isDone={magicModal?.isDone || false}
        brandName={brand.name}
        headline={adVariations[0]?.headline}
        bodyText={adVariations[0]?.primary_text}
      />

      {/* CreativeReel — always mounted, controlled via style */}
      <CreativeReel
        brand={brand}
        adVariation={adVariations[0] || adVariation || { headline: brand.name, primary_text: '', description: '' }}
        imageUrl={img0}
        allImageUrls={allImageUrls}
        adVariations={adVariations}
        isActive={showReel}
        onComplete={() => { setShowReel(false); setShowReadyModal(true) }}
        style={{
          opacity: showReel ? 1 : 0,
          pointerEvents: showReel ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      <FunnelReadyModal
        isOpen={showReadyModal}
        brandName={brand.name}
        onContinue={() => { setShowReadyModal(false); setPreviewReady(true) }}
      />

      {/* Preview content — hidden until ready */}
      <div style={{ visibility: previewReady ? 'visible' : 'hidden', opacity: previewReady ? 1 : 0, transition: 'opacity 0.6s ease', background: 'var(--cream, #f8f7f4)' }}>

      {/* Hero */}
      <div style={{ background: '#000', padding: '64px 32px 56px', textAlign: 'center', marginBottom: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.25)', borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: '#00ff97', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>
          ✦ Built in 30 seconds
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff', marginBottom: 16, textTransform: 'uppercase' }}>
          Your funnel is<br/><span style={{ color: '#00ff97' }}>ready to launch.</span>
        </div>
        <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 32px' }}>
          Ad creatives, copy, and landing page — generated from your brand. Refine below to make it perfect.
        </div>
        {/* Funnel explainer */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 32px 56px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
            {([
              { num: '9', label: 'AD CREATIVES', desc: 'Multi-format visuals built from your brand colors, font and images. Ready to upload directly to Meta.', color: '#a78bfa' },
              null,
              { num: '3', label: 'COPY VARIATIONS', desc: 'Three distinct angles — different hooks, different audiences. Find the message that resonates.', color: '#34d399' },
              null,
              { num: '1', label: 'LANDING PAGE', desc: 'A full conversion page matched to your ad message. Same brand. Same promise. No bounce.', color: '#fbbf24' },
            ] as (null | { num: string; label: string; desc: string; color: string })[]).map((item, i) =>
              item === null ? (
                <div key={i} style={{ alignSelf: 'flex-start', marginTop: 28, padding: '0 8px', color: 'rgba(255,255,255,0.2)', fontSize: 22, flexShrink: 0 }}>→</div>
              ) : (
                <div key={i} style={{ textAlign: 'center', padding: '0 20px', flex: 1 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${item.color}18`, border: `1.5px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, color: item.color }}>{item.num}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.9)', marginBottom: 10, textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              )
            )}
          </div>

          {/* Without vs With */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 0, alignItems: 'stretch', marginBottom: 40 }}>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Without this</div>
              {['Random creative with no system', 'Copy that doesn\'t match the ad', 'Generic page that loses the sale', 'Months wasted finding what works'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                  <span style={{ color: 'rgba(255,100,100,0.9)', fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>✕</span>{t}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 15, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>VS</div>
            <div style={{ border: '1px solid rgba(0,255,151,0.2)', borderRadius: 14, padding: '24px 28px', background: 'rgba(0,255,151,0.03)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00ff97', marginBottom: 12 }}>With this</div>
              {['A complete funnel built in 30 seconds', 'Consistent message from ad to page', 'Landing page that closes the sale', 'Start testing today, find winners fast'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  <span style={{ color: '#00ff97', fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>✓</span>{t}
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,255,151,0.06)', border: '1px solid rgba(0,255,151,0.15)', borderRadius: 999, padding: '6px 18px', marginBottom: 14 }}>
              <span style={{ color: '#00ff97', fontSize: 12, fontWeight: 700 }}>THE POINT</span>
            </div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 8 }}>
              Same message, start to finish.
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Most brands lose because their ad and landing page say different things. This funnel is consistent end-to-end — so you can test faster, learn faster, and find what actually converts.
            </div>
          </div>
        </div>
      </div>

      {brand.status === 'draft' && (
        <div className="max-w-5xl mx-auto px-4 md:px-10 mt-8">
          <div style={{
            background: '#000',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Info size={15} color="#00ff97" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                  This funnel is saved as a draft
                </div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                  Activate it to unlock full editing, brand settings and export.
                </div>
              </div>
            </div>
            <button onClick={activateBrand} disabled={activating} style={{
              background: '#00ff97', color: '#000',
              fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 15,
              padding: '12px 24px', borderRadius: 999, border: 'none',
              cursor: activating ? 'not-allowed' : 'pointer',
              opacity: activating ? 0.7 : 1,
              whiteSpace: 'nowrap', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {activating ? (
                <>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Activating...
                </>
              ) : 'Activate & continue \u2192'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-10 py-8 space-y-8">
        {/* Brand control bar */}
        <BrandControlBar
          primaryColor={brandPrimary}
          secondaryColor={brandSecondary}
          accentColor={brandAccent}
          fontFamily={fontFamily}
          allImageUrls={allImageUrls}
          activeImageIndex={activeImageIndex}
          onPrimaryChange={setBrandPrimary}
          onSecondaryChange={setBrandSecondary}
          onAccentChange={setBrandAccent}
          onFontChange={setFontFamily}
          onImageIndexChange={setActiveImageIndex}
          onAddImages={async (files: File[]) => {
            const newUrls: string[] = []
            for (const file of files) {
              const ext = file.name.split('.').pop() || 'jpg'
              const path = `${brand.id}/manual_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
              const { error } = await supabase.storage.from('brand-images').upload(path, file, { contentType: file.type })
              if (!error) {
                await supabase.from('brand_images').insert({ brand_id: brand.id, file_name: file.name, storage_path: path, mime_type: file.type, tag: 'product' })
                const { data } = supabase.storage.from('brand-images').getPublicUrl(path)
                newUrls.push(data.publicUrl)
              }
            }
            setAllImageUrls(prev => [...prev, ...newUrls])
          }}
          onRemoveImage={(index: number) => {
            setAllImageUrls(prev => prev.filter((_, i) => i !== index))
          }}
          onSave={saveBrandColors}
          saving={savingBrand}
        />

        {/* Hero section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cream rounded-full border border-border text-sm">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: brand.primary_color || '#e0e0e0' }} />
            <span className="font-medium">{brand.name}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black">{campaign.name}</h1>
          {campaign.angle && <p className="text-muted max-w-lg mx-auto">{campaign.angle}</p>}
          <p className="text-sm text-muted max-w-md mx-auto">One consistent message across creative, copy, and landing page — built to convert.</p>
        </div>

        {/* ═══ SECTION 1: Ad Creatives ═══ */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center text-xs font-bold">1</span>
              <span className="font-bold text-xl" style={{ textTransform: 'uppercase' }}>Ad Creatives</span>
            </div>
            <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)} className="text-sm text-muted hover:text-ink transition-colors">
              Edit in creative builder →
            </button>
          </div>

          {adVariation ? (() => {
            const v0 = adVariations[0] || adVariation
            const v1 = adVariations[1] || v0
            const v2 = adVariations[2] || v0

            const SRC_W = 1080
            const SRC_H = 1350
            const STORY_SRC_W = 1080
            const STORY_SRC_H = 1920

            const gridCards = [
              { label: 'Overlay', Comp: OverlayTemplate, img: img0, variation: v0, tp: 'bottom-left' as const, bgColor: brandPrimary },
              { label: 'Split', Comp: SplitTemplate, img: img1, variation: v1, tp: 'center' as const, bgColor: brand.secondary_color || brandPrimary },
              { label: 'Testimonial', Comp: TestimonialTemplate, img: img2, variation: v2, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Statement', Comp: StatTemplate, img: img3, variation: v1, tp: 'center' as const, bgColor: brand.accent_color || brand.secondary_color || brandPrimary },
              { label: 'Card', Comp: UGCTemplate, img: img4, variation: v2, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Grid', Comp: GridTemplate, img: img5, variation: v0, tp: 'center' as const, bgColor: brand.secondary_color || brandPrimary },
              { label: 'Overlay Alt', Comp: OverlayTemplate, img: img6, variation: v2, tp: 'center' as const, bgColor: brand.accent_color || brandPrimary },
              { label: 'Split Alt', Comp: SplitTemplate, img: img7, variation: v0, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Stat Alt', Comp: StatTemplate, img: img8, variation: v1, tp: 'center' as const, bgColor: brand.secondary_color || brand.accent_color || brandPrimary },
            ]

            const storyCards = [
              { label: 'Story — Overlay', Comp: OverlayTemplate, img: img0, variation: v0, tp: 'bottom-left' as const, bgColor: brandPrimary },
              { label: 'Story — Split', Comp: SplitTemplate, img: img1, variation: v1, tp: 'center' as const, bgColor: brand.secondary_color || brandPrimary },
              { label: 'Story — Statement', Comp: StatTemplate, img: img2, variation: v2, tp: 'center' as const, bgColor: brand.accent_color || brandPrimary },
              { label: 'Story — Overlay Alt', Comp: OverlayTemplate, img: img3, variation: v1, tp: 'center' as const, bgColor: brand.secondary_color || brandPrimary },
              { label: 'Story — Testimonial', Comp: TestimonialTemplate, img: img4, variation: v2, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Story — Grid', Comp: GridTemplate, img: img5, variation: v0, tp: 'center' as const, bgColor: brand.accent_color || brand.secondary_color || brandPrimary },
            ]

            function makeProps(card: { variation: typeof v0, img: string | null, tp: 'center' | 'bottom-left', bgColor: string }) {
              const hColor = card.img ? '#ffffff' : textOnPrimary
              return {
                headline: card.variation?.headline || adVariation?.headline || '',
                bodyText: (card.variation?.primary_text || adVariation?.primary_text || '').slice(0, 100),
                ctaText: landingBrief?.hero?.cta_text || 'Shop Now',
                brandColor: brandPrimary,
                brandName: brand.name,
                headlineFont: fontFamily,
                headlineWeight: fh?.weight || '800',
                headlineTransform: fh?.transform || 'none',
                headlineColor: hColor,
                bodyFont: fontFamily,
                bodyWeight: '400',
                bodyTransform: 'none',
                bodyColor: hColor,
                headlineSizeMul: 1,
                bodySizeMul: 1,
                showOverlay: !!card.img,
                overlayOpacity: 0.4,
                textBanner: 'none' as const,
                textBannerColor: card.bgColor,
                showCta: true,
                ctaColor: brandAccent,
                ctaFontColor: textOnAccent,
                imagePosition: 'center',
                bgColor: card.bgColor,
                imageUrl: card.img,
                textPosition: card.tp,
              }
            }

            return (
              <>
                {/* ── 4:5 GRID — 6 creatives, 3 per row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                  {gridCards.map((card, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
                        {card.label}
                      </div>
                      <div style={{ width: '100%', aspectRatio: '4/5', position: 'relative', overflow: 'hidden', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                          <div
                            ref={el => {
                              if (!el) return
                              const w = el.parentElement!.offsetWidth
                              const scale = w / SRC_W
                              el.style.transform = `scale(${scale})`
                            }}
                            style={{ position: 'absolute', top: 0, left: 0, width: SRC_W, height: SRC_H, transformOrigin: 'top left' }}
                          >
                            <card.Comp {...makeProps(card)} width={SRC_W} height={SRC_H} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── 9:16 STORIES — 3 in a row ── */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 20, textAlign: 'center' }}>
                    Instagram & TikTok Stories
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {storyCards.map((card, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>
                          {card.label}
                        </div>
                        <div style={{ width: '100%', aspectRatio: '9/16', position: 'relative', overflow: 'hidden', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
                            <div
                              ref={el => {
                                if (!el) return
                                const w = el.parentElement!.offsetWidth
                                const scale = w / STORY_SRC_W
                                el.style.transform = `scale(${scale})`
                              }}
                              style={{ position: 'absolute', top: 0, left: 0, width: STORY_SRC_W, height: STORY_SRC_H, transformOrigin: 'top left' }}
                            >
                              <card.Comp {...makeProps(card)} width={STORY_SRC_W} height={STORY_SRC_H} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
              <span style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase' }}>Ad Copy</span>
            </div>
            <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)} className="text-sm text-muted hover:text-ink transition-colors">
              Edit copy →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {adVariations.slice(0, 3).map((v, i) => (
              <div key={i} style={{
                background: i === 0 ? '#000' : '#fff',
                border: i === 0 ? 'none' : '1px solid var(--border)',
                borderRadius: 16, padding: '28px 28px 24px',
                display: 'flex', flexDirection: 'column', gap: 0,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: i === 0 ? '#00ff97' : '#bbb', marginBottom: 12 }}>
                  Variation {i + 1}
                </div>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.02em', color: i === 0 ? '#fff' : '#000', marginBottom: 20, textTransform: 'uppercase' }}>
                  {v.headline}
                </div>
                <div style={{ width: 32, height: 2, background: i === 0 ? '#00ff97' : '#000', borderRadius: 1, marginBottom: 20 }} />
                <div style={{ fontSize: 14, lineHeight: 1.7, color: i === 0 ? 'rgba(255,255,255,0.65)' : '#444', flex: 1, marginBottom: 20 }}>
                  {v.primary_text}
                </div>
                {v.description && (
                  <div style={{ display: 'inline-block', background: i === 0 ? 'rgba(0,255,151,0.12)' : '#f8f8f8', border: i === 0 ? '1px solid rgba(0,255,151,0.25)' : '1px solid #e0e0e0', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: i === 0 ? '#00ff97' : '#555', marginBottom: 16 }}>
                    {v.description}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${i === 0 ? 'rgba(255,255,255,0.1)' : '#eee'}` }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: i === 0 ? 'rgba(255,255,255,0.3)' : '#bbb' }}>
                    {v.primary_text.length} chars
                  </span>
                  <button id={`copy-btn-${i}`} onClick={() => {
                    const text = `HEADLINE:\n${v.headline}\n\nPRIMARY TEXT:\n${v.primary_text}\n\nDESCRIPTION:\n${v.description}`
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(text).then(() => {
                        const btn = document.getElementById(`copy-btn-${i}`)
                        if (btn) {
                          btn.textContent = 'Copied ✓'
                          btn.style.background = '#00ff97'
                          btn.style.color = '#000'
                          setTimeout(() => { btn.textContent = 'Copy all'; btn.style.background = i === 0 ? 'rgba(255,255,255,0.1)' : '#f0f0f0'; btn.style.color = i === 0 ? '#fff' : '#000' }, 1500)
                        }
                      })
                    } else {
                      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
                      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
                    }
                  }}
                    style={{ background: i === 0 ? 'rgba(255,255,255,0.1)' : '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: i === 0 ? '#fff' : '#000', cursor: 'pointer' }}>
                    Copy all
                  </button>
                </div>
              </div>
            ))}
            {adVariations.length < 3 && [...Array(3 - adVariations.length)].map((_, i) => (
              <div key={`skel-${i}`} className="border border-dashed border-border rounded-card p-5 bg-paper flex flex-col items-center justify-center text-center" style={{ minHeight: 200 }}>
                <div className={skeleton + ' w-8 h-8 rounded-full mb-2'} />
                <div className="text-sm font-semibold text-muted">Variation {adVariations.length + i + 1}</div>
                <div className="text-xs text-muted mt-1">Generating...</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ SECTION 3: Landing Page ═══ */}
        <div className="mt-12 pt-12 border-t border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-ink text-[#00ff97] flex items-center justify-center text-xs font-black">3</span>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase' }}>Landing Page</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href={`/api/campaigns/${campaign.id}/landing-html`}
                download={`${brand.name.toLowerCase().replace(/\s+/g, '-')}-landing-page.html`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#000', color: '#00ff97', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 999, textDecoration: 'none', border: 'none' }}
              >
                ↓ Download HTML
              </a>
              <button onClick={() => navigateWithActivation(`/campaigns/${campaign.id}`)} style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
                Edit brief →
              </button>
            </div>
          </div>
          {landingBrief ? (
            <div style={{ position: 'relative' }}>
              <div style={{ width: '100%', height: 600, overflow: 'hidden', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', position: 'relative', background: '#fff' }}>
                <iframe
                  src={`/api/campaigns/${campaign.id}/landing-html`}
                  style={{ width: '250%', height: '250%', border: 'none', transform: 'scale(0.4)', transformOrigin: 'top left' }}
                  title="Landing page preview"
                />
              </div>
              <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
                <a href={`/api/campaigns/${campaign.id}/landing-html`} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#000', color: '#00ff97', fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 999, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  ↗ View full page
                </a>
              </div>
            </div>
          ) : (
            <div className={skeleton + ' w-full h-64 rounded-card'} />
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
