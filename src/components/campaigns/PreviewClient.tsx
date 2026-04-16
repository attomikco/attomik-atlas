'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Brand, Campaign, GeneratedContent, BrandImage } from '@/types'
import { createClient } from '@/lib/supabase/client'
import {
  getLogoImages,
  getContentImages,
  bucketBrandImages,
  getBusinessType,
} from '@/lib/brand-images'
import OverlayTemplate from '@/components/creatives/templates/OverlayTemplate'
import SplitTemplate from '@/components/creatives/templates/SplitTemplate'
import StatTemplate from '@/components/creatives/templates/StatTemplate'
import TestimonialTemplate from '@/components/creatives/templates/TestimonialTemplate'
import UGCTemplate from '@/components/creatives/templates/UGCTemplate'
import GridTemplate from '@/components/creatives/templates/GridTemplate'
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

  // Auth + claim state for the "Save this brand" CTA. The wizard creates the
  // brand unclaimed (user_id=null) regardless of whether the visitor is logged
  // in. For logged-in visitors we show a CTA that claims the brand via
  // /api/brands/[id]/claim. Anonymous visitors still go through the sign-up
  // → /auth/confirm claim flow.
  const [authedUserId, setAuthedUserId] = useState<string | null>(null)
  const [brandClaimedByUserId, setBrandClaimedByUserId] = useState<string | null>(
    (brand as unknown as { user_id?: string | null })?.user_id || null
  )
  const [savingBrandToWorkspace, setSavingBrandToWorkspace] = useState(false)
  const [saveBrandError, setSaveBrandError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthedUserId(user?.id || null)
    })
  }, [supabase])

  const brandIsUnclaimed = brandClaimedByUserId === null
  const viewerCanSaveBrand = !!authedUserId && brandIsUnclaimed

  async function saveBrandToWorkspace() {
    if (!authedUserId) {
      setShowAccountModal(true)
      return
    }
    setSavingBrandToWorkspace(true)
    setSaveBrandError(null)
    try {
      const res = await fetch(`/api/brands/${brand.id}/claim`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSaveBrandError(data?.error || `Save failed (HTTP ${res.status})`)
        return
      }
      setBrandClaimedByUserId(authedUserId)
      localStorage.setItem('attomik_active_brand_id', brand.id)
      router.push(`/dashboard?brand=${brand.id}`)
    } catch (e) {
      setSaveBrandError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingBrandToWorkspace(false)
    }
  }

  // Listen for #signup hash (from layout "Get full access" button). Logged-in
  // viewers of an unclaimed brand get routed to the save-to-workspace flow
  // instead of the sign-up modal — the top-bar button becomes a "save" action.
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#signup') {
        history.replaceState(null, '', window.location.pathname)
        if (authedUserId && brandIsUnclaimed) {
          saveBrandToWorkspace()
        } else {
          setShowAccountModal(true)
        }
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authedUserId, brandIsUnclaimed])

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

  // Content state — generation now happens before redirect (in OnboardingWizard)
  const [adVariations, setAdVariations] = useState<AdVariation[]>(existingAdVariations)
  const adVariation = adVariations[0] || null
  const [landingBrief, setLandingBrief] = useState<LandingBrief | null>(existingLandingBrief)

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
  const [copiedId, setCopiedId] = useState<number | null>(null)

  function copyVariation(i: number, v: AdVariation) {
    const text = `HEADLINE:\n${v.headline}\n\nPRIMARY TEXT:\n${v.primary_text}\n\nDESCRIPTION:\n${v.description}`
    const done = () => {
      setCopiedId(i)
      setTimeout(() => setCopiedId(c => (c === i ? null : c)), 1500)
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => {})
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      done()
    }
  }

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

  // Auto-save brand colors/font on change (debounced) so brand hub stays in sync
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialRender = useRef(true)
  useEffect(() => {
    // Skip auto-save on initial mount (values come from DB, no change)
    if (initialRender.current) { initialRender.current = false; return }
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(() => {
      supabase.from('brands').update({
        primary_color: brandPrimary,
        secondary_color: brandSecondary,
        accent_color: brandAccent,
        font_primary: fontFamily || null,
      }).eq('id', brand.id).then(() => {})
    }, 1500)
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [brandPrimary, brandSecondary, brandAccent, fontFamily])

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
      return data.publicUrl
    }
    function loadImages(images: BrandImage[]) {
      // Build set of known logo URLs to exclude from content pools.
      // We still need the brand.logo_url vs file-name match below because some brands
      // have a stored brand.logo_url that may also appear in brand_images without a 'logo' tag.
      const logoUrls = new Set<string>()
      if (brand.logo_url) logoUrls.add(brand.logo_url)
      for (const img of getLogoImages(images)) {
        logoUrls.add(buildImageUrl(img.storage_path))
      }
      setLogoImageUrls(Array.from(logoUrls))

      // Tag-based content pool (excludes logo + press), plus safety filter for
      // SVGs and anything that matches the brand.logo_url file path (legacy data).
      const contentImages = getContentImages(images).filter(i => {
        if (/\.svg$/i.test(i.storage_path) || /\.svg$/i.test(i.file_name || '')) return false
        const url = buildImageUrl(i.storage_path)
        if (logoUrls.has(url)) return false
        if (brand.logo_url) {
          try {
            const logoHost = new URL(brand.logo_url).pathname.split('/').pop()
            if (logoHost && i.file_name && i.file_name.includes(logoHost)) return false
          } catch {}
        }
        return true
      })
      // Smart bucketing — delegates to the shared helper which handles
      // Shopify-vs-non-Shopify brand distinctions and the "collapse when
      // product bucket is empty" rule.
      const { productImages: bucketProduct, lifestyleImages: bucketLifestyle } =
        bucketBrandImages(contentImages, getBusinessType(brand))

      // Lifestyle-first: the single "hero image" defaults used in ad templates
      // prefer lifestyle imagery (sets emotional tone) and fall back to product.
      const bestHero = bucketLifestyle[0] || bucketProduct[0] || contentImages[0]
      if (bestHero) setProductImageUrl(buildImageUrl(bestHero.storage_path))
      const bestLifestyle = bucketLifestyle[0] || bucketProduct[0] || contentImages[0]
      if (bestLifestyle) setLifestyleImageUrl(buildImageUrl(bestLifestyle.storage_path))

      const productUrls = bucketProduct.map(img => buildImageUrl(img.storage_path))
      const lifestyleUrls = bucketLifestyle.map(img => buildImageUrl(img.storage_path))
      // productImageUrls and shopifyImageUrls both mirror the product bucket
      // (kept as two state vars for legacy consumers).
      setShopifyImageUrls(productUrls)
      setProductImageUrls(productUrls)
      setLifestyleImageUrls(lifestyleUrls)
      // allImageUrls is used as the ad-template image pool; order lifestyle-first
      // so carousels/rotations start with lifestyle shots and fall back to products.
      const orderedContent = [
        ...bucketLifestyle,
        ...bucketProduct,
        ...contentImages.filter(i => !bucketLifestyle.includes(i) && !bucketProduct.includes(i)),
      ]
      const allUrls = orderedContent.map(img => buildImageUrl(img.storage_path))
      setAllImageUrls(allUrls)
      filterGoodImages(allUrls).then(goodUrls => {
        if (goodUrls.length >= Math.ceil(allUrls.length * 0.3) || goodUrls.length >= 3) {
          setAllImageUrls(goodUrls)
        }
      })
      filterGoodImages(productUrls).then(good => {
        if (good.length >= Math.ceil(productUrls.length * 0.3) || good.length >= 2) {
          setShopifyImageUrls(good)
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
      loadImages(brandImages)
      setImagesLoaded(true)

      // Poll for stragglers — wizard upload is fire-and-forget, 25-image scrapes
      // routinely take 30s+ to fully land. Stop after 5 consecutive no-change ticks
      // (15s) OR once we've seen 20+ images.
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
        if (pollCount >= 5 || knownCount >= 20) {
          clearInterval(pollInterval)
        }
      }, 3000)
    } else {
      const fetchImages = () => {
        supabase.from('brand_images').select('*').eq('brand_id', brand.id).order('created_at')
          .then(({ data }) => {
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

  // Brand voice — if generation already ran (from OnboardingWizard), the
  // brand object has mission/audience/voice baked in. If it's missing
  // (e.g. direct URL visit to an old brand), fetch it in background.
  useEffect(() => {
    if (brand.mission || brand.target_audience || brand.brand_voice) return
    // Refresh brand data from DB in case generate-voice wrote it after
    // the server component rendered the page.
    const t = setTimeout(() => {
      supabase.from('brands').select('mission, target_audience, brand_voice, tone_keywords')
        .eq('id', brand.id).single()
        .then(({ data }) => {
          if (data?.mission) setBrandMission(data.mission)
          if (data?.target_audience) setBrandAudience(data.target_audience)
          if (data?.brand_voice) setBrandVoice(data.brand_voice)
          if (data?.tone_keywords?.length) setBrandTone(data.tone_keywords)
        })
    }, 2000)
    return () => clearTimeout(t)
  }, [brand.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const headingStyle: React.CSSProperties = {
    fontFamily: fontFamily ? `${fontFamily}, sans-serif` : undefined,
    textTransform: (fh?.transform || 'none') as React.CSSProperties['textTransform'],
    letterSpacing: fh?.letterSpacing === 'wide' ? letterSpacing.widest : fh?.letterSpacing === 'tight' ? letterSpacing.snug : 'normal',
  }

  // Unified image pool — deduped, seeded shuffle for variety per brand.
  // Lifestyle-first: lifestyle shots set the emotional tone for ad templates,
  // product shots serve as fallback when no lifestyle content exists.
  const imagePool = (() => {
    const seen = new Set<string>()
    const pool: string[] = []
    for (const url of [...lifestyleImageUrls, ...shopifyImageUrls, ...productImageUrls]) {
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

  const brandColorDots = [brandPrimary, brandSecondary, brandAccent].filter(c => c && c !== colors.ink)

  const ctaLabel = (() => {
    if (brand.status === 'draft') return activating ? 'Activating...' : 'Activate & save →'
    if (viewerCanSaveBrand) return savingBrandToWorkspace ? 'Saving...' : 'Save to workspace →'
    return 'Get full access →'
  })()
  const ctaAction = () => {
    if (brand.status === 'draft') return requireAuth(activateBrand)
    if (viewerCanSaveBrand) return saveBrandToWorkspace()
    return setShowAccountModal(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.ink }}>
      <style>{`
        @keyframes sectionReveal { from { opacity:0; transform: translateY(32px) } to { opacity:1; transform: translateY(0) } }
        @keyframes pvSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 768px) {
          .pv-hero-band { height: clamp(160px, 32vw, 240px) !important; }
          .pv-hero-name { font-size: clamp(28px, 7vw, 48px) !important; }
          .pv-sticky-bar { padding: 10px 16px !important; }
          .pv-section { padding-left: 16px !important; padding-right: 16px !important; }
          .pv-iframe { height: 380px !important; }
        }
        @media (max-width: 480px) {
          .pv-iframe { height: 280px !important; }
        }
      `}</style>

      {/* ═══ STICKY TOP BAR ═══ */}
      <div className="pv-sticky-bar" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: colors.ink,
        borderBottom: `1px solid ${colors.whiteAlpha10}`,
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {brand.logo_url && (
            <img src={brand.logo_url} alt="" style={{
              maxHeight: 28, objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
            }} onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <span style={{
            fontFamily: font.heading, fontWeight: fontWeight.bold,
            fontSize: fontSize.body, color: colors.paper,
          }}>
            {brand.name}
          </span>
        </div>
        <button
          onClick={ctaAction}
          disabled={activating || savingBrandToWorkspace}
          style={{
            background: colors.accent, color: colors.ink,
            fontFamily: font.heading, fontWeight: fontWeight.bold,
            fontSize: fontSize.caption, borderRadius: radius.pill,
            padding: '10px 24px', border: 'none',
            cursor: (activating || savingBrandToWorkspace) ? 'wait' : 'pointer',
            opacity: (activating || savingBrandToWorkspace) ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {ctaLabel}
        </button>
      </div>

      {/* ═══ HERO BAND ═══ */}
      <div className="pv-hero-band" style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(200px, 28vw, 320px)',
        background: brandPrimary,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: `linear-gradient(to bottom, transparent 0%, ${colors.ink} 100%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {brand.logo_url && (
            <img src={brand.logo_url} alt="" style={{
              maxHeight: 80, maxWidth: 240, objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
              marginBottom: 16,
            }} onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <div className="pv-hero-name" style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: 'clamp(40px, 6vw, 80px)',
            color: colors.paper, textAlign: 'center',
            lineHeight: 1.05, textTransform: 'uppercase',
          }}>
            {brand.name}
          </div>
          {brandColorDots.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {brandColorDots.map((c, i) => (
                <div key={i} style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: c, border: `2px solid ${colors.whiteAlpha20}`,
                }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECTIONS ═══ */}

      {/* Brand Knowledge */}
      {(brandMission || brandVoice || brandAudience || brandTone.length > 0) && (
        <div className="pv-section" style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          marginTop: 'clamp(60px, 8vw, 100px)',
          marginBottom: 'clamp(80px, 10vw, 140px)',
          opacity: 0, animation: 'sectionReveal 0.6s 0.1s ease-out forwards',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <div style={{ width: 2, height: 40, background: colors.accent, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
                Brand Knowledge
              </div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
                ✦ AI-generated from your website
              </div>
            </div>
          </div>
          <div style={{ paddingLeft: 18 }}>
            {[
              brandMission && { label: 'What you do', text: brandMission },
              brandAudience && { label: 'Who buys from you', text: brandAudience },
              brandVoice && { label: 'How you sound', text: brandVoice },
            ].filter(Boolean).map((field, i, arr) => (
              <div key={i} style={{ marginBottom: i < arr.length - 1 ? 32 : 0 }}>
                <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.accent, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 8 }}>
                  {(field as { label: string; text: string }).label}
                </div>
                <div style={{ fontSize: fontSize['2xl'], color: colors.whiteAlpha80, lineHeight: 1.75, maxWidth: 720 }}>
                  {(field as { label: string; text: string }).text}
                </div>
              </div>
            ))}
            {brandTone.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.accent, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', marginBottom: 10 }}>
                  Tone
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {brandTone.map((kw: string, i: number) => (
                    <span key={i} style={{ fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.paper, background: colors.whiteAlpha8, border: `1px solid ${colors.whiteAlpha15}`, padding: '6px 16px', borderRadius: radius.pill }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ad Creatives — hero moment with full-bleed bg */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.whiteAlpha5} 0%, transparent 100%)`,
        padding: '60px 0',
        margin: '0 -60px',
        paddingLeft: 60, paddingRight: 60,
      }}>
        <div className="pv-section" style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          marginBottom: 'clamp(80px, 10vw, 140px)',
          opacity: 0, animation: 'sectionReveal 0.6s 0.2s ease-out forwards',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <div style={{ width: 2, height: 40, background: colors.accent, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
                Ad Creatives
              </div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
                ✦ 9 multi-format creatives
              </div>
            </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 20, marginBottom: 48 }}>
                  {gridCards.map((card, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.whiteAlpha45, marginBottom: 8 }}>
                        {card.label}
                      </div>
                      <ScaledCreative Comp={card.Comp} props={makeProps(card)} srcW={SRC_W} srcH={SRC_H} aspectRatio="4/5" borderRadius={radius['2xl']} />
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: `1px solid ${colors.whiteAlpha10}`, paddingTop: 32 }}>
                  <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.whiteAlpha45, marginBottom: 20, textAlign: 'center' }}>
                    Instagram & TikTok Stories
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 16 }}>
                    {storyCards.map((card, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.whiteAlpha45, marginBottom: 8 }}>
                          {card.label}
                        </div>
                        <ScaledCreative Comp={card.Comp} props={makeProps(card)} srcW={STORY_SRC_W} srcH={STORY_SRC_H} aspectRatio="9/16" borderRadius={radius['3xl']} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          })() : (
            <div style={{ display: 'flex', gap: 20, overflow: 'hidden' }}>
              {[1,2,3].map(i => <div key={i} style={{ flex: 1 }}><div className="animate-pulse" style={{ width: '100%', aspectRatio: '4/5', background: colors.whiteAlpha5, borderRadius: radius['2xl'] }} /></div>)}
            </div>
          )}
        </div>
      </div>

      {/* Ad Copy */}
      <div className="pv-section" style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        marginBottom: 'clamp(80px, 10vw, 140px)',
        opacity: 0, animation: 'sectionReveal 0.6s 0.3s ease-out forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 2, height: 40, background: colors.accent, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Ad Copy
            </div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
              ✦ 3 copy variations
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
          {adVariations.slice(0, 3).map((v, i) => (
            <div key={i} style={{
              background: i === 0 ? colors.whiteAlpha5 : colors.whiteAlpha5,
              border: `1px solid ${colors.whiteAlpha10}`,
              borderRadius: radius['3xl'], padding: '28px 28px 24px',
              display: 'flex', flexDirection: 'column', gap: 0,
            }}>
              <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.widest, textTransform: 'uppercase', color: i === 0 ? colors.accent : colors.whiteAlpha45, marginBottom: 12 }}>
                Variation {i + 1}
              </div>
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['7xl'], lineHeight: 1.1, letterSpacing: letterSpacing.snug, color: colors.paper, marginBottom: 20, textTransform: 'uppercase' }}>
                {v.headline}
              </div>
              <div style={{ width: 32, height: 2, background: i === 0 ? colors.accent : colors.whiteAlpha20, borderRadius: 1, marginBottom: 20 }} />
              <div style={{ fontSize: fontSize.md, lineHeight: 1.7, color: colors.whiteAlpha65, flex: 1, marginBottom: 20 }}>
                {v.primary_text}
              </div>
              {v.description && (
                <div style={{ display: 'inline-block', background: colors.whiteAlpha8, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.md, padding: '8px 14px', fontSize: fontSize.md, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.label, textTransform: 'uppercase', color: colors.whiteAlpha60, marginBottom: 16 }}>
                  {v.description}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: `1px solid ${colors.whiteAlpha10}` }}>
                <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha30 }}>
                  {v.primary_text.length} chars
                </span>
                <button
                  onClick={() => copyVariation(i, v)}
                  style={{
                    background: copiedId === i ? colors.accent : colors.whiteAlpha10,
                    color: copiedId === i ? colors.ink : colors.paper,
                    border: 'none', borderRadius: radius.md,
                    padding: '6px 14px',
                    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
                    cursor: 'pointer',
                    transition: `background ${transition.base}, color ${transition.base}`,
                  }}>
                  {copiedId === i ? 'Copied ✓' : 'Copy all'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Landing Page */}
      <div className="pv-section" style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        marginBottom: 'clamp(80px, 10vw, 140px)',
        opacity: 0, animation: 'sectionReveal 0.6s 0.4s ease-out forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 2, height: 40, background: colors.accent, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Landing Page
            </div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
              ✦ Conversion-optimized page
            </div>
          </div>
        </div>
        {landingBrief ? (
          <div className="pv-iframe" style={{
            width: '100%', height: 680, position: 'relative',
            borderRadius: radius['4xl'], overflow: 'hidden',
            border: `1px solid ${colors.whiteAlpha10}`,
            boxShadow: shadow.heavy, background: colors.paper,
          }}>
            <iframe
              src={`/api/campaigns/${campaign.id}/landing-html?primary=${encodeURIComponent(brandPrimary)}&secondary=${encodeURIComponent(brandSecondary)}&accent=${encodeURIComponent(brandAccent)}&font=${encodeURIComponent(fontFamily)}&transform=${encodeURIComponent(brand.font_heading?.transform || 'none')}`}
              style={{ position: 'absolute', top: 0, left: 0, width: '250%', height: '250%', border: 'none', transform: 'scale(0.4)', transformOrigin: 'top left', pointerEvents: 'none' }}
              title="Landing page preview" loading="lazy"
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: `linear-gradient(to bottom, transparent, ${colors.paper})`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)' }}>
              <a
                href={`/api/campaigns/${campaign.id}/landing-html?primary=${encodeURIComponent(brandPrimary)}&secondary=${encodeURIComponent(brandSecondary)}&accent=${encodeURIComponent(brandAccent)}&font=${encodeURIComponent(fontFamily)}&transform=${encodeURIComponent(brand.font_heading?.transform || 'none')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: colors.ink, color: colors.accent, fontSize: fontSize.body, fontWeight: fontWeight.bold, padding: '10px 20px', borderRadius: radius.pill, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: shadow.dark }}
              >
                ↗ View full page
              </a>
            </div>
          </div>
        ) : (
          <div className="animate-pulse" style={{ width: '100%', height: 256, background: colors.whiteAlpha5, borderRadius: radius['4xl'] }} />
        )}
      </div>

      {/* Email */}
      <div className="pv-section" style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        marginBottom: 'clamp(80px, 10vw, 140px)',
        opacity: 0, animation: 'sectionReveal 0.6s 0.5s ease-out forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 2, height: 40, background: colors.accent, flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Email
            </div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
              ✦ Campaign email · Klaviyo ready
            </div>
          </div>
        </div>

        {!emailGenerated ? (
          <div style={{ background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius['4xl'], padding: '48px 40px', textAlign: 'center' }}>
            {generatingEmail ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, border: `3px solid ${colors.whiteAlpha20}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'pvSpin 0.8s linear infinite' }} />
                <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['2xl'], color: colors.paper, textTransform: 'uppercase' }}>Writing your email...</div>
                <div style={{ fontSize: fontSize.body, color: colors.whiteAlpha45 }}>Generating campaign email from your brief</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: fontSize['9xl'], marginBottom: 16 }}>✉</div>
                <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', marginBottom: 8 }}>Generate campaign email</div>
                <div style={{ fontSize: fontSize.md, color: colors.whiteAlpha45, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px', lineHeight: 1.6 }}>
                  AI generates a complete email using your campaign brief and brand template.
                </div>
                <button onClick={generateEmail}
                  style={{ background: colors.accent, color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md, padding: '12px 32px', borderRadius: radius.pill, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  ✉ Generate email →
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.xl, overflow: 'hidden', background: colors.paper, width: 600, maxWidth: '100%', margin: '0 auto' }}>
            <iframe srcDoc={emailHtml || ''} style={{ width: '100%', height: 600, border: 'none', display: 'block' }} title="Email preview" />
          </div>
        )}
      </div>

      {/* ═══ BOTTOM CTA ═══ */}
      <div style={{
        width: '100%', background: colors.accent,
        padding: 'clamp(48px, 6vw, 80px) 24px',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: font.heading, fontWeight: fontWeight.heading,
          fontSize: 'clamp(32px, 4vw, 56px)',
          color: colors.ink, textTransform: 'uppercase',
          lineHeight: 1.1,
        }}>
          Ready to make it yours?
        </div>
        <div style={{
          fontFamily: font.mono, fontSize: fontSize.body,
          color: colors.ink, opacity: 0.7,
          marginTop: 12,
        }}>
          Customize, publish, and launch — all from one place.
        </div>
        <button
          onClick={() => requireAuth(() => { localStorage.setItem('attomik_active_brand_id', brand.id); router.push(`/creatives?brand=${brand.id}&campaign=${campaign.id}`) })}
          style={{
            background: colors.ink, color: colors.accent,
            fontFamily: font.heading, fontWeight: fontWeight.bold,
            fontSize: fontSize.lg, padding: '18px 48px',
            borderRadius: radius.pill, border: 'none',
            cursor: 'pointer', marginTop: 32,
          }}
        >
          Customize in creative builder →
        </button>
      </div>

      <AccountModal
        isOpen={showAccountModal}
        campaignId={campaign.id}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  )
}
