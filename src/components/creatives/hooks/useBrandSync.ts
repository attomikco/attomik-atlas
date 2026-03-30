'use client'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BrandImage } from '@/types'
import type { Brand, GeneratedCopy } from '../types'
import type { TextPosition } from '../templates/types'

// In-memory cache so switching back to a brand is instant
const imageCache = new Map<string, BrandImage[]>()
const copyCache = new Map<string, GeneratedCopy[]>()

function isLightColor(hex: string) {
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

interface UseBrandSyncOptions {
  brandId: string
  brands: Brand[]
  setImages: (imgs: BrandImage[]) => void
  setSelectedImageId: (id: string | null) => void
  setRecentCopy: (copy: GeneratedCopy[]) => void
  setHeadline: (v: string) => void
  setBodyText: (v: string) => void
  setCtaText: (v: string) => void
  setHeadlineFont: (v: string) => void
  setHeadlineWeight: (v: string) => void
  setHeadlineTransform: (v: string) => void
  setBodyFont: (v: string) => void
  setBodyWeight: (v: string) => void
  setBodyTransform: (v: string) => void
  setHeadlineColor: (v: string) => void
  setBodyColor: (v: string) => void
  setBgColor: (v: string) => void
  setTextBannerColor: (v: string) => void
  setHeadlineSizeMul: (v: number) => void
  setBodySizeMul: (v: number) => void
  setShowOverlay: (v: boolean) => void
  setOverlayOpacity: (v: number) => void
  setTextBanner: (v: 'none' | 'top' | 'bottom') => void
  setTextPosition: (v: TextPosition) => void
  setImagePosition: (v: string) => void
  setActiveVariation: (v: number | null) => void
  setActiveDraft: (v: number | null) => void
  setVariations: (v: any[]) => void
  setCtaColor: (v: string) => void
  setCtaFontColor: (v: string) => void
}

export function useBrandSync(opts: UseBrandSyncOptions) {
  const {
    brandId, brands,
    setImages, setSelectedImageId, setRecentCopy,
    setHeadline, setBodyText, setCtaText,
    setHeadlineFont, setHeadlineWeight, setHeadlineTransform,
    setBodyFont, setBodyWeight, setBodyTransform,
    setHeadlineColor, setBodyColor, setBgColor, setTextBannerColor,
    setHeadlineSizeMul, setBodySizeMul,
    setShowOverlay, setOverlayOpacity, setTextBanner, setTextPosition, setImagePosition,
    setActiveVariation, setActiveDraft, setVariations,
    setCtaColor, setCtaFontColor,
  } = opts

  const brand = brands.find(b => b.id === brandId)

  // Font loading
  useEffect(() => {
    const fonts = [brand?.font_primary, brand?.font_secondary].filter(Boolean).map(f => f!.split('|')[0]) as string[]
    if (fonts.length > 0) {
      const families = Array.from(new Set(fonts)).map(f => f.replace(/ /g, '+')).join('&family=')
      const id = 'brand-fonts-link'
      let link = document.getElementById(id) as HTMLLinkElement | null
      if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link) }
      link.href = `https://fonts.googleapis.com/css2?family=${families}:wght@300;400;500;600;700;800;900&display=swap`
    }
    // Inject custom @font-face CSS if present
    const styleId = 'brand-custom-fonts'
    let style = document.getElementById(styleId) as HTMLStyleElement | null
    if (brand?.custom_fonts_css) {
      if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style) }
      style.textContent = brand.custom_fonts_css
    } else if (style) {
      style.remove()
    }
  }, [brand?.font_primary, brand?.font_secondary, brand?.custom_fonts_css])

  // Brand switching — reset copy, fonts, colors, style defaults
  useEffect(() => {
    const nb = brands.find(b => b.id === brandId)
    const h = nb?.font_heading; const hParts = (nb?.font_primary || '').split('|')
    setHeadlineFont(h?.family || hParts[0] || ''); setHeadlineWeight(h?.weight || hParts[1] || '700'); setHeadlineTransform(h?.transform || hParts[2] || 'none')
    const bo = nb?.font_body; const bParts = (nb?.font_secondary || '').split('|')
    setBodyFont(bo?.family || bParts[0] || ''); setBodyWeight(bo?.weight || bParts[1] || '400'); setBodyTransform(bo?.transform || bParts[2] || 'none')
    // Background: prefer bg_dark > bg_base > primary_color
    const nbBg = nb?.bg_dark || nb?.bg_base || nb?.primary_color || '#000000'
    const light = isLightColor(nbBg)
    // Text: match to bg brightness
    if (light) {
      setHeadlineColor(nb?.text_on_base || nb?.heading_color || '#000000')
      setBodyColor(nb?.text_on_base || nb?.body_color || '#1a1a1a')
    } else {
      setHeadlineColor(nb?.text_on_dark || nb?.heading_color || '#ffffff')
      setBodyColor(nb?.text_on_dark || nb?.body_color || '#ffffff')
    }
    setBgColor(nbBg)
    setTextBannerColor(nb?.bg_accent || nb?.bg_secondary || nbBg)
    // Copy
    setHeadline(nb?.default_headline || `Discover ${nb?.name || 'Our Brand'}`)
    const audience = nb?.target_audience?.split(/[;,]/)[0]?.trim() || 'you'
    setBodyText(nb?.default_body_text || `Premium quality crafted for ${audience}`)
    setCtaText(nb?.default_cta || 'Shop Now')
    // Reset style to defaults on brand switch
    setHeadlineSizeMul(1); setBodySizeMul(1)
    setShowOverlay(false); setOverlayOpacity(10)
    setTextBanner('none'); setTextPosition('center')
    setImagePosition('center')
    // CTA: prefer btn_primary > accent > primary
    setCtaColor(nb?.btn_primary || nb?.accent_color || nb?.primary_color || '#00ff97')
    setCtaFontColor(nb?.btn_primary_text || nb?.accent_font_color || '#000000')
    setVariations([]); setActiveVariation(null); setActiveDraft(null)
  }, [brandId, brands])

  // Fetch images + recent copy (with cache)
  useEffect(() => {
    if (!brandId) return

    // Images — serve from cache if available
    const cachedImgs = imageCache.get(brandId)
    if (cachedImgs) {
      setImages(cachedImgs)
      setSelectedImageId(cachedImgs.length > 0 ? cachedImgs[Math.floor(Math.random() * cachedImgs.length)].id : null)
    } else {
      const supabase = createClient()
      supabase.from('brand_images').select('*').eq('brand_id', brandId).order('created_at')
        .then(({ data }) => {
          const imgs = data ?? []
          imageCache.set(brandId, imgs)
          setImages(imgs)
          setSelectedImageId(imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)].id : null)
        })
    }

    // Copy — serve from cache if available
    const cachedCopy = copyCache.get(brandId)
    if (cachedCopy) {
      setRecentCopy(cachedCopy)
      const latestAd = cachedCopy.find(c => c.type === 'fb_ad')
      if (latestAd) {
        try {
          const parsed = JSON.parse(latestAd.content)
          const v = parsed.variations?.[0] || parsed
          if (v.headline) setHeadline(v.headline)
          if (v.primary_text) setBodyText(v.primary_text.slice(0, 150))
          if (v.description) setCtaText(v.description)
        } catch {}
      }
    } else {
      const supabase = createClient()
      supabase.from('generated_content').select('id, content, type, created_at, campaign_id').eq('brand_id', brandId)
        .order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => {
          const copy = (data as GeneratedCopy[]) ?? []
          copyCache.set(brandId, copy)
          setRecentCopy(copy)
          // Auto-populate copy fields from latest fb_ad
          const latestAd = copy.find(c => c.type === 'fb_ad')
          if (latestAd) {
            try {
              const parsed = JSON.parse(latestAd.content)
              const v = parsed.variations?.[0] || parsed
              if (v.headline) setHeadline(v.headline)
              if (v.primary_text) setBodyText(v.primary_text.slice(0, 150))
              if (v.description) setCtaText(v.description)
            } catch {}
          }
        })
    }
  }, [brandId])
}

export { isLightColor }
