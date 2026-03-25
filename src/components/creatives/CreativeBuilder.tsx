'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage, FontStyle } from '@/types'
import { ChevronDown, ImageIcon, Check, Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react'
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
  const [headlineColor, setHeadlineColor] = useState<string>('#ffffff')
  const [bodyColor, setBodyColor] = useState<string>('#ffffff')
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

  const previewRef = useRef<HTMLDivElement>(null)

  const brand = brands.find(b => b.id === brandId)
  const brandColor = brand?.primary_color || '#00ff97'
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
    const fonts = [brand?.font_primary, brand?.font_secondary].filter(Boolean) as string[]
    if (fonts.length === 0) return
    const families = fonts.map(f => f.replace(/ /g, '+')).join('&family=')
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
    const h = brand?.font_heading
    const b = brand?.font_body
    setHeadlineFont(h?.family || brand?.font_primary || '')
    setHeadlineWeight(h?.weight || '700')
    setHeadlineTransform(h?.transform || 'none')
    setBodyFont(b?.family || brand?.font_secondary || brand?.font_primary || '')
    setBodyWeight(b?.weight || '400')
    setBodyTransform(b?.transform || 'none')
    setBgColor(brand?.primary_color || '#000000')
    setTextBannerColor(brand?.primary_color || '#000000')
  }, [brandId])

  // Load brand images + recent copy when brand changes
  useEffect(() => {
    if (!brandId) return
    setSelectedImageId(null)

    supabase
      .from('brand_images')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at')
      .then(({ data }) => setImages(data ?? []))

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

  const selectedImage = images.find(i => i.id === selectedImageId)
  const imageUrl = selectedImage ? getPublicUrl(selectedImage.storage_path) : null

  // Scale preview to fit container
  const maxPreviewW = 480
  const scale = Math.min(maxPreviewW / size.w, 1)
  const previewW = size.w * scale
  const previewH = size.h * scale

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
                  {brand?.font_primary && <option value={brand.font_primary}>{brand.font_primary}</option>}
                  {brand?.font_secondary && <option value={brand.font_secondary}>{brand.font_secondary}</option>}
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
        <div className="lg:sticky lg:top-4">
          <div className="bg-paper border border-border rounded-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="label">Preview</div>
              <span className="text-xs text-muted">{template.label} &middot; {size.w}&times;{size.h}</span>
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
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
