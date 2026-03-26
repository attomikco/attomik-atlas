'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage, FontStyle } from '@/types'
import { ChevronDown, ImageIcon, Check, Eye, EyeOff, Sparkles, Loader2, Bookmark, X, Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { TextPosition, ff } from './templates/types'
import OverlayTemplate from './templates/OverlayTemplate'
import SplitTemplate from './templates/SplitTemplate'
import TestimonialTemplate from './templates/TestimonialTemplate'
import StatTemplate from './templates/StatTemplate'
import UGCTemplate from './templates/UGCTemplate'

interface Brand {
  id: string
  name: string
  slug: string
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  accent_font_color: string | null
  heading_color: string | null
  body_color: string | null
  font_primary: string | null
  font_secondary: string | null
  font_heading: FontStyle | null
  font_body: FontStyle | null
  custom_fonts_css: string | null
  brand_voice: string | null
  target_audience: string | null
  default_headline: string | null
  default_body_text: string | null
  default_cta: string | null
}

interface GeneratedCopy {
  id: string
  content: string
  type: string
  created_at: string
}

const TEMPLATES = [
  { id: 'overlay',      label: 'Overlay',      component: OverlayTemplate },
  { id: 'split',        label: 'Split',         component: SplitTemplate },
  { id: 'testimonial',  label: 'Testimonial',   component: TestimonialTemplate },
  { id: 'stat',         label: 'Stat',          component: StatTemplate },
  { id: 'ugc',          label: 'Card',          component: UGCTemplate },
] as const

const SIZES = [
  { id: 'feed',      label: '1:1',        w: 1080, h: 1080 },
  { id: 'stories',   label: '9:16',       w: 1080, h: 1920 },
  { id: 'landscape', label: '1.91:1',     w: 1200, h: 628 },
  { id: 'square45',  label: '4:5',        w: 1080, h: 1350 },
]

const POSITIONS: { pos: TextPosition; i: number }[] = [
  { pos: 'top-left', i: 0 }, { pos: 'top-center', i: 1 }, { pos: 'top-right', i: 2 },
  { pos: 'center', i: 4 },
  { pos: 'bottom-left', i: 6 }, { pos: 'bottom-center', i: 7 }, { pos: 'bottom-right', i: 8 },
]

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
  const initBrand = brands.find(b => b.id === initId)
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
  const [showOverlay, setShowOverlay] = useState(true)
  const [overlayOpacity, setOverlayOpacity] = useState(10)
  const [imagePosition, setImagePosition] = useState<string>('center')
  const [textBanner, setTextBanner] = useState<'none' | 'top' | 'bottom'>('none')
  const [textBannerColor, setTextBannerColor] = useState<string>('#000000')
  const [generating, setGenerating] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchCount, setBatchCount] = useState(5)
  const batchAbortRef = useRef<AbortController | null>(null)
  type StyleSnapshot = {
    headlineColor: string; bodyColor: string; headlineFont: string; headlineWeight: string
    headlineTransform: string; bodyFont: string; bodyWeight: string; bodyTransform: string
    bgColor: string; headlineSizeMul: number; bodySizeMul: number; showOverlay: boolean
    overlayOpacity: number; textBanner: 'none' | 'top' | 'bottom'; textBannerColor: string
    textPosition: TextPosition; showCta: boolean; imagePosition: string
  }
  type Variation = { headline: string; body: string; cta: string; imageId: string | null; templateId: string; style: StyleSnapshot }
  const [variations, setVariations] = useState<Variation[]>([])
  const [activeVariation, setActiveVariation] = useState<number | null>(null)
  const [savedDrafts, setSavedDrafts] = useState<Variation[]>([])
  const [activeDraft, setActiveDraft] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportToast, setExportToast] = useState<string | null>(null)

  const previewRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // ── Helpers ────────────────────────────────────────────────────────
  function isLightColor(hex: string) {
    const c = hex.replace('#', '')
    if (c.length < 6) return false
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 150
  }

  function updateBgColor(color: string) {
    setBgColor(color)
    const light = isLightColor(color)
    setHeadlineColor(light ? '#000000' : '#ffffff')
    setBodyColor(light ? '#1a1a1a' : '#ffffff')
  }

  // ── Derived ────────────────────────────────────────────────────────
  const brand = brands.find(b => b.id === brandId)
  const brandColor = brand?.primary_color || '#00ff97'
  const ctaColor = brand?.accent_color || brandColor
  const ctaFontColor = brand?.accent_font_color || '#000000'
  const brandColors = [
    { label: 'White', value: '#ffffff' },
    { label: 'Black', value: '#000000' },
    ...(brand?.primary_color ? [{ label: 'Primary', value: brand.primary_color }] : []),
    ...(brand?.secondary_color ? [{ label: 'Secondary', value: brand.secondary_color }] : []),
    ...(brand?.accent_color ? [{ label: 'Accent', value: brand.accent_color }] : []),
  ]
  const size = SIZES.find(s => s.id === sizeId)!
  const template = TEMPLATES.find(t => t.id === templateId)!
  const TemplateComponent = template.component
  const selectedImage = images.find(i => i.id === selectedImageId)
  const imageUrl = selectedImage ? supabase.storage.from('brand-images').getPublicUrl(selectedImage.storage_path).data.publicUrl : null
  const brandSlug = brand?.slug || brand?.name?.toLowerCase().replace(/\s+/g, '-') || 'creative'

  // ── Effects ────────────────────────────────────────────────────────
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

  useEffect(() => {
    const nb = brands.find(b => b.id === brandId)
    const h = nb?.font_heading; const hParts = (nb?.font_primary || '').split('|')
    setHeadlineFont(h?.family || hParts[0] || ''); setHeadlineWeight(h?.weight || hParts[1] || '700'); setHeadlineTransform(h?.transform || hParts[2] || 'none')
    const bo = nb?.font_body; const bParts = (nb?.font_secondary || '').split('|')
    setBodyFont(bo?.family || bParts[0] || ''); setBodyWeight(bo?.weight || bParts[1] || '400'); setBodyTransform(bo?.transform || bParts[2] || 'none')
    setHeadlineColor(nb?.heading_color || nb?.primary_color || '#ffffff')
    setBodyColor(nb?.body_color || '#ffffff')
    setBgColor(nb?.primary_color || '#000000')
    setTextBannerColor(nb?.primary_color || '#000000')
    setHeadline(nb?.default_headline || `Discover ${nb?.name || 'Our Brand'}`)
    const audience = nb?.target_audience?.split(/[;,]/)[0]?.trim() || 'you'
    setBodyText(nb?.default_body_text || `Premium quality crafted for ${audience}`)
    setCtaText(nb?.default_cta || 'Shop Now')
  }, [brandId, brands])

  useEffect(() => {
    if (!brandId) return
    supabase.from('brand_images').select('*').eq('brand_id', brandId).order('created_at')
      .then(({ data }) => { const imgs = data ?? []; setImages(imgs); setSelectedImageId(imgs.length > 0 ? imgs[Math.floor(Math.random() * imgs.length)].id : null) })
    supabase.from('generated_content').select('id, content, type, created_at').eq('brand_id', brandId)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setRecentCopy((data as GeneratedCopy[]) ?? []))
  }, [brandId])

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

  async function generateBatch() {
    if (!brandId || batchGenerating || images.length === 0) return
    const abort = new AbortController(); batchAbortRef.current = abort
    setBatchGenerating(true); setVariations([]); setActiveVariation(null)
    const templateIds = TEMPLATES.map(t => t.id); const results: Variation[] = []
    for (let i = 0; i < batchCount; i++) {
      if (abort.signal.aborted) break
      try {
        const res = await fetch('/api/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
          body: JSON.stringify({
            brandId, tool: 'ad_copy', tone: 'on-brand', platform: 'creative', subtype: 'image ad',
            brief: `Generate exactly one unique short headline (under 8 words) and one body line (under 20 words) for a visual ad creative. Variation ${i + 1} of 10 — make each one distinct.${campaignBrief ? `\n\nCAMPAIGN CONTEXT:\n${campaignBrief}` : ''}\n\nFormat as:\nHEADLINE: <headline text>\nBODY: <body text>\nCTA: <cta text>\nNothing else.`,
          }),
        })
        let full = ''
        const reader = res.body?.getReader(); const decoder = new TextDecoder()
        if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); for (const line of chunk.split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {} } } } }
        const hm = full.match(/HEADLINE:\s*(.+)/i); const bm = full.match(/BODY:\s*(.+)/i); const cm = full.match(/CTA:\s*(.+)/i)
        results.push({ headline: hm?.[1]?.trim() || 'Headline', body: bm?.[1]?.trim() || 'Body text', cta: cm?.[1]?.trim() || 'Shop Now', imageId: images[Math.floor(Math.random() * images.length)]?.id || null, templateId: templateIds[i % templateIds.length], style: captureStyle() })
        setVariations([...results])
      } catch {
        results.push({ headline: 'Headline', body: 'Body text', cta: 'Shop Now', imageId: images[Math.floor(Math.random() * images.length)]?.id || null, templateId: templateIds[i % templateIds.length], style: captureStyle() })
        setVariations([...results])
      }
    }
    setBatchGenerating(false)
  }

  // ── Variation / Draft helpers ──────────────────────────────────────
  function loadVariation(i: number) { const v = variations[i]; if (!v) return; setHeadline(v.headline); setBodyText(v.body); setCtaText(v.cta); setSelectedImageId(v.imageId); setTemplateId(v.templateId); applyStyle(v.style); setActiveVariation(i); setActiveDraft(null) }
  function saveVariationAsDraft(i: number) { const v = variations[i]; if (!v) return; if (savedDrafts.some(d => d.headline === v.headline && d.imageId === v.imageId)) return; setSavedDrafts(prev => [...prev, v]) }
  function loadDraft(i: number) { const d = savedDrafts[i]; if (!d) return; setHeadline(d.headline); setBodyText(d.body); setCtaText(d.cta); setSelectedImageId(d.imageId); setTemplateId(d.templateId); applyStyle(d.style); setActiveDraft(i); setActiveVariation(null) }
  function removeDraft(i: number) { setSavedDrafts(prev => prev.filter((_, j) => j !== i)); if (activeDraft === i) setActiveDraft(null); else if (activeDraft !== null && activeDraft > i) setActiveDraft(activeDraft - 1) }

  // ── Auto-sync edits back to active variation ──────────────────────
  useEffect(() => {
    if (activeVariation === null) return
    setVariations(prev => prev.map((v, i) => i === activeVariation
      ? { ...v, headline, body: bodyText, cta: ctaText, imageId: selectedImageId, templateId, style: captureStyle() }
      : v
    ))
  }, [headline, bodyText, ctaText, selectedImageId, templateId, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul, showOverlay, overlayOpacity, textBanner, textBannerColor, textPosition, showCta, imagePosition])

  // ── Export ─────────────────────────────────────────────────────────
  const templateProps = {
    imageUrl, headline, bodyText, ctaText, brandColor, brandName: brand?.name || '',
    textPosition, showCta, headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform,
    bodyFont, bodyWeight, bodyTransform, bgColor, headlineSizeMul, bodySizeMul,
    showOverlay, overlayOpacity: overlayOpacity / 100, textBanner, textBannerColor, ctaColor, ctaFontColor, imagePosition,
  }

  async function captureElement(el: HTMLElement, w: number, h: number): Promise<string> {
    const canvas = await html2canvas(el, {
      width: w, height: h, scale: 1,
      useCORS: true, allowTaint: true, logging: false,
    })
    return canvas.toDataURL('image/png')
  }

  async function renderAndCapture(Component: any, props: any, w: number, h: number): Promise<string> {
    const container = exportRef.current
    if (!container) throw new Error('Export container not available')
    container.style.width = `${w}px`; container.style.height = `${h}px`; container.innerHTML = ''
    const { createRoot } = await import('react-dom/client')
    const wrapper = document.createElement('div'); wrapper.style.width = `${w}px`; wrapper.style.height = `${h}px`
    container.appendChild(wrapper)
    const root = createRoot(wrapper)
    root.render(<Component {...props} width={w} height={h} />)
    await new Promise(r => setTimeout(r, 500))
    const imgs = container.querySelectorAll('img')
    await Promise.all(Array.from(imgs).map(img => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })))
    await new Promise(r => setTimeout(r, 200))
    const dataUrl = await captureElement(container, w, h)
    root.unmount()
    container.innerHTML = ''
    return dataUrl
  }

  async function exportPng() {
    setExporting(true)
    try {
      const dataUrl = await renderAndCapture(TemplateComponent, templateProps, size.w, size.h)
      const fileName = `${brandSlug}-${templateId}-${sizeId}-${Date.now()}.png`
      const link = document.createElement('a'); link.download = fileName; link.href = dataUrl; link.click()
      if (campaignId && brand) {
        const base64 = dataUrl.split(',')[1]; const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'image/png' }); const path = `${campaignId}/${fileName}`
        await supabase.storage.from('campaign-assets').upload(path, blob, { contentType: 'image/png' })
        await supabase.from('campaign_assets').insert({ campaign_id: campaignId, brand_id: brand.id, file_name: fileName, storage_path: path, mime_type: 'image/png', size_bytes: blob.size, asset_type: 'creative' })
      }
      setExportToast(campaignId ? 'Downloaded & saved to campaign' : 'Downloaded creative')
      setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export failed:', err) }
    setExporting(false)
  }

  async function exportAllSizes() {
    setExportingAll(true)
    try {
      const zip = new JSZip()
      for (const s of SIZES) { const dataUrl = await renderAndCapture(TemplateComponent, templateProps, s.w, s.h); zip.file(`${brandSlug}-${templateId}-${s.id}-${s.w}x${s.h}.png`, dataUrl.split(',')[1], { base64: true }) }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-${templateId}-all-sizes-${Date.now()}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${SIZES.length} creatives`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export all failed:', err) }
    setExportingAll(false)
  }

  async function exportAllVariations() {
    if (variations.length === 0) return
    setExportingAll(true)
    try {
      const zip = new JSZip()
      for (let i = 0; i < variations.length; i++) {
        const v = variations[i]
        const VComp = TEMPLATES.find(t => t.id === v.templateId)!.component
        const vImg = images.find(img => img.id === v.imageId)
        const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
        const props = thumbProps(v, vImgUrl)
        const dataUrl = await renderAndCapture(VComp, props, size.w, size.h)
        zip.file(`${brandSlug}-${v.templateId}-${sizeId}-${i + 1}.png`, dataUrl.split(',')[1], { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-variations-${sizeId}-${Date.now()}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${variations.length} variations`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export variations failed:', err) }
    setExportingAll(false)
  }

  // ── Preview scaling ────────────────────────────────────────────────
  const maxPreviewH = 420
  const scale = maxPreviewH / size.h
  const previewW = Math.round(size.w * scale)
  const previewH = maxPreviewH

  // ── Styles ─────────────────────────────────────────────────────────
  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"
  const pill = (active: boolean) => ({
    className: "text-xs px-2.5 py-1 rounded-pill border transition-all duration-150 font-semibold cursor-pointer",
    style: active
      ? { background: '#000', color: '#00ff97', borderColor: '#000' } as const
      : { borderColor: '#e0e0e0', color: '#666' } as const,
  })

  // Template props for a thumbnail — uses the variation's own saved style
  const thumbProps = (v: Variation, imgUrl: string | null) => ({
    imageUrl: imgUrl,
    headline: v.headline,
    bodyText: v.body,
    ctaText: v.cta,
    brandColor,
    brandName: brand?.name || '',
    width: size.w,
    height: size.h,
    ctaColor,
    ctaFontColor,
    // Style from the variation's snapshot
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
  })

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ═══ TOP TOOLBAR ═══ */}
      <div className="bg-paper border border-border rounded-card px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Brand */}
        <div className="relative">
          <select value={brandId} onChange={e => setBrandId(e.target.value)}
            className="text-sm font-semibold border border-border rounded-btn pl-3 pr-7 py-1.5 bg-cream appearance-none focus:outline-none focus:border-accent">
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

        <span className="w-px h-5 bg-border" />

        {/* Template pills */}
        <div className="flex gap-1">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => { setTemplateId(t.id); if (t.id === 'stat') { setTextPosition('center'); setShowOverlay(true); setOverlayOpacity(30) } }} {...pill(templateId === t.id)}>{t.label}</button>
          ))}
        </div>

        <span className="w-px h-5 bg-border" />

        {/* Size pills */}
        <div className="flex gap-1">
          {SIZES.map(s => (
            <button key={s.id} onClick={() => setSizeId(s.id)} {...pill(sizeId === s.id)}>{s.label}</button>
          ))}
        </div>

        {/* Right side: AI + Export */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={generateCopy} disabled={generating}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill bg-ink text-accent hover:opacity-80 transition-opacity disabled:opacity-50">
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generating ? 'Writing...' : 'AI Copy'}
          </button>

          <button onClick={exportPng} disabled={exporting || exportingAll}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill border border-border hover:border-ink transition-all disabled:opacity-40">
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            PNG
          </button>

          <button onClick={exportAllSizes} disabled={exporting || exportingAll}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill hover:opacity-80 transition-all disabled:opacity-40"
            style={{ background: '#000', color: '#00ff97' }}>
            {exportingAll ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            All sizes
          </button>
        </div>
      </div>

      {/* ═══ MAIN AREA: Preview (8 cols) + Sidebar (4 cols) ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── LEFT: Preview ── */}
        <div className="lg:col-span-8">
          <div className="bg-paper border border-border rounded-card p-4">
            {/* Preview label */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted">{template.label} &middot; {size.w}&times;{size.h}</span>
              {/* Batch generate */}
              <div className="flex items-center gap-1.5">
                {batchGenerating ? (
                  <button onClick={stopBatch}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill bg-ink text-paper hover:opacity-80 transition-opacity">
                    Stop ({variations.length}/{batchCount})
                  </button>
                ) : (
                  <>
                    {[3, 5, 10, 15, 20].map(n => (
                      <button key={n} onClick={() => setBatchCount(n)}
                        className="text-[11px] font-semibold w-6 h-6 rounded-full border transition-all"
                        style={batchCount === n
                          ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                          : { borderColor: '#e0e0e0', color: '#999' }}>
                        {n}
                      </button>
                    ))}
                    <button onClick={generateBatch} disabled={images.length === 0}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill transition-opacity hover:opacity-80 disabled:opacity-40 ml-0.5"
                      style={{ background: '#00ff97', color: '#000' }}>
                      <Sparkles size={12} /> Batch
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Preview canvas + FB copy */}
            <div className="flex gap-5 items-start" ref={previewRef}>
              <div className="rounded-btn overflow-hidden border border-border shadow-sm flex-shrink-0" style={{ width: previewW, height: previewH }}>
                <div style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <TemplateComponent {...templateProps} width={size.w} height={size.h} />
                </div>
              </div>
              {/* FB Ad copy preview */}
              <div className="flex-1 min-w-0 text-sm space-y-3 pt-1" style={{ fontFamily: ff(bodyFont) }}>
                {[
                  { label: 'Primary Text', value: bodyText || 'Body text goes here' },
                  { label: 'Headline', value: headline || 'Your headline here' },
                  { label: 'Description', value: ctaText || 'Shop Now' },
                ].map(({ label, value }) => (
                  <div key={label} className={label !== 'Primary Text' ? 'border-t border-border pt-3' : ''}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted uppercase tracking-wide font-semibold">{label}</span>
                      <button onClick={() => { navigator.clipboard.writeText(value); setExportToast(`${label} copied`); setTimeout(() => setExportToast(null), 1500) }}
                        className="text-[10px] text-muted hover:text-ink transition-colors font-medium px-1.5 py-0.5 rounded hover:bg-black/5">
                        Copy
                      </button>
                    </div>
                    <p className="text-ink text-[13px] leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Variations strip ── */}
          {variations.length > 0 && (
            <div className="bg-paper border border-border rounded-card p-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="label">Generated ({variations.length})</div>
                <button onClick={exportAllVariations} disabled={exportingAll}
                  className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted hover:text-ink transition-colors disabled:opacity-40">
                  <Download size={11} /> Download all ({size.w}&times;{size.h})
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {variations.map((v, i) => {
                  const vImg = images.find(img => img.id === v.imageId)
                  const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
                  const VTemplate = TEMPLATES.find(t => t.id === v.templateId)!.component
                  const isSaved = savedDrafts.some(d => d.headline === v.headline && d.imageId === v.imageId)
                  const thumbW = 120
                  const thumbScale = thumbW / size.w
                  const thumbH = Math.round(size.h * thumbScale)
                  return (
                    <div key={i} className="relative group">
                      <button onClick={() => loadVariation(i)}
                        className="rounded-[3px] overflow-hidden transition-all hover:opacity-90"
                        style={{ width: thumbW, height: thumbH, border: activeVariation === i ? '2px solid #00ff97' : '1px solid #e0e0e0', display: 'block' }}>
                        <div style={{ width: size.w, height: size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}>
                          <VTemplate {...thumbProps(v, vImgUrl)} />
                        </div>
                      </button>
                      <button onClick={() => saveVariationAsDraft(i)}
                        className={`absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full transition-all ${isSaved ? '' : 'opacity-0 group-hover:opacity-100'}`}
                        style={{ background: isSaved ? '#00ff97' : 'rgba(0,0,0,0.6)', color: isSaved ? '#000' : '#fff' }}>
                        <Bookmark size={8} fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Saved drafts ── */}
          {savedDrafts.length > 0 && (
            <div className="bg-paper border border-border rounded-card p-4 mt-4">
              <div className="label mb-3">Saved drafts ({savedDrafts.length})</div>
              <div className="flex flex-wrap gap-2">
                {savedDrafts.map((d, i) => {
                  const dImg = images.find(img => img.id === d.imageId)
                  const dImgUrl = dImg ? getPublicUrl(dImg.storage_path) : null
                  const DTemplate = TEMPLATES.find(t => t.id === d.templateId)!.component
                  const dThumbW = 120
                  const dThumbScale = dThumbW / size.w
                  const dThumbH = Math.round(size.h * dThumbScale)
                  return (
                    <div key={i} className="relative group">
                      <button onClick={() => loadDraft(i)}
                        className="rounded-[3px] overflow-hidden transition-all hover:opacity-90"
                        style={{ width: dThumbW, height: dThumbH, border: activeDraft === i ? '2px solid #00ff97' : '1px solid #e0e0e0', display: 'block' }}>
                        <div style={{ width: size.w, height: size.h, transform: `scale(${dThumbScale})`, transformOrigin: 'top left' }}>
                          <DTemplate {...thumbProps(d, dImgUrl)} />
                        </div>
                      </button>
                      <button onClick={() => removeDraft(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger">
                        <X size={8} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR: Images + Copy + Style ── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Images */}
          <div className="bg-paper border border-border rounded-card p-4">
            <label className="label block mb-2">Image</label>
            {images.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto">
                {images.map(img => (
                  <button key={img.id}
                    onClick={() => setSelectedImageId(img.id === selectedImageId ? null : img.id)}
                    className="relative aspect-square rounded-[4px] overflow-hidden border-2 transition-all"
                    style={{ borderColor: img.id === selectedImageId ? brandColor : 'transparent' }}>
                    <img src={getPublicUrl(img.storage_path)} alt={img.file_name} className="w-full h-full object-cover" />
                    {img.id === selectedImageId && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted border border-dashed border-border rounded-btn px-3 py-4 justify-center">
                <ImageIcon size={13} /> No images for this brand
              </div>
            )}
          </div>

          {/* Copy */}
          <div className="bg-paper border border-border rounded-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="label">Copy</label>
              <button onClick={async () => {
                await supabase.from('brands').update({ default_headline: headline, default_body_text: bodyText, default_cta: ctaText }).eq('id', brandId)
                setExportToast('Saved as default'); setTimeout(() => setExportToast(null), 1500)
              }} className="text-[10px] text-muted hover:text-ink transition-colors font-semibold uppercase tracking-wide">
                Save as default
              </button>
            </div>
            <input className={inputCls} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline" />
            <textarea className={inputCls + ' resize-none'} rows={2} value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="Body text" />
            <div className="flex items-center gap-2">
              <input className={inputCls + (showCta ? '' : ' opacity-40')} value={ctaText}
                onChange={e => setCtaText(e.target.value)} placeholder="CTA text" disabled={!showCta} />
              <button onClick={() => setShowCta(!showCta)}
                className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors flex-shrink-0 px-1">
                {showCta ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </div>
          </div>

          {/* Style */}
          <div className="bg-paper border border-border rounded-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="label">Style</label>
              <button onClick={() => {
                const h = brand?.font_heading; const hP = (brand?.font_primary || '').split('|')
                const b = brand?.font_body; const bP = (brand?.font_secondary || '').split('|')
                setHeadlineColor(brand?.heading_color || brand?.primary_color || '#ffffff')
                setBodyColor(brand?.body_color || '#ffffff')
                setHeadlineFont(h?.family || hP[0] || ''); setHeadlineWeight(h?.weight || hP[1] || '700'); setHeadlineTransform(h?.transform || hP[2] || 'none')
                setBodyFont(b?.family || bP[0] || ''); setBodyWeight(b?.weight || bP[1] || '400'); setBodyTransform(b?.transform || bP[2] || 'none')
                setBgColor(brand?.primary_color || '#000000'); setHeadlineSizeMul(1); setBodySizeMul(1)
                setShowOverlay(false); setOverlayOpacity(50); setTextBanner('none')
              }}
                className="text-[10px] text-muted hover:text-ink transition-colors font-semibold uppercase tracking-wide">
                Reset to brand
              </button>
            </div>

            {/* Text position grid + Background */}
            <div className="flex gap-4">
              <div>
                <span className="text-[10px] text-muted uppercase tracking-wide block mb-1">Position</span>
                <div className="grid grid-cols-3 gap-0.5 w-[72px]">
                  {Array.from({ length: 9 }).map((_, i) => {
                    const match = POSITIONS.find(p => p.i === i)
                    if (!match) return <div key={i} className="w-6 h-6" />
                    return (
                      <button key={i} onClick={() => setTextPosition(match.pos)}
                        className="w-6 h-6 rounded-[3px] border transition-all"
                        style={textPosition === match.pos
                          ? { background: '#000', borderColor: '#000' }
                          : { background: '#f2f2f2', borderColor: '#e0e0e0' }}
                        title={match.pos} />
                    )
                  })}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase tracking-wide block mb-1">Image</span>
                <div className="grid grid-cols-3 gap-0.5 w-[72px]">
                  {['top', 'center', 'bottom'].map(pos => (
                    <button key={pos} onClick={() => setImagePosition(pos)}
                      className="w-6 h-6 rounded-[3px] border transition-all text-[8px] font-bold"
                      style={imagePosition === pos
                        ? { background: '#000', borderColor: '#000', color: '#00ff97' }
                        : { background: '#f2f2f2', borderColor: '#e0e0e0', color: '#999' }}
                      title={pos}>
                      {pos[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <span className="text-[10px] text-muted uppercase tracking-wide block mb-1">Background</span>
                  <div className="flex gap-1">
                    {brandColors.map(c => (
                      <button key={'bg-' + c.value} onClick={() => updateBgColor(c.value)}
                        className="w-5 h-5 rounded-[3px] border-2 transition-all flex-shrink-0"
                        style={{ background: c.value, borderColor: bgColor === c.value ? '#000' : '#e0e0e0' }}
                        title={c.label} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted uppercase tracking-wide">Overlay</span>
                  <button onClick={() => setShowOverlay(!showOverlay)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                    {showOverlay ? <Eye size={11} /> : <EyeOff size={11} />}
                    {showOverlay ? 'On' : 'Off'}
                  </button>
                </div>
                {showOverlay && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <input type="range" min={0} max={100} step={5} value={overlayOpacity}
                      onChange={e => setOverlayOpacity(parseInt(e.target.value))}
                      className="flex-1 min-w-0 accent-[#00ff97]" />
                    <span className="text-[10px] font-mono text-muted flex-shrink-0">{overlayOpacity}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Text banner */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted uppercase tracking-wide flex-shrink-0">Text bar</span>
              <div className="flex gap-1">
                {(['none', 'top', 'bottom'] as const).map(v => (
                  <button key={v} onClick={() => {
                    setTextBanner(v)
                    if (v === 'top') setTextPosition(p => p.replace(/^(top|bottom|center)/, 'top') as TextPosition)
                    if (v === 'bottom') setTextPosition(p => p.replace(/^(top|bottom|center)/, 'bottom') as TextPosition)
                  }}
                    {...pill(textBanner === v)}>{v === 'none' ? 'Off' : v.charAt(0).toUpperCase() + v.slice(1)}</button>
                ))}
              </div>
              {textBanner !== 'none' && (
                <div className="flex gap-1 ml-auto">
                  {brandColors.map(c => (
                    <button key={'tb-' + c.value} onClick={() => setTextBannerColor(c.value)}
                      className="w-5 h-5 rounded-[3px] border-2 transition-all flex-shrink-0"
                      style={{ background: c.value, borderColor: textBannerColor === c.value ? '#00ff97' : '#e0e0e0' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Font & color rows */}
            <div className="space-y-2">
              {[
                { label: 'H', font: headlineFont, setFont: setHeadlineFont, color: headlineColor, setColor: setHeadlineColor, sizeMul: headlineSizeMul, setSizeMul: setHeadlineSizeMul },
                { label: 'B', font: bodyFont, setFont: setBodyFont, color: bodyColor, setColor: setBodyColor, sizeMul: bodySizeMul, setSizeMul: setBodySizeMul },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted w-4 flex-shrink-0">{row.label}</span>
                  <select value={row.font} onChange={e => row.setFont(e.target.value)}
                    className="text-xs border border-border rounded-btn px-2 py-1 bg-cream focus:outline-none focus:border-accent w-24 flex-shrink-0 appearance-none">
                    <option value="">Barlow</option>
                    {brand?.font_primary && <option value={brand.font_primary.split('|')[0]}>{brand.font_primary.split('|')[0]}</option>}
                    {brand?.font_secondary && brand.font_secondary.split('|')[0] !== brand.font_primary?.split('|')[0] && (
                      <option value={brand.font_secondary.split('|')[0]}>{brand.font_secondary.split('|')[0]}</option>
                    )}
                  </select>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {brandColors.map(c => (
                      <button key={row.label + c.value} onClick={() => row.setColor(c.value)}
                        className="w-5 h-5 rounded-[3px] border-2 transition-all"
                        style={{ background: c.value, borderColor: row.color === c.value ? '#000' : '#e0e0e0' }} />
                    ))}
                  </div>
                  <input type="range" min={0.5} max={2} step={0.1} value={row.sizeMul}
                    onChange={e => row.setSizeMul(parseFloat(e.target.value))}
                    className="flex-1 accent-[#00ff97] min-w-0" />
                  <span className="text-[10px] font-mono text-muted w-7 text-right flex-shrink-0">{Math.round(row.sizeMul * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden export container */}
      <div ref={exportRef} aria-hidden style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }} />

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
