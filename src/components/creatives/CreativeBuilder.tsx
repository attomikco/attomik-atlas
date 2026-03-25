'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandImage } from '@/types'
import { ChevronDown, ImageIcon, Check } from 'lucide-react'
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
  const [copySource, setCopySource] = useState<'manual' | 'generated'>('manual')

  const previewRef = useRef<HTMLDivElement>(null)

  const brand = brands.find(b => b.id === brandId)
  const brandColor = brand?.primary_color || '#00ff97'
  const size = SIZES.find(s => s.id === sizeId)!
  const template = TEMPLATES.find(t => t.id === templateId)!
  const TemplateComponent = template.component

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
        <div>
          <label className="label block mb-1.5">CTA</label>
          <input className={inputCls} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Shop Now" />
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
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
