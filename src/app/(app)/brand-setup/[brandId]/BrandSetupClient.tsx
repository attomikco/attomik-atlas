'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brand, BrandImage } from '@/types'

const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Nunito',
  'DM Sans', 'Outfit', 'Plus Jakarta Sans', 'Sora', 'Jost', 'Mulish', 'Karla',
  'Space Grotesk', 'Barlow', 'Oswald', 'Source Sans 3', 'Noto Sans', 'Ubuntu',
  'Quicksand', 'Cabin', 'Rubik', 'Manrope',
  'Playfair Display', 'Merriweather', 'Lora', 'Cormorant', 'Fraunces', 'Libre Baskerville',
  'EB Garamond', 'Crimson Text', 'Spectral',
  'Bebas Neue', 'Anton', 'Black Han Sans', 'Abril Fatface', 'Righteous', 'Alfa Slab One',
  'Pacifico', 'Satisfy', 'Dancing Script', 'Great Vibes', 'Lobster',
]

function TagInput({ tags, onChange, placeholder, pillColor = '#000', pillBg = '#f0f0f0' }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string; pillColor?: string; pillBg?: string }) {
  const [input, setInput] = useState('')
  const id = 'tag-inp-' + placeholder.replace(/\s/g, '-')
  return (
    <div
      style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 44, cursor: 'text' }}
      onClick={() => document.getElementById(id)?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} style={{ background: pillBg, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: pillColor }}>
          {tag}
          <span onClick={() => onChange(tags.filter((_, j) => j !== i))} style={{ cursor: 'pointer', opacity: 0.5, fontSize: 14 }}>×</span>
        </span>
      ))}
      <input
        id={id}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            e.preventDefault()
            onChange([...tags, input.trim()])
            setInput('')
          }
          if (e.key === 'Backspace' && !input && tags.length) {
            onChange(tags.slice(0, -1))
          }
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{ border: 'none', outline: 'none', fontSize: 13, minWidth: 80, flex: 1, background: 'transparent' }}
      />
    </div>
  )
}

function tryParse(s: string | null) {
  try { return s ? JSON.parse(s) : null } catch { return null }
}

