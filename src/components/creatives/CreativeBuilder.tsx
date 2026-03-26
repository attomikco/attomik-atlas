'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage, FontStyle } from '@/types'
import { ChevronDown, ImageIcon, Check, Eye, EyeOff, Sparkles, Loader2, Bookmark, X, Download } from 'lucide-react'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { TextPosition } from './templates/types'
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
  { id: 'ugc',          label: 'UGC',           component: UGCTemplate },
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
}: {
  brands: Brand[]
  defaultBrandId?: string
}) {
  const supabase = createClient()

  const [brandId, setBrandId] = useState(defaultBrandId || brands[0]?.id || '')
  const [images, setImages] = useState<BrandImage[]>([])
  const [recentCopy, setRecentCopy] = useState<GeneratedCopy[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string>('overlay')
  const [sizeId, setSizeId] = useState<string>('feed')
  const [headline, setHeadline] = useState('Your headline here')
  const [bodyText, setBodyText] = useState('Body text goes here')
  const [ctaText, setCtaText] = useState('Shop Now')
  const [textPosition, setTextPosition] = useState<TextPosition>('bottom-left')
  const [showCta, setShowCta] = useState(true)
  const [headlineColor, setHeadlineColor] = useState<string>(brands[0]?.heading_color || brands[0]?.primary_color || '#ffffff')
  const [bodyColor, setBodyColor] = useState<string>(brands[0]?.body_color || '#ffffff')
  const [headlineFont, setHeadlineFont] = useState<string>('')
  const [bodyFont, setBodyFont] = useState<string>('')
  const [headlineWeight, setHeadlineWeight] = useState<string>('700')
  const [headlineTransform, setHeadlineTransform] = useState<string>('none')
  const [bodyWeight, setBodyWeight] = useState<string>('400')
  const [bodyTransform, setBodyTransform] = useState<string>('none')
  const [bgColor, setBgColor] = useState<string>(brands[0]?.primary_color || '#000000')
  const [headlineSizeMul, setHeadlineSizeMul] = useState(1)
  const [bodySizeMul, setBodySizeMul] = useState(1)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [textBanner, setTextBanner] = useState<'none' | 'top' | 'bottom'>('none')
  const [textBannerColor, setTextBannerColor] = useState<string>('#000000')
  const [copySource, setCopySource] = useState<'manual' | 'generated'>('manual')
  const [generating, setGenerating] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchCount, setBatchCount] = useState(5)
  const batchAbortRef = useRef<AbortController | null>(null)
  type Variation = { headline: string; body: string; cta: string; imageId: string | null; templateId: string }
  const [variations, setVariations] = useState<Variation[]>([])
  const [activeVariation, setActiveVariation] = useState<number | null>(null)
  const [savedDrafts, setSavedDrafts] = useState<Variation[]>([])
  const [activeDraft, setActiveDraft] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportToast, setExportToast] = useState<string | null>(null)

  const previewRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

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

  // Load brand fonts from Google Fonts when brand changes
  useEffect(() => {
    const fonts = [brand?.font_primary, brand?.font_secondary].filter(Boolean).map(f => f!.split('|')[0]) as string[]
    if (fonts.length === 0) return
    const families = Array.from(new Set(fonts)).map(f => f.replace(/ /g, '+')).join('&family=')
    const id = 'brand-fonts-link'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  }, [brand?.font_primary, brand?.font_secondary])

  // Auto-select brand fonts when brand changes
  useEffect(() => {
    // Try JSONB first, then parse from pipe-delimited text columns
    const h = brand?.font_heading
    const hParts = (brand?.font_primary || '').split('|')
    setHeadlineFont(h?.family || hParts[0] || '')
    setHeadlineWeight(h?.weight || hParts[1] || '700')
    setHeadlineTransform(h?.transform || hParts[2] || 'none')

    const b = brand?.font_body
    const bParts = (brand?.font_secondary || '').split('|')
    setBodyFont(b?.family || bParts[0] || '')
    setBodyWeight(b?.weight || bParts[1] || '400')
    setBodyTransform(b?.transform || bParts[2] || 'none')

    setHeadlineColor(brand?.heading_color || brand?.primary_color || '#ffffff')
    setBodyColor(brand?.body_color || '#ffffff')
    setBgColor(brand?.primary_color || '#000000')
    setTextBannerColor(brand?.primary_color || '#000000')
  }, [brandId])

  // Load brand images + recent copy when brand changes
  useEffect(() => {
    if (!brandId) return
    supabase
      .from('brand_images')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at')
      .then(({ data }) => {
        const imgs = data ?? []
        setImages(imgs)
        setSelectedImageId(imgs[0]?.id ?? null)
      })

    supabase
      .from('generated_content')
      .select('id, content, type, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setRecentCopy((data as GeneratedCopy[]) ?? []))
  }, [brandId])

  function getPublicUrl(storagePath: string) {
    return supabase.storage.from('brand-images').getPublicUrl(storagePath).data.publicUrl
  }

  async function generateCopy() {
    if (!brandId || generating) return
    setGenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          tool: 'ad_copy',
          tone: 'on-brand',
          platform: 'creative',
          subtype: 'image ad',
          brief: `Generate exactly one short headline (under 8 words) and one body line (under 20 words) for a visual ad creative. Format as:
HEADLINE: <headline text>
BODY: <body text>
CTA: <cta text>
Nothing else.`,
        }),
      })
      let full = ''
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6))
                full += parsed.delta?.text || ''
              } catch {}
            }
          }
        }
      }
      // Parse structured response
      const headlineMatch = full.match(/HEADLINE:\s*(.+)/i)
      const bodyMatch = full.match(/BODY:\s*(.+)/i)
      const ctaMatch = full.match(/CTA:\s*(.+)/i)
      if (headlineMatch) setHeadline(headlineMatch[1].trim())
      if (bodyMatch) setBodyText(bodyMatch[1].trim())
      if (ctaMatch) setCtaText(ctaMatch[1].trim())
    } catch (err) {
      console.error('Generate failed:', err)
    }
    setGenerating(false)
  }

  function stopBatch() {
    batchAbortRef.current?.abort()
    setBatchGenerating(false)
  }

  async function generateBatch() {
    if (!brandId || batchGenerating || images.length === 0) return
    const abort = new AbortController()
    batchAbortRef.current = abort
    setBatchGenerating(true)
    setVariations([])
    setActiveVariation(null)

    const templateIds = TEMPLATES.map(t => t.id)
    const results: typeof variations = []

    for (let i = 0; i < batchCount; i++) {
      if (abort.signal.aborted) break
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abort.signal,
          body: JSON.stringify({
            brandId,
            tool: 'ad_copy',
            tone: 'on-brand',
            platform: 'creative',
            subtype: 'image ad',
            brief: `Generate exactly one unique short headline (under 8 words) and one body line (under 20 words) for a visual ad creative. Variation ${i + 1} of 10 — make each one distinct. Format as:
HEADLINE: <headline text>
BODY: <body text>
CTA: <cta text>
Nothing else.`,
          }),
        })
        let full = ''
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value)
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try { full += JSON.parse(line.slice(6)).delta?.text || '' } catch {}
              }
            }
          }
        }
        const hm = full.match(/HEADLINE:\s*(.+)/i)
        const bm = full.match(/BODY:\s*(.+)/i)
        const cm = full.match(/CTA:\s*(.+)/i)
        results.push({
          headline: hm?.[1]?.trim() || 'Headline',
          body: bm?.[1]?.trim() || 'Body text',
          cta: cm?.[1]?.trim() || 'Shop Now',
          imageId: images[Math.floor(Math.random() * images.length)]?.id || null,
          templateId: templateIds[i % templateIds.length],
        })
        setVariations([...results])
      } catch {
        results.push({
          headline: 'Headline', body: 'Body text', cta: 'Shop Now',
          imageId: images[Math.floor(Math.random() * images.length)]?.id || null,
          templateId: templateIds[i % templateIds.length],
        })
        setVariations([...results])
      }
    }
    setBatchGenerating(false)
  }

  function loadVariation(i: number) {
    const v = variations[i]
    if (!v) return
    setHeadline(v.headline)
    setBodyText(v.body)
    setCtaText(v.cta)
    setSelectedImageId(v.imageId)
    setTemplateId(v.templateId)
    setActiveVariation(i)
    setActiveDraft(null)
  }

  function saveVariationAsDraft(i: number) {
    const v = variations[i]
    if (!v) return
    // Don't add duplicates
    if (savedDrafts.some(d => d.headline === v.headline && d.imageId === v.imageId)) return
    setSavedDrafts(prev => [...prev, v])
  }

  function loadDraft(i: number) {
    const d = savedDrafts[i]
    if (!d) return
    setHeadline(d.headline)
    setBodyText(d.body)
    setCtaText(d.cta)
    setSelectedImageId(d.imageId)
    setTemplateId(d.templateId)
    setActiveDraft(i)
    setActiveVariation(null)
  }

  function removeDraft(i: number) {
    setSavedDrafts(prev => prev.filter((_, j) => j !== i))
    if (activeDraft === i) setActiveDraft(null)
    else if (activeDraft !== null && activeDraft > i) setActiveDraft(activeDraft - 1)
  }

  const selectedImage = images.find(i => i.id === selectedImageId)
  const imageUrl = selectedImage ? getPublicUrl(selectedImage.storage_path) : null
  const brandSlug = brand?.slug || brand?.name?.toLowerCase().replace(/\s+/g, '-') || 'creative'

  const renderAtFullSize = useCallback(async (w: number, h: number, sLabel: string): Promise<string> => {
    const container = exportRef.current
    if (!container) throw new Error('Export container not available')

    // Render template at full resolution into the hidden div
    container.style.width = `${w}px`
    container.style.height = `${h}px`
    container.innerHTML = ''

    const { createRoot } = await import('react-dom/client')
    const wrapper = document.createElement('div')
    wrapper.style.width = `${w}px`
    wrapper.style.height = `${h}px`
    container.appendChild(wrapper)

    await new Promise<void>((resolve) => {
      const root = createRoot(wrapper)
      root.render(
        <TemplateComponent
          imageUrl={imageUrl}
          headline={headline}
          bodyText={bodyText}
          ctaText={ctaText}
          brandColor={brandColor}
          brandName={brand?.name || ''}
          width={w}
          height={h}
          textPosition={textPosition}
          showCta={showCta}
          headlineColor={headlineColor}
          bodyColor={bodyColor}
          headlineFont={headlineFont}
          headlineWeight={headlineWeight}
          headlineTransform={headlineTransform}
          bodyFont={bodyFont}
          bodyWeight={bodyWeight}
          bodyTransform={bodyTransform}
          bgColor={bgColor}
          headlineSizeMul={headlineSizeMul}
          bodySizeMul={bodySizeMul}
          showOverlay={showOverlay}
          overlayOpacity={overlayOpacity / 100}
          textBanner={textBanner}
          textBannerColor={textBannerColor}
          ctaColor={ctaColor}
          ctaFontColor={ctaFontColor}
        />
      )
      // Give React + images time to render
      setTimeout(() => { resolve() }, 300)
    })

    const dataUrl = await toPng(container, {
      width: w,
      height: h,
      pixelRatio: 1,
      cacheBust: true,
    })
    container.innerHTML = ''
    return dataUrl
  }, [TemplateComponent, imageUrl, headline, bodyText, ctaText, brandColor, textPosition, showCta,
      headlineColor, bodyColor, headlineFont, headlineWeight, headlineTransform, bodyFont, bodyWeight,
      bodyTransform, bgColor, headlineSizeMul, bodySizeMul, showOverlay, overlayOpacity, textBanner,
      textBannerColor, ctaColor, ctaFontColor])

  async function exportPng() {
    setExporting(true)
    try {
      const dataUrl = await renderAtFullSize(size.w, size.h, sizeId)
      const link = document.createElement('a')
      link.download = `${brandSlug}-${templateId}-${sizeId}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      setExportToast('Downloaded creative')
      setTimeout(() => setExportToast(null), 3000)
    } catch (err) {
      console.error('Export failed:', err)
    }
    setExporting(false)
  }

  async function exportAllSizes() {
    setExportingAll(true)
    try {
      const zip = new JSZip()
      for (const s of SIZES) {
        const dataUrl = await renderAtFullSize(s.w, s.h, s.id)
        const base64 = dataUrl.split(',')[1]
        zip.file(`${brandSlug}-${templateId}-${s.id}-${s.w}x${s.h}.png`, base64, { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.download = `${brandSlug}-${templateId}-all-sizes-${Date.now()}.zip`
      link.href = URL.createObjectURL(blob)
      link.click()
      URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${SIZES.length} creatives`)
      setTimeout(() => setExportToast(null), 3000)
    } catch (err) {
      console.error('Export all failed:', err)
    }
    setExportingAll(false)
  }

  // Render template at actual dimensions, scale down to fit preview
  const maxPreviewW = 540
  const scale = maxPreviewW / size.w
  const previewW = Math.round(size.w * scale)
  const previewH = Math.round(size.h * scale)

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"
  const pillCls = (active: boolean) => ({
    className: "text-xs px-2.5 py-1 rounded-pill border transition-all duration-150 font-semibold",
    style: active
      ? { background: '#000', color: '#00ff97', borderColor: '#000' } as const
      : { borderColor: '#e0e0e0', color: '#666' } as const,
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
      {/* LEFT PANEL — Controls */}
      <div className="lg:col-span-5 space-y-4">

        {/* Row 1: Brand + Template + Size */}
        <div className="bg-paper border border-border rounded-card p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label block mb-1">Brand</label>
              <div className="relative">
                <select value={brandId} onChange={e => setBrandId(e.target.value)}
                  className={inputCls + ' pr-8 appearance-none'}>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="label block mb-1">Template</label>
              <div className="flex flex-wrap gap-1">
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setTemplateId(t.id)} {...pillCls(templateId === t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label block mb-1">Size</label>
              <div className="flex gap-1">
                {SIZES.map(s => (
                  <button key={s.id} onClick={() => setSizeId(s.id)} {...pillCls(sizeId === s.id)}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Image picker */}
        <div className="bg-paper border border-border rounded-card p-4">
          <label className="label block mb-1.5">Image</label>
          {images.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5 max-h-[120px] overflow-y-auto">
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
            <div className="flex items-center gap-2 text-xs text-muted border border-dashed border-border rounded-btn px-3 py-3 justify-center">
              <ImageIcon size={13} /> No images for this brand
            </div>
          )}
        </div>

        {/* Row 3: Copy */}
        <div className="bg-paper border border-border rounded-card p-4 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <label className="label">Copy</label>
            <button onClick={generateCopy} disabled={generating}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill bg-black text-accent hover:opacity-80 transition-opacity disabled:opacity-50">
              {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {generating ? 'Generating...' : 'AI Generate'}
            </button>
          </div>

          <input className={inputCls} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline" />
          <textarea className={inputCls + ' resize-none'} rows={2} value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="Body text" />
          <div className="flex items-center gap-2">
            <input className={inputCls + (showCta ? '' : ' opacity-40')} value={ctaText}
              onChange={e => setCtaText(e.target.value)} placeholder="CTA text" disabled={!showCta} />
            <button onClick={() => setShowCta(!showCta)}
              className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors flex-shrink-0 px-2">
              {showCta ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          </div>
        </div>

        {/* Row 4: Style controls — compact grid */}
        <div className="bg-paper border border-border rounded-card p-4 space-y-3">
          <label className="label">Style</label>

          {/* Text position + Overlay side by side */}
          <div className="flex gap-5">
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
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted uppercase tracking-wide">Overlay</span>
                <button onClick={() => setShowOverlay(!showOverlay)}
                  className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                  {showOverlay ? <Eye size={11} /> : <EyeOff size={11} />}
                  {showOverlay ? 'On' : 'Off'}
                </button>
              </div>
              {showOverlay && (
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={100} step={5} value={overlayOpacity}
                    onChange={e => setOverlayOpacity(parseInt(e.target.value))}
                    className="flex-1 accent-[#00ff97]" />
                  <span className="text-[11px] font-mono text-muted w-8 text-right">{overlayOpacity}%</span>
                </div>
              )}
              <div>
                <span className="text-[10px] text-muted uppercase tracking-wide block mb-1">Background</span>
                <div className="flex gap-1">
                  {brandColors.map(c => (
                    <button key={'bg-' + c.value} onClick={() => setBgColor(c.value)}
                      className="w-5 h-5 rounded-[3px] border-2 transition-all flex-shrink-0"
                      style={{ background: c.value, borderColor: bgColor === c.value ? '#000' : '#e0e0e0' }}
                      title={c.label} />
                  ))}
                </div>
              </div>
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
                  {...pillCls(textBanner === v)}>{v === 'none' ? 'Off' : v.charAt(0).toUpperCase() + v.slice(1)}</button>
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

      {/* RIGHT PANEL — Sticky preview */}
      <div className="lg:col-span-7">
        <div className="lg:sticky lg:top-4 space-y-4">
          <div className="bg-paper border border-border rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="label">Preview</div>
                <span className="text-xs text-muted">{template.label} &middot; {size.w}&times;{size.h}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportPng} disabled={exporting || exportingAll}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill border border-border transition-all hover:border-ink disabled:opacity-40"
                  style={{ color: '#000' }}>
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  PNG
                </button>
                <button onClick={exportAllSizes} disabled={exporting || exportingAll}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: '#000', color: '#00ff97' }}>
                  {exportingAll ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  All sizes
                </button>
                <span className="w-px h-4 bg-border" />
                {batchGenerating ? (
                  <button onClick={stopBatch}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill bg-ink text-paper hover:opacity-80 transition-opacity">
                    Stop ({variations.length}/{batchCount})
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    {[3, 5, 10].map(n => (
                      <button key={n} onClick={() => { setBatchCount(n); }}
                        className="text-[11px] font-semibold w-6 h-6 rounded-full border transition-all"
                        style={batchCount === n
                          ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                          : { borderColor: '#e0e0e0', color: '#999' }}>
                        {n}
                      </button>
                    ))}
                    <button onClick={generateBatch} disabled={images.length === 0}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill transition-opacity hover:opacity-80 disabled:opacity-40 ml-1"
                      style={{ background: '#00ff97', color: '#000' }}>
                      <Sparkles size={12} />
                      Generate
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start justify-center" ref={previewRef}>
              <div
                className="rounded-btn overflow-hidden border border-border shadow-sm"
                style={{ width: previewW, height: previewH }}
              >
                <div style={{ width: size.w, height: size.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                  <TemplateComponent
                    imageUrl={imageUrl}
                    headline={headline}
                    bodyText={bodyText}
                    ctaText={ctaText}
                    brandColor={brandColor}
                    brandName={brand?.name || ''}
                    width={size.w}
                    height={size.h}
                    textPosition={textPosition}
                    showCta={showCta}
                    headlineColor={headlineColor}
                    bodyColor={bodyColor}
                    headlineFont={headlineFont}
                    headlineWeight={headlineWeight}
                    headlineTransform={headlineTransform}
                    bodyFont={bodyFont}
                    bodyWeight={bodyWeight}
                    bodyTransform={bodyTransform}
                    bgColor={bgColor}
                    headlineSizeMul={headlineSizeMul}
                    bodySizeMul={bodySizeMul}
                    showOverlay={showOverlay}
                    overlayOpacity={overlayOpacity / 100}
                    textBanner={textBanner}
                    textBannerColor={textBannerColor}
                    ctaColor={ctaColor}
                    ctaFontColor={ctaFontColor}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Saved drafts */}
          {savedDrafts.length > 0 && (
            <div className="bg-paper border border-border rounded-card p-4">
              <div className="label mb-3">Saved drafts ({savedDrafts.length})</div>
              <div className="grid grid-cols-5 gap-2">
                {savedDrafts.map((d, i) => {
                  const dImg = images.find(img => img.id === d.imageId)
                  const dImgUrl = dImg ? getPublicUrl(dImg.storage_path) : null
                  const DTemplate = TEMPLATES.find(t => t.id === d.templateId)!.component
                  const thumbScale = 100 / size.w
                  return (
                    <div key={i} className="relative group">
                      <button onClick={() => loadDraft(i)}
                        className="w-full rounded-[4px] overflow-hidden border-2 transition-all hover:opacity-90"
                        style={{ borderColor: activeDraft === i ? '#00ff97' : '#e0e0e0', aspectRatio: `${size.w}/${size.h}` }}>
                        <div style={{ width: size.w, height: size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}>
                          <DTemplate imageUrl={dImgUrl} headline={d.headline} bodyText={d.body} ctaText={d.cta} brandColor={brandColor} brandName={brand?.name || ''}
                            width={size.w} height={size.h} textPosition={textPosition} showCta={showCta}
                            headlineColor={headlineColor} bodyColor={bodyColor} headlineFont={headlineFont} headlineWeight={headlineWeight}
                            headlineTransform={headlineTransform} bodyFont={bodyFont} bodyWeight={bodyWeight} bodyTransform={bodyTransform}
                            bgColor={bgColor} headlineSizeMul={headlineSizeMul} bodySizeMul={bodySizeMul}
                            showOverlay={showOverlay} overlayOpacity={overlayOpacity / 100} textBanner={textBanner} textBannerColor={textBannerColor} ctaColor={ctaColor} ctaFontColor={ctaFontColor} />
                        </div>
                      </button>
                      <button onClick={() => removeDraft(i)}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger">
                        <X size={10} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Variations strip */}
          {variations.length > 0 && (
            <div className="bg-paper border border-border rounded-card p-4">
              <div className="label mb-3">Generated ({variations.length})</div>
              <div className="grid grid-cols-5 gap-2">
                {variations.map((v, i) => {
                  const vImg = images.find(img => img.id === v.imageId)
                  const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
                  const VTemplate = TEMPLATES.find(t => t.id === v.templateId)!.component
                  const thumbScale = 100 / size.w
                  const isSaved = savedDrafts.some(d => d.headline === v.headline && d.imageId === v.imageId)
                  return (
                    <div key={i} className="relative group">
                      <button onClick={() => loadVariation(i)}
                        className="w-full rounded-[4px] overflow-hidden border-2 transition-all hover:opacity-90"
                        style={{ borderColor: activeVariation === i ? '#00ff97' : '#e0e0e0', aspectRatio: `${size.w}/${size.h}` }}>
                        <div style={{ width: size.w, height: size.h, transform: `scale(${thumbScale})`, transformOrigin: 'top left' }}>
                          <VTemplate imageUrl={vImgUrl} headline={v.headline} bodyText={v.body} ctaText={v.cta} brandColor={brandColor} brandName={brand?.name || ''}
                            width={size.w} height={size.h} textPosition={textPosition} showCta={showCta}
                            headlineColor={headlineColor} bodyColor={bodyColor} headlineFont={headlineFont} headlineWeight={headlineWeight}
                            headlineTransform={headlineTransform} bodyFont={bodyFont} bodyWeight={bodyWeight} bodyTransform={bodyTransform}
                            bgColor={bgColor} headlineSizeMul={headlineSizeMul} bodySizeMul={bodySizeMul}
                            showOverlay={showOverlay} overlayOpacity={overlayOpacity / 100} textBanner={textBanner} textBannerColor={textBannerColor} ctaColor={ctaColor} ctaFontColor={ctaFontColor} />
                        </div>
                      </button>
                      <button onClick={() => saveVariationAsDraft(i)}
                        className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full transition-all hover:scale-110 ${isSaved ? '' : 'opacity-0 group-hover:opacity-100'}`}
                        style={{ background: isSaved ? '#00ff97' : 'rgba(0,0,0,0.6)', color: isSaved ? '#000' : '#fff' }}>
                        <Bookmark size={10} fill={isSaved ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden off-screen container for full-resolution PNG export */}
      <div
        ref={exportRef}
        aria-hidden
        style={{ position: 'fixed', left: '-9999px', top: 0, overflow: 'hidden', pointerEvents: 'none' }}
      />

      {/* Export toast */}
      {exportToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-pill shadow-lg animate-in fade-in slide-in-from-bottom-4"
          style={{ background: '#000', color: '#00ff97' }}>
          <Check size={14} />
          {exportToast}
        </div>
      )}
    </div>
  )
}
