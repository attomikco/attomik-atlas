'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage } from '@/types'
import { Download, Sparkles, Loader2, Check } from 'lucide-react'
import { TextPosition } from './templates/types'
import { Callout } from './templates/types'
import { TEMPLATES, SIZES } from './templates/registry'
import type { Brand, GeneratedCopy, StyleSnapshot, Variation, Draft } from './types'
import { useBrandSync, isLightColor } from './hooks/useBrandSync'
import { useCreativeExport } from './hooks/useCreativeExport'
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
          brief: `Generate copy for a visual ad creative AND separate Facebook ad copy. Same message, different wording.${campaignBrief ? `\n\nCAMPAIGN CONTEXT:\n${campaignBrief}` : ''}\n\nFormat as:\nHEADLINE: <short image headline, under 8 words>\nBODY: <image body line, 80-90 characters including spaces — count carefully>\nCTA: <call to action, 2-3 words>\nFB_PRIMARY: <Facebook primary text, 1-2 sentences, conversational>\nFB_HEADLINE: <Facebook headline, under 10 words, punchy>\nFB_DESCRIPTION: <Facebook description, under 15 words>\nNothing else.`,
        }),
      })
      let full = ''
      const reader = res.body?.getReader(); const decoder = new TextDecoder()
      if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {} } } } }
      const hm = full.match(/HEADLINE:\s*(.+)/i); const bm = full.match(/BODY:\s*(.+)/i); const cm = full.match(/CTA:\s*(.+)/i)
      const fp = full.match(/FB_PRIMARY:\s*(.+)/i); const fh = full.match(/FB_HEADLINE:\s*(.+)/i); const fd = full.match(/FB_DESCRIPTION:\s*(.+)/i)
      if (hm) setHeadline(hm[1].trim()); if (bm) setBodyText(bm[1].trim()); if (cm) setCtaText(cm[1].trim())
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
            brief: `Generate unique copy for a visual ad creative AND separate Facebook ad copy. Variation ${i + 1} of ${batchCount} — make each distinct.${campaignBrief ? `\n\nCAMPAIGN CONTEXT:\n${campaignBrief}` : ''}\n\nFormat as:\nHEADLINE: <short image headline, under 8 words>\nBODY: <image body line, 80-90 characters including spaces — count carefully>\nCTA: <call to action, 2-3 words>\nFB_PRIMARY: <Facebook primary text, 1-2 sentences, conversational>\nFB_HEADLINE: <Facebook headline, under 10 words, punchy>\nFB_DESCRIPTION: <Facebook description, under 15 words>\nNothing else.`,
          }),
        })
        let full = ''
        const reader = res.body?.getReader(); const decoder = new TextDecoder()
        if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {} } } } }
        const hm = full.match(/HEADLINE:\s*(.+)/i); const bm = full.match(/BODY:\s*(.+)/i); const cm = full.match(/CTA:\s*(.+)/i)
        const fp = full.match(/FB_PRIMARY:\s*(.+)/i); const fh = full.match(/FB_HEADLINE:\s*(.+)/i); const fd = full.match(/FB_DESCRIPTION:\s*(.+)/i)
        console.log(`[Batch ${i+1}] AI response:`, full.substring(0, 300))
        const nb = brand
        const defH = nb?.default_headline || `Discover ${nb?.name || 'Our Brand'}`
        const defB = nb?.default_body_text || 'Premium quality crafted for you — designed to elevate every moment of your day'
        const defC = nb?.default_cta || 'Shop Now'
        const v = { headline: hm?.[1]?.trim() || defH, body: bm?.[1]?.trim() || defB, cta: cm?.[1]?.trim() || defC, imageId: pickImageForTemplate(tid), templateId: tid, style: styleForTemplate(tid), fbPrimaryText: fp?.[1]?.trim() || '', fbHeadline: fh?.[1]?.trim() || '', fbDescription: fd?.[1]?.trim() || '' }
        results.push(v)
        setVariations([...results])
        // Load latest into preview
        setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta)
        setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style)
        setFbPrimaryText(v.fbPrimaryText || ''); setFbHeadline(v.fbHeadline || ''); setFbDescription(v.fbDescription || '')
        setActiveVariation(results.length - 1)
      } catch (err) {
        console.error(`[Batch ${i+1}] Failed:`, err)
        const nb = brand
        const defH = nb?.default_headline || `Discover ${nb?.name || 'Our Brand'}`
        const defB = nb?.default_body_text || 'Premium quality crafted for you — designed to elevate every moment of your day'
        const defC = nb?.default_cta || 'Shop Now'
        const v = { headline: defH, body: defB, cta: defC, imageId: pickImageForTemplate(tid), templateId: tid, style: styleForTemplate(tid) }
        results.push(v)
        setVariations([...results])
        setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta)
        setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style)
        setActiveVariation(results.length - 1)
      }
    }
    setBatchGenerating(false)
  }

  // ── Variation / Draft helpers ──────────────────────────────────────
  function loadVariation(i: number) { const v = variations[i]; if (!v) return; setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta); setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style); setFbPrimaryText(v.fbPrimaryText || ''); setFbHeadline(v.fbHeadline || ''); setFbDescription(v.fbDescription || ''); setActiveVariation(i); setActiveDraft(null) }
  function saveVariationAsDraft(i: number) { const v = variations[i]; if (!v) return; saveNewDraftToDB({ ...v, sizeId }) }

  function buildCurrentDraft(): Draft & { imageUrl?: string | null } {
    return { headline, body: bodyText, cta: ctaText, imageId: selectedImageId, templateId, style: captureStyle(), sizeId, imageUrl }
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
      }),
    })
    if (res.ok) {
      setSavedDrafts(prev => prev.map((dd, i) => i === activeDraft ? { ...draft, dbId: d.dbId, imageUrl: draft.imageUrl } : dd))
      setExportToast('Updated!'); setTimeout(() => setExportToast(null), 2000)
    }
  }

  async function saveNewDraftToDB(draft: Draft & { imageUrl?: string | null }) {
    const res = await fetch('/api/creatives/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_id: brandId,
        campaign_id: campaignId || null,
        template_id: draft.templateId,
        size_id: draft.sizeId,
        image_url: draft.imageUrl || null,
        headline: draft.headline,
        body_text: draft.body,
        cta_text: draft.cta,
        style_snapshot: draft.style,
      }),
    })
    if (res.ok) {
      const saved = await res.json()
      const newDraft = { ...draft, dbId: saved.id, imageUrl: draft.imageUrl }
      setSavedDrafts(prev => [newDraft, ...prev])
      setActiveDraft(0)
      setExportToast('Saved!'); setTimeout(() => setExportToast(null), 2000)
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
      .then(r => r.json())
      .then((rows: any[]) => {
        if (!Array.isArray(rows)) return
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
        }))
        setSavedDrafts(drafts)
      })
      .catch(() => {})
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
  const productImages = images.filter(i => i.tag === 'product')
  const lifestyleImages = images.filter(i => i.tag === 'lifestyle' || i.tag === 'background')
  const otherImages = images.filter(i => i.tag !== 'product' && i.tag !== 'lifestyle' && i.tag !== 'background')

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
      <div className="flex flex-col md:flex-row" style={{ alignItems: 'stretch' }}>

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
              />
            </div>

          </div>
        </div>

        {/* ── IMAGES PANEL ── */}
        <div className="w-full md:w-auto" style={{ flex: 0.5, minWidth: 0 }}>
          <div style={{ background: '#fff', borderRadius: 12, margin: 12, padding: 16 }}>
            {productImages.length > 0 && (
              <>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#00ff97', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>PRODUCT</div>
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
            {lifestyleImages.length > 0 && (
              <>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#00ff97', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 8 }}>LIFESTYLE</div>
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
          />
          </div>

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
    </div>
  )
}
