'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage } from '@/types'
import { ChevronDown, Download, Sparkles, Loader2, Check } from 'lucide-react'
import { TextPosition } from './templates/types'
import { Callout } from './templates/types'
import { TEMPLATES, SIZES } from './templates/registry'
import type { Brand, GeneratedCopy, StyleSnapshot, Variation, Draft } from './types'
import { useBrandSync, isLightColor } from './hooks/useBrandSync'
import { useCreativeExport } from './hooks/useCreativeExport'
import ImagePicker from './sidebar/ImagePicker'
import CopyEditor from './sidebar/CopyEditor'
import StylePanel from './sidebar/StylePanel'
import InfographicSidebar from './sidebar/InfographicSidebar'
import ComparisonSidebar from './sidebar/ComparisonSidebar'
import MissionSidebar from './sidebar/MissionSidebar'
import PreviewCanvas from './preview/PreviewCanvas'
import VariationStrip from './preview/VariationStrip'
import DraftStrip from './preview/DraftStrip'

export default function CreativeBuilder({
  brands,
  defaultBrandId,
  campaignId,
  campaignBrief,
}: {
  brands: Brand[]
  defaultBrandId?: string
  campaignId?: string
  campaignBrief?: string
}) {
  const supabase = createClient()

  // ── State ──────────────────────────────────────────────────────────
  const initId = defaultBrandId || brands[0]?.id || ''
  const [brandId, setBrandId] = useState(initId)
  const [images, setImages] = useState<BrandImage[]>([])
  const [recentCopy, setRecentCopy] = useState<GeneratedCopy[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string>('overlay')
  const [sizeId, setSizeId] = useState<string>('feed')
  const [headline, setHeadline] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [ctaText, setCtaText] = useState('Shop Now')
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
  const [exporting, setExporting] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportToast, setExportToast] = useState<string | null>(null)

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
  const brandColor = brand?.primary_color || '#00ff97'
  const [ctaColor, setCtaColor] = useState(brand?.accent_color || brandColor)
  const [ctaFontColor, setCtaFontColor] = useState(brand?.accent_font_color || '#000000')
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
  })

  function getPublicUrl(storagePath: string) {
    return supabase.storage.from('brand-images').getPublicUrl(storagePath).data.publicUrl
  }

  function captureStyle(): StyleSnapshot {
    return { headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul, showOverlay, overlayOpacity, textBanner, textBannerColor, textPosition, showCta, imagePosition }
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
          brief: `Generate exactly one short headline (under 8 words) and one body line (under 20 words) for a visual ad creative.${campaignBrief ? `\n\nCAMPAIGN CONTEXT:\n${campaignBrief}` : ''}\n\nFormat as:\nHEADLINE: <headline text>\nBODY: <body text>\nCTA: <cta text>\nNothing else.`,
        }),
      })
      let full = ''
      const reader = res.body?.getReader(); const decoder = new TextDecoder()
      if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {} } } } }
      const hm = full.match(/HEADLINE:\s*(.+)/i); const bm = full.match(/BODY:\s*(.+)/i); const cm = full.match(/CTA:\s*(.+)/i)
      if (hm) setHeadline(hm[1].trim()); if (bm) setBodyText(bm[1].trim()); if (cm) setCtaText(cm[1].trim())
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

    switch (tid) {
      case 'overlay':
        return { ...shared, headlineColor: darkText, bodyColor: darkBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: '#000', showCta: true }
      case 'stat':
        return { ...shared, headlineColor: darkText, bodyColor: darkBody, textPosition: 'center', showOverlay: true, overlayOpacity: 30, imagePosition: 'center', bgColor: '#000', showCta: false }
      case 'split':
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: true }
      case 'testimonial':
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'bottom', bgColor: brandBg, showCta: true }
      case 'ugc': // Card
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'bottom', bgColor: brandBg, showCta: true }
      case 'grid':
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: true }
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

  function pickImageForTemplate(tid: string): string | null {
    if (images.length === 0) return null
    const portraits = images.filter(img => img.width && img.height && img.height > img.width)
    const landscapes = images.filter(img => img.width && img.height && img.width > img.height)
    const squares = images.filter(img => img.width && img.height && Math.abs(img.width - img.height) < img.width * 0.15)
    const randomFrom = (arr: typeof images) => arr[Math.floor(Math.random() * arr.length)]?.id || null

    switch (tid) {
      case 'overlay':
      case 'stat':
        return squares.length > 0 ? randomFrom(squares) : randomFrom(images)
      case 'split':
        return portraits.length > 0 ? randomFrom(portraits) : randomFrom(images)
      case 'ugc':
      case 'testimonial':
        return landscapes.length > 0 ? randomFrom(landscapes) : randomFrom(images)
      case 'grid': {
        const shuffled = [...images].sort(() => Math.random() - 0.5)
        return shuffled[0]?.id || null
      }
      default:
        return randomFrom(images)
    }
  }

  async function generateBatch() {
    if (!brandId || batchGenerating || images.length === 0) return
    const abort = new AbortController(); batchAbortRef.current = abort
    setBatchGenerating(true); setVariations([]); setActiveVariation(null)
    const templateIds = TEMPLATES.map(t => t.id); const results: Variation[] = []
    for (let i = 0; i < batchCount; i++) {
      if (abort.signal.aborted) break
      const tid = templateIds[i % templateIds.length]
      try {
        const res = await fetch('/api/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
          body: JSON.stringify({
            brandId, tool: 'ad_copy', tone: 'on-brand', platform: 'creative', subtype: 'image ad',
            brief: `Generate exactly one unique short headline (under 8 words) and one body line (under 20 words) for a visual ad creative. Variation ${i + 1} of ${batchCount} — make each one distinct.${campaignBrief ? `\n\nCAMPAIGN CONTEXT:\n${campaignBrief}` : ''}\n\nFormat as:\nHEADLINE: <headline text>\nBODY: <body text>\nCTA: <cta text>\nNothing else.`,
          }),
        })
        let full = ''
        const reader = res.body?.getReader(); const decoder = new TextDecoder()
        if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {} } } } }
        const hm = full.match(/HEADLINE:\s*(.+)/i); const bm = full.match(/BODY:\s*(.+)/i); const cm = full.match(/CTA:\s*(.+)/i)
        results.push({ headline: hm?.[1]?.trim() || 'Headline', body: bm?.[1]?.trim() || 'Body text', cta: cm?.[1]?.trim() || 'Shop Now', imageId: pickImageForTemplate(tid), templateId: tid, style: styleForTemplate(tid) })
        setVariations([...results])
      } catch {
        results.push({ headline: 'Headline', body: 'Body text', cta: 'Shop Now', imageId: pickImageForTemplate(tid), templateId: tid, style: styleForTemplate(tid) })
        setVariations([...results])
      }
    }
    setBatchGenerating(false)
  }

  // ── Variation / Draft helpers ──────────────────────────────────────
  function loadVariation(i: number) { const v = variations[i]; if (!v) return; setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta); setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style); setActiveVariation(i); setActiveDraft(null) }
  function saveVariationAsDraft(i: number) { const v = variations[i]; if (!v) return; setSavedDrafts(prev => [...prev, { ...v, sizeId }]) }
  function saveCurrentAsDraft() {
    setSavedDrafts(prev => [...prev, { headline, body: bodyText, cta: ctaText, imageId: selectedImageId, templateId, style: captureStyle(), sizeId }])
  }
  function loadDraft(i: number) { const d = savedDrafts[i]; if (!d) return; setHeadline(d.headline); setBodyText(d.body); setCtaText(d.cta); setSelectedImageId(d.imageId); setTemplateId(d.templateId); setSizeId(d.sizeId); applyStyle(d.style); setActiveDraft(i); setActiveVariation(null) }
  function removeDraft(i: number) { setSavedDrafts(prev => prev.filter((_, j) => j !== i)); if (activeDraft === i) setActiveDraft(null); else if (activeDraft !== null && activeDraft > i) setActiveDraft(activeDraft - 1) }

  // ── Auto-sync edits back to active variation/draft ─────────────────
  useEffect(() => {
    const snapshot = { headline, body: bodyText, cta: ctaText, imageId: selectedImageId, templateId, style: captureStyle() }
    if (activeVariation !== null) {
      setVariations(prev => prev.map((v, i) => i === activeVariation ? { ...v, ...snapshot } : v))
    }
    if (activeDraft !== null) {
      setSavedDrafts(prev => prev.map((d, i) => i === activeDraft ? { ...d, ...snapshot } : d))
    }
  }, [headline, bodyText, ctaText, selectedImageId, templateId, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul, showOverlay, overlayOpacity, textBanner, textBannerColor, textPosition, showCta, imagePosition])

  // ── Template props ─────────────────────────────────────────────────
  const templateProps = {
    imageUrl, headline, bodyText, ctaText, brandColor, brandName: brand?.name || '',
    textPosition, showCta, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform,
    bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
    showOverlay, overlayOpacity: overlayOpacity / 100, textBanner, textBannerColor, ctaColor, ctaFontColor, imagePosition,
    callouts, statStripText, oldWayItems, newWayItems, subtitle, brandLogoUrl, productImageUrl,
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
    ctaColor,
    ctaFontColor,
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
  }), [brandColor, brand?.name, size.w, size.h, ctaColor, ctaFontColor])

  // ── Export hook ────────────────────────────────────────────────────
  const { exportRef, exportPng, exportAllSizes, exportAllVariations, exportAllDrafts } = useCreativeExport({
    brandSlug, brandId: brand?.id, campaignId, templateId, sizeId,
    templateProps, TemplateComponent, size, images,
    variations, savedDrafts, brandColor, brandName: brand?.name || '',
    ctaColor, ctaFontColor, getPublicUrl, thumbProps,
    setExporting, setExportingAll, setExportToast,
  })

  // ── Preview scaling ────────────────────────────────────────────────
  const maxPreviewH = 420
  const scale = maxPreviewH / size.h
  const previewW = Math.round(size.w * scale)
  const previewH = maxPreviewH

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

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* TOP BAR — Brand + Size + Actions */}
      <div className="bg-paper border border-border rounded-card px-4 py-2.5 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <select value={brandId} onChange={e => setBrandId(e.target.value)}
            className="text-sm font-semibold border border-border rounded-btn pl-3 pr-7 py-1.5 bg-cream appearance-none focus:outline-none focus:border-accent">
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>
        <span className="w-px h-5 bg-border" />
        <div className="flex gap-1">
          {SIZES.map(s => (
            <button key={s.id} onClick={() => setSizeId(s.id)} {...pill(sizeId === s.id)}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* TEMPLATE SELECTOR — full width row, larger pills */}
      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map(t => (
          <button key={t.id}
            onClick={() => {
              setTemplateId(t.id)
              if (t.id === 'stat') { setTextPosition('center'); setShowOverlay(true); setOverlayOpacity(30) }
              if (t.id === 'ugc') { setImagePosition('bottom') }
              if (t.id === 'testimonial') { setImagePosition('bottom') }
              // Auto-pick best image orientation for template
              const portrait = images.filter(img => img.width && img.height && img.height > img.width)
              const landscape = images.filter(img => img.width && img.height && img.width > img.height)
              const square = images.filter(img => img.width && img.height && Math.abs(img.width - img.height) < img.width * 0.15)
              const randFrom = (arr: typeof images) => arr[Math.floor(Math.random() * arr.length)]
              if (t.id === 'overlay' || t.id === 'stat') { const sq = square.length > 0 ? randFrom(square) : randFrom(images); if (sq) setSelectedImageId(sq.id) }
              if (t.id === 'split' && portrait.length > 0) setSelectedImageId(randFrom(portrait).id)
              if ((t.id === 'ugc' || t.id === 'testimonial') && landscape.length > 0) setSelectedImageId(randFrom(landscape).id)
              if (t.id === 'grid' && images.length > 1) {
                const shuffled = [...images].sort(() => Math.random() - 0.5)
                setSelectedImageId(shuffled[0].id)
                setSelectedProductImageId(shuffled[1].id)
              }
            }}
            className="text-sm px-4 py-2 rounded-card border transition-all duration-150 font-semibold cursor-pointer"
            style={templateId === t.id
              ? { background: '#111', color: '#4ade80', border: '1px solid #111' }
              : { background: '#fff', border: '1px solid #ddd', color: '#555' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {/* MAIN AREA: Preview (left) + Controls (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT: Preview */}
        <div className="lg:col-span-5 space-y-4">
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
            saveCurrentAsDraft={saveCurrentAsDraft}
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
          />

        </div>

        {/* RIGHT: Images + Copy + Style */}
        <div className="lg:col-span-7 space-y-4">
          <ImagePicker
            images={images}
            selectedImageId={selectedImageId}
            setSelectedImageId={setSelectedImageId}
            brandColor={brandColor}
            getPublicUrl={getPublicUrl}
          />

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
          />

          {/* Template-specific sidebars */}
          {templateId === 'infographic' && (
            <InfographicSidebar
              callouts={callouts}
              setCallouts={setCallouts}
              statStripText={statStripText}
              setStatStripText={setStatStripText}
              inputCls={inputCls}
            />
          )}

          {templateId === 'comparison' && (
            <ComparisonSidebar
              brandName={brand?.name || ''}
              oldWayItems={oldWayItems}
              setOldWayItems={setOldWayItems}
              newWayItems={newWayItems}
              setNewWayItems={setNewWayItems}
              inputCls={inputCls}
            />
          )}

          {templateId === 'grid' && images.length > 1 && (
            <div className="bg-paper border border-border rounded-card p-4">
              <label className="text-[10px] text-muted uppercase tracking-wide font-semibold block mb-1">Second image</label>
              <div className="grid grid-cols-4 gap-1 max-h-[100px] overflow-y-auto">
                {images.map(img => (
                  <button key={img.id} onClick={() => setSelectedProductImageId(img.id === selectedProductImageId ? null : img.id)}
                    className="aspect-square rounded-[3px] overflow-hidden border-2 transition-all"
                    style={{ borderColor: selectedProductImageId === img.id ? '#4ade80' : '#e0e0e0' }}>
                    <img src={getPublicUrl(img.storage_path)} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {templateId === 'mission' && (
            <MissionSidebar
              subtitle={subtitle}
              setSubtitle={setSubtitle}
              images={images}
              selectedProductImageId={selectedProductImageId}
              setSelectedProductImageId={setSelectedProductImageId}
              inputCls={inputCls}
            />
          )}

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
          />
        </div>
      </div>

      {/* BOTTOM: Generated + Saved — full width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          />
      </div>

      {/* Hidden export container */}
      <div ref={exportRef} aria-hidden style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }} />

      {/* Toast */}
      {exportToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-pill shadow-lg"
          style={{ background: '#000', color: '#00ff97' }}>
          <Check size={14} /> {exportToast}
        </div>
      )}
    </div>
  )
}