export default function BrandHubClient({ brand, initialImages }: { brand: Brand; initialImages: BrandImage[] }) {
  const supabase = createClient()

  const notesData = tryParse(brand.notes)
  const businessType = notesData?.business_type || 'brand'
  const scrapedColors: string[] = notesData?.scraped_colors || []
  const offeringLabel: string = ({
    shopify: 'Products', ecommerce: 'Products',
    saas: 'Plans & Pricing', restaurant: 'Menu Items',
    service: 'Services', brand: 'Offerings',
  } as Record<string, string>)[businessType] || 'Products'

  const namePlaceholder: string = ({
    shopify: 'e.g. Afterdream Tropical',
    ecommerce: 'e.g. Afterdream Tropical',
    saas: 'e.g. Pro Plan',
    restaurant: 'e.g. Wagyu Burger',
    service: 'e.g. Brand Strategy Package',
    brand: 'e.g. Your main offering',
  } as Record<string, string>)[businessType] || 'e.g. Product name'

  const pricePlaceholder: string = ({
    shopify: '$29.99', ecommerce: '$29.99',
    saas: '$49/mo', restaurant: '$24',
    service: 'From $2,000', brand: 'Starting at...',
  } as Record<string, string>)[businessType] || '$29.99'

  const descPlaceholder: string = ({
    shopify: 'e.g. Juicy pineapple + cherry tonic',
    ecommerce: 'e.g. Juicy pineapple + cherry tonic',
    saas: 'e.g. Everything in Starter plus unlimited seats',
    restaurant: 'e.g. 8oz wagyu, truffle fries, house sauce',
    service: 'e.g. 3-month brand strategy engagement',
    brand: 'e.g. Describe your main offering',
  } as Record<string, string>)[businessType] || 'Brief description'

  const isLight = (hex: string) => {
    const c = hex.replace('#', ''); if (c.length < 6) return false
    return (parseInt(c.slice(0,2),16)*299+parseInt(c.slice(2,4),16)*587+parseInt(c.slice(4,6),16)*114)/1000 > 128
  }

  // State
  const [name, setName] = useState(brand.name)
  const [website, setWebsite] = useState(brand.website || '')
  const [mission, setMission] = useState(brand.mission || '')
  const [targetAudience, setTargetAudience] = useState(brand.target_audience || '')
  const [brandVoice, setBrandVoice] = useState(brand.brand_voice || '')
  const [toneKeywords, setToneKeywords] = useState<string[]>(brand.tone_keywords || [])
  const [avoidWords, setAvoidWords] = useState<string[]>(brand.avoid_words || [])
  const [neverWords, setNeverWords] = useState<string[]>(tryParse(brand.notes)?.never_words || [])
  const [klaviyoKey, setKlaviyoKey] = useState(tryParse(brand.notes)?.klaviyo_api_key || '')
  const [metaToken, setMetaToken] = useState(tryParse(brand.notes)?.meta_access_token || '')
  const [metaAdAccountId, setMetaAdAccountId] = useState(tryParse(brand.notes)?.meta_ad_account_id || '')
  const [metaTokenSavedAt, setMetaTokenSavedAt] = useState(tryParse(brand.notes)?.meta_token_saved_at || null)
  const [colors, setColors] = useState<Array<{ label: string; value: string }>>(() => {
    const base = [
      { label: 'Primary', value: brand.primary_color || '#000000' },
      { label: 'Secondary', value: brand.secondary_color || '#ffffff' },
      { label: 'Accent', value: brand.accent_color || '#00ff97' },
      { label: 'Light Background', value: brand.bg_base || '#f8f7f4' },
    ]
    const extra = tryParse(brand.notes)?.extra_colors || []
    return [...base, ...extra]
  })
  const headingFamily = brand.font_heading?.family || brand.font_primary?.split('|')[0] || ''
  const bodyFamily = brand.font_body?.family || brand.font_secondary?.split('|')[0] || headingFamily
  const [fonts, setFonts] = useState<Array<{ label: string; family: string; weight: string; transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize' }>>([
    { label: 'Heading', family: headingFamily, weight: brand.font_heading?.weight || '700', transform: brand.font_heading?.transform || 'none' },
    { label: 'Body', family: bodyFamily, weight: brand.font_body?.weight || '400', transform: brand.font_body?.transform || 'none' },
  ])
  // Text-on colors: auto-derive from luminance, allow override
  const autoTextOn = (hex: string) => isLight(hex) ? '#000000' : '#ffffff'
  const [textOnPrimary, setTextOnPrimary] = useState(brand.text_on_dark || autoTextOn(brand.primary_color || '#000000'))
  const [textOnSecondary, setTextOnSecondary] = useState(brand.text_on_base || autoTextOn(brand.secondary_color || '#ffffff'))
  const [textOnAccent, setTextOnAccent] = useState(brand.text_on_accent || autoTextOn(brand.accent_color || '#00ff97'))

  const [logoDark, setLogoDark] = useState(brand.logo_url || '')
  const [logoLight, setLogoLight] = useState(tryParse(brand.notes)?.logo_url_light || '')
  const [defaultCta, setDefaultCta] = useState(tryParse(brand.notes)?.default_cta || brand.default_cta || 'Shop Now')
  const [products, setProducts] = useState<Array<{ name: string; description: string; price: string; image: string | null }>>(
    brand.products?.map((p: any) => ({
      name: p.name || '',
      description: p.description || '',
      price: p.price_range || p.price || '',
      image: p.image || null,
    })) || [{ name: '', description: '', price: '', image: null }]
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [images, setImages] = useState<BrandImage[]>(initialImages)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState<'dark' | 'light' | null>(null)
  const [generatingVoice, setGeneratingVoice] = useState(false)
  const [aiPrefilled, setAiPrefilled] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [fontDropdownOpen, setFontDropdownOpen] = useState<number | null>(null)
  const [fontSearch, setFontSearch] = useState('')
  const [openColorPicker, setOpenColorPicker] = useState<number | null>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setOpenColorPicker(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initialRef = useRef({
    name: brand.name, website: brand.website || '', mission: brand.mission || '',
    targetAudience: brand.target_audience || '', brandVoice: brand.brand_voice || '',
    toneKeywords: JSON.stringify(brand.tone_keywords || []), avoidWords: JSON.stringify(brand.avoid_words || []),
    neverWords: JSON.stringify(tryParse(brand.notes)?.never_words || []),
    defaultCta: tryParse(brand.notes)?.default_cta || 'Shop Now',
    colors: JSON.stringify(colors), fonts: JSON.stringify(fonts),
    products: JSON.stringify(brand.products?.map((p: any) => ({ name: p.name || '', description: p.description || '', price: p.price_range || p.price || '', image: p.image || null })) || [{ name: '', description: '', price: '', image: null }]),
  })

  useEffect(() => {
    const i = initialRef.current
    const dirty = name !== i.name || website !== i.website || mission !== i.mission ||
      targetAudience !== i.targetAudience || brandVoice !== i.brandVoice || defaultCta !== i.defaultCta ||
      JSON.stringify(toneKeywords) !== i.toneKeywords || JSON.stringify(avoidWords) !== i.avoidWords ||
      JSON.stringify(neverWords) !== i.neverWords || JSON.stringify(colors) !== i.colors ||
      JSON.stringify(fonts) !== i.fonts || JSON.stringify(products) !== i.products
    setIsDirty(dirty)
  }, [name, website, mission, targetAudience, brandVoice, toneKeywords, avoidWords, neverWords, defaultCta, colors, fonts, products])

  function updateColor(index: number, value: string) {
    setColors(prev => prev.map((c, i) => i === index ? { ...c, value } : c))
    // Auto-update text-on color when brand color changes
    if (index === 0) setTextOnPrimary(autoTextOn(value))
    if (index === 1) setTextOnSecondary(autoTextOn(value))
    if (index === 2) setTextOnAccent(autoTextOn(value))
  }
  function updateColorLabel(index: number, label: string) { setColors(prev => prev.map((c, i) => i === index ? { ...c, label } : c)) }
  function addColor() { setColors(prev => [...prev, { label: `Color ${prev.length + 1}`, value: '#000000' }]) }
  function removeColor(index: number) { if (colors.length <= 1) return; setColors(prev => prev.filter((_, i) => i !== index)) }

  function updateFont(index: number, family: string) {
    setFonts(prev => prev.map((f, i) => i === index ? { ...f, family } : f))
    if (family && typeof document !== 'undefined') {
      const id = `gfont-${family.replace(/\s/g, '-')}`
      if (!document.getElementById(id)) {
        const link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;700;900&display=swap`
        document.head.appendChild(link)
      }
    }
  }
  function addFont() { setFonts(prev => [...prev, { label: `Font ${prev.length + 1}`, family: '', weight: '400', transform: 'none' }]) }
  function removeFont(index: number) { if (fonts.length <= 1) return; setFonts(prev => prev.filter((_, i) => i !== index)) }

  function updateProduct(index: number, field: string, value: string) {
    setProducts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }
  function addProduct() {
    setProducts(prev => [...prev, { name: '', description: '', price: '', image: null }])
  }
  function removeProduct(index: number) {
    if (products.length === 1) return
    setProducts(prev => prev.filter((_, i) => i !== index))
  }

  // Build image URLs
  useEffect(() => {
    setImageUrls(images.map(img => {
      const cleanPath = img.storage_path.replace(/^brand-images\//, '')
      return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
    }))
  }, [images])

  // Load Google Fonts for all font entries
  useEffect(() => {
    fonts.forEach(f => {
      if (!f.family) return
      const link = document.createElement('link'); link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, '+')}:wght@400;700;800;900&display=swap`
      document.head.appendChild(link)
    })
  }, [])

  // Auto-generate voice if fields are empty
  useEffect(() => {
    const isEmpty = !brand.mission && !brand.target_audience && !brand.brand_voice
    if (isEmpty && brand.website) generateVoice()
    // Show banner if fields came pre-filled
    if (brand.mission || brand.target_audience || brand.brand_voice) {
      const hasSeenBrand = sessionStorage.getItem(`brand-seen-${brand.id}`)
      if (!hasSeenBrand) { setAiPrefilled(true); sessionStorage.setItem(`brand-seen-${brand.id}`, '1') }
    }
  }, [])

  const [voiceError, setVoiceError] = useState('')
  async function generateVoice() {
    setGeneratingVoice(true)
    setVoiceError('')
    try {
      const res = await fetch(`/api/brands/${brand.id}/generate-voice`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setVoiceError(err.error || `Failed (${res.status})`)
        setGeneratingVoice(false)
        return
      }
      const data = await res.json()
      if (data.voice) {
        if (data.voice.mission) setMission(data.voice.mission)
        if (data.voice.target_audience) setTargetAudience(data.voice.target_audience)
        if (data.voice.brand_voice) setBrandVoice(data.voice.brand_voice)
        if (data.voice.tone_keywords?.length) setToneKeywords(data.voice.tone_keywords)
        if (data.voice.avoid_words?.length) setAvoidWords(data.voice.avoid_words)
        setAiPrefilled(true)
      } else {
        setVoiceError('No voice data returned')
      }
    } catch (err) {
      console.error('generateVoice failed:', err)
      setVoiceError('Network error — check console')
    }
    setGeneratingVoice(false)
  }

  async function saveAll() {
    setSaving(true)
    setSaved(false)
    const savedProducts = products.filter(p => p.name.trim()).map(p => ({
      name: p.name.trim(), description: p.description.trim() || null, price_range: p.price.trim() || null, image: p.image || null,
    }))
    const { error } = await supabase.from('brands').update({
      name, website: website || null, mission: mission || null,
      target_audience: targetAudience || null, brand_voice: brandVoice || null,
      tone_keywords: toneKeywords.length ? toneKeywords : null,
      avoid_words: avoidWords.length ? avoidWords : null,
      primary_color: colors[0]?.value || null, secondary_color: colors[1]?.value || null, accent_color: colors[2]?.value || null, bg_base: colors[3]?.value || null,
      text_on_dark: textOnPrimary, text_on_base: textOnSecondary, text_on_accent: textOnAccent,
      font_primary: fonts[0]?.family ? `${fonts[0].family}|${fonts[0].weight}|none` : null,
      font_secondary: fonts[1]?.family ? `${fonts[1].family}|${fonts[1].weight || '400'}|none` : null,
      font_heading: fonts[0]?.family ? { family: fonts[0].family, weight: fonts[0].weight || '700', transform: fonts[0].transform || 'none', letterSpacing: 'normal' } : null,
      font_body: fonts[1]?.family ? { family: fonts[1].family, weight: fonts[1].weight || '400', transform: fonts[1].transform || 'none', letterSpacing: 'normal' } : null,
      logo_url: logoDark || null,
      notes: JSON.stringify({
        ...tryParse(brand.notes),
        logo_url_light: logoLight || null,
        never_words: neverWords.length ? neverWords : null,
        extra_colors: colors.slice(4).map(c => ({ label: c.label, value: c.value })),
        klaviyo_api_key: klaviyoKey || null,
        default_cta: defaultCta || null,
        meta_access_token: metaToken || null,
        meta_ad_account_id: metaAdAccountId || null,
        meta_token_saved_at: metaToken ? (metaTokenSavedAt || new Date().toISOString()) : null,
      }),
      products: savedProducts.length ? savedProducts : null,
    }).eq('id', brand.id)
    setSaving(false)
    if (error) { console.error('Brand save failed:', error); return }
    setSaved(true)
    setIsDirty(false)
    initialRef.current = { name, website, mission, targetAudience, brandVoice, defaultCta, toneKeywords: JSON.stringify(toneKeywords), avoidWords: JSON.stringify(avoidWords), neverWords: JSON.stringify(neverWords), colors: JSON.stringify(colors), fonts: JSON.stringify(fonts), products: JSON.stringify(products) }
    setTimeout(() => setSaved(false), 3000)
  }

  async function makeWhiteLogo(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('no ctx')); return }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        // Convert all non-transparent pixels to white, preserve alpha
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 10) {
            data[i] = 255
            data[i + 1] = 255
            data[i + 2] = 255
          }
        }
        ctx.putImageData(imageData, 0, 0)
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url)
          if (blob) resolve(blob); else reject(new Error('toBlob failed'))
        }, 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')) }
      img.src = url
    })
  }

  async function uploadToStorage(path: string, body: Blob | File, contentType: string): Promise<string | null> {
    const { error } = await supabase.storage.from('brand-assets').upload(path, body, { contentType, upsert: true })
    if (!error) return supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl
    const { error: error2 } = await supabase.storage.from('brand-images').upload(`logos/${path}`, body, { contentType, upsert: true })
    if (error2) return null
    return supabase.storage.from('brand-images').getPublicUrl(`logos/${path}`).data.publicUrl
  }

  async function uploadLogo(file: File, variant: 'dark' | 'light') {
    const ext = file.name.split('.').pop() || 'png'
    const path = `${brand.id}/logo_${variant}.${ext}`
    const url = await uploadToStorage(path, file, file.type)
    if (!url) return

    if (variant === 'dark') {
      setLogoDark(url)
      // Auto-generate a white version from the uploaded color logo
      let whiteUrl: string | null = null
      try {
        const whiteBlob = await makeWhiteLogo(file)
        whiteUrl = await uploadToStorage(`${brand.id}/logo_light.png`, whiteBlob, 'image/png')
      } catch {}
      const prevNotes = tryParse(brand.notes) || {}
      const nextNotes = whiteUrl ? { ...prevNotes, logo_url_light: whiteUrl } : prevNotes
      await supabase.from('brands').update({
        logo_url: url,
        ...(whiteUrl ? { notes: JSON.stringify(nextNotes) } : {}),
      }).eq('id', brand.id)
      if (whiteUrl) setLogoLight(whiteUrl)
    } else {
      setLogoLight(url)
      await supabase.from('brands').update({ notes: JSON.stringify({ ...tryParse(brand.notes), logo_url_light: url }) }).eq('id', brand.id)
    }
  }

  async function handleImageUpload(files: File[], tag: 'product' | 'lifestyle') {
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${brand.id}/${tag}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('brand-images').upload(path, file, { contentType: file.type })
      if (!error) {
        const { data: inserted } = await supabase.from('brand_images').insert({ brand_id: brand.id, file_name: file.name, storage_path: path, mime_type: file.type, tag }).select().single()
        if (inserted) setImages(prev => [...prev, inserted as BrandImage])
      }
    }
    setUploading(false)
  }

  function getImageUrl(img: BrandImage) {
    const cleanPath = img.storage_path.replace(/^brand-images\//, '')
    return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
  }

  async function removeImageById(id: string) {
    await supabase.from('brand_images').delete().eq('id', id)
    setImages(prev => prev.filter(img => img.id !== id))
  }

  async function uploadProductImage(file: File, productIndex: number): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${brand.id}/product_${productIndex}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('brand-images').upload(path, file, { contentType: file.type })
    if (error) return null
    const { data } = supabase.storage.from('brand-images').getPublicUrl(path)
    const { data: inserted } = await supabase.from('brand_images').insert({ brand_id: brand.id, file_name: file.name, storage_path: path, mime_type: file.type, tag: 'product' as const }).select().single()
    if (inserted) setImages(prev => [...prev, inserted as BrandImage])
    return data.publicUrl
  }

  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }
  const inputStyle: React.CSSProperties = { border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '11px 14px', fontSize: 14, width: '100%', outline: 'none', color: '#000', background: '#fff' }
  const helperStyle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', marginTop: 4 }

  function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 400 }}>{subtitle}</div>
        </div>
        {action}
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', paddingBottom: isDirty ? 80 : 32, maxWidth: 800, margin: '0 auto', background: 'var(--cream, #f8f7f4)', color: 'var(--ink, #1a1a1a)', minHeight: '100vh' }}>

      {/* Brand banner */}
      {(() => {
        const pc = colors[0]?.value || brand.primary_color || '#000'
        const light = isLight(pc)
        const textOn = light ? '#000' : '#fff'
        const textSub = light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)'
        const textMid = light ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'
        const border = light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'
        const divider = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'
        const ghost = light ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
        return (
          <div style={{ borderRadius: 16, background: pc, padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, position: 'relative', overflow: 'hidden', flexWrap: 'wrap' }}>
            {/* Left: logo + name + url */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
              {logoDark ? (
                <img src={light ? logoDark : (logoLight || logoDark)} style={{ height: 40, width: 'auto', maxWidth: 100, objectFit: 'contain', filter: light ? 'none' : (logoLight ? 'none' : 'brightness(0) invert(1)') }} alt={name} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: 10, background: ghost, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, color: textOn, flexShrink: 0 }}>
                  {name[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, color: textOn, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1 }}>{name || brand.name}</div>
                <div style={{ fontSize: 11, color: textSub, marginTop: 3 }}>{website?.replace(/https?:\/\//, '') || brand.website?.replace(/https?:\/\//, '') || '—'}</div>
              </div>
            </div>
            {/* Right: colors + font */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {colors.slice(0, 3).filter(c => c.value).map((c, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c.value, border: '3px solid #fff', flexShrink: 0 }} title={c.label} />
                ))}
              </div>
              {fonts[0]?.family && (
                <>
                  <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1 }}>Font</div>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, fontFamily: `${fonts[0].family}, sans-serif`, lineHeight: 1.2, marginTop: 2 }}>{fonts[0].family}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Brand Hub</div>
        <div style={{ background: 'rgba(0,255,151,0.08)', border: '1px solid rgba(0,255,151,0.2)', borderRadius: 10, padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ color: '#00ff97', fontSize: 14 }}>✦</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>The more you fill in, the better your creatives get.</span>
        </div>
      </div>

      {/* ── BRAND KNOWLEDGE SUMMARY ── */}
      {(brand.mission || brand.brand_voice || brand.target_audience) && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--ink)', marginBottom: 4 }}>What Attomik knows about {brand.name}</div>
            {aiPrefilled && <div style={{ fontSize: 14, color: '#00a86b', fontWeight: 700 }}>✦ AI-generated from your website</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {brand.mission && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>What you do</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5 }}>{brand.mission}</div>
              </div>
            )}
            {brand.target_audience && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Who buys from you</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5 }}>{brand.target_audience}</div>
              </div>
            )}
            {brand.brand_voice && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>How you sound</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5 }}>{brand.brand_voice}</div>
              </div>
            )}
            {brand.tone_keywords && brand.tone_keywords.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Tone</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {brand.tone_keywords.map((kw: string, i: number) => (
                    <span key={i} style={{ fontSize: 12, fontWeight: 600, color: '#00a86b', background: 'rgba(0,255,151,0.08)', border: '1px solid rgba(0,255,151,0.2)', padding: '3px 10px', borderRadius: 999 }}>{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SECTION 1: IDENTITY ── */}
      <SectionHeader title="Identity" subtitle="Basic brand info" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Brand name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Website</label>
          <input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
      </div>

      {/* Logo */}
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Logo</label>
        <div className="logo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          <style>{`@media(max-width:768px){.logo-grid{gridTemplateColumns:1fr !important;grid-template-columns:1fr !important}}`}</style>
          {/* Color logo */}
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
              Color logo <span style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>for light backgrounds</span>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 110, borderRadius: 12, border: '2px dashed var(--border)', background: '#fff', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s', position: 'relative' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              {uploadingLogo === 'dark' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #eee', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Uploading...</span>
                </div>
              ) : logoDark ? (
                <>
                  <img src={logoDark} style={{ maxHeight: 60, maxWidth: '80%', objectFit: 'contain' }} alt="Color logo" />
                  <span style={{ position: 'absolute', bottom: 6, fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>Click to replace</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 24, color: 'var(--muted)', marginBottom: 4 }}>+</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Upload logo</span>
                </>
              )}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadingLogo('dark'); uploadLogo(f, 'dark').finally(() => setUploadingLogo(null)) } }} />
            </label>
          </div>

          {/* White logo */}
          <div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
              White logo <span style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>auto-generated, upload to override</span>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 110, borderRadius: 12, border: '2px dashed #d0d0d0', background: logoLight ? 'repeating-conic-gradient(#e0e0e0 0% 25%, #f5f5f5 0% 50%) 0 0 / 16px 16px' : '#f0f0f0', cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.15s', position: 'relative' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#d0d0d0')}>
              {uploadingLogo === 'light' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #ddd', borderTopColor: '#666', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 11, color: '#999' }}>Uploading...</span>
                </div>
              ) : logoLight ? (
                <>
                  <img src={logoLight} style={{ maxHeight: 60, maxWidth: '80%', objectFit: 'contain' }} alt="White logo" />
                  <span style={{ position: 'absolute', bottom: 6, fontSize: 10, color: '#666', fontWeight: 600 }}>Click to replace</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 24, color: '#999', marginBottom: 4 }}>+</span>
                  <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>Upload white logo</span>
                </>
              )}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadingLogo('light'); uploadLogo(f, 'light').finally(() => setUploadingLogo(null)) } }} />
            </label>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
          Color logo used on landing pages and light backgrounds. White logo used on dark ad creatives and overlays.
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 2: COLORS & FONT ── */}
      <SectionHeader title="Colors & Font" subtitle="Visual identity" />

      {/* Colors */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Brand colors</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {colors.map((color, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Swatch with popup picker */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div onClick={() => setOpenColorPicker(openColorPicker === index ? null : index)} style={{ width: 40, height: 40, borderRadius: 10, background: color.value, border: openColorPicker === index ? '3px solid #000' : '2px solid #eee', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }} />
                {openColorPicker === index && (
                  <div ref={colorPickerRef} style={{ position: 'absolute', top: 48, left: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: 14, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Brand colors</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {[...colors.map(c => c.value), ...scrapedColors, '#000000', '#ffffff', '#f5f5f5', '#1a1a1a'].filter((c, i, a) => c && a.indexOf(c) === i).map(swatch => (
                        <div key={swatch} onClick={() => { updateColor(index, swatch); setOpenColorPicker(null) }} style={{ width: 28, height: 28, borderRadius: 8, background: swatch, border: color.value === swatch ? '3px solid #000' : '1.5px solid #e0e0e0', cursor: 'pointer', transition: 'transform 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} title={swatch} />
                      ))}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Custom</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: color.value, flexShrink: 0, border: '1px solid #eee' }} />
                      <input type="text" value={color.value.toUpperCase()} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) updateColor(index, e.target.value) }} style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 13, padding: '6px 10px', textTransform: 'uppercase' }} maxLength={7} />
                      <label style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1px solid #eee', flexShrink: 0, background: 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="color" value={color.value} onChange={e => updateColor(index, e.target.value)} style={{ opacity: 0, width: 0, height: 0 }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <select value={color.label} onChange={e => updateColorLabel(index, e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 13, padding: '8px 12px', color: '#555', cursor: 'pointer', appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}>
                {['Primary', 'Secondary', 'Accent', 'Light Background', 'Background', 'Text', 'Button', 'Button Text', 'Border', 'Surface', 'Dark', 'Light', 'Custom'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {colors.length > 1 && (
                <button onClick={() => removeColor(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={addColor} style={{ marginTop: 10, background: 'none', border: '1.5px dashed var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
          + Add color
        </button>
      </div>

      {/* Text on colors */}
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Text on colors</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Text on Primary', value: textOnPrimary, set: setTextOnPrimary, bg: colors[0]?.value },
            { label: 'Text on Secondary', value: textOnSecondary, set: setTextOnSecondary, bg: colors[1]?.value },
            { label: 'Text on Accent', value: textOnAccent, set: setTextOnAccent, bg: colors[2]?.value },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div onClick={() => setOpenColorPicker(openColorPicker === 100 + idx ? null : 100 + idx)} style={{ width: 40, height: 40, borderRadius: 10, background: item.bg || '#000', border: openColorPicker === 100 + idx ? '3px solid #000' : '2px solid #eee', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: item.value }}>{item.label.charAt(item.label.length - 1) === 'y' ? 'A' : 'A'}</span>
                </div>
                {openColorPicker === 100 + idx && (
                  <div ref={colorPickerRef} style={{ position: 'absolute', top: 48, left: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: 14, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Brand colors</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {[...colors.map(c => c.value), ...scrapedColors, '#000000', '#ffffff', '#f5f5f5', '#1a1a1a'].filter((c, i, a) => c && a.indexOf(c) === i).map(swatch => (
                        <div key={swatch} onClick={() => { item.set(swatch); setOpenColorPicker(null); setIsDirty(true) }} style={{ width: 28, height: 28, borderRadius: 8, background: swatch, border: item.value === swatch ? '3px solid #000' : '1.5px solid #e0e0e0', cursor: 'pointer', transition: 'transform 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} title={swatch} />
                      ))}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Custom</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: item.value, flexShrink: 0, border: '1px solid #eee' }} />
                      <input type="text" value={item.value.toUpperCase()} onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) { item.set(e.target.value); setIsDirty(true) } }} style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: 13, padding: '6px 10px', textTransform: 'uppercase' }} maxLength={7} />
                      <label style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1px solid #eee', flexShrink: 0, background: 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="color" value={item.value} onChange={e => { item.set(e.target.value); setIsDirty(true) }} style={{ opacity: 0, width: 0, height: 0 }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ ...inputStyle, flex: 1, fontSize: 13, padding: '8px 12px', color: '#555', background: '#fafafa' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div>
        <label style={labelStyle}>Fonts</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fonts.map((font, index) => (
            <div key={index}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: font.family ? 6 : 0 }}>
                <select value={font.label} onChange={e => setFonts(prev => prev.map((f, i) => i === index ? { ...f, label: e.target.value } : f))} style={{ ...inputStyle, width: 130, fontSize: 12, padding: '8px 12px', color: '#555', cursor: 'pointer', appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28 }}>
                  {['Heading', 'Body', 'Accent', 'Mono', 'Display', 'UI'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input type="text" value={fontDropdownOpen === index ? fontSearch : font.family} onChange={e => { setFontSearch(e.target.value); setFontDropdownOpen(index) }} onFocus={() => { setFontSearch(''); setFontDropdownOpen(index) }} onBlur={() => { setTimeout(() => { setFontDropdownOpen(null); setFontSearch('') }, 150) }}
                    style={{ ...inputStyle, width: '100%', fontFamily: font.family ? `${font.family}, sans-serif` : 'inherit', fontSize: 14, padding: '8px 14px' }} placeholder="Search fonts..." />
                  {fontDropdownOpen === index && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100, background: '#fff', border: '1.5px solid #000', borderRadius: 10, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                      {POPULAR_FONTS.filter(f => !fontSearch || f.toLowerCase().includes(fontSearch.toLowerCase())).map(f => (
                        <div key={f} onMouseDown={() => { updateFont(index, f); setFontDropdownOpen(null); setFontSearch('') }}
                          style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, fontFamily: `${f}, sans-serif`, color: font.family === f ? '#000' : '#333', fontWeight: font.family === f ? 700 : 400, background: font.family === f ? '#f5f5f5' : 'transparent', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = font.family === f ? '#f5f5f5' : 'transparent')}>
                          {f}
                          {font.family === f && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 4.5,9 10.5,3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <select value={font.weight} onChange={e => setFonts(prev => prev.map((f, i) => i === index ? { ...f, weight: e.target.value } : f))}
                  style={{ ...inputStyle, width: 90, fontSize: 12, padding: '8px 10px', color: '#555', cursor: 'pointer', appearance: 'none' as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: 24, flexShrink: 0 }}>
                  {[['300','Light'],['400','Regular'],['500','Medium'],['600','Semi'],['700','Bold'],['800','ExBold'],['900','Black']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {fonts.length > 1 && (
                  <button onClick={() => removeFont(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {(['none', 'uppercase', 'capitalize'] as const).map(t => (
                  <button key={t} onClick={() => { setFonts(prev => prev.map((f, i) => i === index ? { ...f, transform: t } : f)); setIsDirty(true) }}
                    style={{ padding: '4px 10px', borderRadius: 6, border: font.transform === t ? '2px solid #000' : '1.5px solid #e0e0e0', background: font.transform === t ? '#000' : '#fff', color: font.transform === t ? '#fff' : '#666', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {t === 'none' ? 'Aa' : t === 'uppercase' ? 'AA' : 'Aa'}
                  </button>
                ))}
              </div>
              {font.family && (
                <div style={{ fontSize: 15, fontFamily: `${font.family}, sans-serif`, fontWeight: parseInt(font.weight) || 700, textTransform: font.transform || 'none', color: 'var(--muted)', paddingTop: 6, lineHeight: 1.4 }}>
                  The quick brown fox jumps over the lazy dog
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={addFont} style={{ marginTop: 10, background: 'none', border: '1.5px dashed var(--border)', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
          + Add font
        </button>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 3: BRAND VOICE ── */}
      <SectionHeader title="Brand Voice" subtitle="How your brand communicates" action={
        <button onClick={generateVoice} disabled={generatingVoice} style={{ background: generatingVoice ? '#e0e0e0' : '#00ff97', color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13, padding: '9px 20px', borderRadius: 999, border: 'none', cursor: generatingVoice ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {generatingVoice ? (<><div style={{ width: 12, height: 12, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Analyzing your brand...</>) : <>✦ AI-fill from website</>}
        </button>
      } />

      {generatingVoice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,0.04)', border: '1px solid #e0e0e0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--muted)' }}>
          <div style={{ width: 14, height: 14, flexShrink: 0, border: '2px solid #ddd', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Analyzing your website to pre-fill brand voice...
        </div>
      )}

      {voiceError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c00' }}>
          AI-fill failed: {voiceError}
        </div>
      )}

      {aiPrefilled && !generatingVoice && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: 'rgba(0,255,151,0.06)', border: '1px solid rgba(0,255,151,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#00a86b', lineHeight: 1.5 }}>
            <strong>✦ AI pre-filled</strong> — We analyzed your website and made our best guess. Review each field and improve it to get better creatives.
          </div>
          <button onClick={generateVoice} disabled={generatingVoice} style={{ background: '#000', color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 12, padding: '7px 16px', borderRadius: 999, border: 'none', cursor: generatingVoice ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{generatingVoice ? 'Generating...' : <><span style={{ fontSize: 16, lineHeight: 1 }}>↺</span> Regenerate</>}</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>What does your brand do?</label>
          <input style={inputStyle} value={mission} onChange={e => setMission(e.target.value)} placeholder="Non-alcoholic functional drinks for people who want to socialize without the downsides of alcohol" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
          <div style={helperStyle}>One line that captures your value proposition.</div>
        </div>
        <div>
          <label style={labelStyle}>Who buys from you?</label>
          <input style={inputStyle} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Health-conscious adults 25-40 who want to maintain their social life without compromising their wellness goals" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
        <div>
          <label style={labelStyle}>How does your brand sound?</label>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={brandVoice} onChange={e => setBrandVoice(e.target.value)} placeholder="Bold and energetic but approachable. We're the friend who's always down to hang, just making smarter choices. Never preachy, never boring." onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
        <div>
          <label style={labelStyle}>Tone keywords (press Enter to add)</label>
          <TagInput tags={toneKeywords} onChange={setToneKeywords} placeholder="e.g. Bold, Energetic, Approachable" pillColor="#00704a" pillBg="rgba(0,255,151,0.1)" />
          <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>Press comma or Enter to add a tag.</div>
        </div>
        <div>
          <label style={labelStyle}>Words to avoid</label>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>Tone guidance — Claude avoids these when possible.</p>
          <TagInput tags={avoidWords} onChange={setAvoidWords} placeholder="e.g. cheap, basic, discount..." pillColor="#b91c1c" pillBg="rgba(239,68,68,0.08)" />
          <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>Press comma or Enter to add a tag.</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Never use</label>
            <span style={{ fontSize: 10, fontWeight: 800, background: '#fff0f0', color: '#cc0000', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>STRICT</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>— optional</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>Brand policy — these will NEVER appear in any generated copy. Use for legal or compliance restrictions.</p>
          <TagInput tags={neverWords} onChange={setNeverWords} placeholder="e.g. THC, guaranteed, FDA approved..." pillColor="#991b1b" pillBg="rgba(220,38,38,0.12)" />
          <div style={{ fontSize: 12, color: '#bbb', marginTop: 4 }}>Press comma or Enter to add a tag.</div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 4: YOUR PRODUCTS ── */}
      <SectionHeader title={`Your ${offeringLabel}`} subtitle={`${products.length} ${offeringLabel.toLowerCase()}`} />

      {products.map((product, index) => (
        <div key={index} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 12, display: 'flex', gap: 16, alignItems: 'stretch', position: 'relative' }}>
          {/* LEFT: Product image */}
          <div style={{ width: 180, flexShrink: 0, display: 'flex', alignSelf: 'stretch' }}>
            {(() => {
              const productImgs = images.filter(img => img.tag === 'product')
              const currentImg = product.image || (productImgs[index] ? getImageUrl(productImgs[index]) : null)
              return (
                <label style={{ width: '100%', height: '100%', borderRadius: 10, border: currentImg ? '1px solid var(--border)' : '2px dashed var(--border)', cursor: 'pointer', overflow: 'hidden', background: currentImg ? '#000' : '#fafafa', position: 'relative', display: 'block' }}>
                  {currentImg ? (
                    <>
                      <img src={currentImg} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', fontSize: 11, fontWeight: 700, color: '#fff' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>Change</div>
                    </>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <span style={{ fontSize: 24, color: '#ccc' }}>+</span>
                      <span style={{ fontSize: 10, color: '#bbb', fontWeight: 600 }}>Add photo</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadProductImage(f, index); if (url) updateProduct(index, 'image', url) }} />
                </label>
              )
            })()}
          </div>
          {/* RIGHT: Product info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Product {index + 1}</span>
              {products.length > 1 && <button onClick={() => removeProduct(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: 0 }}>×</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Name *</label>
                <input style={inputStyle} value={product.name} onChange={e => updateProduct(index, 'name', e.target.value)} placeholder={namePlaceholder} onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
              </div>
              <div>
                <label style={labelStyle}>Price</label>
                <input style={inputStyle} value={product.price} onChange={e => updateProduct(index, 'price', e.target.value)} placeholder={pricePlaceholder} onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input style={inputStyle} value={product.description} onChange={e => updateProduct(index, 'description', e.target.value)} placeholder={descPlaceholder} onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
            </div>
          </div>
        </div>
      ))}

      <button onClick={addProduct} style={{
        width: '100%', padding: 12, background: 'transparent', border: '2px dashed var(--border)',
        borderRadius: 14, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'border-color 0.15s, color 0.15s',
      }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.color = '#000' }}
         onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
        + Add another product
      </button>

      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Default CTA</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: colors[0]?.value || '#000', color: isLight(colors[0]?.value || '#000') ? '#000' : '#fff', borderRadius: 999, padding: '10px 24px', fontFamily: fonts[0]?.family ? `${fonts[0].family}, sans-serif` : 'Barlow, sans-serif', fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', flexShrink: 0, minWidth: 120, letterSpacing: '0.02em' }}>{defaultCta || 'Shop Now'}</div>
          <input style={{ ...inputStyle, flex: 1 }} value={defaultCta} onChange={e => setDefaultCta(e.target.value)} placeholder="Shop Now" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Used as the default button text on landing pages and ad creatives.</div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 5: IMAGES ── */}
      <SectionHeader title="Images" subtitle={`${images.length} image${images.length !== 1 ? 's' : ''} in your library`} />

      {/* Product images */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Product images
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>Hero shots of your product</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.filter(img => img.tag === 'product').map(img => (
            <div key={img.id} style={{ position: 'relative' }}>
              <img src={getImageUrl(img)} alt="" style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} onError={e => { (e.currentTarget as HTMLElement).style.display = 'none' }} />
              <button onClick={() => removeImageById(img.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#000', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <label style={{ width: 120, height: 120, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, fontWeight: 600, gap: 4, transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>Add
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const f = Array.from(e.target.files || []); if (f.length) handleImageUpload(f, 'product'); e.target.value = '' }} />
          </label>
        </div>
      </div>

      {/* Lifestyle images */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Lifestyle images
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>Brand context, mood, people using the product</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {images.filter(img => img.tag === 'lifestyle' || img.tag === 'background').map(img => (
            <div key={img.id} style={{ position: 'relative' }}>
              <img src={getImageUrl(img)} alt="" style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} onError={e => { (e.currentTarget as HTMLElement).style.display = 'none' }} />
              <button onClick={() => removeImageById(img.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#000', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <label style={{ width: 120, height: 120, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, fontWeight: 600, gap: 4, transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>Add
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const f = Array.from(e.target.files || []); if (f.length) handleImageUpload(f, 'lifestyle'); e.target.value = '' }} />
          </label>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 6: INTEGRATIONS ── */}
      <SectionHeader title="Integrations" subtitle="Connect your marketing tools" />

      {/* Meta Ads */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>f</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#000' }}>Meta Ads</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Connect to sync ad performance + creatives automatically</div>
          </div>
        </div>

        {/* Token expiry warning */}
        {metaTokenSavedAt && (() => {
          const savedDate = new Date(metaTokenSavedAt)
          const expiryDate = new Date(savedDate.getTime() + 60 * 24 * 60 * 60 * 1000)
          const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysLeft <= 14) return (
            <div style={{ background: '#fff3cd', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#856404', marginBottom: 12 }}>
              ⚠️ Your Meta token expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Refresh it at developers.facebook.com/tools/debug/accesstoken
            </div>
          )
          return null
        })()}

        <label style={labelStyle}>
          Long-lived Access Token
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>optional</span>
        </label>
        <input
          type="password"
          value={metaToken}
          onChange={e => { setMetaToken(e.target.value); setIsDirty(true) }}
          placeholder="EAAxxxxxxxxxxxxx..."
          style={{ ...inputStyle, marginBottom: 12 }}
          onFocus={e => { e.currentTarget.style.borderColor = '#000' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0' }}
        />

        <label style={labelStyle}>Ad Account ID</label>
        <input
          type="text"
          value={metaAdAccountId}
          onChange={e => { setMetaAdAccountId(e.target.value.replace('act_', '')); setIsDirty(true) }}
          placeholder="663039913130424"
          style={{ ...inputStyle, marginBottom: 6 }}
          onFocus={e => { e.currentTarget.style.borderColor = '#000' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0' }}
        />
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 0 }}>
          Just the number — no "act_" prefix. Find in Meta Ads Manager → Settings → Ad Account ID.
          Get your token at <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2' }}>Graph API Explorer</a> with ads_read + ads_management + business_management permissions, then extend to 60 days.
        </div>
        {metaToken && metaAdAccountId && (
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#00a86b' }}>✓ Connected</div>
        )}
      </div>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 24px' }} />

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>
          Klaviyo Private API Key
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>optional</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="password"
            value={klaviyoKey}
            onChange={e => { setKlaviyoKey(e.target.value); setIsDirty(true) }}
            placeholder="pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            style={{ ...inputStyle, paddingRight: 100 }}
            onFocus={e => { e.currentTarget.style.borderColor = '#000' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0' }}
          />
          {klaviyoKey && (
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, fontWeight: 700, color: '#00a86b' }}>
              ✓ Connected
            </div>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
          Find in Klaviyo → Account → Settings → API Keys. Used to push email templates directly to your account.
        </div>
      </div>

      {/* Dirty save bar */}
      {isDirty && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#000', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }} />You have unsaved changes
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setName(brand.name); setWebsite(brand.website || ''); setMission(brand.mission || ''); setTargetAudience(brand.target_audience || ''); setBrandVoice(brand.brand_voice || ''); setToneKeywords(brand.tone_keywords || []); setAvoidWords(brand.avoid_words || []); setDefaultCta(tryParse(brand.notes)?.default_cta || 'Shop Now'); setIsDirty(false) }}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', borderRadius: 999, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Discard</button>
            <button onClick={saveAll} disabled={saving} style={{ background: saving ? '#555' : '#00ff97', color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13, padding: '9px 28px', borderRadius: 999, border: 'none', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Danger Zone ── */}
      <DangerZone brandId={brand.id} brandName={brand.name} />

      {/* Floating save toast */}
      {saved && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          background: '#000', color: '#00ff97',
          padding: '12px 24px', borderRadius: 12,
          fontSize: 14, fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.2s ease',
        }}>
          ✓ Brand saved
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function DangerZone({ brandId, brandName }: { brandId: string; brandName: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const canDelete = confirmText === brandName

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/brands/${brandId}/delete`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete brand')
        setDeleting(false)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Network error')
      setDeleting(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid rgba(255,0,0,0.1)', padding: '40px 0' }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#cc0000', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
        Danger zone
      </div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: 18, color: '#111', marginBottom: 6 }}>
        Delete this brand
      </div>
      <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 16, maxWidth: 500 }}>
        This will permanently delete the brand, all its campaigns, images, and generated content. This cannot be undone.
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          style={{ background: 'transparent', border: '1px solid #cc0000', color: '#cc0000', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Delete brand
        </button>
      ) : (
        <div style={{ background: 'rgba(255,0,0,0.03)', border: '1px solid rgba(255,0,0,0.1)', borderRadius: 12, padding: 20, maxWidth: 420, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontSize: 14, color: '#333', marginBottom: 10 }}>
            Are you sure? Type <strong>{brandName}</strong> to confirm:
          </div>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={brandName}
            style={{ width: '100%', border: '1.5px solid rgba(255,0,0,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
          />
          {error && <div style={{ fontSize: 13, color: 'red', marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              style={{
                background: canDelete ? 'rgba(255,0,0,0.8)' : 'rgba(255,0,0,0.2)',
                color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: canDelete && !deleting ? 'pointer' : 'not-allowed', opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, delete permanently'}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(''); setError('') }}
              style={{ background: 'none', border: 'none', color: '#999', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
