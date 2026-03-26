'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BrandImage } from '@/types'
import type { Brand, GeneratedCopy } from '../types'
import type { TextPosition } from '../templates/types'

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
    setActiveVariation, setActiveDraft,
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
    const nbBg = nb?.primary_color || '#000000'
    const light = isLightColor(nbBg)
    setHeadlineColor(nb?.heading_color || (light ? '#000000' : '#ffffff'))
    setBodyColor(nb?.body_color || (light ? '#1a1a1a' : '#ffffff'))
    setBgColor(nbBg)
    setTextBannerColor(nbBg)
    setHeadline(nb?.default_headline || `Discover ${nb?.name || 'Our Brand'}`)
    const audience = nb?.target_audience?.split(/[;,]/)[0]?.trim() || 'you'
    setBodyText(nb?.default_body_text || `Premium quality crafted for ${audience}`)
    setCtaText(nb?.default_cta || 'Shop Now')
    // Reset style to defaults on brand switch
    setHeadlineSizeMul(1); setBodySizeMul(1)
    setShowOverlay(false); setOverlayOpacity(10)
    setTextBanner('none'); setTextPosition('bottom-left')
    setImagePosition('center')
    setActiveVariation(null); setActiveDraft(null)
  }, [brandId, brands])

  // Fetch images + recent copy
  useEffect(() => {
    if (!brandId) return
    const supabase = createClient()
    supabase.from('brand_images').select('*').eq('brand_id', brandId).order('created_at')
      .then(({ data }) => { const imgs = data ?? []; setImages(imgs); setSelectedImageId(imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)].id : null) })
    supabase.from('generated_content').select('id, content, type, created_at').eq('brand_id', brandId)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setRecentCopy((data as GeneratedCopy[]) ?? []))
  }, [brandId])
}

export { isLightColor }
