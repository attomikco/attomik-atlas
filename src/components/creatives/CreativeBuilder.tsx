'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage } from '@/types'
import { bucketBrandImages, getBusinessType } from '@/lib/brand-images'
import { Download, Sparkles, Loader2, Check } from 'lucide-react'
import { TextPosition } from './templates/types'
import { Callout } from './templates/types'
import { TEMPLATES, SIZES } from './templates/registry'
import type { Brand, GeneratedCopy, StyleSnapshot, Variation, Draft } from './types'
import { useBrandSync, isLightColor } from './hooks/useBrandSync'
import { useCreativeExport } from './hooks/useCreativeExport'
import CopyEditor from './sidebar/CopyEditor'
import type { CtaType } from './types'
import StylePanel from './sidebar/StylePanel'
import PreviewCanvas from './preview/PreviewCanvas'
import VariationStrip from './preview/VariationStrip'
import DraftStrip from './preview/DraftStrip'
import MetaLaunchModal from './MetaLaunchModal'

export default function CreativeBuilder({
  brands,
  defaultBrandId,
  campaignId,
  campaignBrief,
  preloadedCopy,
}: {
  brands: Brand[]
  defaultBrandId?: string
  campaignId?: string
  campaignBrief?: string
  preloadedCopy?: { headline?: string; primary_text?: string; description?: string } | null
}) {
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────
  const initId = defaultBrandId || brands[0]?.id || ''
  const [brandId, setBrandId] = useState(initId)

  useEffect(() => {
    if (defaultBrandId && defaultBrandId !== brandId) {
      setBrandId(defaultBrandId)
    }
  }, [defaultBrandId])
  const [images, setImages] = useState<BrandImage[]>([])
  const [recentCopy, setRecentCopy] = useState<GeneratedCopy[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string>('overlay')
  const [sizeId, setSizeId] = useState<string>('feed')
  const [headline, setHeadline] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [ctaText, setCtaText] = useState('Shop Now')
  // FB ad copy — different from image copy
  const [fbPrimaryText, setFbPrimaryText] = useState('')
  const [fbHeadline, setFbHeadline] = useState('')
  const [fbDescription, setFbDescription] = useState('')
  // ── Meta ad launch fields (persisted on save) ──
  // destinationUrl defaults to blank so the empty string means "use brand.website
  // at launch time" — matches the save route's default_url || null logic.
  const [destinationUrl, setDestinationUrl] = useState('')
  const [ctaType, setCtaType] = useState<CtaType>('LEARN_MORE')
  const [textPosition, setTextPosition] = useState<TextPosition>('bottom-left')
  const [showCta, setShowCta] = useState(true)
  const [headlineColor, setHeadlineColor] = useState<string>('#ffffff')
  const [bodyColor, setBodyColor] = useState<string>('#ffffff')
  const [headlineFont, setHeadlineFont] = useState<string>('')
  const [bodyFont, setBodyFont] = useState<string>('')
  const [headlineWeight, setHeadlineWeight] = useState<string>('700')
  const [headlineTransform, setHeadlineTransform] = useState<string>('none')
  const [bodyWeight, setBodyWeight] = useState<string>('400')
  const [bodyTransform, setBodyTransform] = useState<string>('none')
  const [bgColor, setBgColor] = useState<string>('#000000')
  const [headlineSizeMul, setHeadlineSizeMul] = useState(1)
  const [bodySizeMul, setBodySizeMul] = useState(1)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(10)
  const [imagePosition, setImagePosition] = useState<string>('center')
  const [textBanner, setTextBanner] = useState<'none' | 'top' | 'bottom'>('none')
  const [textBannerColor, setTextBannerColor] = useState<string>('#000000')
  // Template-specific state
  const defaultCallouts: Callout[] = [
    { icon: '🌿', label: 'Natural', description: 'Clean ingredients' },
    { icon: '⚡', label: 'Energy', description: 'Sustained focus' },
    { icon: '🍋', label: 'Fresh', description: 'Real fruit flavor' },
    { icon: '💧', label: 'Hydrating', description: 'Electrolyte-rich' },
  ]
  const [callouts, setCallouts] = useState<Callout[]>(defaultCallouts)
  const [statStripText, setStatStripText] = useState('Only 1g of Sugar')
  const [oldWayItems, setOldWayItems] = useState<string[]>(['Artificial ingredients', 'Sugary mixers', 'Next-day regret'])
  const [newWayItems, setNewWayItems] = useState<string[]>(['All natural', 'Zero sugar', 'Feel great tomorrow'])
  const [subtitle, setSubtitle] = useState('')
  const [selectedProductImageId, setSelectedProductImageId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchCount, setBatchCount] = useState(5)
  const batchAbortRef = useRef<AbortController | null>(null)
  const [variations, setVariations] = useState<Variation[]>([])
  const [activeVariation, setActiveVariation] = useState<number | null>(null)
  const [savedDrafts, setSavedDrafts] = useState<Draft[]>([])
  const [activeDraft, setActiveDraft] = useState<number | null>(null)
  const [launchModalDraft, setLaunchModalDraft] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportToast, setExportToast] = useState<string | null>(null)
  const [previewContainerW, setPreviewContainerW] = useState(600)
  const leftPanelRef = useRef<HTMLDivElement>(null)

  // ── Helpers ────────────────────────────────────────────────────────
  function updateBgColor(color: string) {
    setBgColor(color)
    const light = isLightColor(color)
    // Use brand's text-on-bg colors if the bg matches a known brand bg
    if (brand?.bg_base && color.toLowerCase() === brand.bg_base.toLowerCase() && brand.text_on_base) {
      setHeadlineColor(brand.text_on_base); setBodyColor(brand.text_on_base); return
    }
    if (brand?.bg_dark && color.toLowerCase() === brand.bg_dark.toLowerCase() && brand.text_on_dark) {
      setHeadlineColor(brand.text_on_dark); setBodyColor(brand.text_on_dark); return
    }
    if (brand?.bg_accent && color.toLowerCase() === brand.bg_accent.toLowerCase() && brand.text_on_accent) {
      setHeadlineColor(brand.text_on_accent); setBodyColor(brand.text_on_accent); return
    }
    // Fallback: auto-detect
    setHeadlineColor(light ? '#000000' : '#ffffff')
    setBodyColor(light ? '#1a1a1a' : '#ffffff')
  }

  // ── Derived ────────────────────────────────────────────────────────
  const brand = brands.find(b => b.id === brandId)
  // Gate the Launch button on a fully wired Meta connection (token + account + page id).
  const metaConnected = (() => {
    if (!brand?.notes) return false
    try {
      const n = JSON.parse(brand.notes)
      return !!(n.meta_access_token && n.meta_ad_account_id && n.meta_page_id)
    } catch { return false }
  })()
  const brandColor = brand?.primary_color || '#00ff97'
  const [ctaColor, setCtaColor] = useState(brand?.accent_color || brandColor)
  const [ctaFontColor, setCtaFontColor] = useState(brand?.accent_font_color || '#000000')
  const [ctaSizeMul, setCtaSizeMul] = useState(1)
  // Build color palette from all brand colors (deduped)
  const allColors: { label: string; value: string }[] = []
  const seen = new Set<string>()
  const addColor = (label: string, value: string | null | undefined) => {
    if (!value || seen.has(value.toLowerCase())) return
    seen.add(value.toLowerCase())
    allColors.push({ label, value })
  }
  // Backgrounds
  addColor('Base bg', brand?.bg_base)
  addColor('Dark bg', brand?.bg_dark)
  addColor('Secondary bg', brand?.bg_secondary)
  addColor('Accent bg', brand?.bg_accent)
  // Legacy / core
  addColor('Primary', brand?.primary_color)
  addColor('Secondary', brand?.secondary_color)
  addColor('Accent', brand?.accent_color)
  // Text
  addColor('Text on base', brand?.text_on_base)
  addColor('Text on dark', brand?.text_on_dark)
  addColor('Text on accent', brand?.text_on_accent)
  addColor('Heading', brand?.heading_color)
  addColor('Body', brand?.body_color)
  // Buttons
  addColor('Btn primary', brand?.btn_primary)
  addColor('Btn primary text', brand?.btn_primary_text)
  addColor('Btn secondary', brand?.btn_secondary)
  addColor('Btn secondary text', brand?.btn_secondary_text)
  addColor('Btn tertiary', brand?.btn_tertiary)
  addColor('Btn tertiary text', brand?.btn_tertiary_text)
  // Always include black and white
  addColor('Black', '#000000')
  addColor('White', '#ffffff')
  const brandColors = allColors
  const size = SIZES.find(s => s.id === sizeId)!
  const template = TEMPLATES.find(t => t.id === templateId)!
  const TemplateComponent = template.component
  const selectedImage = images.find(i => i.id === selectedImageId)
  const imageUrl = selectedImage ? supabase.storage.from('brand-images').getPublicUrl(selectedImage.storage_path).data.publicUrl : null
  const productImage = images.find(i => i.id === selectedProductImageId)
  const productImageUrl = productImage ? supabase.storage.from('brand-images').getPublicUrl(productImage.storage_path).data.publicUrl : null
  const brandLogoUrl = brand?.logo_url || null
  const brandSlug = brand?.slug || brand?.name?.toLowerCase().replace(/\s+/g, '-') || 'creative'

  // ── Brand sync (font loading, brand switching, data fetch) ────────
  useBrandSync({
    brandId, brands, campaignId, preloadedCopy,
    setImages, setSelectedImageId, setRecentCopy,
    setHeadline, setBodyText, setCtaText,
    setHeadlineFont, setHeadlineWeight, setHeadlineTransform,
    setBodyFont, setBodyWeight, setBodyTransform,
    setHeadlineColor, setBodyColor, setBgColor, setTextBannerColor,
    setHeadlineSizeMul, setBodySizeMul,
    setShowOverlay, setOverlayOpacity, setTextBanner, setTextPosition, setImagePosition,
    setActiveVariation, setActiveDraft, setVariations,
    setCtaColor, setCtaFontColor,
  })

  function getPublicUrl(storagePath: string) {
    return supabase.storage.from('brand-images').getPublicUrl(storagePath).data.publicUrl
  }

  function captureStyle(): StyleSnapshot {
    return { headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul, showOverlay, overlayOpacity, textBanner, textBannerColor, textPosition, showCta, imagePosition, ctaColor, ctaFontColor, ctaSizeMul }
  }

  function applyStyle(s: StyleSnapshot) {
    setHeadlineColor(s.headlineColor); setBodyColor(s.bodyColor)
    setHeadlineFont(s.headlineFont); setHeadlineWeight(s.headlineWeight); setHeadlineTransform(s.headlineTransform)
    setBodyFont(s.bodyFont); setBodyWeight(s.bodyWeight); setBodyTransform(s.bodyTransform)
    setBgColor(s.bgColor); setHeadlineSizeMul(s.headlineSizeMul); setBodySizeMul(s.bodySizeMul)
    setShowOverlay(s.showOverlay); setOverlayOpacity(s.overlayOpacity)
    setTextBanner(s.textBanner); setTextBannerColor(s.textBannerColor)
    setTextPosition(s.textPosition); setShowCta(s.showCta)
    setImagePosition(s.imagePosition || 'center')
    if (s.ctaColor !== undefined) setCtaColor(s.ctaColor)
    if (s.ctaFontColor !== undefined) setCtaFontColor(s.ctaFontColor)
    if (s.ctaSizeMul !== undefined) setCtaSizeMul(s.ctaSizeMul)
  }

  // ── AI Generate ────────────────────────────────────────────────────
  async function generateCopy() {
    if (!brandId || generating) return
    setGenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId, tool: 'ad_copy', tone: 'on-brand', platform: 'creative', subtype: 'image ad',
          brief: `Using ONLY the brand information provided above (products, mission, audience, voice), write ad copy. Do not invent any product names or features.${campaignBrief ? `\n\nCAMPAIGN CONTEXT:\n${campaignBrief}` : ''}

Return EXACTLY this format, one line each, nothing else:
HEADLINE: <3-5 words MAXIMUM, like a billboard>
BODY: <One sentence, under 75 characters including spaces. Clear and punchy.>
CTA: <2-3 words>
FB_PRIMARY: <1-2 short sentences>
FB_HEADLINE: <under 8 words>
FB_DESCRIPTION: <under 12 words>`,
        }),
      })
      let full = ''
      const reader = res.body?.getReader(); const decoder = new TextDecoder()
      if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {} } } } }
      const hm = full.match(/HEADLINE:\s*(.+)/i); const bm = full.match(/BODY:\s*(.+)/i); const cm = full.match(/CTA:\s*(.+)/i)
      const fp = full.match(/FB_PRIMARY:\s*(.+)/i); const fh = full.match(/FB_HEADLINE:\s*(.+)/i); const fd = full.match(/FB_DESCRIPTION:\s*(.+)/i)
      if (hm) setHeadline(hm[1].trim())
      if (bm) { let b = bm[1].trim(); if (b.length > 75) { b = b.slice(0, 75); const ls = b.lastIndexOf(' '); if (ls > 50) b = b.slice(0, ls); } setBodyText(b) }
      if (cm) setCtaText(cm[1].trim())
      if (fp) setFbPrimaryText(fp[1].trim()); if (fh) setFbHeadline(fh[1].trim()); if (fd) setFbDescription(fd[1].trim())
    } catch (err) { console.error('Generate failed:', err) }
    setGenerating(false)
  }

  function stopBatch() { batchAbortRef.current?.abort(); setBatchGenerating(false) }

  // Per-template optimal defaults for batch generation — clean slate, no current editor leaking
  function styleForTemplate(tid: string): StyleSnapshot {
    const nb = brand
    // Fonts from brand
    const h = nb?.font_heading; const hParts = (nb?.font_primary || '').split('|')
    const bo = nb?.font_body; const bParts = (nb?.font_secondary || '').split('|')
    const hFont = h?.family || hParts[0] || ''
    const hWeight = h?.weight || hParts[1] || '700'
    const hTransform = h?.transform || hParts[2] || 'none'
    const bFont = bo?.family || bParts[0] || ''
    const bWeight = bo?.weight || bParts[1] || '400'
    const bTransform = bo?.transform || bParts[2] || 'none'

    // Colors for dark bg (overlay, stat)
    const darkText = nb?.text_on_dark || nb?.heading_color || '#ffffff'
    const darkBody = nb?.text_on_dark || nb?.body_color || '#ffffff'
    // Colors for brand bg (split, card, testimonial, grid)
    const brandBg = nb?.bg_dark || nb?.bg_base || nb?.primary_color || '#000000'
    const lightBg = isLightColor(brandBg)
    const bgText = lightBg ? (nb?.text_on_base || '#000000') : (nb?.text_on_dark || '#ffffff')
    const bgBody = lightBg ? (nb?.text_on_base || '#1a1a1a') : (nb?.text_on_dark || '#ffffff')

    const shared = {
      headlineFont: hFont, headlineWeight: hWeight, headlineTransform: hTransform,
      bodyFont: bFont, bodyWeight: bWeight, bodyTransform: bTransform,
      headlineSizeMul: 1, bodySizeMul: 1,
      textBanner: 'none' as const, textBannerColor: brandBg,
    }

    // Primary color + smart text-on for split/card/testimonial
    const primary = nb?.primary_color || '#000000'
    const secondary = nb?.secondary_color || '#ffffff'
    const primaryIsLight = isLightColor(primary)
    const secondaryIsLight = isLightColor(secondary)
    const textOnPrimary = nb?.text_on_dark || (primaryIsLight ? '#000000' : '#ffffff')
    const bodyOnPrimary = nb?.text_on_dark || (primaryIsLight ? '#1a1a1a' : '#ffffff')
    const textOnSecondary = nb?.text_on_base || (secondaryIsLight ? '#000000' : '#ffffff')

    switch (tid) {
      case 'overlay':
        return { ...shared, headlineColor: '#ffffff', bodyColor: '#ffffff', textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: '#000', showCta: true }
      case 'stat':
        return { ...shared, headlineColor: '#ffffff', bodyColor: '#ffffff', textPosition: 'center', showOverlay: true, overlayOpacity: 30, imagePosition: 'center', bgColor: '#000', showCta: false }
      case 'split':
        return { ...shared, headlineColor: textOnPrimary, bodyColor: bodyOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: primary, showCta: true }
      case 'testimonial':
        return { ...shared, headlineColor: textOnPrimary, bodyColor: bodyOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'bottom', bgColor: primary, showCta: true }
      case 'ugc': // Card
        return { ...shared, headlineColor: textOnPrimary, bodyColor: bodyOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'bottom', bgColor: primary, showCta: true }
      case 'grid':
        return { ...shared, headlineColor: textOnSecondary, bodyColor: textOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: secondary, showCta: true }
      case 'mission':
        return { ...shared, headlineColor: darkText, bodyColor: darkBody, textPosition: 'center', showOverlay: true, overlayOpacity: 50, imagePosition: 'center', bgColor: '#000', showCta: false }
      case 'infographic':
        return { ...shared, headlineColor: darkText, bodyColor: darkBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: false }
      case 'comparison':
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: false }
      default:
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: true }
    }
  }

  function pickSecondImage(excludeId: string | null): string | null {
    // Grid templates pair a hero (lifestyle) with a product shot. For the
    // secondary slot, prefer a product image that isn't the hero — fall back
    // to any non-excluded image.
    const productPool = productImages.filter(img => img.id !== excludeId)
    if (productPool.length > 0) return productPool[0].id
    if (images.length < 2) return excludeId
    const others = images.filter(img => img.id !== excludeId)
    return others[Math.floor(Math.random() * others.length)]?.id || excludeId
  }

  function pickImageForTemplate(tid: string): string | null {
    if (images.length === 0) return null
    // Lifestyle-first pool for orientation matching. If the ideal orientation
    // has no lifestyle images, we still prefer any lifestyle image over a
    // product shot because lifestyle sets the tone for the creative.
    const orderedImages = [...lifestyleImages, ...productImages, ...otherImages]
    const portraits = orderedImages.filter(img => img.width && img.height && img.height > img.width)
    const landscapes = orderedImages.filter(img => img.width && img.height && img.width > img.height)
    const squares = orderedImages.filter(img => img.width && img.height && Math.abs(img.width - img.height) < img.width * 0.15)
    const firstOf = (arr: typeof images) => arr[0]?.id || null
    const randomFrom = (arr: typeof images) => arr[Math.floor(Math.random() * arr.length)]?.id || null

    switch (tid) {
      case 'overlay':
      case 'stat':
        return squares.length > 0 ? randomFrom(squares) : firstOf(orderedImages)
      case 'split':
        return portraits.length > 0 ? randomFrom(portraits) : firstOf(orderedImages)
      case 'ugc':
      case 'testimonial':
        return landscapes.length > 0 ? randomFrom(landscapes) : firstOf(orderedImages)
      case 'grid':
        // Grid hero slot gets the top lifestyle image deterministically
        return firstOf(orderedImages)
      default:
        return firstOf(orderedImages)
    }
  }

  async function generateBatch() {
    if (!brandId || batchGenerating || images.length === 0) return
    const abort = new AbortController(); batchAbortRef.current = abort
    setBatchGenerating(true); setVariations([]); setActiveVariation(null)
    const templateIds = TEMPLATES.map(t => t.id); const results: Variation[] = []
    // Overlay layout variants — rotated through each time 'overlay' is hit in
    // the batch so multiple overlay cards in the same run don't all look the
    // same. Position + overlay opacity + showOverlay are all varied.
    const overlayLayouts: { textPosition: TextPosition; showOverlay: boolean; overlayOpacity: number }[] = [
      { textPosition: 'bottom-left', showOverlay: true, overlayOpacity: 45 },
      { textPosition: 'top-left', showOverlay: true, overlayOpacity: 40 },
      { textPosition: 'center', showOverlay: true, overlayOpacity: 35 },
      { textPosition: 'bottom-center', showOverlay: true, overlayOpacity: 50 },
      { textPosition: 'top-center', showOverlay: true, overlayOpacity: 35 },
      { textPosition: 'bottom-right', showOverlay: true, overlayOpacity: 45 },
    ]
    let overlayCount = 0
    for (let i = 0; i < batchCount; i++) {
      if (abort.signal.aborted) break
      const tid = templateIds[i % templateIds.length]
      try {
        const res = await fetch('/api/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
          body: JSON.stringify({
            brandId, tool: 'ad_copy', tone: 'on-brand', platform: 'creative', subtype: 'image ad',
            brief: `Using ONLY the brand information provided above (products, mission, audience, voice), write ad copy. Variation ${i + 1} of ${batchCount} — each must be different. Do not invent any product names or features.${results.length > 0 ? `\n\nAlready used (write something different):\n${results.map((r, j) => `${j+1}. "${r.headline}" / "${r.body}"`).join('\n')}` : ''}${campaignBrief ? `\n\nCAMPAIGN CONTEXT:\n${campaignBrief}` : ''}

Return EXACTLY this format, one line each, nothing else:
HEADLINE: <3-5 words MAXIMUM, like a billboard>
BODY: <One sentence, under 75 characters including spaces. Clear and punchy.>
CTA: <2-3 words>
FB_PRIMARY: <1-2 short sentences>
FB_HEADLINE: <under 8 words>
FB_DESCRIPTION: <under 12 words>`,
          }),
        })
        let full = ''
        const reader = res.body?.getReader(); const decoder = new TextDecoder()
        if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {} } } } }
        const hm = full.match(/HEADLINE:\s*(.+)/i); const bm = full.match(/BODY:\s*(.+)/i); const cm = full.match(/CTA:\s*(.+)/i)
        const fp = full.match(/FB_PRIMARY:\s*(.+)/i); const fh = full.match(/FB_HEADLINE:\s*(.+)/i); const fd = full.match(/FB_DESCRIPTION:\s*(.+)/i)
        console.log(`[Batch ${i+1}] AI response:`, full.substring(0, 300))
        const nb = brand
        const firstProd = nb?.products?.[0]
        const defH = nb?.default_headline || firstProd?.name || nb?.name || 'Your Brand'
        const defB = nb?.default_body_text || nb?.mission?.slice(0, 80) || firstProd?.description?.slice(0, 80) || ''
        const defC = nb?.default_cta || 'Shop Now'
        const imgId = pickImageForTemplate(tid)
        let rawBody = bm?.[1]?.trim() || defB; if (rawBody.length > 75) { rawBody = rawBody.slice(0, 75); const ls = rawBody.lastIndexOf(' '); if (ls > 50) rawBody = rawBody.slice(0, ls) }
        const baseStyle = styleForTemplate(tid)
        const style = tid === 'overlay'
          ? { ...baseStyle, ...overlayLayouts[overlayCount++ % overlayLayouts.length] }
          : baseStyle
        const v = { headline: hm?.[1]?.trim() || defH, body: rawBody, cta: cm?.[1]?.trim() || defC, imageId: imgId, templateId: tid, style, fbPrimaryText: fp?.[1]?.trim() || '', fbHeadline: fh?.[1]?.trim() || '', fbDescription: fd?.[1]?.trim() || '' }
        results.push(v)
        setVariations([...results])
        // Load latest into preview
        setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta)
        setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style)
        if (tid === 'grid') setSelectedProductImageId(pickSecondImage(imgId))
        setFbPrimaryText(v.fbPrimaryText || ''); setFbHeadline(v.fbHeadline || ''); setFbDescription(v.fbDescription || '')
        setActiveVariation(results.length - 1)
      } catch (err) {
        console.error(`[Batch ${i+1}] Failed:`, err)
        const nb = brand
        const firstProd = nb?.products?.[0]
        const defH = nb?.default_headline || firstProd?.name || nb?.name || 'Your Brand'
        const defB = nb?.default_body_text || nb?.mission?.slice(0, 80) || firstProd?.description?.slice(0, 80) || ''
        const defC = nb?.default_cta || 'Shop Now'
        const fallbackImgId = pickImageForTemplate(tid)
        const baseStyle = styleForTemplate(tid)
        const style = tid === 'overlay'
          ? { ...baseStyle, ...overlayLayouts[overlayCount++ % overlayLayouts.length] }
          : baseStyle
        const v = { headline: defH, body: defB, cta: defC, imageId: fallbackImgId, templateId: tid, style }
        results.push(v)
        setVariations([...results])
        setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta)
        setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style)
        if (tid === 'grid') setSelectedProductImageId(pickSecondImage(fallbackImgId))
        setActiveVariation(results.length - 1)
      }
    }
    setBatchGenerating(false)
  }

  // ── Variation / Draft helpers ──────────────────────────────────────
  function loadVariation(i: number) { const v = variations[i]; if (!v) return; setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta); setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style); setFbPrimaryText(v.fbPrimaryText || ''); setFbHeadline(v.fbHeadline || ''); setFbDescription(v.fbDescription || ''); setActiveVariation(i); setActiveDraft(null) }
  function saveVariationAsDraft(i: number) { const v = variations[i]; if (!v) return; saveNewDraftToDB({ ...v, sizeId }) }

  function buildCurrentDraft(): Draft & { imageUrl?: string | null } {
    return {
      headline, body: bodyText, cta: ctaText,
      imageId: selectedImageId, templateId, style: captureStyle(), sizeId, imageUrl,
      // Include Meta-launch fields so the in-memory Draft matches what we
      // persist to saved_creatives. Without these the Launch modal opens
      // with empty pre-fills after a same-session save (reload was masking
      // the bug because load hydration reads them straight from the row).
      fbPrimaryText, fbHeadline, fbDescription,
      destinationUrl, ctaType,
    }
  }

  async function saveCurrentAsDraft() {
    await saveNewDraftToDB(buildCurrentDraft())
  }

  async function updateCurrentDraft() {
    if (activeDraft === null) return
    const d = savedDrafts[activeDraft]
    if (!d?.dbId) return
    const draft = buildCurrentDraft()
    const res = await fetch(`/api/creatives/${d.dbId}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: draft.templateId,
        size_id: draft.sizeId,
        image_url: draft.imageUrl || null,
        headline: draft.headline,
        body_text: draft.body,
        cta_text: draft.cta,
        style_snapshot: draft.style,
        // ── Meta ad launch fields ──
        destination_url: destinationUrl || null,
        cta_type: ctaType,
        fb_primary_text: fbPrimaryText || null,
        fb_headline: fbHeadline || null,
        fb_description: fbDescription || null,
      }),
    })
    if (res.ok) {
      setSavedDrafts(prev => prev.map((dd, i) => i === activeDraft ? { ...draft, dbId: d.dbId, imageUrl: draft.imageUrl } : dd))
      setExportToast('Updated!'); setTimeout(() => setExportToast(null), 2000)
    }
  }

  async function saveNewDraftToDB(draft: Draft & { imageUrl?: string | null }) {
    const payload = {
      brand_id: brandId,
      campaign_id: campaignId || null,
      template_id: draft.templateId,
      size_id: draft.sizeId,
      image_url: draft.imageUrl || null,
      headline: draft.headline,
      body_text: draft.body,
      cta_text: draft.cta,
      style_snapshot: draft.style,
      // ── Meta ad launch fields ──
      destination_url: destinationUrl || null,
      cta_type: ctaType,
      fb_primary_text: fbPrimaryText || null,
      fb_headline: fbHeadline || null,
      fb_description: fbDescription || null,
    }
    const res = await fetch('/api/creatives/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const saved = await res.json()
      const newDraft = { ...draft, dbId: saved.id, imageUrl: draft.imageUrl }
      setSavedDrafts(prev => [newDraft, ...prev])
      setActiveDraft(0)
      setExportToast('Saved!'); setTimeout(() => setExportToast(null), 2000)

      // Fire-and-forget thumbnail render — renders the creative at 1080x1080
      // via the existing Puppeteer pipeline, uploads to brand-assets storage,
      // and PATCHes the row with thumbnail_url. Runs in the background so the
      // Save toast fires immediately; any failure is logged and swallowed.
      if (saved.id) {
        generateAndUploadThumbnail(saved.id, draft).catch(e => {
          console.warn('[thumbnail] post-save render failed:', e)
        })
      }
    } else {
      const err = await res.text()
      console.error('[Save creative] Failed:', res.status, err)
      setExportToast('Save failed'); setTimeout(() => setExportToast(null), 3000)
    }
  }

  // Post-save thumbnail: renders the creative at feed size (1080x1080) via
  // the existing /api/export/png pipeline, uploads the PNG to the
  // brand-assets bucket at thumbnails/{brand_id}/{creative_id}.png, then
  // PATCHes the saved_creatives row with the public URL. Client-side so the
  // save response isn't blocked and so we don't need server-side
  // fire-and-forget (which is unreliable on serverless).
  async function generateAndUploadThumbnail(
    creativeId: string,
    draft: Draft & { imageUrl?: string | null }
  ) {
    if (!brandId) return
    try {
      const { fetchPngViaPuppeteer } = await import('./hooks/useCreativeExport')
      // Build minimal template props for the feed (1:1) size. The render
      // page reads template props via propsId, so only serializable props
      // matter here.
      const feedProps = thumbProps(draft, draft.imageUrl || null, 1080, 1080)
      const buf = await fetchPngViaPuppeteer(
        draft.templateId,
        feedProps,
        1080,
        1080,
        `thumb-${creativeId}.png`
      )
      const file = new Blob([buf], { type: 'image/png' })
      const path = `thumbnails/${brandId}/${creativeId}.png`
      const { error: uploadErr } = await supabase.storage
        .from('brand-assets')
        .upload(path, file, { contentType: 'image/png', upsert: true })
      if (uploadErr) {
        console.warn('[thumbnail] upload failed:', uploadErr.message)
        return
      }
      const { data: pub } = supabase.storage.from('brand-assets').getPublicUrl(path)
      if (!pub?.publicUrl) return
      await fetch(`/api/creatives/${creativeId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail_url: pub.publicUrl }),
      })
    } catch (e) {
      console.warn('[thumbnail] render or upload threw:', e)
    }
  }

  function loadDraft(i: number) {
    const d = savedDrafts[i]; if (!d) return
    setHeadline(d.headline); setBodyText(d.body); setCtaText(d.cta)
    if (d.imageId) { setSelectedImageId(d.imageId) }
    else if (d.imageUrl) {
      const match = images.find(img => getPublicUrl(img.storage_path) === d.imageUrl)
      if (match) setSelectedImageId(match.id)
    }
    setTemplateId(d.templateId); setSizeId(d.sizeId); applyStyle(d.style); setActiveDraft(i); setActiveVariation(null)
    // Restore Meta ad launch fields from the hydrated draft row.
    setDestinationUrl(d.destinationUrl || '')
    setCtaType((d.ctaType as CtaType) || 'LEARN_MORE')
    setFbPrimaryText(d.fbPrimaryText || '')
    setFbHeadline(d.fbHeadline || '')
    setFbDescription(d.fbDescription || '')
  }

  function clearActiveDraft() { setActiveDraft(null); setActiveVariation(null) }

  async function removeDraft(i: number) {
    const d = savedDrafts[i]
    if (d?.dbId) { fetch(`/api/creatives/${d.dbId}/delete`, { method: 'DELETE' }) }
    setSavedDrafts(prev => prev.filter((_, j) => j !== i))
    if (activeDraft === i) setActiveDraft(null)
    else if (activeDraft !== null && activeDraft > i) setActiveDraft(activeDraft - 1)
  }

  // ── Auto-sync edits back to active variation/draft ─────────────────
  useEffect(() => {
    const snapshot = { headline, body: bodyText, cta: ctaText, imageId: selectedImageId, templateId, style: captureStyle() }
    if (activeVariation !== null) {
      setVariations(prev => prev.map((v, i) => i === activeVariation ? { ...v, ...snapshot } : v))
    }
    if (activeDraft !== null) {
      setSavedDrafts(prev => prev.map((d, i) => i === activeDraft ? { ...d, ...snapshot } : d))
    }
  }, [headline, bodyText, ctaText, selectedImageId, templateId, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul, showOverlay, overlayOpacity, textBanner, textBannerColor, textPosition, showCta, imagePosition, ctaColor, ctaFontColor, ctaSizeMul])

  useEffect(() => {
    if (preloadedCopy?.headline) setHeadline(preloadedCopy.headline)
    if (preloadedCopy?.primary_text) {
      const t = preloadedCopy.primary_text
      if (t.length <= 90) setBodyText(t)
      else { const cut = t.slice(0, 90); const ls = cut.lastIndexOf(' '); setBodyText((ls > 80 ? cut.slice(0, ls) : cut).replace(/[.,;:!?—-]\s*$/, '').trim()) }
    }
    if (preloadedCopy?.description) setCtaText(preloadedCopy.description || 'Shop Now')
  }, [preloadedCopy])

  // Load saved creatives from DB
  useEffect(() => {
    if (!brandId) return
    fetch(`/api/creatives/by-brand/${brandId}`)
      .then(r => {
        if (!r.ok) { console.error('[Load creatives] API error:', r.status); return [] }
        return r.json()
      })
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) { console.warn('[Load creatives] Unexpected response:', rows); return }
        console.log(`[Load creatives] Loaded ${rows.length} saved creatives for brand ${brandId}`)
        const drafts: Draft[] = rows.map(r => ({
          headline: r.headline || '',
          body: r.body_text || '',
          cta: r.cta_text || '',
          imageId: null,
          templateId: r.template_id,
          sizeId: r.size_id || 'feed',
          style: r.style_snapshot || {},
          dbId: r.id,
          imageUrl: r.image_url,
          thumbnailUrl: r.thumbnail_url || null,
          // ── Meta ad launch fields ──
          destinationUrl: r.destination_url || '',
          ctaType: (r.cta_type as CtaType) || 'LEARN_MORE',
          fbPrimaryText: r.fb_primary_text || '',
          fbHeadline: r.fb_headline || '',
          fbDescription: r.fb_description || '',
          metaAdId: r.meta_ad_id || null,
          metaAdStatus: r.meta_ad_status || null,
        }))
        setSavedDrafts(drafts)
      })
      .catch(err => console.error('[Load creatives] Fetch failed:', err))
  }, [brandId])

  useEffect(() => {
    const el = leftPanelRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setPreviewContainerW(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Template props ─────────────────────────────────────────────────
  const templateProps = {
    imageUrl, headline, bodyText, ctaText, brandColor, brandName: brand?.name || '',
    textPosition, showCta, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform,
    bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
    showOverlay, overlayOpacity: overlayOpacity / 100, textBanner, textBannerColor, ctaColor, ctaFontColor, ctaSizeMul, imagePosition,
    callouts, statStripText, oldWayItems, newWayItems, subtitle, brandLogoUrl, productImageUrl,
    customFontsCss: brand?.custom_fonts_css || '',
  }

  const thumbProps = useCallback((v: Variation, imgUrl: string | null, w?: number, h?: number) => ({
    imageUrl: imgUrl,
    headline: v.headline,
    bodyText: v.body,
    ctaText: v.cta,
    brandColor,
    brandName: brand?.name || '',
    width: w ?? size.w,
    height: h ?? size.h,
    ctaColor: v.style.ctaColor ?? ctaColor,
    ctaFontColor: v.style.ctaFontColor ?? ctaFontColor,
    ctaSizeMul: v.style.ctaSizeMul ?? 1,
    headlineColor: v.style.headlineColor,
    bodyColor: v.style.bodyColor,
    headlineFont: v.style.headlineFont,
    headlineWeight: v.style.headlineWeight,
    headlineTransform: v.style.headlineTransform,
    bodyFont: v.style.bodyFont,
    bodyWeight: v.style.bodyWeight,
    bodyTransform: v.style.bodyTransform,
    bgColor: v.style.bgColor,
    headlineSizeMul: v.style.headlineSizeMul,
    bodySizeMul: v.style.bodySizeMul,
    showOverlay: v.style.showOverlay,
    overlayOpacity: v.style.overlayOpacity / 100,
    textBanner: v.style.textBanner,
    textBannerColor: v.style.textBannerColor,
    textPosition: v.style.textPosition,
    showCta: v.style.showCta,
    imagePosition: v.style.imagePosition || 'center',
    customFontsCss: brand?.custom_fonts_css || '',
  }), [brandColor, brand?.name, size.w, size.h, ctaColor, ctaFontColor, brand?.custom_fonts_css])

  // ── Export hook ────────────────────────────────────────────────────
  const { exportRef, exportPng, exportAllSizes, exportAllVariations, exportAllDrafts } = useCreativeExport({
    brandSlug, brandId: brand?.id, campaignId, templateId, sizeId,
    templateProps, TemplateComponent, size, images,
    variations, savedDrafts, brandColor, brandName: brand?.name || '',
    ctaColor, ctaFontColor, getPublicUrl, thumbProps,
    setExporting, setExportingAll, setExportToast,
  })

  // ── Preview scaling ────────────────────────────────────────────────
  const maxPreviewH = 460
  const maxPreviewW = Math.min(600, previewContainerW || 600)
  const scale = Math.min(maxPreviewH / size.h, maxPreviewW / size.w)
  const previewW = Math.round(size.w * scale)
  const previewH = Math.round(size.h * scale)

  // ── Styles ─────────────────────────────────────────────────────────
  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"
  const pill = (active: boolean) => ({
    className: "text-xs px-2.5 py-1 rounded-pill transition-all duration-150 font-semibold cursor-pointer",
    style: active
      ? { background: '#111', color: '#4ade80', border: 'none' } as const
      : { background: '#fff', border: '1px solid #ddd', color: '#333' } as const,
  })

  // ── Style reset handler ────────────────────────────────────────────
  function handleStyleReset() {
    const h = brand?.font_heading; const hP = (brand?.font_primary || '').split('|')
    const b = brand?.font_body; const bP = (brand?.font_secondary || '').split('|')
    setHeadlineColor(brand?.heading_color || brand?.primary_color || '#ffffff')
    setBodyColor(brand?.body_color || '#ffffff')
    setHeadlineFont(h?.family || hP[0] || ''); setHeadlineWeight(h?.weight || hP[1] || '700'); setHeadlineTransform(h?.transform || hP[2] || 'none')
    setBodyFont(b?.family || bP[0] || ''); setBodyWeight(b?.weight || bP[1] || '400'); setBodyTransform(b?.transform || bP[2] || 'none')
    setBgColor(brand?.primary_color || '#000000'); setHeadlineSizeMul(1); setBodySizeMul(1)
    setShowOverlay(false); setOverlayOpacity(50); setTextBanner('none')
  }

  // ── Derived image groups for left panel ────────────────────────────
  // Smart bucketing — Shopify brands use tag='shopify' for products,
  // non-Shopify brands use tag='product'. Lifestyle covers everything else.
  const { productImages, lifestyleImages } = bucketBrandImages(images, getBusinessType(brand))
  const otherImages = images.filter(i =>
    i.tag !== 'product' && i.tag !== 'shopify' && i.tag !== 'lifestyle' && i.tag !== 'background'
  )

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f5f5f5' }}>

      {/* ── TOPBAR ── */}
      <div className="creative-topbar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 48, minHeight: 48, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <style>{`@media(max-width:767px){.creative-topbar{overflow-x:auto;white-space:nowrap;scrollbar-width:none;-ms-overflow-style:none}.creative-topbar::-webkit-scrollbar{display:none}}`}</style>
        {/* Size pills */}
        {SIZES.map(s => (
          <button key={s.id} onClick={() => setSizeId(s.id)} {...pill(sizeId === s.id)}>{s.label}</button>
        ))}

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />

        {/* Template pills */}
        {TEMPLATES.map(t => (
          <button key={t.id}
            onClick={() => {
              setTemplateId(t.id)
              if (t.id === 'stat') { setTextPosition('center'); setShowOverlay(true); setOverlayOpacity(30) }
              if (t.id === 'ugc') { setImagePosition('bottom') }
              if (t.id === 'testimonial') { setImagePosition('bottom') }
              // Lifestyle-first pool for template image picks. Falls back to
              // product images only when no lifestyle images match the required
              // orientation. Matches the "lifestyle sets the tone" rule.
              const orderedImages = [...lifestyleImages, ...productImages, ...otherImages]
              const portrait = orderedImages.filter(img => img.width && img.height && img.height > img.width)
              const landscape = orderedImages.filter(img => img.width && img.height && img.width > img.height)
              const square = orderedImages.filter(img => img.width && img.height && Math.abs(img.width - img.height) < img.width * 0.15)
              const randFrom = (arr: typeof images) => arr[Math.floor(Math.random() * arr.length)]
              if (t.id === 'overlay' || t.id === 'stat') { const sq = square.length > 0 ? randFrom(square) : randFrom(orderedImages); if (sq) setSelectedImageId(sq.id) }
              if (t.id === 'split' && portrait.length > 0) setSelectedImageId(randFrom(portrait).id)
              if ((t.id === 'ugc' || t.id === 'testimonial') && landscape.length > 0) setSelectedImageId(randFrom(landscape).id)
              if (t.id === 'grid' && orderedImages.length > 1) {
                // Grid: lifestyle in the hero slot, product in the secondary slot
                // (the "product image" on a grid template is explicitly the product shot)
                setSelectedImageId(orderedImages[0].id)
                const productShot = productImages[0] || orderedImages[1]
                if (productShot) setSelectedProductImageId(productShot.id)
              }
            }}
            {...pill(templateId === t.id)}
            style={{
              ...(templateId === t.id
                ? { background: '#111', color: '#4ade80', border: 'none' }
                : { background: '#fff', border: '1px solid #ddd', color: '#333' }),
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}

        {campaignId && (
          <>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <a href={`/preview/${campaignId}`} style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                ← Back to funnel
              </a>
            </div>
          </>
        )}
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-col md:flex-row" style={{ alignItems: 'flex-start' }}>

        {/* ── PREVIEW PANEL ── */}
        <div ref={leftPanelRef} className="w-full md:w-auto" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 12, margin: 12, padding: 16 }}>
            <PreviewCanvas
              templateLabel={template.label}
              size={size}
              previewW={previewW}
              previewH={previewH}
              scale={scale}
              TemplateComponent={TemplateComponent}
              templateProps={templateProps}
              bodyFont={bodyFont}
              bodyText={bodyText}
              headline={headline}
              ctaText={ctaText}
              fbPrimaryText={fbPrimaryText}
              fbHeadline={fbHeadline}
              fbDescription={fbDescription}
              saveCurrentAsDraft={saveCurrentAsDraft}
              updateCurrentDraft={updateCurrentDraft}
              clearActiveDraft={clearActiveDraft}
              isEditingDraft={activeDraft !== null && !!savedDrafts[activeDraft]?.dbId}
              batchGenerating={batchGenerating}
              batchCount={batchCount}
              setBatchCount={setBatchCount}
              generateBatch={generateBatch}
              stopBatch={stopBatch}
              variationsCount={variations.length}
              imagesCount={images.length}
              setExportToast={setExportToast}
              exportPng={exportPng}
              exportAllSizes={exportAllSizes}
              exporting={exporting}
              exportingAll={exportingAll}
              afterBatchSlot={
                variations.length > 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <VariationStrip
                      variations={variations}
                      activeVariation={activeVariation}
                      loadVariation={loadVariation}
                      saveVariationAsDraft={saveVariationAsDraft}
                      savedDrafts={savedDrafts}
                      size={size}
                      images={images}
                      getPublicUrl={getPublicUrl}
                      thumbProps={thumbProps}
                      exportAllVariations={exportAllVariations}
                      exportingAll={exportingAll}
                      sizeId={sizeId}
                    />
                  </div>
                ) : null
              }
            />

            {/* Draft strip */}
            <div style={{ marginTop: 12 }}>
              <DraftStrip
                savedDrafts={savedDrafts}
                activeDraft={activeDraft}
                loadDraft={loadDraft}
                removeDraft={removeDraft}
                size={size}
                images={images}
                getPublicUrl={getPublicUrl}
                thumbProps={thumbProps}
                exportAllDrafts={exportAllDrafts}
                exportingAll={exportingAll}
                metaConnected={metaConnected}
                onLaunchDraft={i => setLaunchModalDraft(i)}
              />
            </div>

          </div>
        </div>

        {/* ── IMAGES PANEL ── */}
        <div className="w-full md:w-auto" style={{ flex: 0.5, minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 12, margin: 12, padding: 16, maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
            {/* Lifestyle first — sets the emotional tone for a creative and is the
                default pick downstream. Product shots come after as fallback. */}
            {lifestyleImages.length > 0 && (
              <>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#00ff97', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>LIFESTYLE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lifestyleImages.map(img => (
                    <div key={img.id} onClick={() => setSelectedImageId(img.id === selectedImageId ? null : img.id)}
                      style={{ width: 'calc(50% - 3px)', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', outline: img.id === selectedImageId ? '2px solid #00ff97' : 'none', outlineOffset: 2 }}>
                      <img src={getPublicUrl(img.storage_path)} alt={img.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                    </div>
                  ))}
                </div>
              </>
            )}
            {productImages.length > 0 && (
              <>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#00ff97', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: lifestyleImages.length > 0 ? 16 : 0, marginBottom: 8 }}>PRODUCT</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {productImages.map(img => (
                    <div key={img.id} onClick={() => setSelectedImageId(img.id === selectedImageId ? null : img.id)}
                      style={{ width: 'calc(50% - 3px)', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', outline: img.id === selectedImageId ? '2px solid #00ff97' : 'none', outlineOffset: 2 }}>
                      <img src={getPublicUrl(img.storage_path)} alt={img.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                    </div>
                  ))}
                </div>
              </>
            )}
            {otherImages.length > 0 && (
              <>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#00ff97', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 8 }}>OTHER</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {otherImages.map(img => (
                    <div key={img.id} onClick={() => setSelectedImageId(img.id === selectedImageId ? null : img.id)}
                      style={{ width: 'calc(50% - 3px)', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', outline: img.id === selectedImageId ? '2px solid #00ff97' : 'none', outlineOffset: 2 }}>
                      <img src={getPublicUrl(img.storage_path)} alt={img.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                    </div>
                  ))}
                </div>
              </>
            )}
            {images.length === 0 && (
              <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '24px 0' }}>No images</div>
            )}
          </div>
        </div>

        {/* ── STYLE & COPY PANEL ── */}
        <div className="w-full md:w-auto" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 12, margin: 12, padding: 16 }}>
          <StylePanel
            templateId={templateId}
            brand={brand}
            textPosition={textPosition}
            setTextPosition={setTextPosition}
            imagePosition={imagePosition}
            setImagePosition={setImagePosition}
            bgColor={bgColor}
            updateBgColor={updateBgColor}
            showOverlay={showOverlay}
            setShowOverlay={setShowOverlay}
            overlayOpacity={overlayOpacity}
            setOverlayOpacity={setOverlayOpacity}
            textBanner={textBanner}
            setTextBanner={setTextBanner}
            textBannerColor={textBannerColor}
            setTextBannerColor={setTextBannerColor}
            headlineFont={headlineFont}
            setHeadlineFont={setHeadlineFont}
            headlineColor={headlineColor}
            setHeadlineColor={setHeadlineColor}
            headlineSizeMul={headlineSizeMul}
            setHeadlineSizeMul={setHeadlineSizeMul}
            bodyFont={bodyFont}
            setBodyFont={setBodyFont}
            bodyColor={bodyColor}
            setBodyColor={setBodyColor}
            bodySizeMul={bodySizeMul}
            setBodySizeMul={setBodySizeMul}
            brandColors={brandColors}
            pill={pill}
            onReset={handleStyleReset}
            setHeadlineWeight={setHeadlineWeight}
            setHeadlineTransform={setHeadlineTransform}
            setBodyFont2={setBodyFont}
            setBodyWeight={setBodyWeight}
            setBodyTransform={setBodyTransform}
            setBgColor={setBgColor}
            setHeadlineSizeMul2={setHeadlineSizeMul}
            setBodySizeMul2={setBodySizeMul}
            setShowOverlay2={setShowOverlay}
            setOverlayOpacity2={setOverlayOpacity}
            setTextBanner2={setTextBanner}
            ctaColor={ctaColor}
            setCtaColor={setCtaColor}
            ctaFontColor={ctaFontColor}
            setCtaFontColor={setCtaFontColor}
            ctaSizeMul={ctaSizeMul}
            setCtaSizeMul={setCtaSizeMul}
          />

          <div style={{ marginTop: 16 }}>
          <CopyEditor
            headline={headline}
            setHeadline={setHeadline}
            bodyText={bodyText}
            setBodyText={setBodyText}
            ctaText={ctaText}
            setCtaText={setCtaText}
            showCta={showCta}
            setShowCta={setShowCta}
            brandId={brandId}
            setExportToast={setExportToast}
            inputCls={inputCls}
            generateCopy={generateCopy}
            generating={generating}
            destinationUrl={destinationUrl}
            setDestinationUrl={setDestinationUrl}
            ctaType={ctaType}
            setCtaType={setCtaType}
            fbPrimaryText={fbPrimaryText}
            setFbPrimaryText={setFbPrimaryText}
            fbHeadline={fbHeadline}
            setFbHeadline={setFbHeadline}
            fbDescription={fbDescription}
            setFbDescription={setFbDescription}
            brandWebsite={(brand as { website?: string | null } | null)?.website ?? null}
          />
          </div>

          {templateId === 'grid' && images.length > 1 && (
            <div style={{ padding: 16 }}>
              <label style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 4 }}>Second image</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                {images.map(img => (
                  <button key={img.id} onClick={() => setSelectedProductImageId(img.id === selectedProductImageId ? null : img.id)}
                    style={{ aspectRatio: '1', borderRadius: 3, overflow: 'hidden', border: `2px solid ${selectedProductImageId === img.id ? '#4ade80' : '#e0e0e0'}`, padding: 0, background: 'none', cursor: 'pointer' }}>
                    <img src={getPublicUrl(img.storage_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          </div>
        </div>

      </div>{/* end MAIN AREA */}

      {/* Hidden export container */}
      <div ref={exportRef} aria-hidden style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }} />

      {/* Toast */}
      {(exporting || exportingAll) && !exportToast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12, background: '#000', color: '#fff', padding: '14px 24px', borderRadius: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          {exportingAll ? 'Generating all sizes...' : 'Generating PNG...'}
        </div>
      )}
      {exportToast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, background: '#000', color: '#00ff97', padding: '14px 24px', borderRadius: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3.5" stroke="#00ff97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {exportToast}
        </div>
      )}

      {/* ── Meta launch modal ── */}
      {launchModalDraft !== null && brand && savedDrafts[launchModalDraft]?.dbId && (() => {
        const d = savedDrafts[launchModalDraft]
        // Reconstruct the minimal SavedCreative shape the modal expects from
        // the Draft + the saved row's dbId. The modal only needs image urls,
        // copy, and the Meta-specific fields.
        const creative = {
          id: d.dbId!,
          created_at: '',
          brand_id: brand.id,
          campaign_id: null,
          template_id: d.templateId,
          size_id: d.sizeId,
          image_url: d.imageUrl || null,
          headline: d.headline,
          body_text: d.body,
          cta_text: d.cta,
          style_snapshot: d.style,
          thumbnail_url: d.thumbnailUrl || null,
          name: null,
          destination_url: d.destinationUrl || null,
          cta_type: d.ctaType || 'LEARN_MORE',
          fb_primary_text: d.fbPrimaryText || null,
          fb_headline: d.fbHeadline || null,
          fb_description: d.fbDescription || null,
          meta_ad_id: d.metaAdId || null,
          meta_ad_status: d.metaAdStatus || null,
        }
        return (
          <MetaLaunchModal
            creative={creative}
            brand={{
              id: brand.id,
              website: (brand as { website?: string | null }).website ?? null,
              notes: brand.notes,
            }}
            onClose={() => setLaunchModalDraft(null)}
            onSuccess={result => {
              setSavedDrafts(prev => prev.map((dd, idx) =>
                idx === launchModalDraft
                  ? { ...dd, metaAdId: result.adId, metaAdStatus: result.status }
                  : dd
              ))
            }}
          />
        )
      })()}
    </div>
  )
}
