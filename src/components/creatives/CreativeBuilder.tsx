'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage } from '@/types'
import { ChevronDown, ImageIcon, Check, Eye, EyeOff } from 'lucide-react'
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
  { id: 'feed',      label: 'Feed 1:1',        w: 1080, h: 1080 },
  { id: 'stories',   label: 'Stories 9:16',     w: 1080, h: 1920 },
  { id: 'landscape', label: 'Landscape 1.91:1', w: 1200, h: 628 },
  { id: 'square45',  label: 'Square 4:5',       w: 1080, h: 1350 },
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
  const [bgColor, setBgColor] = useState<string>('#ffffff')
  const [headlineSizeMul, setHeadlineSizeMul] = useState(1)
  const [bodySizeMul, setBodySizeMul] = useState(1)
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(50)
  const [copySource, setCopySource] = useState<'manual' | 'generated'>('manual')

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
    setHeadlineFont(brand?.font_primary || '')
    setBodyFont(brand?.font_secondary || brand?.font_primary || '')
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

  const selectedImage = images.find(i => i.id === selectedImageId)
  const imageUrl = selectedImage ? getPublicUrl(selectedImage.storage_path) : null

  // Scale preview to fit container
  const maxPreviewW = 520
  const scale = Math.min(maxPreviewW / size.w, 1)
  const previewW = size.w * scale
  const previewH = size.h * scale

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
      {/* LEFT PANEL — Controls */}
      <div className="lg:col-span-2 space-y-5">
        {/* Brand selector */}
        <div>
          <label className="label block mb-1.5">Brand</label>
          <div className="relative">
            <select
              value={brandId}
              onChange={e => setBrandId(e.target.value)}
              className={inputCls + ' pr-8 appearance-none'}
            >
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Image picker */}
        <div>
          <label className="label block mb-1.5">Image</label>
          {images.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto rounded-btn border border-border p-1.5 bg-cream">
              {images.map(img => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageId(img.id === selectedImageId ? null : img.id)}
                  className="relative aspect-square rounded-[4px] overflow-hidden border-2 transition-all"
                  style={{ borderColor: img.id === selectedImageId ? brandColor : 'transparent' }}
                >
                  <img src={getPublicUrl(img.storage_path)} alt={img.file_name} className="w-full h-full object-cover" />
                  {img.id === selectedImageId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted border border-dashed border-border rounded-btn px-3 py-4 justify-center">
              <ImageIcon size={14} />
              No images uploaded for this brand
            </div>
          )}
        </div>

        {/* Copy source */}
        <div>
          <label className="label block mb-1.5">Copy source</label>
          <div className="flex gap-1.5 mb-3">
            {(['manual', 'generated'] as const).map(src => (
              <button
                key={src}
                onClick={() => setCopySource(src)}
                className="text-xs px-2.5 py-1 rounded-pill border transition-all duration-150 font-semibold"
                style={copySource === src
                  ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                  : { borderColor: '#e0e0e0', color: '#666' }}
              >
                {src === 'manual' ? 'Write manually' : 'From generated'}
              </button>
            ))}
          </div>

          {copySource === 'generated' && recentCopy.length > 0 && (
            <div className="max-h-[180px] overflow-y-auto space-y-1.5 mb-3">
              {recentCopy.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    // Parse content — try to pull headline and body from it
                    const lines = c.content.split('\n').filter(Boolean)
                    if (lines.length >= 2) {
                      setHeadline(lines[0].slice(0, 60))
                      setBodyText(lines.slice(1).join(' ').slice(0, 200))
                    } else {
                      setHeadline(c.content.slice(0, 60))
                      setBodyText('')
                    }
                  }}
                  className="w-full text-left bg-cream hover:bg-[#e8e8e8] rounded-btn px-3 py-2 transition-colors"
                >
                  <div className="text-[10px] text-muted uppercase tracking-wide mb-0.5">{c.type}</div>
                  <div className="text-xs line-clamp-2">{c.content}</div>
                </button>
              ))}
            </div>
          )}
          {copySource === 'generated' && recentCopy.length === 0 && (
            <p className="text-xs text-muted mb-3">No generated copy yet for this brand.</p>
          )}
        </div>

        {/* Text fields */}
        <div>
          <label className="label block mb-1.5">Headline</label>
          <input className={inputCls} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Main headline" />
        </div>
        <div>
          <label className="label block mb-1.5">Body text</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={bodyText} onChange={e => setBodyText(e.target.value)} placeholder="Supporting copy" />
        </div>

        {/* CTA with toggle */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label">CTA button</label>
            <button
              onClick={() => setShowCta(!showCta)}
              className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
            >
              {showCta ? <Eye size={12} /> : <EyeOff size={12} />}
              {showCta ? 'Visible' : 'Hidden'}
            </button>
          </div>
          {showCta && (
            <input className={inputCls} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Shop Now" />
          )}
        </div>

        {/* Text position */}
        <div>
          <label className="label block mb-1.5">Text position</label>
          <div className="grid grid-cols-3 gap-1 w-[140px]">
            {(['top-left', 'top-center', 'top-right', 'center', 'center', 'center', 'bottom-left', 'bottom-center', 'bottom-right'] as TextPosition[]).map((pos, i) => {
              // center row: only the middle cell is "center"
              if ((i === 3 || i === 5)) return <div key={i} />
              return (
                <button
                  key={pos + i}
                  onClick={() => setTextPosition(pos)}
                  className="w-full aspect-square rounded-[4px] border transition-all"
                  style={textPosition === pos
                    ? { background: '#000', borderColor: '#000' }
                    : { background: '#f2f2f2', borderColor: '#e0e0e0' }}
                  title={pos}
                />
              )
            })}
          </div>
        </div>

        {/* Font & color controls */}
        <div>
          <label className="label block mb-1.5">Fonts & colors</label>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted uppercase tracking-wide w-16 flex-shrink-0">Headline</span>
              <select
                value={headlineFont}
                onChange={e => setHeadlineFont(e.target.value)}
                className={inputCls + ' !py-1.5 pr-6 appearance-none text-xs'}
              >
                <option value="">Default (Barlow)</option>
                {brand?.font_primary && <option value={brand.font_primary}>{brand.font_primary}</option>}
                {brand?.font_secondary && <option value={brand.font_secondary}>{brand.font_secondary}</option>}
              </select>
              <div className="flex gap-1 flex-shrink-0">
                {brandColors.map(c => (
                  <button
                    key={'h-' + c.value}
                    onClick={() => setHeadlineColor(c.value)}
                    className="w-6 h-6 rounded-[4px] border-2 transition-all flex-shrink-0"
                    style={{ background: c.value, borderColor: headlineColor === c.value ? '#000' : '#e0e0e0' }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted uppercase tracking-wide w-16 flex-shrink-0">Body</span>
              <select
                value={bodyFont}
                onChange={e => setBodyFont(e.target.value)}
                className={inputCls + ' !py-1.5 pr-6 appearance-none text-xs'}
              >
                <option value="">Default (Barlow)</option>
                {brand?.font_primary && <option value={brand.font_primary}>{brand.font_primary}</option>}
                {brand?.font_secondary && <option value={brand.font_secondary}>{brand.font_secondary}</option>}
              </select>
              <div className="flex gap-1 flex-shrink-0">
                {brandColors.map(c => (
                  <button
                    key={'b-' + c.value}
                    onClick={() => setBodyColor(c.value)}
                    className="w-6 h-6 rounded-[4px] border-2 transition-all flex-shrink-0"
                    style={{ background: c.value, borderColor: bodyColor === c.value ? '#000' : '#e0e0e0' }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Background color */}
        <div>
          <label className="label block mb-1.5">Background color</label>
          <p className="text-[10px] text-muted mb-2">For text panels in Split, Testimonial, etc.</p>
          <div className="flex gap-1.5">
            {brandColors.map(c => (
              <button
                key={'bg-' + c.value}
                onClick={() => setBgColor(c.value)}
                className="w-7 h-7 rounded-[4px] border-2 transition-all flex-shrink-0"
                style={{ background: c.value, borderColor: bgColor === c.value ? '#000' : '#e0e0e0' }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Image overlay */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label">Image overlay</label>
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors"
            >
              {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
              {showOverlay ? 'On' : 'Off'}
            </button>
          </div>
          {showOverlay && (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={overlayOpacity}
                onChange={e => setOverlayOpacity(parseInt(e.target.value))}
                className="flex-1 accent-[#00ff97]"
              />
              <span className="text-xs font-mono text-muted w-10 text-right">{overlayOpacity}%</span>
            </div>
          )}
        </div>

        {/* Font sizes */}
        <div>
          <label className="label block mb-1.5">Font sizes</label>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted uppercase tracking-wide w-16 flex-shrink-0">Headline</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={headlineSizeMul}
                onChange={e => setHeadlineSizeMul(parseFloat(e.target.value))}
                className="flex-1 accent-[#00ff97]"
              />
              <span className="text-xs font-mono text-muted w-10 text-right">{Math.round(headlineSizeMul * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted uppercase tracking-wide w-16 flex-shrink-0">Body</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={bodySizeMul}
                onChange={e => setBodySizeMul(parseFloat(e.target.value))}
                className="flex-1 accent-[#00ff97]"
              />
              <span className="text-xs font-mono text-muted w-10 text-right">{Math.round(bodySizeMul * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Template selector */}
        <div>
          <label className="label block mb-1.5">Template</label>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className="text-xs px-2.5 py-1 rounded-pill border transition-all duration-150 font-semibold"
                style={templateId === t.id
                  ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                  : { borderColor: '#e0e0e0', color: '#666' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size selector */}
        <div>
          <label className="label block mb-1.5">Platform size</label>
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map(s => (
              <button
                key={s.id}
                onClick={() => setSizeId(s.id)}
                className="text-xs px-2.5 py-1 rounded-pill border transition-all duration-150 font-semibold"
                style={sizeId === s.id
                  ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                  : { borderColor: '#e0e0e0', color: '#666' }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-1.5">{size.w} &times; {size.h}px</p>
        </div>
      </div>

      {/* RIGHT PANEL — Live preview */}
      <div className="lg:col-span-3">
        <div className="bg-paper border border-border rounded-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="label">Preview</div>
            <span className="text-xs text-muted">{template.label} &middot; {size.label}</span>
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
                  bodyFont={bodyFont}
                  bgColor={bgColor}
                  headlineSizeMul={headlineSizeMul}
                  bodySizeMul={bodySizeMul}
                  showOverlay={showOverlay}
                  overlayOpacity={overlayOpacity / 100}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
