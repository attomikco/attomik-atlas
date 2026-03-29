'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brand, BrandImage } from '@/types'

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  const id = 'tag-inp-' + placeholder.replace(/\s/g, '-')
  return (
    <div
      style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 44, cursor: 'text' }}
      onClick={() => document.getElementById(id)?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} style={{ background: '#f0f0f0', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: '#000' }}>
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

export default function BrandHubClient({ brand, initialImages }: { brand: Brand; initialImages: BrandImage[] }) {
  const supabase = createClient()
  const logoInputRef = useRef<HTMLInputElement>(null)

  // State
  const [name, setName] = useState(brand.name)
  const [website, setWebsite] = useState(brand.website || '')
  const [mission, setMission] = useState(brand.mission || '')
  const [targetAudience, setTargetAudience] = useState(brand.target_audience || '')
  const [brandVoice, setBrandVoice] = useState(brand.brand_voice || '')
  const [toneKeywords, setToneKeywords] = useState<string[]>(brand.tone_keywords || [])
  const [avoidWords, setAvoidWords] = useState<string[]>(brand.avoid_words || [])
  const [primaryColor, setPrimaryColor] = useState(brand.primary_color || '#000000')
  const [secondaryColor, setSecondaryColor] = useState(brand.secondary_color || '#000000')
  const [accentColor, setAccentColor] = useState(brand.accent_color || '#000000')
  const [fontFamily, setFontFamily] = useState(brand.font_primary?.split('|')[0] || '')
  const [logoUrl, setLogoUrl] = useState(brand.logo_url || '')
  const [defaultCta, setDefaultCta] = useState(brand.default_cta || '')
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
  const [activeColor, setActiveColor] = useState<'primary' | 'secondary' | 'accent' | null>(null)

  const palette = [primaryColor, secondaryColor, accentColor, '#000000', '#ffffff', '#f5f5f5', '#1a1a1a'].filter((c, i, a) => a.indexOf(c) === i)

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

  // Load Google Font preview
  useEffect(() => {
    if (!fontFamily) return
    const id = 'hub-font'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link) }
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700;800;900&display=swap`
  }, [fontFamily])

  // Click outside color picker
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('.color-picker-wrap')) setActiveColor(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function saveAll() {
    setSaving(true)
    setSaved(false)
    const savedProducts = products.filter(p => p.name.trim()).map(p => ({
      name: p.name.trim(), description: p.description.trim() || null, price_range: p.price.trim() || null, image: p.image || null,
    }))
    await supabase.from('brands').update({
      name, website: website || null, mission: mission || null,
      target_audience: targetAudience || null, brand_voice: brandVoice || null,
      tone_keywords: toneKeywords.length ? toneKeywords : null,
      avoid_words: avoidWords.length ? avoidWords : null,
      primary_color: primaryColor, secondary_color: secondaryColor, accent_color: accentColor,
      font_primary: fontFamily || null, logo_url: logoUrl || null,
      default_cta: defaultCta || null, products: savedProducts.length ? savedProducts : null,
    }).eq('id', brand.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop() || 'png'
    const path = `${brand.id}/logo.${ext}`
    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { contentType: file.type, upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('brand-assets').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
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

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }
  const inputStyle: React.CSSProperties = { border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '11px 14px', fontSize: 14, width: '100%', outline: 'none', color: '#000', background: '#fff' }
  const helperStyle: React.CSSProperties = { fontSize: 11, color: '#aaa', marginTop: 4 }

  function renderColorPicker(label: string, key: 'primary' | 'secondary' | 'accent', value: string, onChange: (v: string) => void) {
    return (
      <div className="color-picker-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, position: 'relative' }}>
        <div onClick={() => setActiveColor(activeColor === key ? null : key)} style={{
          width: 52, height: 52, borderRadius: 12, background: value,
          border: activeColor === key ? '3px solid #000' : '2px solid #eee',
          cursor: 'pointer', transition: 'border-color 0.15s',
          boxShadow: activeColor === key ? '0 0 0 2px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.12)',
        }} />
        <span style={{ fontSize: 9, fontWeight: 600, color: '#999', fontFamily: 'monospace' }}>{value.toUpperCase()}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
        {activeColor === key && (
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 16, padding: 16, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Brand colors</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {palette.map(color => (
                <div key={color} onClick={() => { onChange(color); setActiveColor(null) }} title={color} style={{
                  width: 32, height: 32, borderRadius: 8, background: color,
                  border: color === value ? '3px solid #000' : '1.5px solid #e0e0e0',
                  cursor: 'pointer', transition: 'transform 0.1s', flexShrink: 0,
                }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }} />
              ))}
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: 12 }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Custom</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #eee', cursor: 'pointer', padding: 2, background: 'none', flexShrink: 0 }} />
              <input type="text" value={value.toUpperCase()} onChange={e => { if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onChange(e.target.value) }} placeholder="#000000" style={{ flex: 1, padding: '7px 10px', border: '1.5px solid #eee', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#000', outline: 'none' }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>{subtitle}</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto', background: 'var(--cream, #f8f7f4)', color: 'var(--ink, #1a1a1a)', minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>Brand Hub</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>Everything Attomik knows about {brand.name}. The more you add, the better your creatives.</div>
        </div>
        <button onClick={saveAll} disabled={saving} style={{
          background: saving ? '#e0e0e0' : '#000', color: saving ? '#999' : '#00ff97',
          fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13,
          padding: '10px 24px', borderRadius: 999, border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      {/* ── SECTION 1: IDENTITY ── */}
      <SectionHeader title="Identity" subtitle="Basic brand info" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Brand name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Website</label>
          <input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
        <div>
          <label style={labelStyle}>Industry</label>
          <input style={inputStyle} value={brand.industry || ''} readOnly placeholder="Auto-detected" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
        </div>
      </div>

      {/* Logo */}
      <div
        onClick={() => logoInputRef.current?.click()}
        style={{ border: '2px dashed var(--border)', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', marginTop: 16 }}
      >
        {logoUrl ? (
          <img src={logoUrl} style={{ height: 56, borderRadius: 8, maxWidth: 200, objectFit: 'contain' }} alt="Logo" />
        ) : (
          <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--muted)' }}>+</div>
        )}
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{logoUrl ? 'Change logo' : 'Upload logo'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>PNG, SVG or JPG. Shown on landing pages and creatives.</div>
        </div>
        <input type="file" accept="image/*" style={{ display: 'none' }} ref={logoInputRef} onChange={handleLogoUpload} />
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 2: COLORS & FONT ── */}
      <SectionHeader title="Colors & Font" subtitle="Visual identity" />
      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        {renderColorPicker('Primary', 'primary', primaryColor, setPrimaryColor)}
        {renderColorPicker('Secondary', 'secondary', secondaryColor, setSecondaryColor)}
        {renderColorPicker('Accent', 'accent', accentColor, setAccentColor)}
      </div>
      <div style={{ maxWidth: 320 }}>
        <label style={labelStyle}>Heading font</label>
        <input style={inputStyle} value={fontFamily} onChange={e => setFontFamily(e.target.value)} placeholder="Barlow, Montserrat..." onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => {
          e.currentTarget.style.borderColor = '#e0e0e0'
          if (e.currentTarget.value) {
            const link = document.createElement('link'); link.rel = 'stylesheet'
            link.href = `https://fonts.googleapis.com/css2?family=${e.currentTarget.value.replace(/ /g, '+')}:wght@400;700;800;900&display=swap`
            document.head.appendChild(link)
          }
        }} />
        {fontFamily && <div style={{ fontSize: 13, color: '#555', marginTop: 8, fontFamily, fontWeight: 600 }}>The quick brown fox jumps over the lazy dog</div>}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 3: BRAND VOICE ── */}
      <SectionHeader title="Brand Voice" subtitle="How your brand communicates" />
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
          <TagInput tags={toneKeywords} onChange={setToneKeywords} placeholder="e.g. Bold, Energetic, Approachable" />
        </div>
        <div>
          <label style={labelStyle}>Words/phrases to avoid</label>
          <TagInput tags={avoidWords} onChange={setAvoidWords} placeholder="e.g. Cheap, Basic, Alcoholic" />
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '36px 0' }} />

      {/* ── SECTION 4: YOUR PRODUCTS ── */}
      <SectionHeader title="Your Products" subtitle={`${products.length} product${products.length !== 1 ? 's' : ''}`} />

      {products.map((product, index) => (
        <div key={index} style={{
          background: '#fff', border: '1px solid var(--border)', borderRadius: 14,
          padding: '20px 20px 16px', marginBottom: 12, position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Product {index + 1}
            </span>
            {products.length > 1 && (
              <button onClick={() => removeProduct(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px' }}>×</button>
            )}
          </div>

          {/* Product image */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Product image</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {(() => {
                const productImgs = images.filter(img => img.tag === 'product')
                const currentImg = product.image || (productImgs[index] ? getImageUrl(productImgs[index]) : null)
                return currentImg ? (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img src={currentImg} alt={product.name || 'Product'} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    <label style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s', fontSize: 11, fontWeight: 700, color: '#fff' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                      Change
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadProductImage(f, index); if (url) updateProduct(index, 'image', url) }} />
                    </label>
                  </div>
                ) : (
                  <label style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 10, fontWeight: 700, gap: 4, flexShrink: 0, transition: 'border-color 0.15s', textAlign: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>Add photo
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadProductImage(f, index); if (url) updateProduct(index, 'image', url) }} />
                  </label>
                )
              })()}
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                {images.filter(img => img.tag === 'product')[index]
                  ? 'Scraped from your website. Click to replace.'
                  : 'Upload your hero product shot. Used in ad creatives.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Product name *</label>
              <input style={inputStyle} value={product.name} onChange={e => updateProduct(index, 'name', e.target.value)} placeholder="e.g. Afterdream Tropical" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
            </div>
            <div>
              <label style={labelStyle}>Price</label>
              <input style={inputStyle} value={product.price} onChange={e => updateProduct(index, 'price', e.target.value)} placeholder="$29.99" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>One-line description</label>
            <input style={inputStyle} value={product.description} onChange={e => updateProduct(index, 'description', e.target.value)} placeholder="e.g. Juicy pineapple + cherry non-alcoholic social tonic" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
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
        <label style={labelStyle}>Default CTA text</label>
        <input style={inputStyle} value={defaultCta} onChange={e => setDefaultCta(e.target.value)} placeholder="e.g. Shop Now, Try It Free, Get Started" onFocus={e => e.currentTarget.style.borderColor = '#000'} onBlur={e => e.currentTarget.style.borderColor = '#e0e0e0'} />
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
              <img src={getImageUrl(img)} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} onError={e => { (e.currentTarget as HTMLElement).style.display = 'none' }} />
              <button onClick={() => removeImageById(img.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#000', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <label style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, fontWeight: 600, gap: 4, transition: 'border-color 0.15s' }}
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
              <img src={getImageUrl(img)} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} onError={e => { (e.currentTarget as HTMLElement).style.display = 'none' }} />
              <button onClick={() => removeImageById(img.id)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#000', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <label style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, fontWeight: 600, gap: 4, transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>Add
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { const f = Array.from(e.target.files || []); if (f.length) handleImageUpload(f, 'lifestyle'); e.target.value = '' }} />
          </label>
        </div>
      </div>

      {/* Spacer at bottom */}
      <div style={{ height: 80 }} />

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
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
