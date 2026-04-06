'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import AccountModal from '@/components/ui/AccountModal'
import { colors, font, fontWeight, fontSize, radius, zIndex, shadow, transition, letterSpacing } from '@/lib/design-tokens'

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

const APP_ACCENT = colors.accent

function ScaledCreative({
  Comp, props, srcW, srcH, aspectRatio, borderRadius = 14
}: {
  Comp: React.ComponentType<any>
  props: any
  srcW: number
  srcH: number
  aspectRatio: string
  borderRadius?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w > 0) setScale(w / srcW)
    })
    ro.observe(container)
    const w = container.offsetWidth
    if (w > 0) setScale(w / srcW)
    return () => ro.disconnect()
  }, [srcW])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio,
        position: 'relative',
        overflow: 'hidden',
        borderRadius,
        border: '1px solid var(--border)',
        boxShadow: shadow.cardHover,
      }}
    >
      {scale > 0 && (
        <div
          ref={innerRef}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: srcW,
            height: srcH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          <Comp {...props} width={srcW} height={srcH} />
        </div>
      )}
    </div>
  )
}

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
  const [showAccountModal, setShowAccountModal] = useState(false)

  // Listen for #signup hash (from layout "Get full access" button)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#signup') {
        setShowAccountModal(true)
        history.replaceState(null, '', window.location.pathname)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  async function requireAuth(onAuthed: () => void) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { onAuthed(); return }
    setShowAccountModal(true)
  }

  async function deleteBrandImageByUrl(url: string) {
    const { data: brandImgs } = await supabase
      .from('brand_images').select('id, storage_path').eq('brand_id', brand.id)
    if (!brandImgs) return
    const match = brandImgs.find(img => {
      const cleanPath = img.storage_path.replace(/^brand-images\//, '')
      const publicUrl = supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
      return publicUrl === url
    })
    if (!match) return
    await supabase.from('brand_images').delete().eq('id', match.id)
    await supabase.storage.from('brand-images').remove([match.storage_path]).catch(() => {})
  }

  async function syncBrandChanges() {
    await supabase.from('brands').update({
      primary_color: brandPrimary, secondary_color: brandSecondary,
      accent_color: brandAccent, font_primary: fontFamily || null,
    }).eq('id', brand.id)
  }

  async function activateBrand() {
    setActivating(true)
    await syncBrandChanges()
    await supabase.from('brands').update({ status: 'active' }).eq('id', brand.id)
    sessionStorage.removeItem('attomik_draft_brand_id')
    sessionStorage.removeItem('attomik_draft_campaign_id')
    localStorage.setItem('attomik_active_brand_id', brand.id)
    router.push(`/dashboard?brand=${brand.id}`)
  }

  async function navigateWithActivation(href: string) {
    if (brand.status === 'draft') {
      await syncBrandChanges()
      await supabase.from('brands').update({ status: 'active' }).eq('id', brand.id)
      sessionStorage.removeItem('attomik_draft_brand_id')
      sessionStorage.removeItem('attomik_draft_campaign_id')
    }
    localStorage.setItem('attomik_active_brand_id', brand.id)
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
  const [showWelcomeBack, setShowWelcomeBack] = useState(hasContent)

  useEffect(() => {
    if (!hasContent) return
    const t = setTimeout(() => setShowWelcomeBack(false), 2000)
    return () => clearTimeout(t)
  }, [hasContent])

  // Brand image URLs
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null)
  const [lifestyleImageUrl, setLifestyleImageUrl] = useState<string | null>(null)
  const [allImageUrls, setAllImageUrls] = useState<string[]>([])
  const [shopifyImageUrls, setShopifyImageUrls] = useState<string[]>([])
  const [productImageUrls, setProductImageUrls] = useState<string[]>([])
  const [lifestyleImageUrls, setLifestyleImageUrls] = useState<string[]>([])
  const [logoImageUrls, setLogoImageUrls] = useState<string[]>([])
  const [imagesLoaded, setImagesLoaded] = useState(brandImages.length > 0)
  const brandImageUrl = productImageUrl

  async function filterGoodImages(urls: string[]): Promise<string[]> {
    const results = await Promise.allSettled(
      urls.map(url => new Promise<string | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img.naturalWidth >= 300 && img.naturalHeight >= 300 ? url : null)
        img.onerror = () => resolve(null)
        img.src = url
      }))
    )
    return results.map(r => r.status === 'fulfilled' ? r.value : null).filter((url): url is string => url !== null)
  }

  // Brand colors (editable state)
  // Brand knowledge (local state — updated by generate-voice)
  const [brandMission, setBrandMission] = useState(brand.mission || '')
  const [brandAudience, setBrandAudience] = useState(brand.target_audience || '')
  const [brandVoice, setBrandVoice] = useState(brand.brand_voice || '')
  const [brandTone, setBrandTone] = useState<string[]>(brand.tone_keywords || [])

  const [brandPrimary, setBrandPrimary] = useState(brand.primary_color || colors.ink)
  const [brandSecondary, setBrandSecondary] = useState(brand.secondary_color || brand.primary_color || colors.ink)
  const [brandAccent, setBrandAccent] = useState(brand.accent_color || brand.secondary_color || brand.primary_color || colors.ink)
  function isLightColor(hex: string): boolean {
    const c = (hex || '').replace('#', ''); if (c.length < 6) return false
    const r = parseInt(c.slice(0,2),16); const g = parseInt(c.slice(2,4),16); const b = parseInt(c.slice(4,6),16)
    return (r*299+g*587+b*114)/1000 > 128
  }
  const textOnPrimary = isLightColor(brandPrimary) ? colors.ink : colors.paper
  const textOnAccent = isLightColor(brandAccent) ? colors.ink : colors.paper

  // Brand font (editable state)
  const fh = brand.font_heading
  const [fontFamily, setFontFamily] = useState(fh?.family || brand.font_primary?.split('|')[0] || '')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [savingBrand, setSavingBrand] = useState(false)
  const [emailHtml, setEmailHtml] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [emailGenerated, setEmailGenerated] = useState(false)

  async function saveBrandColors() {
    setSavingBrand(true)
    await supabase.from('brands').update({
      primary_color: brandPrimary,
      secondary_color: brandSecondary,
      accent_color: brandAccent,
      font_primary: fontFamily,
    }).eq('id', brand.id)
    setSavingBrand(false)
    localStorage.setItem('attomik_active_brand_id', brand.id)
    router.push(`/brand-setup/${brand.id}`)
  }

  // Fetch existing email on mount — auto-generate if none exists
  useEffect(() => {
    fetch(`/api/campaigns/${campaign.id}/email`)
      .then(r => r.json())
      .then(data => {
        if (data.html) {
          setEmailHtml(data.html); setEmailSubject(data.subject || ''); setEmailGenerated(true)
        } else {
          // Auto-generate email
          generateEmail()
        }
      })
      .catch(() => { generateEmail() })
  }, [campaign.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateEmail() {
    setGeneratingEmail(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryColor: brandPrimary, accentColor: brandAccent, headingFont: fontFamily, headingTransform: brand.font_heading?.transform || 'none' }),
      })
      const data = await res.json()
      if (data.html) { setEmailHtml(data.html); setEmailSubject(data.subject || ''); setEmailGenerated(true) }
    } catch {}
    setGeneratingEmail(false)
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
      console.log('[Preview] brand images:', images.map(i => ({ id: i.id, tag: i.tag, storage_path: i.storage_path, file_name: i.file_name })))

      // Build set of known logo URLs to exclude
      const logoUrls = new Set<string>()
      if (brand.logo_url) logoUrls.add(brand.logo_url)
      for (const img of images) {
        if (img.tag === 'logo' || /logo/i.test(img.storage_path) || /logo/i.test(img.file_name || '')) {
          logoUrls.add(buildImageUrl(img.storage_path))
        }
      }

      setLogoImageUrls(Array.from(logoUrls))

      // Filter out logos and press from content pools — they shouldn't appear in ad templates
      const contentImages = images.filter(i => {
        if (i.tag === 'logo') return false
        if (/logo/i.test(i.storage_path)) return false
        if (/logo/i.test(i.file_name || '')) return false
        if (/\.svg$/i.test(i.storage_path) || /\.svg$/i.test(i.file_name || '')) return false
        // Check if this image's URL matches the brand logo
        const url = buildImageUrl(i.storage_path)
        if (logoUrls.has(url)) return false
        if (brand.logo_url) {
          try {
            // Compare by original source URL embedded in alt_text or file path
            const logoHost = new URL(brand.logo_url).pathname.split('/').pop()
            if (logoHost && i.file_name && i.file_name.includes(logoHost)) return false
          } catch {}
        }
        return true
      })
      // Shopify images are stored as tag='product' but with file_name prefix 'shopify_'
      const shopify = contentImages.filter(i => /^shopify_/i.test(i.file_name || ''))
      const products = contentImages.filter(i => i.tag === 'product' && !/^shopify_/i.test(i.file_name || ''))
      const lifestyle = contentImages.filter(i => i.tag === 'lifestyle' || i.tag === 'background')
      // Priority: shopify > products > lifestyle > any content
      const bestProduct = shopify[0] || products[0] || contentImages[0]
      if (bestProduct) setProductImageUrl(buildImageUrl(bestProduct.storage_path))
      const bestLifestyle = lifestyle[0] || shopify[0] || products[0] || contentImages[0]
      if (bestLifestyle) setLifestyleImageUrl(buildImageUrl(bestLifestyle.storage_path))
      const shopifyUrls = shopify.map(img => buildImageUrl(img.storage_path))
      const productUrls = products.map(img => buildImageUrl(img.storage_path))
      const lifestyleUrls = lifestyle.map(img => buildImageUrl(img.storage_path))
      setShopifyImageUrls(shopifyUrls)
      setProductImageUrls(productUrls)
      setLifestyleImageUrls(lifestyleUrls)
      const allUrls = contentImages.map(img => buildImageUrl(img.storage_path))
      setAllImageUrls(allUrls)
      filterGoodImages(allUrls).then(goodUrls => {
        if (goodUrls.length >= Math.ceil(allUrls.length * 0.3) || goodUrls.length >= 3) {
          setAllImageUrls(goodUrls)
        }
      })
      filterGoodImages(shopifyUrls).then(good => {
        if (good.length >= Math.ceil(shopifyUrls.length * 0.3) || good.length >= 2) {
          setShopifyImageUrls(good)
        }
      })
      filterGoodImages(productUrls).then(good => {
        if (good.length >= Math.ceil(productUrls.length * 0.3) || good.length >= 2) {
          setProductImageUrls(good)
        }
      })
      filterGoodImages(lifestyleUrls).then(good => {
        if (good.length >= Math.ceil(lifestyleUrls.length * 0.3) || good.length >= 2) {
          setLifestyleImageUrls(good)
        }
      })
    }
    if (brandImages.length > 0) {
      console.log('[Preview] Using server-provided brandImages:', brandImages.length)
      loadImages(brandImages)
      setImagesLoaded(true)

      // Poll for stragglers
      let pollCount = 0
      let knownCount = brandImages.length
      const pollInterval = setInterval(async () => {
        pollCount++
        const { data } = await supabase
          .from('brand_images').select('*')
          .eq('brand_id', brand.id).order('created_at')
        if (data && data.length > knownCount) {
          knownCount = data.length
          loadImages(data as BrandImage[])
          pollCount = 0
        }
        if (pollCount >= 3 || knownCount >= 10) {
          clearInterval(pollInterval)
        }
      }, 3000)
    } else {
      console.log('[Preview] No server images, fetching client-side for brand:', brand.id)
      const fetchImages = () => {
        supabase.from('brand_images').select('*').eq('brand_id', brand.id).order('created_at')
          .then(({ data }) => {
            console.log('[Preview] Client fetch got:', data?.length, 'images')
            if (data?.length) { loadImages(data as BrandImage[]); setImagesLoaded(true) }
          })
      }
      fetchImages()
      // Retry every 2s, reset counter on new data
      let retries = 0
      let lastCount = 0
      const retryInterval = setInterval(async () => {
        retries++
        const { data } = await supabase
          .from('brand_images')
          .select('*')
          .eq('brand_id', brand.id)
          .order('created_at')

        const count = data?.length || 0

        if (count > 0) {
          loadImages(data as BrandImage[])
          setImagesLoaded(true)
        }

        if (count > lastCount) {
          lastCount = count
          retries = 0 // reset on new data
        }

        if ((count > 0 && retries >= 5) || retries >= 20) {
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
      // Generate brand voice — update local state when done
      const needsVoice = !brand.mission && !brand.target_audience && !brand.brand_voice
      if (needsVoice) {
        // Show fallbacks immediately while AI generates
        if (!brandMission) setBrandMission(`${brand.name} delivers quality products to customers who care about what they buy.`)
        if (!brandAudience) setBrandAudience(`Customers interested in ${brand.name} products`)
        if (!brandVoice) setBrandVoice('Professional and approachable')
        if (brandTone.length === 0) setBrandTone(['trustworthy', 'approachable'])

        fetch(`/api/brands/${brand.id}/generate-voice`, { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.voice) {
              if (data.voice.mission) setBrandMission(data.voice.mission)
              if (data.voice.target_audience) setBrandAudience(data.voice.target_audience)
              if (data.voice.brand_voice) setBrandVoice(data.voice.brand_voice)
              if (data.voice.tone_keywords?.length) setBrandTone(data.voice.tone_keywords)
            }
          })
          .catch(() => {})
      }

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
    letterSpacing: fh?.letterSpacing === 'wide' ? letterSpacing.widest : fh?.letterSpacing === 'tight' ? letterSpacing.snug : 'normal',
  }

  // Unified image pool — deduped, seeded shuffle for variety per brand
  const imagePool = (() => {
    const seen = new Set<string>()
    const pool: string[] = []
    for (const url of [...shopifyImageUrls, ...productImageUrls, ...lifestyleImageUrls]) {
      if (!seen.has(url)) { seen.add(url); pool.push(url) }
    }
    // Seeded shuffle based on campaign id for consistent but varied ordering
    const seed = campaign.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed * (i + 1) + 7) % (i + 1)
      const tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp
    }
    return shuffled
  })()

  const SLOTS = 9
  const slotImages: (string | null)[] = (() => {
    if (imagePool.length === 0) return Array(SLOTS).fill(null)
    if (imagePool.length >= SLOTS) {
      // Spread evenly across the pool — each slot picks from a different section
      return Array.from({ length: SLOTS }, (_, i) =>
        imagePool[Math.floor(i * imagePool.length / SLOTS)]
      )
    }
    if (imagePool.length >= 4) {
      // Use each image once, fill remaining from the end of the pool
      const result = [...imagePool]
      while (result.length < SLOTS) result.push(imagePool[imagePool.length - 1 - (result.length % imagePool.length)])
      return result
    }
    // Fewer than 4 — cycle
    return Array.from({ length: SLOTS }, (_, i) => imagePool[i % imagePool.length])
  })()

  const [img0, img1, img2, img3, img4, img5, img6, img7, img8] = slotImages

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
    headlineColor: colors.paper,
    bodyFont: fontFamily,
    bodyWeight: '400',
    bodyTransform: 'none',
    bodyColor: colors.whiteAlpha85,
    bgColor: brandPrimary,
    headlineSizeMul: 1,
    bodySizeMul: 1,
    showOverlay: !!brandImageUrl,
    overlayOpacity: brandImageUrl ? 0.3 : 0,
    textBanner: 'none' as const,
    textBannerColor: colors.ink,
    textPosition: 'center' as const,
    showCta: true,
    ctaColor: brandAccent,
    ctaFontColor: colors.paper,
    imagePosition: 'center',
  } : null

  const skeleton = 'animate-pulse bg-cream rounded'

  return (
    <div className="min-h-screen" style={{ background: colors.ink }}>
      {/* Persistent black screen gate */}
      {!previewReady && (
        <div style={{ position: 'fixed', inset: 0, background: colors.ink, zIndex: zIndex.reelOverlay, pointerEvents: 'none' }} />
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
        allImageUrls={[...shopifyImageUrls, ...productImageUrls, ...lifestyleImageUrls]}
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

      {showWelcomeBack && (
        <div style={{
          position: 'fixed', inset: 0,
          zIndex: 200, background: colors.ink,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16,
          opacity: showWelcomeBack ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}>
          <AttomikLogo height={36} color={colors.paper} />
          <div style={{
            fontFamily: font.heading,
            fontWeight: fontWeight.heading, fontSize: fontSize['5xl'],
            color: colors.paper, textTransform: 'uppercase',
            marginTop: 8,
          }}>
            Your funnel is ready.
          </div>
          <div style={{
            fontSize: fontSize.body,
            color: colors.whiteAlpha40,
          }}>
            Loading {brand.name}...
          </div>
        </div>
      )}

      {/* Preview content — hidden until ready */}
      <div style={{ display: previewReady ? 'block' : 'none', background: 'var(--cream, #f8f7f4)' }}>
      <style>{`
        @media (max-width: 768px) {
          .pv-hero { padding: 40px 20px 32px !important; }
          .pv-hero h1 { font-size: clamp(28px, 8vw, 56px) !important; }
          .pv-funnel-flow { flex-direction: column !important; gap: 24px !important; }
          .pv-funnel-flow .pv-arrow { display: none !important; }
          .pv-compare { grid-template-columns: 1fr !important; }
          .pv-compare-vs { display: none !important; }
          .pv-point { padding-top: 32px !important; }
          .pv-bcb-row { flex-direction: column !important; gap: 20px !important; }
          .pv-bcb-divider { display: none !important; }
          .pv-bcb-grid { grid-template-columns: 180px 1fr !important; }
          .pv-section-head { margin-bottom: 20px !important; }
          .pv-section-head span[style*="fontSize: 26"] { font-size: 20px !important; }
          .pv-draft-bar { flex-direction: column !important; gap: 12px !important; text-align: center !important; }
          .pv-draft-bar button { width: 100% !important; }
          .pv-iframe { height: 380px !important; }
          .pv-brand-bar { flex-direction: column !important; }
        }
        @media (max-width: 480px) {
          .pv-bcb-grid { grid-template-columns: 1fr !important; }
          .pv-hero { padding: 32px 16px 24px !important; }
          .pv-iframe { height: 280px !important; }
        }
      `}</style>


      {brand.status === 'draft' && (
        <div className="max-w-5xl mx-auto px-4 md:px-10 mt-8">
          <div className="pv-draft-bar" style={{
            background: colors.ink,
            borderRadius: radius['3xl'],
            padding: '20px 24px',
            margin: '0 0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div>
              <div style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading, fontSize: fontSize.xl,
                color: colors.paper, marginBottom: 4,
                textTransform: 'uppercase',
              }}>
                Your funnel is ready — save it to your account.
              </div>
              <div style={{
                fontSize: fontSize.md,
                color: colors.whiteAlpha45,
              }}>
                Activate to unlock editing, custom images, and export.
              </div>
            </div>
            <button
              onClick={() => requireAuth(activateBrand)}
              disabled={activating}
              style={{
                background: colors.accent, color: colors.ink,
                fontFamily: font.heading,
                fontWeight: fontWeight.extrabold, fontSize: fontSize.base,
                padding: '12px 28px', borderRadius: radius.pill,
                border: 'none', cursor: 'pointer',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              {activating ? 'Activating...' : 'Activate & save →'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-10 py-8 space-y-8">
        {/* Make your creatives better banner */}
        <div style={{ background: colors.darkBg, borderRadius: radius['4xl'], padding: '36px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, boxShadow: shadow.xl }}>
          <div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['3xl'], color: colors.paper, marginBottom: 6, textTransform: 'uppercase' }}><span style={{ color: colors.accent }}>✦</span> Make your creatives better</div>
            <div style={{ fontSize: fontSize.base, color: colors.whiteAlpha50, lineHeight: 1.6 }}>Add your brand voice, target audience and products to get more accurate copy and creatives.</div>
          </div>
          <button onClick={() => requireAuth(() => { localStorage.setItem('attomik_active_brand_id', brand.id); router.push(`/brand-setup/${brand.id}`) })} style={{ background: colors.accent, color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.extrabold, fontSize: fontSize.base, padding: '14px 28px', borderRadius: radius.pill, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Complete Brand Hub →</button>
        </div>

        {/* Brand control bar */}
        <BrandControlBar
          primaryColor={brandPrimary}
          secondaryColor={brandSecondary}
          accentColor={brandAccent}
          fontFamily={fontFamily}
          allImageUrls={allImageUrls}
          shopifyImageUrls={shopifyImageUrls}
          productImageUrls={productImageUrls}
          lifestyleImageUrls={lifestyleImageUrls}
          logoUrl={brand.logo_url}
          logoImageUrls={logoImageUrls}
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
            setProductImageUrls(prev => [...prev, ...newUrls])
          }}
          onRemoveImage={(url: string) => {
            setAllImageUrls(prev => prev.filter(u => u !== url))
            setShopifyImageUrls(prev => prev.filter(u => u !== url))
            setProductImageUrls(prev => prev.filter(u => u !== url))
            setLifestyleImageUrls(prev => prev.filter(u => u !== url))
            setLogoImageUrls(prev => prev.filter(u => u !== url))
            setActiveImageIndex(0)
            // Delete immediately from brand_images + storage
            void deleteBrandImageByUrl(url)
          }}
          onSave={() => requireAuth(saveBrandColors)}
          saving={savingBrand}
        />

        {/* ═══ BRAND KNOWLEDGE ═══ */}
        {(brandMission || brandVoice || brandAudience || brandTone.length > 0) && (
          <div>
            {/* Section header */}
            <div style={{ padding: '48px 0 32px', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.ink, borderRadius: radius.pill, padding: '6px 16px', fontFamily: font.mono, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 14 }}>
                ✦ AI-generated from your website
              </div>
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 36, textTransform: 'uppercase', color: colors.ink, lineHeight: 1.1, marginBottom: 12 }}>
                What We Know About {brand.name}
              </div>
              <div style={{ fontSize: 18, color: colors.muted, lineHeight: 1.6, maxWidth: 480, margin: '0 auto', marginBottom: 14 }}>
                Our AI scraped your site and built a brand profile. The more you fill in, the better your funnel gets.
              </div>
            </div>

            {/* Brand fields — clean column layout */}
            <div style={{ padding: '0 0 48px', textAlign: 'center' }}>
              {[
                brandMission && { label: 'What you do', text: brandMission },
                brandAudience && { label: 'Who buys from you', text: brandAudience },
                brandVoice && { label: 'How you sound', text: brandVoice },
              ].filter(Boolean).map((field, i, arr) => (
                <div key={i}>
                  <div style={{ display: 'inline-flex', fontFamily: font.mono, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.accent, background: colors.ink, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 8, padding: '6px 16px', borderRadius: radius.pill }}>
                    {(field as { label: string; text: string }).label}
                  </div>
                  <div style={{ fontSize: 18, color: '#333', lineHeight: 1.75 }}>
                    {(field as { label: string; text: string }).text}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', margin: '24px 0' }} />
                  )}
                </div>
              ))}
              {brandTone.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'inline-flex', fontFamily: font.mono, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.accent, background: colors.ink, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 10, padding: '6px 16px', borderRadius: radius.pill }}>
                    Tone
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {brandTone.map((kw: string, i: number) => (
                      <span key={i} style={{ fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink, background: colors.accentLight, border: `1.5px solid ${colors.ink}`, padding: '6px 16px', borderRadius: radius.pill }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* ═══ SECTION 1: Ad Creatives ═══ */}
        <div>
          <div style={{ padding: '48px 0 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.ink, borderRadius: radius.pill, padding: '6px 16px', fontFamily: font.mono, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 14 }}>
              ✦ 9 multi-format creatives
            </div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 36, textTransform: 'uppercase', color: colors.ink, lineHeight: 1.1, marginBottom: 16 }}>
              Ad Creatives
            </div>
            <button onClick={() => requireAuth(() => { localStorage.setItem('attomik_active_brand_id', brand.id); router.push(`/creatives?brand=${brand.id}&campaign=${campaign.id}`) })} style={{ background: colors.accent, color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.extrabold, fontSize: fontSize.base, padding: '14px 28px', borderRadius: radius.pill, border: 'none', cursor: 'pointer' }}>
              Customize in builder →
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
              { label: 'Split', Comp: SplitTemplate, img: img1, variation: v1, tp: 'center' as const, bgColor: brandSecondary },
              { label: 'Testimonial', Comp: TestimonialTemplate, img: img2, variation: v2, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Statement', Comp: StatTemplate, img: img3, variation: v1, tp: 'center' as const, bgColor: brandAccent },
              { label: 'Card', Comp: UGCTemplate, img: img4, variation: v2, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Grid', Comp: GridTemplate, img: img5, secondImg: img6, variation: v0, tp: 'center' as const, bgColor: brandSecondary },
              { label: 'Overlay Alt', Comp: OverlayTemplate, img: img6, variation: v2, tp: 'center' as const, bgColor: brandAccent },
              { label: 'Split Alt', Comp: SplitTemplate, img: img7, variation: v0, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Stat Alt', Comp: StatTemplate, img: img8, variation: v1, tp: 'center' as const, bgColor: brandSecondary },
            ]

            const storyCards = [
              { label: 'Story — Overlay', Comp: OverlayTemplate, img: img0, variation: v0, tp: 'bottom-left' as const, bgColor: brandPrimary },
              { label: 'Story — Split', Comp: SplitTemplate, img: img1, variation: v1, tp: 'center' as const, bgColor: brandSecondary },
              { label: 'Story — Statement', Comp: StatTemplate, img: img2, variation: v2, tp: 'center' as const, bgColor: brandAccent },
              { label: 'Story — Overlay Alt', Comp: OverlayTemplate, img: img3, variation: v1, tp: 'center' as const, bgColor: brandSecondary },
              { label: 'Story — Testimonial', Comp: TestimonialTemplate, img: img4, variation: v2, tp: 'center' as const, bgColor: brandPrimary },
              { label: 'Story — Grid', Comp: GridTemplate, img: img5, secondImg: img7, variation: v0, tp: 'center' as const, bgColor: brandSecondary },
            ]

            function makeProps(card: { variation: typeof v0, img: string | null, secondImg?: string | null, tp: 'center' | 'bottom-left', bgColor: string }) {
              const hColor = card.img ? colors.paper : textOnPrimary
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
                productImageUrl: card.secondImg || undefined,
              }
            }

            return (
              <>
                {/* ── 4:5 GRID — 9 creatives, 3 per row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                  {gridCards.map((card, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.gray750, marginBottom: 8 }}>
                        {card.label}
                      </div>
                      <ScaledCreative
                        Comp={card.Comp}
                        props={makeProps(card)}
                        srcW={SRC_W}
                        srcH={SRC_H}
                        aspectRatio="4/5"
                        borderRadius={radius['2xl']}
                      />
                    </div>
                  ))}
                </div>

                {/* ── 9:16 STORIES — 3 in a row ── */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32, marginBottom: 8 }}>
                  <div style={{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.gray750, marginBottom: 20, textAlign: 'center' }}>
                    Instagram & TikTok Stories
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {storyCards.map((card, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.gray750, marginBottom: 8 }}>
                          {card.label}
                        </div>
                        <ScaledCreative
                          Comp={card.Comp}
                          props={makeProps(card)}
                          srcW={STORY_SRC_W}
                          srcH={STORY_SRC_H}
                          aspectRatio="9/16"
                          borderRadius={radius['3xl']}
                        />
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
        <div>
          <div style={{ padding: '48px 0 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.ink, borderRadius: radius.pill, padding: '6px 16px', fontFamily: font.mono, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 14 }}>
              ✦ 3 copy variations
            </div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 36, textTransform: 'uppercase', color: colors.ink, lineHeight: 1.1 }}>
              Ad Copy
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {adVariations.slice(0, 3).map((v, i) => (
              <div key={i} style={{
                background: i === 0 ? colors.ink : colors.paper,
                border: i === 0 ? 'none' : '1px solid var(--border)',
                borderRadius: radius['3xl'], padding: '28px 28px 24px',
                display: 'flex', flexDirection: 'column', gap: 0,
              }}>
                <div style={{ fontSize: fontSize.body, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.widest, textTransform: 'uppercase', color: i === 0 ? colors.accent : '#bbb', marginBottom: 12 }}>
                  Variation {i + 1}
                </div>
                <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['7xl'], lineHeight: 1.1, letterSpacing: letterSpacing.snug, color: i === 0 ? colors.paper : colors.ink, marginBottom: 20, textTransform: 'uppercase' }}>
                  {v.headline}
                </div>
                <div style={{ width: 32, height: 2, background: i === 0 ? colors.accent : colors.ink, borderRadius: 1, marginBottom: 20 }} />
                <div style={{ fontSize: fontSize.md, lineHeight: 1.7, color: i === 0 ? colors.whiteAlpha65 : colors.grayText, flex: 1, marginBottom: 20 }}>
                  {v.primary_text}
                </div>
                {v.description && (
                  <div style={{ display: 'inline-block', background: i === 0 ? colors.accentAlpha12 : '#f8f8f8', border: i === 0 ? `1px solid ${colors.accentAlpha25}` : '1px solid #e0e0e0', borderRadius: radius.md, padding: '8px 14px', fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.label, textTransform: 'uppercase', color: i === 0 ? colors.accent : '#555', marginBottom: 16 }}>
                    {v.description}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${i === 0 ? colors.whiteAlpha10 : colors.gray300}` }}>
                  <span style={{ fontFamily: 'monospace', fontSize: fontSize.body, color: i === 0 ? colors.whiteAlpha30 : '#bbb' }}>
                    {v.primary_text.length} chars
                  </span>
                  <button id={`copy-btn-${i}`} onClick={() => {
                    const text = `HEADLINE:\n${v.headline}\n\nPRIMARY TEXT:\n${v.primary_text}\n\nDESCRIPTION:\n${v.description}`
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(text).then(() => {
                        const btn = document.getElementById(`copy-btn-${i}`)
                        if (btn) {
                          btn.textContent = 'Copied ✓'
                          btn.style.background = colors.accent
                          btn.style.color = colors.ink
                          setTimeout(() => { btn.textContent = 'Copy all'; btn.style.background = i === 0 ? colors.whiteAlpha10 : colors.gray250; btn.style.color = i === 0 ? colors.paper : colors.ink }, 1500)
                        }
                      })
                    } else {
                      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
                      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
                    }
                  }}
                    style={{ background: i === 0 ? colors.whiteAlpha10 : colors.gray250, border: 'none', borderRadius: radius.md, padding: '6px 14px', fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: i === 0 ? colors.paper : colors.ink, cursor: 'pointer' }}>
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
        <div>
          <div style={{ padding: '48px 0 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.ink, borderRadius: radius.pill, padding: '6px 16px', fontFamily: font.mono, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 14 }}>
              ✦ Conversion-optimized page
            </div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 36, textTransform: 'uppercase', color: colors.ink, lineHeight: 1.1 }}>
              Landing Page
            </div>
          </div>
          {landingBrief ? (
            <div className="pv-iframe" style={{
              width: '100%',
              height: 680,
              position: 'relative',
              borderRadius: radius['4xl'],
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: shadow.heavy,
              background: colors.paper,
            }}>
              <iframe
                src={`/api/campaigns/${campaign.id}/landing-html?primary=${encodeURIComponent(brandPrimary)}&secondary=${encodeURIComponent(brandSecondary)}&accent=${encodeURIComponent(brandAccent)}&font=${encodeURIComponent(fontFamily)}&transform=${encodeURIComponent(brand.font_heading?.transform || 'none')}`}
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '250%',
                  height: '250%',
                  border: 'none',
                  transform: 'scale(0.4)',
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                }}
                title="Landing page preview"
                loading="lazy"
              />
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: 120,
                background: `linear-gradient(to bottom, transparent, ${colors.paper})`,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                bottom: 20, left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', gap: 10,
              }}>
                <a
                  href={`/api/campaigns/${campaign.id}/landing-html?primary=${encodeURIComponent(brandPrimary)}&secondary=${encodeURIComponent(brandSecondary)}&accent=${encodeURIComponent(brandAccent)}&font=${encodeURIComponent(fontFamily)}&transform=${encodeURIComponent(brand.font_heading?.transform || 'none')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: colors.ink, color: colors.accent,
                    fontSize: fontSize.body, fontWeight: fontWeight.bold,
                    padding: '10px 20px', borderRadius: radius.pill,
                    textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: shadow.dark,
                  }}
                >
                  ↗ View full page
                </a>
              </div>
            </div>
          ) : (
            <div className={skeleton + ' w-full h-64 rounded-card'} />
          )}
        </div>

        {/* ═══ SECTION 4: EMAIL ═══ */}
        <div>
          {/* Section header */}
          <div style={{ padding: '48px 0 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.ink, borderRadius: radius.pill, padding: '6px 16px', fontFamily: font.mono, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 14 }}>
              ✦ Campaign email · Klaviyo ready
            </div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 36, textTransform: 'uppercase', color: colors.ink, lineHeight: 1.1 }}>
              Email Master Template
            </div>
          </div>

          {!emailGenerated ? (
            <div style={{ background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius['4xl'], padding: '48px 40px', textAlign: 'center' }}>
              {generatingEmail ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, border: `3px solid ${colors.gray300}`, borderTopColor: colors.ink, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['2xl'], color: colors.ink, textTransform: 'uppercase' }}>Writing your email...</div>
                  <div style={{ fontSize: fontSize.body, color: colors.muted }}>Generating campaign email from your brief</div>
                  <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: fontSize['9xl'], marginBottom: 16 }}>✉</div>
                  <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.ink, textTransform: 'uppercase', marginBottom: 8 }}>Generate campaign email</div>
                  <div style={{ fontSize: fontSize.md, color: colors.muted, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.6 }}>
                    AI generates a complete email using your campaign brief and brand template. Export HTML or push directly to Klaviyo.
                  </div>
                  <button onClick={generateEmail}
                    style={{ background: colors.accent, color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md, padding: '12px 32px', borderRadius: radius.pill, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    ✉ Generate email →
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.xl, overflow: 'hidden', background: colors.paper }}>
                <iframe srcDoc={emailHtml || ''} style={{ width: '100%', height: 900, border: 'none', display: 'block' }} title="Email preview" />
              </div>
            </div>
          )}
        </div>

        {/* ═══ Context banner ═══ */}
        {brand.status === 'draft' ? (
          <div style={{
            marginTop: 48,
            background: colors.ink,
            borderRadius: radius['4xl'],
            padding: '48px 40px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading, fontSize: fontSize['8xl'],
              color: colors.paper, marginBottom: 12,
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}>
              Ready to launch?
            </div>
            <div style={{
              fontSize: fontSize.lg, color: colors.whiteAlpha45,
              maxWidth: 440, margin: '0 auto 32px',
              lineHeight: 1.7,
            }}>
              Upload your creatives to Meta, deploy your landing page,
              and start finding your winners. This funnel was built
              in 30 seconds — testing it takes even less.
            </div>
            <button
              onClick={() => requireAuth(activateBrand)}
              style={{
                background: colors.accent, color: colors.ink,
                fontFamily: font.heading,
                fontWeight: fontWeight.heading, fontSize: fontSize.lg,
                padding: '16px 40px', borderRadius: radius.pill,
                border: 'none', cursor: 'pointer',
              }}
            >
              Activate & continue →
            </button>
          </div>
        ) : (
          <div style={{
            marginTop: 48,
            background: colors.ink,
            borderRadius: radius['4xl'],
            padding: '48px 40px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading, fontSize: fontSize['8xl'],
              color: colors.paper, marginBottom: 12,
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}>
              Make it yours.
            </div>
            <div style={{
              fontSize: fontSize.lg, color: colors.whiteAlpha45,
              maxWidth: 440, margin: '0 auto 32px',
              lineHeight: 1.7,
            }}>
              Open the creative builder to customize templates,
              swap images, and download ad-ready assets.
            </div>
            <button
              onClick={() => requireAuth(() => { localStorage.setItem('attomik_active_brand_id', brand.id); router.push(`/creatives?brand=${brand.id}&campaign=${campaign.id}`) })}
              style={{
                background: colors.accent, color: colors.ink,
                fontFamily: font.heading,
                fontWeight: fontWeight.extrabold, fontSize: fontSize.base,
                padding: '14px 28px', borderRadius: radius.pill,
                border: 'none', cursor: 'pointer',
              }}
            >
              Customize in creative builder →
            </button>
          </div>
        )}
      </div>
      </div>{/* end preview gate */}

      <AccountModal
        isOpen={showAccountModal}
        campaignId={campaign.id}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  )
}
