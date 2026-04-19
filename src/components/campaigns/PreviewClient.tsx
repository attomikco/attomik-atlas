'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import AttomikLogo from '@/components/ui/AttomikLogo'
import AccountModal from '@/components/ui/AccountModal'
import MarketingFooter from '@/components/ui/MarketingFooter'
import LogoImage from '@/components/ui/LogoImage'
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
  // Also capture the style_snapshot (primary/secondary/accent/fontFamily/
  // headingTransform the brand had at generation time). Legacy rows generated
  // before the snapshot field existed fall back to live brand.* values, so
  // older campaigns still render (they just drift with brand edits).
  type AdStyleSnapshot = {
    primary?: string | null
    secondary?: string | null
    accent?: string | null
    fontFamily?: string | null
    headingTransform?: string | null
  }
  const { existingAdVariations, adStyleSnapshot } = ((): {
    existingAdVariations: AdVariation[]
    adStyleSnapshot: AdStyleSnapshot | null
  } => {
    if (adCopyContent.length === 0) return { existingAdVariations: [], adStyleSnapshot: null }
    try {
      const parsed = JSON.parse(adCopyContent[0].content)
      const snapshot = (parsed?.style_snapshot ?? null) as AdStyleSnapshot | null
      if (parsed?.variations && Array.isArray(parsed.variations)) {
        return { existingAdVariations: parsed.variations.slice(0, 3), adStyleSnapshot: snapshot }
      }
      // Old format: each row is a single variation
      const all: AdVariation[] = [parsed].filter(Boolean)
      for (let i = 1; i < Math.min(adCopyContent.length, 3); i++) {
        try { all.push(JSON.parse(adCopyContent[i].content)) } catch {}
      }
      return { existingAdVariations: all, adStyleSnapshot: snapshot }
    } catch { return { existingAdVariations: [], adStyleSnapshot: null } }
  })()

  const existingLandingBrief: LandingBrief | null = landingContent.length > 0
    ? (() => {
        try { return JSON.parse(landingContent[0].content) } catch { return null }
      })()
    : null

  // Frozen snapshot: landing HTML is rendered once at brief-generation time with
  // the brand's palette/fonts baked in and stored on the same row. Preview
  // renders from this stored HTML, so edits to brand colors/fonts elsewhere in
  // the app never drift the Preview. Legacy rows (pre-snapshot) have a null
  // generated_html — those render as a skeleton rather than hitting the live
  // /landing-html endpoint and breaking the frozen guarantee.
  const landingHtml: string | null = landingContent.length > 0
    ? (landingContent[0].generated_html ?? null)
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

  // Intelligence data from generate-voice (stored in brand.notes)
  const parsedNotes = (() => { try { return JSON.parse(brand.notes || '{}') } catch { return {} } })()
  const [intelligenceScore, setIntelligenceScore] = useState<number | null>(parsedNotes.score ?? null)
  const [scoreBreakdown, setScoreBreakdown] = useState<Record<string, number> | null>(parsedNotes.scoreBreakdown ?? null)
  const [insights, setInsights] = useState<Array<{ label: string; text: string }>>(parsedNotes.insights ?? [])

  // Snapshot-preferring colors: when the fb_ad row carries a style_snapshot
  // (new format), creatives + Brand Toolkit freeze to those values. Legacy
  // rows fall through to the brand's live columns. Setters are retained for
  // type compatibility but no longer called — Preview no longer edits these.
  const [brandPrimary, setBrandPrimary] = useState(adStyleSnapshot?.primary || brand.primary_color || colors.ink)
  const [brandSecondary, setBrandSecondary] = useState(adStyleSnapshot?.secondary || brand.secondary_color || brand.primary_color || colors.ink)
  const [brandAccent, setBrandAccent] = useState(adStyleSnapshot?.accent || brand.accent_color || brand.secondary_color || brand.primary_color || colors.ink)
  function isLightColor(hex: string): boolean {
    const c = (hex || '').replace('#', ''); if (c.length < 6) return false
    const r = parseInt(c.slice(0,2),16); const g = parseInt(c.slice(2,4),16); const b = parseInt(c.slice(4,6),16)
    return (r*299+g*587+b*114)/1000 > 128
  }
  const textOnPrimary = isLightColor(brandPrimary) ? colors.ink : colors.paper
  // After the scraper swap, brand.accent_color holds the lightest color and
  // brand.secondary_color holds the vibrant hue-diverse one. In the preview
  // visual treatment, CTAs / statement bgs read off the vibrant color, so
  // textOnAccent (which pairs with the CTA bg below) keys off brandSecondary.
  const textOnAccent = isLightColor(brandSecondary) ? colors.ink : colors.paper

  // Brand font (snapshot-preferring — see color note above)
  const fh = brand.font_heading
  const [fontFamily, setFontFamily] = useState(adStyleSnapshot?.fontFamily || fh?.family || brand.font_primary?.split('|')[0] || '')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [savingBrand, setSavingBrand] = useState(false)
  const [emailHtml, setEmailHtml] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [emailGenerated, setEmailGenerated] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [activeCreative, setActiveCreative] = useState(0)
  // ── Creative Showcase cinematic-carousel state ──
  // activeFloat is the continuous version of activeCreative. It updates
  // every pointermove during a drag and every rAF tick during release /
  // autoplay / dot-click tweens. Card transforms (translateX, scale,
  // opacity, blur, shadow) are all pure functions of (cardIndex −
  // activeFloat) with cyclic wrap-around so the carousel is continuous
  // on every advance path.
  const [activeFloat, setActiveFloat] = useState(0)
  const activeFloatRef = useRef(0)
  const tweenRafRef = useRef<number | null>(null)
  const prefersReducedMotionRef = useRef(false)
  // Tween implementation lives on a ref so consumer effects (autoplay,
  // pointer handlers) never depend on the function's identity. Using
  // useCallback here previously meant the autoplay setInterval was torn
  // down and re-created every time showcaseCount or tween-related state
  // re-memoized the callback — making autoplay brittle under async
  // loads and dev-mode Fast Refresh. The ref always points to the
  // newest impl with the latest showcaseCount closure.
  const tweenActiveFloatRef = useRef<(target: number, durationMs?: number) => void>(() => {})
  const finaleRef = useRef<HTMLDivElement>(null)
  const showcaseScrollRef = useRef<HTMLDivElement>(null)

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
        body: JSON.stringify({ primaryColor: brandPrimary, accentColor: brandSecondary, headingFont: fontFamily, headingTransform: brand.font_heading?.transform || 'none' }),
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
      supabase.from('brands').select('mission, target_audience, brand_voice, tone_keywords, notes')
        .eq('id', brand.id).single()
        .then(({ data }) => {
          if (data?.mission) setBrandMission(data.mission)
          if (data?.target_audience) setBrandAudience(data.target_audience)
          if (data?.brand_voice) setBrandVoice(data.brand_voice)
          if (data?.tone_keywords?.length) setBrandTone(data.tone_keywords)
          if (data?.notes) {
            try {
              const n = JSON.parse(data.notes)
              if (n.score !== undefined) setIntelligenceScore(n.score)
              if (n.scoreBreakdown) setScoreBreakdown(n.scoreBreakdown)
              if (n.insights?.length) setInsights(n.insights)
            } catch {}
          }
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

  // ── Hoisted creative card definitions (shared by Feed, Showcase, and Ad Creatives sections) ──
  const v0 = adVariations[0] || adVariation
  const v1 = adVariations[1] || v0
  const v2 = adVariations[2] || v0
  const SRC_W = 1080
  const SRC_H = 1350
  const STORY_SRC_W = 1080
  const STORY_SRC_H = 1920

  type GridCard = {
    label: string
    Comp: React.ComponentType<any>
    img: string | null
    secondImg?: string | null
    variation: AdVariation | null
    tp: 'center' | 'bottom-left'
    bgColor: string
  }

  const gridCards: GridCard[] = adVariation ? [
    { label: 'Overlay', Comp: OverlayTemplate, img: img0, variation: v0, tp: 'bottom-left', bgColor: brandPrimary },
    { label: 'Split', Comp: SplitTemplate, img: img1, variation: v1, tp: 'center', bgColor: brandAccent },
    { label: 'Testimonial', Comp: TestimonialTemplate, img: img2, variation: v2, tp: 'center', bgColor: brandPrimary },
    { label: 'Statement', Comp: StatTemplate, img: img3, variation: v1, tp: 'center', bgColor: brandSecondary },
    { label: 'Card', Comp: UGCTemplate, img: img4, variation: v2, tp: 'center', bgColor: brandPrimary },
    { label: 'Grid', Comp: GridTemplate, img: img5, secondImg: img6, variation: v0, tp: 'center', bgColor: brandAccent },
    { label: 'Overlay Alt', Comp: OverlayTemplate, img: img6, variation: v2, tp: 'center', bgColor: brandSecondary },
    { label: 'Split Alt', Comp: SplitTemplate, img: img7, variation: v0, tp: 'center', bgColor: brandPrimary },
    { label: 'Stat Alt', Comp: StatTemplate, img: img8, variation: v1, tp: 'center', bgColor: brandAccent },
  ] : []

  const storyCards: GridCard[] = adVariation ? [
    { label: 'Story — Overlay', Comp: OverlayTemplate, img: img0, variation: v0, tp: 'bottom-left', bgColor: brandPrimary },
    { label: 'Story — Split', Comp: SplitTemplate, img: img1, variation: v1, tp: 'center', bgColor: brandAccent },
    { label: 'Story — Statement', Comp: StatTemplate, img: img2, variation: v2, tp: 'center', bgColor: brandSecondary },
    { label: 'Story — Overlay Alt', Comp: OverlayTemplate, img: img3, variation: v1, tp: 'center', bgColor: brandAccent },
    { label: 'Story — Testimonial', Comp: TestimonialTemplate, img: img4, variation: v2, tp: 'center', bgColor: brandPrimary },
    { label: 'Story — Grid', Comp: GridTemplate, img: img5, secondImg: img7, variation: v0, tp: 'center', bgColor: brandAccent },
  ] : []

  function makeCreativeProps(card: GridCard) {
    const hColor = card.img ? colors.paper : textOnPrimary
    const effectiveBgColor = (card.Comp === SplitTemplate || card.Comp === GridTemplate) ? brandPrimary : card.bgColor
    return {
      headline: card.variation?.headline || adVariation?.headline || '',
      bodyText: (card.variation?.primary_text || adVariation?.primary_text || '').slice(0, 100),
      ctaText: landingBrief?.hero?.cta_text || 'Shop Now',
      brandColor: brandPrimary,
      brandName: brand.name,
      headlineFont: fontFamily,
      headlineWeight: fh?.weight || '800',
      headlineTransform: adStyleSnapshot?.headingTransform || fh?.transform || 'none',
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
      textBannerColor: effectiveBgColor,
      showCta: true,
      ctaColor: brandSecondary,
      ctaFontColor: textOnAccent,
      imagePosition: 'center',
      bgColor: effectiveBgColor,
      imageUrl: card.img,
      textPosition: card.tp,
      productImageUrl: card.secondImg || undefined,
    }
  }

  // Feed + Showcase — derived from gridCards
  const showcaseCount = gridCards.length
  // Auto-advance: cycle the active card every 3s. Paused briefly after a user
  // gesture (swipe/wheel/dot click) so manual control doesn't fight the timer.
  const showcaseInteractionRef = useRef<number>(0)

  // Reduced-motion preference — if on, tweens snap instantly. Drag still
  // follows the finger; only the RELEASE animation and autoplay motion
  // become instantaneous.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => { prefersReducedMotionRef.current = mq.matches }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Unmount guard — cancel any in-flight tween so we don't setState on an
  // unmounted component.
  useEffect(() => () => {
    if (tweenRafRef.current !== null) cancelAnimationFrame(tweenRafRef.current)
  }, [])

  // Shared rAF tween helper — used by drag-release, autoplay, dot click,
  // and wheel/trackpad step. Tweens activeFloat to `target` (which may be
  // outside [0, N) to carry directional intent through a wrap-around);
  // on completion, wraps activeFloat + activeCreative into [0, N). Cancels
  // any in-flight tween before starting a new one, so a user gesture mid-
  // autoplay immediately takes over.
  //
  // Stored on a ref and updated every render rather than memoized with
  // useCallback. This keeps the autoplay setInterval stable across
  // re-renders and showcaseCount changes — previously the callback's
  // identity was part of the effect's dep array, which made the interval
  // fragile.
  useEffect(() => {
    tweenActiveFloatRef.current = (target: number, durationMs: number = 300) => {
      if (tweenRafRef.current !== null) {
        cancelAnimationFrame(tweenRafRef.current)
        tweenRafRef.current = null
      }
      const n = showcaseCount
      if (n <= 0) return
      const wrap = (v: number) => ((v % n) + n) % n

      if (prefersReducedMotionRef.current) {
        const wrapped = wrap(target)
        activeFloatRef.current = wrapped
        setActiveFloat(wrapped)
        setActiveCreative(wrapped)
        return
      }

      const start = activeFloatRef.current
      const delta = target - start
      if (delta === 0) {
        const wrapped = wrap(target)
        setActiveCreative(wrapped)
        return
      }
      const t0 = performance.now()
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / durationMs)
        // ease-out-cubic: starts fast, settles slowly — feels cinematic
        const eased = 1 - Math.pow(1 - p, 3)
        const next = start + delta * eased
        activeFloatRef.current = next
        setActiveFloat(next)
        if (p < 1) {
          tweenRafRef.current = requestAnimationFrame(step)
        } else {
          // Final snap — wrap float + int together so cyclic-distance math
          // stays continuous (N ≡ 0 visually, so this is invisible).
          const wrapped = wrap(target)
          activeFloatRef.current = wrapped
          setActiveFloat(wrapped)
          setActiveCreative(wrapped)
          tweenRafRef.current = null
        }
      }
      tweenRafRef.current = requestAnimationFrame(step)
    }
  })

  useEffect(() => {
    if (showcaseCount <= 1) return
    const interval = setInterval(() => {
      if (Date.now() - showcaseInteractionRef.current < 6000) return
      // Target lives outside [0, N) to carry "forward" intent through a
      // wrap-around. E.g. at activeFloat 8 of 9, target = 9. Tween reaches
      // 9, then wraps to 0 on completion — visually continuous.
      const target = Math.round(activeFloatRef.current) + 1
      console.log('[showcase autoplay] advancing to', target)  // TEMP: verify interval firing
      tweenActiveFloatRef.current(target, 700)
    }, 3000)
    return () => clearInterval(interval)
  }, [showcaseCount])

  // Manual navigation: pointer drag (mouse + touch + pen) with live
  // finger-follow, plus horizontal wheel/trackpad step (desktop). Vertical
  // page scroll remains uninterrupted via touchAction: 'pan-y' on the
  // band and the deltaX<deltaY early-return in the wheel handler.
  useEffect(() => {
    if (showcaseCount <= 1) return
    const el = showcaseScrollRef.current
    if (!el) return

    // ── Pointer drag ──
    let dragActive = false
    let pendingPointerId: number | null = null
    let startX = 0
    let startY = 0
    let startFloat = 0
    let lastMoveX = 0
    let lastMoveT = 0
    let velocityPxPerMs = 0
    // "1 card drag distance" derived from band height. Card is aspect 4/5
    // at 85% of band height, so card width ≈ 0.85 · H · 4/5 = 0.68 · H.
    // translateX is 80% of card width per step ⇒ one-step drag ≈ 0.544 · H.
    const getCardStepPx = () => Math.max(200, el.clientHeight * 0.544)
    let cardStepPx = getCardStepPx()

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      // Cancel any in-flight tween so the finger takes over immediately.
      if (tweenRafRef.current !== null) {
        cancelAnimationFrame(tweenRafRef.current)
        tweenRafRef.current = null
      }
      startX = e.clientX
      startY = e.clientY
      startFloat = activeFloatRef.current
      lastMoveX = e.clientX
      lastMoveT = performance.now()
      velocityPxPerMs = 0
      dragActive = false // claim on first horizontally-dominant move
      pendingPointerId = e.pointerId
      cardStepPx = getCardStepPx()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (pendingPointerId !== e.pointerId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      if (!dragActive) {
        // Dead zone — wait for a real move
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        // Vertical-dominant → let page scroll handle it, abort drag
        if (Math.abs(dx) <= Math.abs(dy)) {
          pendingPointerId = null
          return
        }
        dragActive = true
        showcaseInteractionRef.current = Date.now()
        try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      }

      e.preventDefault()
      const now = performance.now()
      const dt = now - lastMoveT
      if (dt > 0) velocityPxPerMs = (e.clientX - lastMoveX) / dt
      lastMoveX = e.clientX
      lastMoveT = now
      // Finger right → activeFloat decreases (pulls previous card in)
      const next = startFloat - dx / cardStepPx
      activeFloatRef.current = next
      setActiveFloat(next)
    }

    const finishDrag = (e: PointerEvent) => {
      if (pendingPointerId !== e.pointerId) return
      const id = pendingPointerId
      pendingPointerId = null
      try { el.releasePointerCapture(id) } catch { /* ignore */ }
      if (!dragActive) return
      dragActive = false

      const dx = e.clientX - startX
      const dragFraction = Math.abs(dx) / cardStepPx
      // Velocity-aware snap: either dragged past 30% of a card OR flicked
      // hard enough. Threshold 0.3 px/ms ≈ 300 px/s.
      const passed = dragFraction > 0.3 || Math.abs(velocityPxPerMs) > 0.3
      let dir = 0
      if (passed) {
        if (Math.abs(velocityPxPerMs) > 0.3) {
          // Velocity wins if it's significant (finger still moving at release)
          dir = velocityPxPerMs > 0 ? -1 : 1
        } else {
          dir = dx > 0 ? -1 : 1
        }
      }
      showcaseInteractionRef.current = Date.now()
      tweenActiveFloatRef.current(Math.round(startFloat) + dir, 500)
    }

    // ── Horizontal wheel / trackpad ──
    let wheelAccum = 0
    let wheelTimer: ReturnType<typeof setTimeout> | null = null
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
      e.preventDefault()
      wheelAccum += e.deltaX
      if (wheelTimer) clearTimeout(wheelTimer)
      wheelTimer = setTimeout(() => { wheelAccum = 0 }, 200)
      if (Math.abs(wheelAccum) >= 60) {
        const dir = wheelAccum > 0 ? 1 : -1
        showcaseInteractionRef.current = Date.now()
        tweenActiveFloatRef.current(Math.round(activeFloatRef.current) + dir, 500)
        wheelAccum = 0
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', finishDrag)
    el.addEventListener('pointercancel', finishDrag)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', finishDrag)
      el.removeEventListener('pointercancel', finishDrag)
      el.removeEventListener('wheel', onWheel)
      if (wheelTimer) clearTimeout(wheelTimer)
    }
  }, [showcaseCount])

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
    ctaColor: brandSecondary,
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
        @keyframes gaugeIn { from { stroke-dashoffset: var(--gauge-circumference) } to { stroke-dashoffset: var(--gauge-offset) } }
        .iphone-screen::-webkit-scrollbar { display: none }
        .iphone-stories::-webkit-scrollbar { display: none }
        @keyframes pvPulseGlow { 0%{box-shadow:0 0 0 0 rgba(0,255,151,0.3)} 70%{box-shadow:0 0 0 12px transparent} 100%{box-shadow:0 0 0 0 transparent} }
        @keyframes pvPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes pvSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes cardFloat0 { from{transform:rotate(-8deg) translateY(0)} to{transform:rotate(-8deg) translateY(-8px)} }
        @keyframes cardFloat1 { from{transform:rotate(6deg) translateY(0)} to{transform:rotate(6deg) translateY(8px)} }
        @keyframes cardFloat2 { from{transform:rotate(-4deg) translateY(0)} to{transform:rotate(-4deg) translateY(-8px)} }
        @keyframes cardFloat3 { from{transform:rotate(5deg) translateY(0)} to{transform:rotate(5deg) translateY(8px)} }
        @keyframes pvScrollDown { from{transform:translateY(0)} to{transform:translateY(-50%)} }
        @keyframes pvScrollUp { from{transform:translateY(-50%)} to{transform:translateY(0)} }
        @media (max-width: 768px) {
          .pv-hero-band { height: auto !important; min-height: 280px !important; padding-top: 40px !important; padding-bottom: 40px !important; }
          .pv-hero-name { font-size: clamp(28px, 7vw, 48px) !important; }
          .pv-sticky-bar { padding: 10px 16px !important; }
          .pv-sticky-bar .pv-bar-brand { display: none !important; }
          .pv-section { padding-left: 16px !important; padding-right: 16px !important; }
          .pv-section-heading { font-size: 24px !important; }
          .pv-iframe { height: 380px !important; }
          .pv-intel-cols { flex-direction: column !important; }
          .pv-intel-left, .pv-intel-right { width: 100% !important; flex: none !important; }
          .pv-intel-grid { grid-template-columns: 1fr !important; }
          .pv-creatives-wrap { margin-left: 0 !important; margin-right: 0 !important; padding-left: 0 !important; padding-right: 0 !important; }
          .pv-copy-headline { font-size: 24px !important; }
          .pv-bar-btn { font-size: 13px !important; padding: 8px 16px !important; }
          .pv-iphone-frame { width: 280px !important; height: 540px !important; }
          .pv-showcase-band { height: clamp(380px, 60vh, 600px) !important; }
          .pv-feed-card { display: none !important; }
          .pv-feed-glow { display: none !important; }
          .pv-feed-stage { min-height: 560px !important; }
          .pv-lifestyle-grid { grid-template-columns: 1fr 1fr !important; grid-template-rows: auto !important; height: auto !important; }
          .pv-lifestyle-grid > div { grid-column: auto !important; grid-row: auto !important; min-height: 180px !important; }
          .pv-lifestyle-cta { padding: 20px 24px !important; }
          .pv-finale { height: 80vh !important; }
          .pv-finale-col { width: clamp(100px, 22vw, 140px) !important; }
          .pv-finale-stats { gap: 24px !important; flex-wrap: wrap !important; }
          .pv-finale-num { font-size: clamp(22px, 4.8vw, 34px) !important; }
          .pv-landing-laptop { display: none !important; }
          .pv-landing-phone { display: block !important; }
          .pv-email-laptop { display: none !important; }
          .pv-email-phone { display: block !important; }
        }
        @media (min-width: 769px) {
          .pv-landing-phone { display: none !important; }
          .pv-email-phone { display: none !important; }
        }
        @media (max-width: 480px) {
          .pv-iframe { height: 280px !important; }
          .pv-bar-btn { font-size: 12px !important; padding: 7px 12px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pv-atlas-beat { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* ═══ STICKY TOP BAR ═══ */}
      <div className="pv-sticky-bar" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: colors.ink,
        borderBottom: `1px solid ${colors.whiteAlpha10}`,
        padding: '12px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <AttomikLogo height={35} color={colors.paper} />
            <span style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading,
              fontSize: fontSize['7xl'], color: colors.paper,
              marginLeft: 12,
            }}>
              Atlas
            </span>
          </Link>
          <div className="pv-bar-brand" style={{ display: 'contents' }}>
            <div style={{ width: 1, height: 16, background: colors.whiteAlpha20, margin: '0 12px' }} />
            <span style={{
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.whiteAlpha45,
            }}>
              {brand.name}
            </span>
          </div>
        </div>
        <div>
          <button
            className="pv-bar-btn"
            onClick={ctaAction}
            disabled={activating || savingBrandToWorkspace}
            style={{
              background: colors.accent, color: colors.ink,
              fontFamily: font.heading, fontWeight: fontWeight.bold,
              fontSize: fontSize.body, borderRadius: radius.pill,
              padding: '10px 24px', border: 'none',
              cursor: (activating || savingBrandToWorkspace) ? 'wait' : 'pointer',
              opacity: (activating || savingBrandToWorkspace) ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            Save your funnel free →
          </button>
        </div>
      </div>

      {/* ═══ HERO BAND ═══ */}
      <div className="pv-hero-band" style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(220px, 28vw, 340px)',
        background: brandPrimary,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%',
          background: `linear-gradient(to bottom, transparent 0%, ${colors.ink} 100%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {brand.logo_url && (
            <LogoImage src={brand.logo_url} alt="" onDark style={{
              maxHeight: 48, maxWidth: 200, objectFit: 'contain',
              marginBottom: 16,
            }} onError={e => { e.currentTarget.style.display = 'none' }} />
          )}
          <div className="pv-hero-name" style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: 'clamp(24px, 3.5vw, 52px)',
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

      {/* ═══ ATLAS NARRATIVE ═══
          Frame-setting beat above the generated outputs. Sequential
          phrase fade-up using the existing `sectionReveal` keyframe
          (120ms stagger). `prefers-reduced-motion` short-circuits to
          instant render via the `.pv-atlas-beat` media-query rule in
          the page-level style block. */}
      <div className="pv-section" style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        marginTop: 'clamp(48px, 6vw, 88px)',
        marginBottom: 'clamp(56px, 7vw, 96px)',
        textAlign: 'center', position: 'relative',
      }}>
        <div className="pv-atlas-beat" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginBottom: 40,
          opacity: 0, animation: 'sectionReveal 0.6s 0.1s ease-out forwards',
        }}>
          <div style={{ width: 40, height: 2, background: colors.accent, marginBottom: 16 }} />
          <div className="pv-section-heading" style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: fontSize['4xl'], color: colors.paper,
            textTransform: 'uppercase', lineHeight: 1.1,
          }}>
            Atlas
          </div>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            color: colors.whiteAlpha45, background: colors.whiteAlpha5,
            border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill,
            padding: '4px 12px', marginTop: 8, display: 'inline-block',
          }}>
            ✦ The work starts after launch
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div className="pv-atlas-beat" style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: 'clamp(24px, 3.2vw, 36px)',
            color: colors.accent, lineHeight: 1.2,
            letterSpacing: letterSpacing.snug,
            marginBottom: 28,
            opacity: 0, animation: 'sectionReveal 0.6s 0.22s ease-out forwards',
          }}>
            Everything below is just the first draft.
          </div>

          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.medium,
            fontSize: 'clamp(17px, 1.9vw, 20px)',
            color: colors.whiteAlpha80, lineHeight: 1.55,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div className="pv-atlas-beat" style={{
              opacity: 0, animation: 'sectionReveal 0.6s 0.34s ease-out forwards',
            }}>
              Atlas measures every ad you run,
            </div>
            <div className="pv-atlas-beat" style={{
              opacity: 0, animation: 'sectionReveal 0.6s 0.46s ease-out forwards',
            }}>
              studies <span style={{ color: colors.accent, fontWeight: fontWeight.bold }}>what your competitors do</span>,
            </div>
            <div className="pv-atlas-beat" style={{
              opacity: 0, animation: 'sectionReveal 0.6s 0.58s ease-out forwards',
            }}>
              and learns from every <span style={{ color: colors.accent, fontWeight: fontWeight.bold }}>campaign</span> on the platform.
            </div>
            <div className="pv-atlas-beat" style={{
              marginTop: 16, color: colors.whiteAlpha55,
              opacity: 0, animation: 'sectionReveal 0.6s 0.7s ease-out forwards',
            }}>
              The next batch is always sharper than the last.
            </div>
          </div>
        </div>
      </div>

      {/* ═══ YOUR BRAND IN THE FEED ═══ */}
      {gridCards.length >= 6 && (
        <div className="pv-section" style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          marginTop: 'clamp(32px, 4vw, 56px)',
          marginBottom: 'clamp(80px, 10vw, 140px)',
          opacity: 0, animation: 'sectionReveal 0.6s 0.1s ease-out forwards',
        }}>
          {/* Section header — centered */}
          <div style={{
            textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1,
          }}>
            <div style={{
              width: 48, height: 2, background: colors.accent, margin: '0 auto 16px',
            }} />
            <div className="pv-section-heading" style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading,
              fontSize: fontSize['4xl'], color: colors.paper,
              textTransform: 'uppercase', lineHeight: 1.1,
            }}>
              Your Brand in the Feed
            </div>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.whiteAlpha45, background: colors.whiteAlpha5,
              border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill,
              padding: '4px 12px', marginTop: 8, display: 'inline-block',
            }}>
              ✦ Live preview
            </div>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.body,
              color: colors.whiteAlpha60, marginTop: 8,
            }}>
              This is what your ads look like to your audience.
            </div>
          </div>

          {/* Stage — phone centered with orbiting cards */}
          <div className="pv-feed-stage" style={{
            position: 'relative', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 700, overflow: 'hidden',
          }}>
            {/* Brand glow orb */}
            <div className="pv-feed-glow" style={{
              position: 'absolute', width: 600, height: 600, borderRadius: '50%',
              background: brandPrimary, filter: 'blur(160px)', opacity: 0.15,
              top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 0, pointerEvents: 'none',
            }} />

            {/* Card 1 — top left: Statement */}
            {gridCards[3] && (
              <div className="pv-feed-card" style={{
                position: 'absolute', width: 220, top: '5%', left: 'calc(50% - 420px)',
                zIndex: 2,
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                borderRadius: radius.xl, overflow: 'hidden',
                animation: 'cardFloat0 6s ease-in-out infinite alternate',
              }}>
                <ScaledCreative Comp={gridCards[3].Comp} props={makeCreativeProps(gridCards[3])} srcW={1080} srcH={1350} aspectRatio="4/5" borderRadius={radius.xl} />
              </div>
            )}
            {/* Card 2 — right middle: Card template */}
            {gridCards[4] && (
              <div className="pv-feed-card" style={{
                position: 'absolute', width: 240, top: '25%', right: 'calc(50% - 430px)',
                zIndex: 2,
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                borderRadius: radius.xl, overflow: 'hidden',
                animation: 'cardFloat1 7s ease-in-out infinite alternate',
              }}>
                <ScaledCreative Comp={gridCards[4].Comp} props={makeCreativeProps(gridCards[4])} srcW={1080} srcH={1350} aspectRatio="4/5" borderRadius={radius.xl} />
              </div>
            )}
            {/* Card 3 — bottom left: Grid template */}
            {gridCards[5] && (
              <div className="pv-feed-card" style={{
                position: 'absolute', width: 200, bottom: '5%', left: 'calc(50% - 400px)',
                zIndex: 2,
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                borderRadius: radius.xl, overflow: 'hidden',
                animation: 'cardFloat2 8s ease-in-out infinite alternate',
              }}>
                <ScaledCreative Comp={gridCards[5].Comp} props={makeCreativeProps(gridCards[5])} srcW={1080} srcH={1350} aspectRatio="4/5" borderRadius={radius.xl} />
              </div>
            )}
            {/* Card 4 — bottom right: Overlay Alt */}
            {gridCards[6] && (
              <div className="pv-feed-card" style={{
                position: 'absolute', width: 210, bottom: '8%', right: 'calc(50% - 420px)',
                zIndex: 2,
                boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                borderRadius: radius.xl, overflow: 'hidden',
                animation: 'cardFloat3 9s ease-in-out infinite alternate',
              }}>
                <ScaledCreative Comp={gridCards[6].Comp} props={makeCreativeProps(gridCards[6])} srcW={1080} srcH={1350} aspectRatio="4/5" borderRadius={radius.xl} />
              </div>
            )}

            {/* iPhone — dead center */}
            <div className="pv-iphone-frame" style={{
              position: 'relative', zIndex: 3, width: 300, height: 580,
              borderRadius: 44, background: '#1a1a1a',
              border: '4px solid #333', overflow: 'hidden',
              boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
            }}>
              {/* Notch */}
              <div style={{
                width: 120, height: 28, background: '#1a1a1a',
                borderRadius: '0 0 16px 16px', margin: '0 auto',
                position: 'relative', zIndex: 2,
              }} />

              {/* Screen */}
              <div className="iphone-screen" style={{
                background: '#ffffff', height: 'calc(100% - 28px)',
                overflowY: 'auto', scrollbarWidth: 'none',
              }}>
                {/* Instagram top bar */}
                <div style={{
                  background: '#fff', borderBottom: '1px solid #efefef',
                  padding: '10px 16px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 3,
                }}>
                  <span style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontStyle: 'italic', fontSize: 20, color: '#000', fontWeight: 400,
                  }}>
                    Instagram
                  </span>
                  <div style={{ display: 'flex', gap: 16, fontSize: 18, color: '#000' }}>
                    <span>♡</span>
                    <span>✉</span>
                  </div>
                </div>

                {/* Stories bar */}
                <div className="iphone-stories" style={{
                  padding: '12px 16px', borderBottom: '1px solid #efefef',
                  display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none',
                }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4, flexShrink: 0,
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: brandPrimary,
                      border: `2px solid ${colors.accent}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}>
                      {brand.logo_url ? (
                        <LogoImage src={brand.logo_url} alt="" onDark={!isLightColor(brandPrimary)} style={{
                          width: 28, height: 28, objectFit: 'contain',
                        }} onError={e => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <span style={{
                          color: textOnPrimary, fontFamily: font.heading,
                          fontWeight: fontWeight.heading, fontSize: 18,
                        }}>
                          {brand.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10, color: '#000', maxWidth: 48,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', textAlign: 'center',
                    }}>
                      {brand.name.toLowerCase().replace(/\s+/g, '')}
                    </span>
                  </div>
                  {([
                    { name: 'sarah.m', avatar: 'https://i.pravatar.cc/150?img=47' },
                    { name: 'javier_r', avatar: 'https://i.pravatar.cc/150?img=68' },
                    { name: 'emma.k', avatar: 'https://i.pravatar.cc/150?img=32' },
                  ] as const).map(profile => (
                    <div key={profile.name} style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4, flexShrink: 0,
                    }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: '2px solid #dbdbdb' }}>
                        <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      </div>
                      <span style={{ fontSize: 10, color: '#8e8e8e' }}>{profile.name}</span>
                    </div>
                  ))}
                </div>

                {/* Feed posts — same order as Ad Creatives grid */}
                {[0, 1, 2, 3, 4, 5].map((cardIdx, postIdx) => {
                  const card = gridCards[cardIdx]
                  const captionRaw = card.variation?.primary_text || `Discover ${brand.name}`
                  const caption = captionRaw.length > 100 ? captionRaw.slice(0, 100) + '...' : captionRaw
                  const likes = Math.floor(1000 + (postIdx * 1234 + 567) % 8999)
                  const handle = brand.name.toLowerCase().replace(/\s+/g, '')
                  return (
                    <div key={postIdx} style={{ borderBottom: '1px solid #efefef' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '10px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            overflow: 'hidden', background: brandPrimary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {brand.logo_url ? (
                              <LogoImage src={brand.logo_url} alt="" onDark={!isLightColor(brandPrimary)} style={{
                                width: 20, height: 20, objectFit: 'contain',
                              }} onError={e => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <span style={{
                                color: textOnPrimary, fontFamily: font.heading,
                                fontWeight: fontWeight.heading, fontSize: 12,
                              }}>
                                {brand.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#000' }}>{handle}</div>
                            <div style={{ fontSize: 10, color: '#8e8e8e' }}>Sponsored</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 16, color: '#000', letterSpacing: 2 }}>···</span>
                      </div>
                      <ScaledCreative Comp={card.Comp} props={makeCreativeProps(card)} srcW={1080} srcH={1080} aspectRatio="1/1" borderRadius={0} />
                      <div style={{
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '8px 16px',
                      }}>
                        <div style={{ display: 'flex', gap: 16, fontSize: 22, color: '#000' }}>
                          <span>♡</span><span>💬</span><span>✈</span>
                        </div>
                        <span style={{ fontSize: 22, color: '#000' }}>⚑</span>
                      </div>
                      <div style={{ padding: '0 16px', fontSize: 12, fontWeight: 600, color: '#000' }}>
                        {likes.toLocaleString()} likes
                      </div>
                      <div style={{ padding: '4px 16px 8px', fontSize: 12, color: '#000', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600 }}>{handle} </span>
                        {caption}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AI LIFESTYLE IMAGES ═══ */}
      {imagePool.length > 0 && (
        <div className="pv-section" style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          marginTop: 'clamp(32px, 4vw, 56px)',
          marginBottom: 'clamp(80px, 10vw, 140px)',
          opacity: 0, animation: 'sectionReveal 0.6s 0.15s ease-out forwards',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: brandPrimary, filter: 'blur(160px)', opacity: 0.1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Section header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
              <div style={{ width: 40, height: 2, background: colors.accent, margin: '0 auto 20px' }} />
              <div className="pv-section-heading" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
                AI Lifestyle Images
              </div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
                ✦ Powered by Atlas
              </div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.body, color: colors.whiteAlpha60, textAlign: 'center', maxWidth: 560, margin: '8px auto 0' }}>
                Generate custom lifestyle scenes trained on your brand — no product distortion, pure brand atmosphere.
              </div>
            </div>

            {/* Gallery grid + locked overlay */}
            {(() => {
              const imgs = imagePool.slice(0, 4)
              const count = imgs.length
              const gridStyle: React.CSSProperties = count >= 4
                ? { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, height: 'clamp(400px, 50vw, 560px)' }
                : count === 3
                ? { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, height: 'clamp(400px, 50vw, 560px)' }
                : count === 2
                ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: 'clamp(300px, 40vw, 440px)' }
                : { display: 'grid', gridTemplateColumns: '1fr', gap: 12, height: 'clamp(300px, 40vw, 440px)' }

              const cellPositions: React.CSSProperties[] = count >= 4
                ? [
                    { gridColumn: 1, gridRow: '1 / 3' },
                    { gridColumn: 2, gridRow: 1 },
                    { gridColumn: 3, gridRow: 1 },
                    { gridColumn: '2 / 4', gridRow: 2 },
                  ]
                : count === 3
                ? [
                    { gridColumn: 1, gridRow: '1 / 3' },
                    { gridColumn: 2, gridRow: 1 },
                    { gridColumn: 3, gridRow: 1 },
                  ]
                : count === 2
                ? [{}, {}]
                : [{}]

              return (
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <div className="pv-lifestyle-grid" style={gridStyle}>
                    {imgs.map((url, i) => (
                      <div key={i} style={{
                        position: 'relative', overflow: 'hidden', borderRadius: radius.lg,
                        ...cellPositions[i],
                      }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: radius.lg, filter: 'blur(3px)', transform: 'scale(1.05)' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                          borderRadius: radius.lg, transition: 'all 0.3s ease',
                        }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.45)' }} />
                      </div>
                    ))}
                  </div>

                  {/* Center unlock CTA */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)', zIndex: 10, textAlign: 'center',
                  }}>
                    <div className="pv-lifestyle-cta" style={{
                      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: `1px solid ${colors.whiteAlpha20}`, borderRadius: radius.xl,
                      padding: '32px 40px',
                    }}>
                      <div style={{ fontSize: fontSize['2xl'], marginBottom: 8 }}>🔒</div>
                      <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.xl, color: colors.paper, textTransform: 'uppercase' }}>
                        Generate AI Lifestyle Scenes
                      </div>
                      <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha60, marginTop: 8 }}>
                        Custom scenes. Your aesthetic. No product distortion.
                      </div>
                      <button
                        onClick={() => requireAuth(() => {})}
                        style={{
                          background: colors.accent, color: colors.ink,
                          fontFamily: font.heading, fontWeight: fontWeight.bold,
                          fontSize: fontSize.body, borderRadius: radius.pill,
                          padding: '14px 32px', border: 'none', cursor: 'pointer',
                          marginTop: 20, animation: 'pvPulseGlow 2s infinite',
                        }}
                      >
                        Unlock with free account →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ═══ CREATIVE SHOWCASE ═══ */}
      {gridCards.length > 0 && (
        <div style={{
          marginTop: 'clamp(32px, 4vw, 56px)',
          marginBottom: 'clamp(80px, 10vw, 140px)',
          opacity: 0, animation: 'sectionReveal 0.6s 0.15s ease-out forwards',
        }}>
          {/* Section header — centered */}
          <div className="pv-section" style={{
            maxWidth: 1080, margin: '0 auto', padding: '0 24px', marginBottom: 32,
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ width: 2, height: 40, background: colors.accent, flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <div className="pv-section-heading" style={{
                  fontFamily: font.heading, fontWeight: fontWeight.heading,
                  fontSize: fontSize['4xl'], color: colors.paper,
                  textTransform: 'uppercase', lineHeight: 1.1,
                }}>
                  Creative Showcase
                </div>
                <div style={{
                  fontFamily: font.mono, fontSize: fontSize.caption,
                  color: colors.whiteAlpha45, background: colors.whiteAlpha5,
                  border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill,
                  padding: '4px 12px', marginTop: 8, display: 'inline-block',
                }}>
                  ✦ {showcaseCount} formats ready
                </div>
              </div>
            </div>
          </div>

          {/* Full-width showcase band */}
          <div
            ref={showcaseScrollRef}
            className="pv-showcase-band"
            style={{
              width: '100vw', marginLeft: 'calc(-50vw + 50%)',
              position: 'relative', height: 'clamp(500px, 70vh, 800px)',
              overflow: 'hidden',
              touchAction: 'pan-y',
              // Lets desktop horizontal-wheel gestures land on this element
              // before the browser consumes them as page scroll.
              overscrollBehaviorX: 'contain',
            }}
          >
            {/* Background — pure black */}
            <div style={{ position: 'absolute', inset: 0, background: colors.ink, zIndex: 0 }} />

            {/* Carousel peek — rendered creative templates */}
            <div style={{
              position: 'relative', zIndex: 1, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {gridCards.map((card, idx) => {
                if (!card) return null
                // Cyclic distance from the continuous activeFloat. Wraps to
                // [-N/2, N/2) so card N-1 appears to the LEFT of card 0 when
                // activeFloat is near 0, etc. — visual continuity across the
                // wrap-around.
                const half = showcaseCount / 2
                let distance = idx - activeFloat
                while (distance >= half) distance -= showcaseCount
                while (distance < -half) distance += showcaseCount

                const absD = Math.abs(distance)
                // Clamp visual weight to 1 at the edge; cards beyond |d|=1
                // stay at the edge look so they don't keep shrinking/fading
                // off into nothing during drag overshoot.
                const d = Math.min(absD, 1)

                // Endpoints match the old static values at rest:
                //   translateX: ±80% at |d|=1 → 0 at center
                //   scale:     0.85 at |d|=1 → 1 at center
                //   opacity:   0.6 at |d|=1 → 1 at center
                //   blur:      2px at |d|=1 → 0 at center
                const translateXPct = distance * 80
                const scale = 1 - d * 0.15
                const opacity = 1 - d * 0.4
                const blurPx = d * 2
                // Fade the shadow alpha + vignette opacity continuously so
                // the "active card" glow blooms in as a card approaches
                // center rather than snapping on/off.
                const shadowAlpha = (1 - d) * 0.5
                const vignetteOpacity = 1 - d
                // Hide far-off-screen cards from interaction + a11y tree so
                // they don't steal clicks or announce to screen readers.
                const interactive = absD < 0.5
                // Keep the nearest card on top; distance grows z-index falls.
                const zIndex = absD < 0.01 ? 3 : absD < 1 ? 2 : 1

                return (
                  <div key={idx} style={{
                    position: 'absolute',
                    height: '85%', aspectRatio: '4/5',
                    borderRadius: radius.xl, overflow: 'hidden',
                    transform: `translateX(${translateXPct}%) scale(${scale})`,
                    opacity,
                    filter: blurPx > 0.05 ? `blur(${blurPx}px)` : 'none',
                    zIndex,
                    pointerEvents: interactive ? 'auto' : 'none',
                    boxShadow: shadowAlpha > 0.01 ? `0 40px 80px rgba(0,0,0,${shadowAlpha})` : 'none',
                    // No CSS transition — every tick drives the transforms
                    // directly via activeFloat state changes (drag pointer-
                    // move, release rAF, autoplay rAF, dot/wheel rAF).
                  }}>
                    <ScaledCreative Comp={card.Comp} props={makeCreativeProps(card)} srcW={SRC_W} srcH={SRC_H} aspectRatio="4/5" borderRadius={radius.xl} />
                    {/* Vignette gradient — fades in as card approaches center */}
                    {vignetteOpacity > 0.01 && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)',
                        height: '40%', zIndex: 2, pointerEvents: 'none',
                        opacity: vignetteOpacity,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Navigation dots — click to jump to that card. */}
            <div style={{
              position: 'absolute', bottom: 24, left: '50%',
              transform: 'translateX(-50%)', zIndex: 3,
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              {gridCards.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  aria-label={`Show creative ${dotIdx + 1}`}
                  onClick={() => {
                    showcaseInteractionRef.current = Date.now()
                    // Shortest cyclic path — carousel picks the direction
                    // that minimizes travel, so clicking dot 0 from card N-1
                    // moves forward (one card) instead of backward (N-1 cards).
                    const current = activeFloatRef.current
                    const roundedCurrent = Math.round(current)
                    const forwardTarget = dotIdx >= roundedCurrent ? dotIdx : dotIdx + showcaseCount
                    const backwardTarget = dotIdx <= roundedCurrent ? dotIdx : dotIdx - showcaseCount
                    const target = (forwardTarget - roundedCurrent) <= (roundedCurrent - backwardTarget)
                      ? forwardTarget
                      : backwardTarget
                    tweenActiveFloatRef.current(target, 600)
                  }}
                  style={{
                    height: 8,
                    width: dotIdx === activeCreative ? 24 : 8,
                    borderRadius: radius.pill,
                    background: dotIdx === activeCreative ? colors.accent : colors.whiteAlpha30,
                    transition: 'width 0.3s ease, background 0.3s ease',
                    border: 'none', padding: 0, cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Brand Knowledge */}
      {(brandMission || brandVoice || brandAudience || brandTone.length > 0) && (
        <div className="pv-section" style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          marginTop: 'clamp(32px, 4vw, 56px)',
          marginBottom: 'clamp(80px, 10vw, 140px)',
          opacity: 0, animation: 'sectionReveal 0.6s 0.1s ease-out forwards',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: brandPrimary, filter: 'blur(160px)', opacity: 0.1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
              <div style={{ width: 40, height: 2, background: colors.accent, margin: '0 auto 20px' }} />
              <div className="pv-section-heading" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
                Brand Knowledge
              </div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
                ✦ AI-generated from your website
              </div>
            </div>
            {/* ═══ Tier 1: featured Brand Voice quote ═══
                Large-type hero treatment. `brand_voice` is the only field
                that reads as a "voice sample" — giving it the featured slot
                signals its role in shaping the rest of the knowledge.
                Previously this string was also rendered as a third fact
                card labeled "How you sound" (duplication bug); the fact
                card is now dropped so voice only appears here. */}
            {brandVoice && (
              <div style={{
                maxWidth: 860, margin: '0 auto 40px',
                padding: '32px 36px',
                background: colors.whiteAlpha5,
                border: `1px solid ${colors.whiteAlpha10}`,
                borderLeft: `3px solid ${colors.accent}`,
                borderRadius: radius.xl,
              }}>
                <div style={{
                  fontFamily: font.mono, fontSize: fontSize.caption, color: colors.accent,
                  letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                  marginBottom: 14,
                }}>Voice</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{
                    fontFamily: font.heading, fontWeight: fontWeight.heading,
                    fontSize: fontSize['7xl'], color: colors.accent,
                    lineHeight: 0.8, flexShrink: 0, marginTop: -4,
                  }}>&ldquo;</span>
                  <div style={{
                    fontFamily: font.heading, fontWeight: fontWeight.bold,
                    fontSize: fontSize['2xl'], color: colors.paper,
                    lineHeight: 1.35,
                  }}>{brandVoice}</div>
                </div>
              </div>
            )}

            {/* ═══ Tier 2: factual brand data ═══
                2-col grid (collapses to single column below ~900px via the
                existing `.pv-intel-grid` media query rule). `.pv-intel-grid`
                is keyed off grid-template-columns so the initial value here
                sets the desktop layout, then the media query overrides. */}
            {(brandMission || brandAudience) && (
              <div className="pv-intel-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16, marginBottom: brandTone.length > 0 ? 40 : 0,
              }}>
                {[
                  brandMission && { label: 'What you do', text: brandMission },
                  brandAudience && { label: 'Who buys from you', text: brandAudience },
                ].filter(Boolean).map((field, i) => {
                  const f = field as { label: string; text: string }
                  return (
                    <div key={i} style={{
                      background: colors.whiteAlpha5,
                      border: `1px solid ${colors.whiteAlpha10}`,
                      borderTop: `3px solid ${colors.accent}`,
                      borderRadius: radius.xl, padding: '22px 24px',
                      display: 'flex', flexDirection: 'column',
                    }}>
                      <div style={{
                        fontFamily: font.mono, fontSize: fontSize.caption, color: colors.accent,
                        letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                        marginBottom: 10,
                      }}>{f.label}</div>
                      {/* No truncation — these are 1–3 sentence summaries;
                          cards grow to fit naturally. */}
                      <div style={{
                        fontSize: fontSize.md, color: colors.whiteAlpha80,
                        lineHeight: 1.55,
                      }}>{f.text}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ═══ Tier 3: tone pills ═══
                Lighter, ambient treatment. Centered below the facts. Small
                label + flex-wrap pill row so 2 or 10 pills both lay out
                naturally. */}
            {brandTone.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: font.mono, fontSize: fontSize.caption,
                  color: colors.whiteAlpha45, letterSpacing: letterSpacing.wide,
                  textTransform: 'uppercase', marginBottom: 14,
                }}>Tone</div>
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 10,
                  justifyContent: 'center',
                }}>
                  {brandTone.map((kw: string, i: number) => (
                    <span key={i} style={{
                      background: colors.whiteAlpha5,
                      border: `1px solid ${brandPrimary}60`,
                      borderRadius: radius.pill,
                      padding: '9px 22px',
                      fontFamily: font.heading, fontWeight: fontWeight.bold,
                      fontSize: fontSize.md, color: colors.paper,
                      letterSpacing: letterSpacing.slight,
                    }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ad Creatives */}
      <div className="pv-creatives-wrap" style={{
        background: `radial-gradient(ellipse at center, ${brandPrimary}18 0%, transparent 70%)`,
        padding: '60px 0', margin: '0 -60px', paddingLeft: 60, paddingRight: 60,
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: brandPrimary, filter: 'blur(160px)', opacity: 0.1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
        <div className="pv-section" style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          marginBottom: 'clamp(80px, 10vw, 140px)',
          opacity: 0, animation: 'sectionReveal 0.6s 0.2s ease-out forwards',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
            <div style={{ width: 40, height: 2, background: colors.accent, margin: '0 auto 20px' }} />
            <div className="pv-section-heading" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Ad Creatives
            </div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
              ✦ 9 multi-format creatives
            </div>
          </div>

          {gridCards.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 20, marginBottom: 48 }}>
                {gridCards.map((card, i) => (
                  <ScaledCreative key={i} Comp={card.Comp} props={makeCreativeProps(card)} srcW={SRC_W} srcH={SRC_H} aspectRatio="4/5" borderRadius={radius['2xl']} />
                ))}
              </div>
              <div style={{ borderTop: `1px solid ${colors.whiteAlpha10}`, paddingTop: 32 }}>
                <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.semibold, letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.whiteAlpha45, marginBottom: 20, textAlign: 'center' }}>
                  Instagram & TikTok Stories
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3" style={{ gap: 16 }}>
                  {storyCards.map((card, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <ScaledCreative Comp={card.Comp} props={makeCreativeProps(card)} srcW={STORY_SRC_W} srcH={STORY_SRC_H} aspectRatio="9/16" borderRadius={radius['3xl']} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
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
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: brandPrimary, filter: 'blur(160px)', opacity: 0.1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
            <div style={{ width: 40, height: 2, background: colors.accent, margin: '0 auto 20px' }} />
            <div className="pv-section-heading" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Ad Copy
            </div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
              ✦ 3 copy variations
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 16 }}>
            {adVariations.slice(0, 3).map((v, i) => (
              <div key={i} style={{
                background: colors.whiteAlpha5,
                border: `1px solid ${colors.whiteAlpha10}`,
                borderLeft: i === 0 ? `2px solid ${colors.accent}` : `2px solid ${colors.whiteAlpha10}`,
                borderRadius: radius['3xl'], padding: '28px 28px 24px',
                display: 'flex', flexDirection: 'column', gap: 0,
                boxShadow: i === 0 ? `0 0 40px ${brandPrimary}30` : 'none',
              }}>
                <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.widest, textTransform: 'uppercase', color: i === 0 ? colors.accent : colors.whiteAlpha45, marginBottom: 12 }}>
                  Variation {i + 1}
                </div>
                <div className="pv-copy-headline" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['7xl'], lineHeight: 1.1, letterSpacing: letterSpacing.snug, color: colors.paper, marginBottom: 20, textTransform: 'uppercase' }}>
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
                  <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha30 }}>{v.primary_text.length} chars</span>
                  <button onClick={() => copyVariation(i, v)} style={{
                    background: copiedId === i ? colors.accent : colors.whiteAlpha10,
                    color: copiedId === i ? colors.ink : colors.paper,
                    border: 'none', borderRadius: radius.md, padding: '6px 14px',
                    fontSize: fontSize.md, fontWeight: fontWeight.semibold, cursor: 'pointer',
                    transition: `background ${transition.base}, color ${transition.base}`,
                  }}>{copiedId === i ? 'Copied ✓' : 'Copy all'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Landing Page */}
      <div className="pv-section" style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        marginBottom: 'clamp(80px, 10vw, 140px)',
        opacity: 0, animation: 'sectionReveal 0.6s 0.4s ease-out forwards',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: brandPrimary, filter: 'blur(160px)', opacity: 0.15, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
            <div style={{ width: 40, height: 2, background: colors.accent, margin: '0 auto 20px' }} />
            <div className="pv-section-heading" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Landing Page
            </div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
              ✦ Conversion-optimized page
            </div>
          </div>
          {landingBrief ? (
            <>
              {/* Desktop — laptop frame */}
              <div className="pv-landing-laptop" style={{ maxWidth: 900, margin: '0 auto' }}>
                <div style={{ background: '#1a1a1a', borderRadius: '16px 16px 8px 8px', padding: '28px 20px 0', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                  <div style={{ height: 28, display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 6, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                  {/* Render the iframe at a desktop viewport (1 / 0.6 ≈ 1.67× parent
                      width) and scale it down to fit. transform-origin: top left
                      anchors the left edge to the frame, so wide-viewport CSS
                      tricks (full-bleed negative margins, `calc(50vw - 50%)`)
                      that were previously pushing text off the left in an
                      860px iframe now have room to resolve correctly. Same
                      pattern used on the mobile phone frame below. */}
                  <div className="pv-iframe" style={{ width: '100%', height: 600, overflow: 'hidden', borderRadius: '8px 8px 0 0', background: colors.paper }}>
                    <iframe
                      srcDoc={landingHtml || ''}
                      style={{
                        width: 'calc(100% / 0.6)',
                        height: 'calc(100% / 0.6)',
                        border: 'none',
                        display: 'block',
                        transform: 'scale(0.6)',
                        transformOrigin: 'top left',
                      }}
                      title="Landing page preview" loading="lazy"
                    />
                  </div>
                </div>
                <div style={{ background: '#2a2a2a', height: 20, borderRadius: '0 0 12px 12px', width: '110%', marginLeft: '-5%' }} />
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <a
                    href={`/api/campaigns/${campaign.id}/landing-html`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ background: colors.ink, color: colors.accent, fontSize: fontSize.body, fontWeight: fontWeight.bold, padding: '10px 20px', borderRadius: radius.pill, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: shadow.dark, border: `1px solid ${colors.whiteAlpha10}` }}
                  >↗ View full page</a>
                </div>
              </div>
              {/* Mobile — phone frame */}
              <div className="pv-landing-phone" style={{ display: 'none', margin: '0 auto', width: 340, maxWidth: '100%' }}>
                <div style={{ background: '#1a1a1a', borderRadius: 40, padding: '16px 12px', border: '4px solid #333', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                  <div style={{ width: 80, height: 20, background: '#1a1a1a', borderRadius: '0 0 12px 12px', margin: '0 auto 8px' }} />
                  <div style={{ borderRadius: 28, overflow: 'hidden', width: '100%', background: colors.paper, position: 'relative', height: 500 }}>
                    <iframe
                      srcDoc={landingHtml || ''}
                      style={{ position: 'absolute', top: 0, left: 0, width: '250%', height: '250%', border: 'none', transform: 'scale(0.4)', transformOrigin: 'top left', pointerEvents: 'none' }}
                      title="Landing page preview" loading="lazy"
                    />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: `linear-gradient(to bottom, transparent, ${colors.paper})`, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}>
                      <a
                        href={`/api/campaigns/${campaign.id}/landing-html`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ background: colors.ink, color: colors.accent, fontSize: fontSize.caption, fontWeight: fontWeight.bold, padding: '8px 16px', borderRadius: radius.pill, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: shadow.dark }}
                      >↗ View full page</a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-pulse" style={{ width: '100%', height: 256, background: colors.whiteAlpha5, borderRadius: radius['4xl'] }} />
          )}
        </div>
      </div>

      {/* Email */}
      <div className="pv-section" style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 24px',
        marginBottom: 'clamp(80px, 10vw, 140px)',
        opacity: 0, animation: 'sectionReveal 0.6s 0.5s ease-out forwards',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: brandPrimary, filter: 'blur(160px)', opacity: 0.1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
            <div style={{ width: 40, height: 2, background: colors.accent, margin: '0 auto 20px' }} />
            <div className="pv-section-heading" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Email
            </div>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
              ✦ Campaign email · Klaviyo ready
            </div>
          </div>

          {!emailGenerated ? (
            <>
              {/* Desktop — laptop frame with skeleton */}
              <div className="pv-email-laptop" style={{ width: 700, maxWidth: '100%', margin: '0 auto' }}>
                <div style={{ background: '#1a1a1a', borderRadius: '16px 16px 8px 8px', padding: '28px 20px 0', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                  <div style={{ height: 28, display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 6, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                  <div style={{ width: '100%', borderRadius: '8px 8px 0 0', overflow: 'hidden', background: colors.paper, padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 400 }}>
                    <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <div style={{ width: '90%', height: 12, background: colors.whiteAlpha10, borderRadius: radius.pill, marginBottom: 12, animation: 'pvPulse 1.5s ease-in-out infinite' }} />
                      <div style={{ width: '70%', height: 12, background: colors.whiteAlpha10, borderRadius: radius.pill, marginBottom: 12, animation: 'pvPulse 1.5s 0.2s ease-in-out infinite' }} />
                      <div style={{ width: '85%', height: 12, background: colors.whiteAlpha10, borderRadius: radius.pill, marginBottom: 12, animation: 'pvPulse 1.5s 0.4s ease-in-out infinite' }} />
                    </div>
                    <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, textAlign: 'center', marginTop: 24 }}>
                      Generating your email campaign...
                    </div>
                  </div>
                </div>
                <div style={{ background: '#2a2a2a', height: 20, borderRadius: '0 0 12px 12px', width: '110%', marginLeft: '-5%' }} />
              </div>
              {/* Mobile — phone frame with skeleton */}
              <div className="pv-email-phone" style={{ display: 'none', margin: '0 auto', width: 340, maxWidth: '100%' }}>
                <div style={{ background: '#1a1a1a', borderRadius: 40, padding: '16px 12px', border: '4px solid #333', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                  <div style={{ width: 80, height: 20, background: '#1a1a1a', borderRadius: '0 0 12px 12px', margin: '0 auto 8px' }} />
                  <div style={{ borderRadius: 28, overflow: 'hidden', width: '100%', background: colors.paper, padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 300 }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <div style={{ width: '90%', height: 10, background: colors.whiteAlpha10, borderRadius: radius.pill, marginBottom: 10, animation: 'pvPulse 1.5s ease-in-out infinite' }} />
                      <div style={{ width: '70%', height: 10, background: colors.whiteAlpha10, borderRadius: radius.pill, marginBottom: 10, animation: 'pvPulse 1.5s 0.2s ease-in-out infinite' }} />
                      <div style={{ width: '85%', height: 10, background: colors.whiteAlpha10, borderRadius: radius.pill, marginBottom: 10, animation: 'pvPulse 1.5s 0.4s ease-in-out infinite' }} />
                    </div>
                    <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, textAlign: 'center', marginTop: 20 }}>
                      Generating your email campaign...
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Desktop — laptop frame */}
              <div className="pv-email-laptop" style={{ width: 700, maxWidth: '100%', margin: '0 auto' }}>
                <div style={{ background: '#1a1a1a', borderRadius: '16px 16px 8px 8px', padding: '28px 20px 0', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                  <div style={{ height: 28, display: 'flex', alignItems: 'center', paddingLeft: 12, gap: 6, marginBottom: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                  </div>
                  <div style={{ width: '100%', borderRadius: '8px 8px 0 0', overflow: 'hidden', background: colors.paper }}>
                    <iframe srcDoc={emailHtml || ''} style={{ width: '100%', height: 600, border: 'none', display: 'block' }} title="Email preview" />
                  </div>
                </div>
                <div style={{ background: '#2a2a2a', height: 20, borderRadius: '0 0 12px 12px', width: '110%', marginLeft: '-5%' }} />
              </div>
              {/* Mobile — phone frame */}
              <div className="pv-email-phone" style={{ display: 'none', margin: '0 auto', width: 340, maxWidth: '100%' }}>
                <div style={{ background: '#1a1a1a', borderRadius: 40, padding: '16px 12px', border: '4px solid #333', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
                  <div style={{ width: 80, height: 20, background: '#1a1a1a', borderRadius: '0 0 12px 12px', margin: '0 auto 8px' }} />
                  <div style={{ borderRadius: 28, overflow: 'hidden', width: '100%', background: colors.paper }}>
                    <iframe srcDoc={emailHtml || ''} style={{ width: '100%', height: 500, border: 'none', display: 'block', borderRadius: 28 }} title="Email preview" />
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Brand Intelligence */}
      {(() => {
        const GAUGE_R = 104
        const GAUGE_C = 2 * Math.PI * GAUGE_R
        const gaugeOffset = intelligenceScore !== null ? GAUGE_C - (intelligenceScore / 100) * GAUGE_C : GAUGE_C
        const hasIntel = intelligenceScore !== null

        return (
          <div className="pv-section" style={{
            maxWidth: 1080, margin: '0 auto', padding: '0 24px',
            marginTop: 'clamp(32px, 4vw, 56px)',
            marginBottom: 'clamp(80px, 10vw, 140px)',
            opacity: 0, animation: 'sectionReveal 0.6s 0.15s ease-out forwards',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: brandPrimary, filter: 'blur(160px)', opacity: 0.1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
                <div style={{ width: 40, height: 2, background: colors.accent, margin: '0 auto 20px' }} />
                <div className="pv-section-heading" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], color: colors.paper, textTransform: 'uppercase', lineHeight: 1.1 }}>
                  Brand Intelligence
                </div>
                <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '4px 12px', marginTop: 8, display: 'inline-block' }}>
                  ✦ AI-analyzed
                </div>
              </div>

              <div className="pv-intel-cols" style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
                <div className="pv-intel-left" style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 240, height: 240, marginBottom: 12 }}>
                    <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: colors.accent, filter: 'blur(60px)', opacity: 0.08, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                    <svg width={240} height={240} style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
                      <circle cx={120} cy={120} r={GAUGE_R} fill="none" stroke={colors.whiteAlpha10} strokeWidth={14} />
                      {hasIntel && (
                        <circle cx={120} cy={120} r={GAUGE_R} fill="none" stroke={colors.accent} strokeWidth={14} strokeLinecap="round" strokeDasharray={GAUGE_C} strokeDashoffset={gaugeOffset}
                          style={{ '--gauge-circumference': GAUGE_C, '--gauge-offset': gaugeOffset, animation: 'gaugeIn 1.5s ease-out forwards' } as React.CSSProperties} />
                      )}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                      {hasIntel ? (
                        <span style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['5xl'], color: colors.paper, lineHeight: 1 }}>{intelligenceScore}</span>
                      ) : (
                        <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha30 }}>—</span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, textTransform: 'uppercase', letterSpacing: letterSpacing.wide, marginBottom: 28 }}>Atlas Score</div>
                  <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {([
                      { label: '✦ Brand Identity', key: 'brandIdentity' },
                      { label: '✦ Audience Clarity', key: 'audienceClarity' },
                      { label: '✦ Content Readiness', key: 'contentReadiness' },
                    ] as const).map(({ label, key }) => (
                      <div key={key} style={{ background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha60 }}>{label}</span>
                        <span style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.xl, color: hasIntel ? colors.accent : colors.whiteAlpha30 }}>
                          {hasIntel ? `${scoreBreakdown?.[key] ?? 0}%` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pv-intel-right" style={{ flex: '1 1 60%' }}>
                  {hasIntel && insights.length > 0 ? (
                    <>
                      <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, textTransform: 'uppercase', letterSpacing: letterSpacing.wide, marginBottom: 12 }}>Top Signals</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                        {insights.map((insight, i) => (
                          <span key={i} style={{ background: `${brandPrimary}25`, border: `1px solid ${brandPrimary}50`, borderRadius: radius.pill, padding: '8px 20px', fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize.body, color: colors.paper }}>{insight.label}</span>
                        ))}
                      </div>
                      {insights[3] && (
                        <>
                          <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, textTransform: 'uppercase', letterSpacing: letterSpacing.wide, marginTop: 32, marginBottom: 12 }}>Best Opportunity</div>
                          <div style={{ borderLeft: `3px solid ${colors.accent}`, paddingLeft: 20, fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize['2xl'], color: colors.paper, lineHeight: 1.3 }}>
                            {insights[3].text.length > 100 ? insights[3].text.slice(0, 100) + '...' : insights[3].text}
                          </div>
                        </>
                      )}
                      {insights[2] && (
                        <>
                          <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, textTransform: 'uppercase', letterSpacing: letterSpacing.wide, marginTop: 32, marginBottom: 12 }}>Recommended Angle</div>
                          <div style={{ borderLeft: `3px solid ${colors.accent}`, paddingLeft: 20, fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize.xl, color: colors.whiteAlpha80, lineHeight: 1.3 }}>
                            {insights[2].text.length > 80 ? insights[2].text.slice(0, 80) + '...' : insights[2].text}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} className="animate-pulse" style={{ background: colors.whiteAlpha5, border: `1px solid ${colors.whiteAlpha10}`, borderRadius: radius.pill, height: 44 }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ FINALE ═══ */}
      <div ref={finaleRef} className="pv-finale" style={{
        position: 'relative', overflow: 'hidden', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.ink,
      }}>
        {/* Left column — lifestyle images scrolling down */}
        {(() => {
          const leftItems = [...lifestyleImageUrls.slice(0, 4), ...gridCards.slice(0, 3).map((_, i) => `__creative_${i}`)]
          const leftLoop = [...leftItems, ...leftItems]
          return leftLoop.length > 0 ? (
            <div className="pv-finale-col" style={{
              position: 'absolute', left: '5%', top: 0,
              width: 'clamp(160px, 18vw, 240px)',
              display: 'flex', flexDirection: 'column', gap: 12,
              animation: 'pvScrollDown 25s linear infinite',
            }}>
              {leftLoop.map((item, i) => {
                if (typeof item === 'string' && item.startsWith('__creative_')) {
                  const idx = parseInt(item.split('_')[2])
                  const card = gridCards[idx]
                  if (!card) return null
                  return (
                    <div key={`lc-${i}`} style={{ width: '100%', opacity: 0.4 }}>
                      <ScaledCreative Comp={card.Comp} props={makeCreativeProps(card)} srcW={1080} srcH={1350} aspectRatio="4/5" borderRadius={radius.lg} />
                    </div>
                  )
                }
                return (
                  <img key={`li-${i}`} src={item} alt="" style={{
                    width: '100%', aspectRatio: '3/4', objectFit: 'cover',
                    borderRadius: radius.lg, opacity: 0.4, display: 'block',
                  }} onError={e => { e.currentTarget.style.display = 'none' }} />
                )
              })}
            </div>
          ) : null
        })()}

        {/* Right column — creatives scrolling up */}
        {(() => {
          const rightCreatives = gridCards.slice(3, 9).map((_, i) => `__creative_${i + 3}`)
          const rightImages = lifestyleImageUrls.slice(4, 7)
          const rightItems = [...rightCreatives, ...rightImages]
          const rightLoop = [...rightItems, ...rightItems]
          return rightLoop.length > 0 ? (
            <div className="pv-finale-col" style={{
              position: 'absolute', right: '5%', top: 0,
              width: 'clamp(160px, 18vw, 240px)',
              display: 'flex', flexDirection: 'column', gap: 12,
              animation: 'pvScrollUp 30s linear infinite',
            }}>
              {rightLoop.map((item, i) => {
                if (typeof item === 'string' && item.startsWith('__creative_')) {
                  const idx = parseInt(item.split('_')[2])
                  const card = gridCards[idx]
                  if (!card) return null
                  return (
                    <div key={`rc-${i}`} style={{ width: '100%', opacity: 0.4 }}>
                      <ScaledCreative Comp={card.Comp} props={makeCreativeProps(card)} srcW={1080} srcH={1350} aspectRatio="4/5" borderRadius={radius.lg} />
                    </div>
                  )
                }
                return (
                  <img key={`ri-${i}`} src={item} alt="" style={{
                    width: '100%', aspectRatio: '3/4', objectFit: 'cover',
                    borderRadius: radius.lg, opacity: 0.4, display: 'block',
                  }} onError={e => { e.currentTarget.style.display = 'none' }} />
                )
              })}
            </div>
          ) : null
        })()}

        {/* Edge fades */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 280, height: '100%', background: `linear-gradient(to right, ${colors.ink} 0%, transparent 100%)`, zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, width: 280, height: '100%', background: `linear-gradient(to left, ${colors.ink} 0%, transparent 100%)`, zIndex: 2, pointerEvents: 'none' }} />

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, opacity: 0, animation: 'sectionReveal 0.8s 0.2s ease-out forwards' }}>
          {/* Stats row */}
          <div className="pv-finale-stats" style={{ display: 'flex', gap: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            {([
              { value: '60s', label: 'Time to build' },
              { value: '27', label: 'Creatives generated' },
              { value: '4', label: 'Channels ready' },
              { value: '$0', label: 'To get started' },
            ] as const).map((stat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="pv-finale-num" style={{
                    fontFamily: font.heading, fontWeight: fontWeight.heading,
                    fontSize: 'clamp(38px, 5.4vw, 68px)', color: colors.paper, lineHeight: 1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize.caption,
                    color: colors.accent, textTransform: 'uppercase',
                    letterSpacing: letterSpacing.widest, marginTop: 8,
                  }}>
                    {stat.label}
                  </div>
                </div>
                {i < 3 && (
                  <div style={{ width: 1, height: 48, background: colors.whiteAlpha15, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 60, height: 2, background: colors.accent }} />

          {/* Headline */}
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: 'clamp(32px, 4vw, 56px)', color: colors.paper,
            textTransform: 'uppercase', textAlign: 'center', maxWidth: 600,
            lineHeight: 1.1,
          }}>
            Everything your brand needs.
          </div>

          {/* Subline */}
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.body,
            color: colors.whiteAlpha60, marginTop: 8,
          }}>
            Built in seconds. Ready to launch.
          </div>

          {/* CTA */}
          <button
            onClick={() => {
              if (brand.status === 'draft') return requireAuth(activateBrand)
              if (viewerCanSaveBrand) return saveBrandToWorkspace()
              return setShowAccountModal(true)
            }}
            style={{
              background: colors.accent, color: colors.ink,
              fontFamily: font.heading, fontWeight: fontWeight.bold,
              fontSize: fontSize.lg, padding: '18px 48px',
              borderRadius: radius.pill, border: 'none',
              cursor: 'pointer', marginTop: 32,
              animation: 'pvPulseGlow 2s infinite',
            }}
          >
            {brand.status === 'draft' ? 'Activate & save →' : viewerCanSaveBrand ? 'Save to workspace →' : 'Save to my account →'}
          </button>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha30, marginTop: 12 }}>
            No credit card required.
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <MarketingFooter />

      <AccountModal
        isOpen={showAccountModal}
        campaignId={campaign.id}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  )
}
