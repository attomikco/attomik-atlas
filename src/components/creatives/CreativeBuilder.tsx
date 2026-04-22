'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage } from '@/types'
import { bucketBrandImages, getBusinessType } from '@/lib/brand-images'
import { buildOrderedImagePool, filterByOrientation, pickImageForTemplate, pickSecondImage } from '@/lib/image-helpers'
import { Bookmark, Download, Loader2, Sparkles, Wand2, X, Zap } from 'lucide-react'
import { TextPosition } from './templates/types'
import { Callout } from './templates/types'
import { TEMPLATES, SIZES } from './templates/registry'
import type { Brand, GeneratedCopy, StyleSnapshot, Variation, Draft } from './types'
import { useBrandSync, isLightColor } from './hooks/useBrandSync'
import { useCreativeExport } from './hooks/useCreativeExport'
import CopyEditor from './sidebar/CopyEditor'
import ComparisonSidebar from './sidebar/ComparisonSidebar'
import InfographicSidebar from './sidebar/InfographicSidebar'
import MissionSidebar from './sidebar/MissionSidebar'
import type { CtaType } from './types'
import MetaLaunchModal from './MetaLaunchModal'
import { colors, font, fontSize, fontWeight, spacing, radius, shadow, letterSpacing } from '@/lib/design-tokens'

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
  const [headlineColor, setHeadlineColor] = useState<string>(colors.white)
  const [bodyColor, setBodyColor] = useState<string>(colors.white)
  const [headlineFont, setHeadlineFont] = useState<string>('')
  const [bodyFont, setBodyFont] = useState<string>('')
  const [headlineWeight, setHeadlineWeight] = useState<string>('700')
  const [headlineTransform, setHeadlineTransform] = useState<string>('none')
  const [bodyWeight, setBodyWeight] = useState<string>('400')
  const [bodyTransform, setBodyTransform] = useState<string>('none')
  const [bgColor, setBgColor] = useState<string>(colors.ink)
  const [headlineSizeMul, setHeadlineSizeMul] = useState(1)
  const [bodySizeMul, setBodySizeMul] = useState(1)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(10)
  const [imagePosition, setImagePosition] = useState<string>('center')
  const [textBanner, setTextBanner] = useState<'none' | 'top' | 'bottom'>('none')
  const [textBannerColor, setTextBannerColor] = useState<string>(colors.ink)
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
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [previewContainerW, setPreviewContainerW] = useState(600)
  const leftPanelRef = useRef<HTMLDivElement>(null)

  // ── NEW (reshell-only): inspector + reel tab state, persisted to
  // localStorage so a refresh keeps the user's last tab. No other new
  // state is introduced; everything else reuses what was already here.
  const [inspectorTab, setInspectorTab] = useState<'copy' | 'style' | 'layout'>(() => {
    if (typeof window === 'undefined') return 'copy'
    const saved = window.localStorage.getItem('atlas-creative-studio-inspector-tab')
    return saved === 'style' || saved === 'layout' ? (saved as 'style' | 'layout') : 'copy'
  })
  const [reelTab, setReelTab] = useState<'drafts' | 'variations'>(() => {
    if (typeof window === 'undefined') return 'drafts'
    const saved = window.localStorage.getItem('atlas-creative-studio-reel-tab')
    return saved === 'variations' ? 'variations' : 'drafts'
  })
  useEffect(() => {
    try { window.localStorage.setItem('atlas-creative-studio-inspector-tab', inspectorTab) } catch { /* storage quota / privacy mode */ }
  }, [inspectorTab])
  useEffect(() => {
    try { window.localStorage.setItem('atlas-creative-studio-reel-tab', reelTab) } catch { /* storage quota / privacy mode */ }
  }, [reelTab])

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
    setHeadlineColor(light ? colors.ink : colors.white)
    setBodyColor(light ? colors.darkCard : colors.white)
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
  const brandColor = brand?.primary_color || colors.accent
  const [ctaColor, setCtaColor] = useState(brand?.accent_color || brandColor)
  const [ctaFontColor, setCtaFontColor] = useState(brand?.accent_font_color || colors.ink)
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
  addColor('Black', colors.ink)
  addColor('White', colors.white)
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
    const darkText = nb?.text_on_dark || nb?.heading_color || colors.white
    const darkBody = nb?.text_on_dark || nb?.body_color || colors.white
    // Colors for brand bg (split, card, testimonial, grid)
    const brandBg = nb?.bg_dark || nb?.bg_base || nb?.primary_color || colors.ink
    const lightBg = isLightColor(brandBg)
    const bgText = lightBg ? (nb?.text_on_base || colors.ink) : (nb?.text_on_dark || colors.white)
    const bgBody = lightBg ? (nb?.text_on_base || colors.darkCard) : (nb?.text_on_dark || colors.white)

    const shared = {
      headlineFont: hFont, headlineWeight: hWeight, headlineTransform: hTransform,
      bodyFont: bFont, bodyWeight: bWeight, bodyTransform: bTransform,
      headlineSizeMul: 1, bodySizeMul: 1,
      textBanner: 'none' as const, textBannerColor: brandBg,
    }

    // Primary color + smart text-on for split/card/testimonial
    const primary = nb?.primary_color || colors.ink
    const secondary = nb?.secondary_color || colors.white
    const primaryIsLight = isLightColor(primary)
    const secondaryIsLight = isLightColor(secondary)
    const textOnPrimary = nb?.text_on_dark || (primaryIsLight ? colors.ink : colors.white)
    const bodyOnPrimary = nb?.text_on_dark || (primaryIsLight ? colors.darkCard : colors.white)
    const textOnSecondary = nb?.text_on_base || (secondaryIsLight ? colors.ink : colors.white)

    switch (tid) {
      case 'overlay':
        return { ...shared, headlineColor: colors.white, bodyColor: colors.white, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: colors.ink, showCta: true }
      case 'stat':
        return { ...shared, headlineColor: colors.white, bodyColor: colors.white, textPosition: 'center', showOverlay: true, overlayOpacity: 30, imagePosition: 'center', bgColor: colors.ink, showCta: false }
      case 'split':
        return { ...shared, headlineColor: textOnPrimary, bodyColor: bodyOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: primary, showCta: true }
      case 'testimonial':
        return { ...shared, headlineColor: textOnPrimary, bodyColor: bodyOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'bottom', bgColor: primary, showCta: true }
      case 'ugc': // Card
        return { ...shared, headlineColor: textOnPrimary, bodyColor: bodyOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'bottom', bgColor: primary, showCta: true }
      case 'grid':
        return { ...shared, headlineColor: textOnSecondary, bodyColor: textOnPrimary, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: secondary, showCta: true }
      case 'mission':
        return { ...shared, headlineColor: darkText, bodyColor: darkBody, textPosition: 'center', showOverlay: true, overlayOpacity: 50, imagePosition: 'center', bgColor: colors.ink, showCta: false }
      case 'infographic':
        return { ...shared, headlineColor: darkText, bodyColor: darkBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: false }
      case 'comparison':
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: false }
      default:
        return { ...shared, headlineColor: bgText, bodyColor: bgBody, textPosition: 'center', showOverlay: false, overlayOpacity: 10, imagePosition: 'center', bgColor: brandBg, showCta: true }
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
        const imgId = pickImageForTemplate(tid, { lifestyleImages, productImages, otherImages })?.id ?? null
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
        if (tid === 'grid') setSelectedProductImageId(pickSecondImage(imgId, images, productImages)?.id ?? null)
        setFbPrimaryText(v.fbPrimaryText || ''); setFbHeadline(v.fbHeadline || ''); setFbDescription(v.fbDescription || '')
        setActiveVariation(results.length - 1)
      } catch (err) {
        console.error(`[Batch ${i+1}] Failed:`, err)
        const nb = brand
        const firstProd = nb?.products?.[0]
        const defH = nb?.default_headline || firstProd?.name || nb?.name || 'Your Brand'
        const defB = nb?.default_body_text || nb?.mission?.slice(0, 80) || firstProd?.description?.slice(0, 80) || ''
        const defC = nb?.default_cta || 'Shop Now'
        const fallbackImgId = pickImageForTemplate(tid, { lifestyleImages, productImages, otherImages })?.id ?? null
        const baseStyle = styleForTemplate(tid)
        const style = tid === 'overlay'
          ? { ...baseStyle, ...overlayLayouts[overlayCount++ % overlayLayouts.length] }
          : baseStyle
        const v = { headline: defH, body: defB, cta: defC, imageId: fallbackImgId, templateId: tid, style }
        results.push(v)
        setVariations([...results])
        setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta)
        setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style)
        if (tid === 'grid') setSelectedProductImageId(pickSecondImage(fallbackImgId, images, productImages)?.id ?? null)
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
  const maxPreviewH = 420
  const maxPreviewW = Math.min(600, previewContainerW || 600)
  const scale = Math.min(maxPreviewH / size.h, maxPreviewW / size.w)
  const previewW = Math.round(size.w * scale)
  const previewH = Math.round(size.h * scale)

  // ── Styles ─────────────────────────────────────────────────────────
  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"
  const pill = (active: boolean) => ({
    className: "text-xs px-2.5 py-1 rounded-pill transition-all duration-150 font-semibold cursor-pointer",
    style: active
      ? { background: colors.gray900, color: colors.tailGreen400, border: 'none' } as const
      : { background: colors.white, border: `1px solid ${colors.gray400}`, color: colors.gray333 } as const,
  })

  // ── Style reset handler ────────────────────────────────────────────
  function handleStyleReset() {
    const h = brand?.font_heading; const hP = (brand?.font_primary || '').split('|')
    const b = brand?.font_body; const bP = (brand?.font_secondary || '').split('|')
    setHeadlineColor(brand?.heading_color || brand?.primary_color || colors.white)
    setBodyColor(brand?.body_color || colors.white)
    setHeadlineFont(h?.family || hP[0] || ''); setHeadlineWeight(h?.weight || hP[1] || '700'); setHeadlineTransform(h?.transform || hP[2] || 'none')
    setBodyFont(b?.family || bP[0] || ''); setBodyWeight(b?.weight || bP[1] || '400'); setBodyTransform(b?.transform || bP[2] || 'none')
    setBgColor(brand?.primary_color || colors.ink); setHeadlineSizeMul(1); setBodySizeMul(1)
    setShowOverlay(false); setOverlayOpacity(50); setTextBanner('none')
  }

  // ── Derived image groups for left panel ────────────────────────────
  // Smart bucketing — Shopify brands use tag='shopify' for products,
  // non-Shopify brands use tag='product'. Lifestyle covers everything else.
  const { productImages, lifestyleImages } = bucketBrandImages(images, getBusinessType(brand))
  const otherImages = images.filter(i =>
    i.tag !== 'product' && i.tag !== 'shopify' && i.tag !== 'lifestyle' && i.tag !== 'background' && i.tag !== 'generated' && i.tag !== 'press_logo'
  )
  // AI-generated images — newest first so freshly generated images appear at the top
  const generatedImages = [...images]
    .filter(i => i.tag === 'generated')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

  async function generateImage() {
    if (!brandId || generatingImage) return
    setGeneratingImage(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'request failed')
      // Re-fetch images so the new row hydrates with the same shape as the rest
      const { data } = await supabase.from('brand_images').select('*').eq('brand_id', brandId).order('created_at')
      if (data) {
        setImages(data)
        const newest = [...data].filter(i => i.tag === 'generated').sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0]
        if (newest) setSelectedImageId(newest.id)
      }
    } catch (e) {
      console.error('[generateImage]', e)
      setGenerateError('Generation failed, try again')
      setTimeout(() => setGenerateError(null), 4000)
    } finally {
      setGeneratingImage(false)
    }
  }

  // ── Reshell helpers ────────────────────────────────────────────────
  // Breadcrumb creative name per Open Q #5: headline, else "Untitled".
  const creativeName = (headline && headline.trim()) || 'Untitled'
  const crumbName = creativeName.length > 40 ? creativeName.slice(0, 38) + '…' : creativeName

  // Toolbar Launch button targets the currently-loaded saved draft per Open Q #6.
  const activeDraftRow = activeDraft !== null ? savedDrafts[activeDraft] : null
  const launchCanFire = !!(activeDraftRow?.dbId && metaConnected && !activeDraftRow.metaAdId)
  const launchTooltip = !activeDraftRow?.dbId
    ? 'Save draft to launch'
    : !metaConnected
      ? 'Connect Meta in Brand Hub'
      : activeDraftRow.metaAdId
        ? `Already launched (${activeDraftRow.metaAdStatus || 'PAUSED'})`
        : 'Launch to Meta'

  // Background mode derivation per Open Q #7, widened to match ANY color in
  // the full brand palette (bg_base / bg_dark / primary / secondary / accent /
  // text_on_* / btn_*) so selecting bg_dark or secondary_color from the swatch
  // grid is correctly classified as 'brand' instead of 'custom'. The
  // brandColors array already includes black and white, so an ink match would
  // register as 'brand'; we check `ink` explicitly first so pure-black stays
  // classified as 'dark' — the more useful label for a user switching the
  // background to a dark canvas.
  const bgModeDerived: 'image' | 'brand' | 'dark' | 'custom' = (() => {
    if (selectedImageId) return 'image'
    const bg = bgColor.toLowerCase()
    if (bg === colors.ink.toLowerCase()) return 'dark'
    const matchesPalette = brandColors.some(c => c.value.toLowerCase() === bg)
    if (matchesPalette) return 'brand'
    return 'custom'
  })()
  function setBgMode(mode: 'image' | 'brand' | 'dark' | 'custom') {
    if (mode === 'image') {
      if (!selectedImageId) {
        const first = lifestyleImages[0] || productImages[0] || generatedImages[0]
        if (first) setSelectedImageId(first.id)
      }
    } else if (mode === 'brand') {
      setSelectedImageId(null)
      updateBgColor(brand?.primary_color || colors.ink)
    } else if (mode === 'dark') {
      setSelectedImageId(null)
      updateBgColor(colors.ink)
    } else {
      // 'custom' — clear image, keep bgColor; user edits via color field
      setSelectedImageId(null)
    }
  }

  // Char soft-limits for Copy tab counters (warning style past limit).
  // 40 for the on-creative headline mirrors the Meta FB_HEADLINE_LIMIT
  // already used in CopyEditor and is a common "billboard" upper-bound.
  const HEADLINE_BILLBOARD = 40
  const BODY_LIMIT = 75

  // 3×3 text position pad — render all 9 cells but disable the 2 unsupported
  // middle-row side positions per Open Q #10.
  const POS_GRID: (TextPosition | null)[] = [
    'top-left', 'top-center', 'top-right',
    null, 'center', null,
    'bottom-left', 'bottom-center', 'bottom-right',
  ]

  // ── Render ─────────────────────────────────────────────────────────
  // Replaces the old 3-column flex stack with the new workspace shell
  // per design handoff (README §4.1). Every handler below is reused
  // verbatim from the state declarations above; no new data flow.
  return (
    <div className="cs-shell" style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 72px)',
      overflow: 'hidden',
      background: colors.previewCream,
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .cs-scroll::-webkit-scrollbar { width: 6px; height: 6px }
        .cs-scroll::-webkit-scrollbar-thumb { background: ${colors.gray400}; border-radius: 3px }
        .cs-scroll::-webkit-scrollbar-track { background: transparent }
        .cs-grid { display: grid; grid-template-columns: 232px 1fr 320px; flex: 1; min-height: 0; }
        .cs-stage {
          background-image: radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px);
          background-size: 18px 18px;
        }
        .cs-template-card:hover { transform: translateY(-1px); border-color: ${colors.ink}; }
        .cs-media-card:hover { transform: translateY(-1px); border-color: ${colors.ink}; }
        .cs-crumb-link { text-decoration: none; }
        .cs-crumb-link:hover { text-decoration: underline; }
        @media (max-width: 1099px) and (min-width: 900px) {
          .cs-grid { grid-template-columns: 200px 1fr 280px; }
        }
        @media (max-width: 899px) {
          .cs-grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
          .cs-rail { max-height: 180px; overflow-x: auto; overflow-y: hidden; display: flex; border-right: none; border-bottom: 1px solid ${colors.border}; }
          .cs-rail > section { flex-shrink: 0; min-width: 240px; border-bottom: none; border-right: 1px solid ${colors.border}; }
          .cs-inspector { max-height: 300px; border-left: none; border-top: 1px solid ${colors.border}; }
        }
      `}</style>

      {/* ══════════ TOOLBAR (44px) ══════════ */}
      <div className="cs-toolbar" style={{
        display: 'flex', alignItems: 'center', gap: spacing[3],
        padding: `0 ${spacing[4]}px`,
        height: 44, minHeight: 44, flexShrink: 0,
        background: colors.paper,
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1,
          fontFamily: font.mono, fontSize: 11, letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
        }}>
          {campaignId ? (
            <a href={`/preview/${campaignId}`} className="cs-crumb-link"
              style={{ color: colors.subtle, fontFamily: font.mono, fontSize: 11, letterSpacing: letterSpacing.wide, textTransform: 'uppercase' }}>
              Campaigns
            </a>
          ) : (
            <span style={{ color: colors.subtle }}>Campaigns</span>
          )}
          <span style={{ color: colors.disabled }}>/</span>
          <span style={{ color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
            {campaignBrief ? 'Campaign' : 'Draft'}
          </span>
          <span style={{ color: colors.disabled }}>/</span>
          <span style={{ color: colors.ink, fontWeight: fontWeight.bold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={creativeName}>
            {crumbName}
          </span>
        </div>

        {/* Size pill group — active = ink bg + accent text, 700 weight */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SIZES.map(s => {
            const active = sizeId === s.id
            return (
              <button key={s.id} onClick={() => setSizeId(s.id)} style={{
                padding: '5px 12px', borderRadius: radius.sm,
                fontSize: 12, fontWeight: active ? 700 : 600,
                fontFamily: font.mono,
                background: active ? colors.ink : 'transparent',
                color: active ? colors.accent : colors.muted,
                border: active ? '1px solid transparent' : `1px solid ${colors.border}`,
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}>{s.label}</button>
            )
          })}
        </div>

        {/* Dims */}
        <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.subtle, letterSpacing: letterSpacing.wide, whiteSpace: 'nowrap' }}>
          {size.w}×{size.h}
        </div>

        <div style={{ width: 1, height: 20, background: colors.border }} />

        {/* Save draft — Update when editing, Save new otherwise */}
        {activeDraft !== null && savedDrafts[activeDraft]?.dbId ? (
          <>
            <button onClick={updateCurrentDraft} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: radius.sm,
              background: colors.ink, color: colors.accent, border: 'none',
              fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: 12,
              letterSpacing: '0.02em',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}>
              <Bookmark size={12} /> Update
            </button>
            <button onClick={saveCurrentAsDraft} style={{
              padding: '6px 12px', borderRadius: radius.sm,
              background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`,
              fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: 12,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}>Save as new</button>
          </>
        ) : (
          <button onClick={saveCurrentAsDraft} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: radius.sm,
            background: colors.ink, color: colors.accent, border: 'none',
            fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: 12,
            letterSpacing: '0.02em',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}>
            <Bookmark size={12} /> Save draft
          </button>
        )}

        {/* Export PNG */}
        <button onClick={exportPng} disabled={exporting || exportingAll} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: radius.sm,
          background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`,
          fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: 12,
          cursor: exporting ? 'wait' : 'pointer',
          opacity: exporting ? 0.5 : 1,
          transition: 'all 0.15s ease',
        }}>
          {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Export
        </button>

        {/* Export all sizes — ghost secondary per Open Q #15 */}
        <button onClick={exportAllSizes} disabled={exporting || exportingAll} style={{
          padding: '6px 12px', borderRadius: radius.sm,
          background: 'transparent', color: colors.muted, border: 'none',
          fontFamily: font.mono, fontWeight: 600, fontSize: 11,
          letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
          cursor: exportingAll ? 'wait' : 'pointer',
          opacity: exportingAll ? 0.5 : 1,
          transition: 'all 0.15s ease',
        }}>
          {exportingAll ? 'Exporting…' : `Export all (${SIZES.length})`}
        </button>

        {/* Launch — primary, ink bg + accent text */}
        <button
          onClick={() => { if (launchCanFire && activeDraft !== null) setLaunchModalDraft(activeDraft) }}
          disabled={!launchCanFire}
          title={launchTooltip}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: radius.sm,
            background: colors.ink,
            color: colors.accent,
            border: 'none',
            fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: 12,
            letterSpacing: '0.02em',
            cursor: launchCanFire ? 'pointer' : 'not-allowed',
            opacity: launchCanFire ? 1 : 0.4,
            boxShadow: launchCanFire ? shadow.accent : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Zap size={12} /> Launch
        </button>
      </div>

      {/* ══════════ 3-COLUMN GRID ══════════ */}
      <div className="cs-grid">

        {/* ── LEFT RAIL ── */}
        <aside className="cs-rail cs-scroll" style={{
          borderRight: `1px solid ${colors.border}`,
          background: colors.paper,
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          {/* Templates */}
          <section style={{ padding: `${spacing[3]}px`, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 600, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.muted, marginBottom: spacing[2] }}>
              Templates
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {TEMPLATES.map(t => {
                const active = templateId === t.id
                return (
                  <button key={t.id} className="cs-template-card"
                    onClick={() => {
                      setTemplateId(t.id)
                      if (t.id === 'stat') { setTextPosition('center'); setShowOverlay(true); setOverlayOpacity(30) }
                      if (t.id === 'ugc') { setImagePosition('bottom') }
                      if (t.id === 'testimonial') { setImagePosition('bottom') }
                      const orderedImages = buildOrderedImagePool(lifestyleImages, productImages, otherImages)
                      const { portraits, landscapes, squares } = filterByOrientation(orderedImages)
                      const randFrom = (arr: typeof images) => arr[Math.floor(Math.random() * arr.length)]
                      if (t.id === 'overlay' || t.id === 'stat') { const sq = squares.length > 0 ? randFrom(squares) : randFrom(orderedImages); if (sq) setSelectedImageId(sq.id) }
                      if (t.id === 'split' && portraits.length > 0) setSelectedImageId(randFrom(portraits).id)
                      if ((t.id === 'ugc' || t.id === 'testimonial') && landscapes.length > 0) setSelectedImageId(randFrom(landscapes).id)
                      if (t.id === 'grid' && orderedImages.length > 1) {
                        setSelectedImageId(orderedImages[0].id)
                        const productShot = productImages[0] || orderedImages[1]
                        if (productShot) setSelectedProductImageId(productShot.id)
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 52,
                      border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                      boxShadow: active ? `0 0 0 3px ${colors.accentAlpha30}` : 'none',
                      borderRadius: radius.sm,
                      background: active ? colors.gray150 : colors.white,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      padding: '0 8px',
                      fontFamily: font.heading,
                      fontSize: 13,
                      fontWeight: active ? fontWeight.heading : fontWeight.bold,
                      color: colors.ink,
                      letterSpacing: letterSpacing.slight,
                      transition: 'all 0.15s ease',
                    }}>
                    {t.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Lifestyle */}
          {lifestyleImages.length > 0 && (
            <section style={{ padding: `${spacing[3]}px`, borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 600, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.muted, marginBottom: spacing[2] }}>
                Lifestyle
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {lifestyleImages.map(img => {
                  const active = img.id === selectedImageId
                  return (
                    <button key={img.id} className="cs-media-card"
                      onClick={() => setSelectedImageId(active ? null : img.id)}
                      title={img.file_name}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: radius.sm,
                        overflow: 'hidden', padding: 0,
                        cursor: 'pointer',
                        border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                        boxShadow: active ? `0 0 0 3px ${colors.accentAlpha30}` : 'none',
                        background: colors.gray150,
                        transition: 'all 0.15s ease',
                      }}>
                      <img src={getPublicUrl(img.storage_path)} alt="" loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <span style={{
                        position: 'absolute', top: 4, left: 4,
                        fontFamily: font.mono, fontSize: 9, fontWeight: 700,
                        background: colors.blackAlpha50, color: colors.white,
                        padding: '1px 6px', borderRadius: 3,
                        letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                      }}>lifestyle</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Product + Generate */}
          <section style={{ padding: `${spacing[3]}px` }}>
            <div style={{ fontFamily: font.mono, fontSize: 11, fontWeight: 600, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', color: colors.muted, marginBottom: spacing[2] }}>
              Product
            </div>
            {productImages.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {productImages.map(img => {
                  const active = img.id === selectedImageId
                  return (
                    <button key={img.id} className="cs-media-card"
                      onClick={() => setSelectedImageId(active ? null : img.id)}
                      title={img.file_name}
                      style={{
                        position: 'relative',
                        aspectRatio: '1', borderRadius: radius.sm, overflow: 'hidden', padding: 0,
                        cursor: 'pointer',
                        border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                        boxShadow: active ? `0 0 0 3px ${colors.accentAlpha30}` : 'none',
                        background: colors.gray150, transition: 'all 0.15s ease',
                      }}>
                      <img src={getPublicUrl(img.storage_path)} alt="" loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <span style={{
                        position: 'absolute', top: 4, left: 4,
                        fontFamily: font.mono, fontSize: 9, fontWeight: 700,
                        background: colors.blackAlpha50, color: colors.white,
                        padding: '1px 6px', borderRadius: 3,
                        letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                      }}>product</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.subtle }}>No product images</div>
            )}

            {generatedImages.length > 0 && (
              <div style={{ marginTop: spacing[3], display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {generatedImages.map(img => {
                  const active = img.id === selectedImageId
                  return (
                    <button key={img.id} className="cs-media-card"
                      onClick={() => setSelectedImageId(active ? null : img.id)}
                      title={img.file_name}
                      style={{
                        position: 'relative',
                        aspectRatio: '1', borderRadius: radius.sm, overflow: 'hidden', padding: 0,
                        cursor: 'pointer',
                        border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                        boxShadow: active ? `0 0 0 3px ${colors.accentAlpha30}` : 'none',
                        background: colors.gray150, transition: 'all 0.15s ease',
                      }}>
                      <img src={getPublicUrl(img.storage_path)} alt="" loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      <span style={{
                        position: 'absolute', top: 4, left: 4,
                        fontFamily: font.mono, fontSize: 9, fontWeight: 700,
                        background: colors.ink, color: colors.accent,
                        padding: '1px 6px', borderRadius: 3,
                        letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                      }}>AI</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Generate image — dashed-border CTA */}
            <button
              onClick={generateImage}
              disabled={generatingImage || !brandId}
              style={{
                width: '100%', marginTop: spacing[3],
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 12px',
                border: `1.5px dashed ${colors.border}`, borderRadius: radius.sm,
                background: 'transparent', color: colors.muted,
                fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                cursor: generatingImage ? 'wait' : 'pointer',
                transition: 'all 0.15s ease',
              }}>
              {generatingImage ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              {generatingImage ? 'Generating…' : 'Generate image'}
            </button>
            {generateError && (
              <div style={{ marginTop: 6, fontSize: 10, color: colors.danger, fontFamily: font.mono }}>{generateError}</div>
            )}
          </section>
        </aside>

        {/* ── CANVAS CENTER ── */}
        <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>

          {/* Canvas stage — sizes to content (label + card + optional
              editing indicator + padding). flex:0 0 auto prevents the
              old `flex:1` behaviour that stretched the stage to fill all
              leftover vertical space and left the card adrift in the
              middle of an oversized dotted-grid region. Reel sits right
              below; any remaining space in <main> is whitespace. */}
          <div ref={leftPanelRef} className="cs-stage" style={{
            flex: '0 0 auto',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: spacing[6],
            background: colors.previewCream,
            backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)`,
            backgroundSize: '18px 18px',
          }}>
            {/* Mono label above card */}
            <div style={{
              fontFamily: font.mono, fontSize: 10, color: colors.subtle,
              letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
              marginBottom: spacing[3],
            }}>
              {template.id} · {size.w}×{size.h}
            </div>

            {/* Card with corner markers */}
            <div style={{ position: 'relative', width: previewW, height: previewH }}>
              {/* Four corner markers, 10×10 with 2px stroke, offset outside card */}
              <div style={{ position: 'absolute', top: -14, left: -14, width: 10, height: 10, borderTop: `2px solid ${colors.ink}`, borderLeft: `2px solid ${colors.ink}` }} />
              <div style={{ position: 'absolute', top: -14, right: -14, width: 10, height: 10, borderTop: `2px solid ${colors.ink}`, borderRight: `2px solid ${colors.ink}` }} />
              <div style={{ position: 'absolute', bottom: -14, left: -14, width: 10, height: 10, borderBottom: `2px solid ${colors.ink}`, borderLeft: `2px solid ${colors.ink}` }} />
              <div style={{ position: 'absolute', bottom: -14, right: -14, width: 10, height: 10, borderBottom: `2px solid ${colors.ink}`, borderRight: `2px solid ${colors.ink}` }} />
              <div style={{
                width: '100%', height: '100%', overflow: 'hidden',
                background: colors.white,
                boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
              }}>
                <div style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <TemplateComponent {...templateProps} width={size.w} height={size.h} />
                </div>
              </div>
            </div>

            {/* Editing-saved-creative indicator */}
            {activeDraft !== null && savedDrafts[activeDraft]?.dbId && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginTop: spacing[3],
                fontFamily: font.mono, fontSize: 11,
              }}>
                <span style={{
                  padding: '3px 10px', borderRadius: radius.pill,
                  background: colors.accentAlpha12, color: colors.accentDark,
                  border: `1px solid ${colors.accentAlpha30}`,
                  fontWeight: 700, letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                }}>Editing saved creative</span>
                <button onClick={clearActiveDraft} style={{
                  background: 'transparent', border: 'none', padding: 0,
                  fontSize: 11, color: colors.subtle, fontFamily: font.mono,
                  cursor: 'pointer', textDecoration: 'underline',
                }}>Start new</button>
              </div>
            )}
          </div>

          {/* Reel */}
          <div className="cs-reel" style={{
            flexShrink: 0,
            background: colors.paper,
            borderTop: `1px solid ${colors.border}`,
          }}>
            {/* Reel tab bar */}
            <div style={{
              display: 'flex', alignItems: 'center',
              padding: `${spacing[2]}px ${spacing[4]}px`,
              borderBottom: `1px solid ${colors.border}`,
              gap: spacing[3],
            }}>
              <button onClick={() => setReelTab('drafts')} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 0',
                background: 'transparent', border: 'none',
                borderBottom: reelTab === 'drafts' ? `2px solid ${colors.ink}` : '2px solid transparent',
                color: reelTab === 'drafts' ? colors.ink : colors.muted,
                fontFamily: font.heading, fontWeight: 700, fontSize: 12,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}>
                Drafts
                {savedDrafts.length > 0 && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: colors.accent, boxShadow: `0 0 8px ${colors.accentAlpha40}`,
                  }} />
                )}
                <span style={{ color: colors.subtle, fontWeight: 500, fontFamily: font.mono, fontSize: 11 }}>({savedDrafts.length})</span>
              </button>
              <button onClick={() => setReelTab('variations')} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 0',
                background: 'transparent', border: 'none',
                borderBottom: reelTab === 'variations' ? `2px solid ${colors.ink}` : '2px solid transparent',
                color: reelTab === 'variations' ? colors.ink : colors.muted,
                fontFamily: font.heading, fontWeight: 700, fontSize: 12,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}>
                AI variations
                <span style={{ color: colors.subtle, fontWeight: 500, fontFamily: font.mono, fontSize: 11 }}>({variations.length})</span>
              </button>

              {/* Right-side actions */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {reelTab === 'drafts' && savedDrafts.length > 0 && (
                  <>
                    {(activeDraft !== null || activeVariation !== null) && (
                      <button onClick={clearActiveDraft} style={{
                        padding: '6px 10px', borderRadius: radius.sm,
                        background: 'transparent', color: colors.muted, border: 'none',
                        fontFamily: font.mono, fontWeight: 600, fontSize: 11,
                        letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                      }}>Clear</button>
                    )}
                    <button onClick={exportAllDrafts} disabled={exportingAll} style={{
                      padding: '6px 12px', borderRadius: radius.sm,
                      background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`,
                      fontFamily: font.heading, fontWeight: 700, fontSize: 11,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      cursor: exportingAll ? 'wait' : 'pointer', opacity: exportingAll ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                    }}>{exportingAll ? 'Exporting…' : 'Export all'}</button>
                  </>
                )}
                {reelTab === 'variations' && variations.length > 0 && (
                  <button onClick={exportAllVariations} disabled={exportingAll} style={{
                    padding: '6px 12px', borderRadius: radius.sm,
                    background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`,
                    fontFamily: font.heading, fontWeight: 700, fontSize: 11,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    cursor: exportingAll ? 'wait' : 'pointer', opacity: exportingAll ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                  }}>{exportingAll ? 'Exporting…' : 'Export all'}</button>
                )}

                {/* Batch count selector + Generate N */}
                {!batchGenerating ? (
                  <>
                    <div style={{ display: 'flex', gap: 2, padding: 3, background: colors.gray150, borderRadius: radius.sm }}>
                      {[3, 5, 10, 15, 20].map(n => (
                        <button key={n} onClick={() => setBatchCount(n)} style={{
                          width: 22, height: 22, borderRadius: radius.xs,
                          fontSize: 10, fontWeight: 700, fontFamily: font.mono,
                          background: batchCount === n ? colors.ink : 'transparent',
                          color: batchCount === n ? colors.accent : colors.subtle,
                          border: 'none', cursor: 'pointer', transition: 'all 0.15s ease',
                        }}>{n}</button>
                      ))}
                    </div>
                    <button onClick={generateBatch} disabled={images.length === 0} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: radius.sm,
                      background: images.length === 0 ? colors.gray400 : colors.ink,
                      color: colors.accent, border: 'none',
                      fontFamily: font.heading, fontWeight: 700, fontSize: 11,
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                      cursor: images.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: shadow.accent, transition: 'all 0.15s ease',
                    }}>
                      <Sparkles size={11} /> Generate {batchCount}
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: font.mono, fontSize: 11, color: colors.muted,
                    }}>
                      <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                      {variations.length}/{batchCount}
                    </div>
                    <button onClick={stopBatch} style={{
                      padding: '4px 10px', borderRadius: radius.sm,
                      background: 'transparent', color: colors.muted, border: `1px solid ${colors.border}`,
                      fontFamily: font.mono, fontWeight: 600, fontSize: 10,
                      letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                    }}>Stop</button>
                  </div>
                )}
              </div>
            </div>

            {/* Reel thumbs */}
            <div className="cs-scroll" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: spacing[3],
              minHeight: 100,
              overflowX: 'auto',
            }}>
              {reelTab === 'drafts' ? (
                savedDrafts.length === 0 ? (
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.subtle, padding: '20px 0' }}>
                    No drafts yet — Save one from the toolbar above.
                  </div>
                ) : savedDrafts.map((d, i) => {
                  const dImg = d.imageId ? images.find(img => img.id === d.imageId) : null
                  const dImgUrl = dImg ? getPublicUrl(dImg.storage_path) : (d as { imageUrl?: string | null }).imageUrl || null
                  const DTemplate = TEMPLATES.find(t => t.id === d.templateId)?.component
                  const dSize = SIZES.find(s => s.id === d.sizeId) || size
                  if (!DTemplate) return null
                  const THUMB = 72
                  const thumbScale = THUMB / dSize.h
                  const thumbW = Math.round(dSize.w * thumbScale)
                  const active = activeDraft === i
                  const launched = !!d.metaAdId
                  return (
                    <div key={i} style={{ position: 'relative', flexShrink: 0, width: thumbW }}>
                      <button onClick={() => loadDraft(i)} style={{
                        width: thumbW, height: THUMB,
                        padding: 0, overflow: 'hidden',
                        border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                        boxShadow: active ? `0 0 0 3px ${colors.accentAlpha30}` : 'none',
                        borderRadius: radius.sm, cursor: 'pointer',
                        background: colors.gray150, display: 'block',
                      }}>
                        <div style={{ width: dSize.w, height: dSize.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}>
                          <DTemplate {...(thumbProps(d, dImgUrl, dSize.w, dSize.h) as any)} />
                        </div>
                      </button>
                      {/* Saved check badge */}
                      {d.dbId && (
                        <span style={{
                          position: 'absolute', top: 3, right: 3,
                          width: 14, height: 14, borderRadius: '50%',
                          background: colors.accent, color: colors.ink,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700,
                        }}>✓</span>
                      )}
                      {launched && (
                        <span style={{
                          position: 'absolute', top: 3, left: 3,
                          fontFamily: font.mono, fontSize: 8, fontWeight: 700,
                          background: d.metaAdStatus === 'ACTIVE' ? colors.accentDark : '#ffc107',
                          color: colors.ink,
                          padding: '1px 4px', borderRadius: 2,
                          letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                        }}>{d.metaAdStatus === 'ACTIVE' ? 'LIVE' : 'PAUSED'}</span>
                      )}
                      <button onClick={e => { e.stopPropagation(); removeDraft(i) }}
                        title="Delete"
                        style={{
                          position: 'absolute', bottom: -4, right: -4,
                          width: 16, height: 16, borderRadius: '50%',
                          background: colors.ink, color: colors.white,
                          border: `1px solid ${colors.paper}`, padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', opacity: 0.85,
                        }}>
                        <X size={9} />
                      </button>
                    </div>
                  )
                })
              ) : (
                variations.length === 0 ? (
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.subtle, padding: '20px 0' }}>
                    No variations yet — use Generate {batchCount} to create a batch.
                  </div>
                ) : variations.map((v, i) => {
                  const vImg = v.imageId ? images.find(img => img.id === v.imageId) : null
                  const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
                  const VTemplate = TEMPLATES.find(t => t.id === v.templateId)?.component
                  if (!VTemplate) return null
                  const THUMB = 72
                  const thumbScale = THUMB / size.h
                  const thumbW = Math.round(size.w * thumbScale)
                  const active = activeVariation === i
                  const isSaved = savedDrafts.some(d => d.headline === v.headline && d.imageId === v.imageId)
                  return (
                    <div key={i} style={{ position: 'relative', flexShrink: 0, width: thumbW }}>
                      <button onClick={() => loadVariation(i)} style={{
                        width: thumbW, height: THUMB,
                        padding: 0, overflow: 'hidden',
                        border: active ? `2px solid ${colors.ink}` : `1px solid ${colors.border}`,
                        boxShadow: active ? `0 0 0 3px ${colors.accentAlpha30}` : 'none',
                        borderRadius: radius.sm, cursor: 'pointer',
                        background: colors.gray150, display: 'block',
                      }}>
                        <div style={{ width: size.w, height: size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}>
                          <VTemplate {...(thumbProps(v, vImgUrl) as any)} />
                        </div>
                      </button>
                      <button onClick={e => { e.stopPropagation(); saveVariationAsDraft(i) }}
                        title={isSaved ? 'Saved' : 'Save as draft'}
                        style={{
                          position: 'absolute', top: 3, right: 3,
                          width: 16, height: 16, borderRadius: '50%',
                          background: isSaved ? colors.accent : colors.blackAlpha50,
                          color: isSaved ? colors.ink : colors.white,
                          border: 'none', padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}>
                        <Bookmark size={9} fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT INSPECTOR ── */}
        <aside className="cs-inspector cs-scroll" style={{
          borderLeft: `1px solid ${colors.border}`,
          background: colors.paper,
          display: 'flex', flexDirection: 'column', minHeight: 0,
          overflowY: 'auto',
        }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex', flexShrink: 0,
            borderBottom: `1px solid ${colors.border}`,
            background: colors.paper,
            position: 'sticky', top: 0, zIndex: 1,
          }}>
            {(['copy', 'style', 'layout'] as const).map(tab => (
              <button key={tab} onClick={() => setInspectorTab(tab)} style={{
                flex: 1, padding: '12px 0',
                background: 'transparent', border: 'none',
                borderBottom: inspectorTab === tab ? `2px solid ${colors.ink}` : '2px solid transparent',
                color: inspectorTab === tab ? colors.ink : colors.muted,
                fontFamily: font.heading, fontWeight: 700, fontSize: 12,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}>{tab}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: spacing[3], display: 'flex', flexDirection: 'column', gap: spacing[3] }}>

            {/* ─── COPY TAB ─── */}
            {inspectorTab === 'copy' && (
              <>
                {/* Counters above headline/body via inline badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, fontFamily: font.mono, color: colors.subtle, letterSpacing: letterSpacing.wide, textTransform: 'uppercase' }}>
                  <span>Headline</span>
                  <span style={{
                    marginLeft: 'auto',
                    color: headline.length > HEADLINE_BILLBOARD ? colors.danger : colors.subtle,
                    fontWeight: headline.length > HEADLINE_BILLBOARD ? 700 : 500,
                  }}>
                    {headline.length}{headline.length > HEADLINE_BILLBOARD ? ' · billboard' : ''}
                  </span>
                </div>
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
                {headline.length > HEADLINE_BILLBOARD && (
                  <div style={{ fontSize: 10, color: colors.danger, fontFamily: font.mono, letterSpacing: letterSpacing.wide }}>
                    Headline is {headline.length} chars — aim for ≤ {HEADLINE_BILLBOARD}.
                  </div>
                )}
                {bodyText.length > BODY_LIMIT && (
                  <div style={{ fontSize: 10, color: colors.danger, fontFamily: font.mono, letterSpacing: letterSpacing.wide }}>
                    Body is {bodyText.length} chars — aim for ≤ {BODY_LIMIT}.
                  </div>
                )}
              </>
            )}

            {/* ─── STYLE TAB ─── */}
            {inspectorTab === 'style' && (
              <>
                {/* Brand color swatches */}
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                    Background color
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                    {brandColors.map(c => {
                      const active = bgColor.toLowerCase() === c.value.toLowerCase()
                      return (
                        <button key={c.value + c.label} onClick={() => updateBgColor(c.value)} title={`${c.label} — ${c.value}`} style={{
                          aspectRatio: '1', borderRadius: radius.sm, padding: 0,
                          background: c.value,
                          border: `1px solid ${colors.blackAlpha10}`,
                          outline: active ? `2px solid ${colors.ink}` : 'none',
                          outlineOffset: 2,
                          boxShadow: active ? `0 0 0 4px ${colors.accentAlpha25}` : 'none',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }} />
                      )
                    })}
                    {/* "+" custom-color picker */}
                    <label title="Custom color" style={{
                      aspectRatio: '1', borderRadius: radius.sm,
                      border: `1px dashed ${colors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: colors.muted, fontFamily: font.mono, fontSize: 14, fontWeight: 700,
                    }}>
                      +
                      <input type="color" value={/^#([0-9a-f]{6})$/i.test(bgColor) ? bgColor : '#000000'}
                        onChange={e => updateBgColor(e.target.value)}
                        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }} />
                    </label>
                  </div>
                </div>

                {/* Background mode segmented */}
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                    Background mode
                  </div>
                  <div style={{ display: 'flex', gap: 0, border: `1px solid ${colors.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
                    {(['image', 'brand', 'dark', 'custom'] as const).map((mode, idx) => {
                      const active = bgModeDerived === mode
                      const labels = { image: 'Image', brand: 'Brand', dark: 'Dark', custom: 'Custom' }
                      return (
                        <button key={mode} onClick={() => setBgMode(mode)} style={{
                          flex: 1, padding: '7px 0',
                          fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                          letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                          background: active ? colors.ink : colors.white,
                          color: active ? colors.accent : colors.muted,
                          border: 'none',
                          borderLeft: idx > 0 ? `1px solid ${colors.border}` : 'none',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}>{labels[mode]}</button>
                      )
                    })}
                  </div>
                </div>

                {/* Overlay opacity — only for templates that support overlay */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600 }}>
                      Overlay
                    </span>
                    <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontFamily: font.mono, fontSize: 10, color: colors.subtle }}>
                      <input type="checkbox" checked={showOverlay} onChange={e => setShowOverlay(e.target.checked)} />
                      On
                    </label>
                    <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.subtle, minWidth: 32, textAlign: 'right' }}>{overlayOpacity}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={overlayOpacity}
                    onChange={e => setOverlayOpacity(Number(e.target.value))}
                    disabled={!showOverlay}
                    style={{ width: '100%', opacity: showOverlay ? 1 : 0.4 }} />
                </div>

                {/* Headline size */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600 }}>Headline size</span>
                    <span style={{ marginLeft: 'auto', fontFamily: font.mono, fontSize: 10, color: colors.subtle }}>{headlineSizeMul.toFixed(2)}×</span>
                  </div>
                  <input type="range" min={0.6} max={1.8} step={0.05} value={headlineSizeMul}
                    onChange={e => setHeadlineSizeMul(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                {/* Body size */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600 }}>Body size</span>
                    <span style={{ marginLeft: 'auto', fontFamily: font.mono, fontSize: 10, color: colors.subtle }}>{bodySizeMul.toFixed(2)}×</span>
                  </div>
                  <input type="range" min={0.6} max={1.8} step={0.05} value={bodySizeMul}
                    onChange={e => setBodySizeMul(Number(e.target.value))} style={{ width: '100%' }} />
                </div>

                {/* Case — 3-way per Open Q #11 */}
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Headline case</div>
                  <div style={{ display: 'flex', border: `1px solid ${colors.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
                    {(['none', 'uppercase', 'lowercase'] as const).map((v, i) => {
                      const labels = { none: 'None', uppercase: 'UPPER', lowercase: 'lower' }
                      const active = headlineTransform === v
                      return (
                        <button key={v} onClick={() => setHeadlineTransform(v)} style={{
                          flex: 1, padding: '6px 0',
                          background: active ? colors.ink : colors.white, color: active ? colors.accent : colors.muted,
                          border: 'none', borderLeft: i > 0 ? `1px solid ${colors.border}` : 'none',
                          fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                          letterSpacing: letterSpacing.wide,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}>{labels[v]}</button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ─── LAYOUT TAB ─── */}
            {inspectorTab === 'layout' && (
              <>
                {/* 3×3 text position pad — 9 cells, mid-row sides disabled */}
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                    Text position
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 180 }}>
                    {POS_GRID.map((pos, i) => {
                      if (pos === null) {
                        return <div key={i} style={{ aspectRatio: '1' }} />
                      }
                      const active = textPosition === pos
                      return (
                        <button key={pos} onClick={() => setTextPosition(pos)}
                          title={pos}
                          style={{
                            aspectRatio: '1', padding: 0,
                            background: active ? colors.ink : colors.white,
                            border: active ? `1px solid ${colors.ink}` : `1px solid ${colors.border}`,
                            borderRadius: radius.sm,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                          }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: active ? colors.accent : colors.disabled,
                          }} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Image position segmented */}
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Image position</div>
                  <div style={{ display: 'flex', border: `1px solid ${colors.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
                    {(['top', 'center', 'bottom', 'fit'] as const).map((v, i) => {
                      const active = imagePosition === v
                      return (
                        <button key={v} onClick={() => setImagePosition(v)} style={{
                          flex: 1, padding: '6px 0',
                          background: active ? colors.ink : colors.white, color: active ? colors.accent : colors.muted,
                          border: 'none', borderLeft: i > 0 ? `1px solid ${colors.border}` : 'none',
                          fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                          letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}>{v}</button>
                      )
                    })}
                  </div>
                </div>

                {/* Text banner segmented */}
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Text banner</div>
                  <div style={{ display: 'flex', border: `1px solid ${colors.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
                    {(['none', 'top', 'bottom'] as const).map((v, i) => {
                      const active = textBanner === v
                      return (
                        <button key={v} onClick={() => setTextBanner(v)} style={{
                          flex: 1, padding: '6px 0',
                          background: active ? colors.ink : colors.white, color: active ? colors.accent : colors.muted,
                          border: 'none', borderLeft: i > 0 ? `1px solid ${colors.border}` : 'none',
                          fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                          letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}>{v}</button>
                      )
                    })}
                  </div>
                </div>

                {/* Per-template editors — previously orphaned, now surfaced per Open Q #12 */}
                {templateId === 'comparison' && (
                  <ComparisonSidebar
                    brandName={brand?.name || 'the brand'}
                    oldWayItems={oldWayItems}
                    setOldWayItems={setOldWayItems}
                    newWayItems={newWayItems}
                    setNewWayItems={setNewWayItems}
                    inputCls={inputCls}
                  />
                )}
                {templateId === 'infographic' && (
                  <InfographicSidebar
                    callouts={callouts}
                    setCallouts={setCallouts}
                    statStripText={statStripText}
                    setStatStripText={setStatStripText}
                    inputCls={inputCls}
                  />
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

                {/* Grid template — second image picker */}
                {templateId === 'grid' && images.length > 1 && (
                  <div>
                    <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.muted, letterSpacing: letterSpacing.wide, textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Second image</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                      {images.map(img => (
                        <button key={img.id} onClick={() => setSelectedProductImageId(img.id === selectedProductImageId ? null : img.id)}
                          style={{
                            aspectRatio: '1', borderRadius: radius.xs, overflow: 'hidden', padding: 0,
                            border: `2px solid ${selectedProductImageId === img.id ? colors.accent : colors.border}`,
                            background: 'none', cursor: 'pointer',
                          }}>
                          <img src={getPublicUrl(img.storage_path)} alt="" loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

      </div>

      {/* Hidden export container */}
      <div ref={exportRef} aria-hidden style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none' }} />

      {/* Toast */}
      {(exporting || exportingAll) && !exportToast && (
        <div style={{ position: 'fixed', bottom: spacing[6], left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: spacing[3], background: colors.ink, color: colors.white, padding: `14px ${spacing[6]}px`, borderRadius: radius.pill, boxShadow: shadow.dark, fontSize: fontSize.body, fontWeight: fontWeight.bold, whiteSpace: 'nowrap' }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${colors.whiteAlpha20}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          {exportingAll ? 'Generating all sizes...' : 'Generating PNG...'}
        </div>
      )}
      {exportToast && (
        <div style={{ position: 'fixed', bottom: spacing[6], left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: spacing[2], background: colors.ink, color: colors.accent, padding: `14px ${spacing[6]}px`, borderRadius: radius.pill, boxShadow: shadow.dark, fontSize: fontSize.body, fontWeight: fontWeight.bold, whiteSpace: 'nowrap' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3.5" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {exportToast}
        </div>
      )}

      {/* ── Meta launch modal ── */}
      {launchModalDraft !== null && brand && savedDrafts[launchModalDraft]?.dbId && (() => {
        const d = savedDrafts[launchModalDraft]
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
