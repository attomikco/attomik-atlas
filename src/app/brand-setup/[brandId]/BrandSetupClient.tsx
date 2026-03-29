'use client'
import { useState, useEffect } from 'react'
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

function tryParse(s: string | null) {
  try { return s ? JSON.parse(s) : null } catch { return null }
}

export default function BrandHubClient({ brand, initialImages }: { brand: Brand; initialImages: BrandImage[] }) {
  const supabase = createClient()

  // State
  const [name, setName] = useState(brand.name)
  const [website, setWebsite] = useState(brand.website || '')
  const [mission, setMission] = useState(brand.mission || '')
  const [targetAudience, setTargetAudience] = useState(brand.target_audience || '')
  const [brandVoice, setBrandVoice] = useState(brand.brand_voice || '')
  const [toneKeywords, setToneKeywords] = useState<string[]>(brand.tone_keywords || [])
  const [avoidWords, setAvoidWords] = useState<string[]>(brand.avoid_words || [])
  const [colors, setColors] = useState<Array<{ label: string; value: string }>>(() => {
    const base = [
      { label: 'Primary', value: brand.primary_color || '#000000' },
      { label: 'Secondary', value: brand.secondary_color || '#ffffff' },
      { label: 'Accent', value: brand.accent_color || '#00ff97' },
    ]
    const extra = tryParse(brand.notes)?.extra_colors || []
    return [...base, ...extra]
  })
  const [fonts, setFonts] = useState<Array<{ label: string; family: string }>>([
    { label: 'Heading', family: brand.font_heading?.family || brand.font_primary?.split('|')[0] || '' },
    { label: 'Body', family: brand.font_body?.family || brand.font_secondary?.split('|')[0] || '' },
  ])
  const [logoDark, setLogoDark] = useState(brand.logo_url || '')
  const [logoLight, setLogoLight] = useState(tryParse(brand.notes)?.logo_url_light || '')
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
  const [uploadingLogo, setUploadingLogo] = useState<'dark' | 'light' | null>(null)

  function updateColor(index: number, value: string) { setColors(prev => prev.map((c, i) => i === index ? { ...c, value } : c)) }
  function updateColorLabel(index: number, label: string) { setColors(prev => prev.map((c, i) => i === index ? { ...c, label } : c)) }
  function addColor() { setColors(prev => [...prev, { label: `Color ${prev.length + 1}`, value: '#000000' }]) }
  function removeColor(index: number) { if (colors.length <= 1) return; setColors(prev => prev.filter((_, i) => i !== index)) }

  function updateFont(index: number, family: string) {
    setFonts(prev => prev.map((f, i) => i === index ? { ...f, family } : f))
    if (family) {
      const link = document.createElement('link'); link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;700;900&display=swap`
      document.head.appendChild(link)
    }
  }
  function addFont() { setFonts(prev => [...prev, { label: `Font ${prev.length + 1}`, family: '' }]) }
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
      primary_color: colors[0]?.value || null, secondary_color: colors[1]?.value || null, accent_color: colors[2]?.value || null,
      font_primary: fonts[0]?.family || null, font_secondary: fonts[1]?.family || null,
      logo_url: logoDark || null,
      notes: JSON.stringify({
        ...tryParse(brand.notes),
        logo_url_light: logoLight || null,
        extra_colors: colors.slice(3).map(c => ({ label: c.label, value: c.value })),
      }),
      default_cta: defaultCta || null, products: savedProducts.length ? savedProducts : null,
    }).eq('id', brand.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function uploadLogo(file: File, variant: 'dark' | 'light') {
    const ext = file.name.split('.').pop() || 'png'
    const path = `${brand.id}/logo_${variant}.${ext}`
    let url: string | null = null

    const { error } = await supabase.storage.from('brand-assets').upload(path, file, { contentType: file.type, upsert: true })
    if (!error) {
      url = supabase.storage.from('brand-assets').getPublicUrl(path).data.publicUrl
    } else {
      // Fallback to brand-images bucket
      const { error: error2 } = await supabase.storage.from('brand-images').upload(`logos/${path}`, file, { contentType: file.type, upsert: true })
      if (error2) return
      url = supabase.storage.from('brand-images').getPublicUrl(`logos/${path}`).data.publicUrl
    }

    if (!url) return
    if (variant === 'dark') {
      setLogoDark(url)
      await supabase.from('brands').update({ logo_url: url }).eq('id', brand.id)
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

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }
  const inputStyle: React.CSSProperties = { border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '11px 14px', fontSize: 14, width: '100%', outline: 'none', color: '#000', background: '#fff' }
  const helperStyle: React.CSSProperties = { fontSize: 11, color: '#aaa', marginTop: 4 }

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
      <div style={{ marginTop: 16 }}>
        <label style={labelStyle}>Logo</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Color logo */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
              Color logo <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10 }}>for light backgrounds</span>
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
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
              White logo <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10 }}>for dark backgrounds</span>
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
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
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
              <label style={{ width: 40, height: 40, borderRadius: 10, background: color.value, border: '2px solid #eee', cursor: 'pointer', display: 'block', boxShadow: '0 1px 4px rgba(0,0,0,0.12)', flexShrink: 0, position: 'relative' }}>
                <input type="color" value={color.value} onChange={e => updateColor(index, e.target.value)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', top: 0, left: 0 }} />
              </label>
              <input type="text" value={color.value.toUpperCase()} onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) updateColor(index, v) }} onBlur={() => { if (!/^#[0-9A-Fa-f]{6}$/.test(color.value)) updateColor(index, colors[index].value) }} style={{ ...inputStyle, width: 110, fontFamily: 'monospace', fontSize: 13, padding: '8px 12px', textTransform: 'uppercase' }} maxLength={7} placeholder="#000000" onFocus={e => (e.target.style.borderColor = '#000')} />
              <input type="text" value={color.label} onChange={e => updateColorLabel(index, e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 13, padding: '8px 12px', color: '#666' }} placeholder="e.g. Primary, Background, CTA..." onFocus={e => (e.target.style.borderColor = '#000')} onBlur={e => (e.target.style.borderColor = '#e0e0e0')} />
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

      {/* Fonts */}
      <div>
        <label style={labelStyle}>Fonts</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fonts.map((font, index) => (
            <div key={index}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: font.family ? 6 : 0 }}>
                <input type="text" value={font.label} onChange={e => setFonts(prev => prev.map((f, i) => i === index ? { ...f, label: e.target.value } : f))} style={{ ...inputStyle, width: 110, fontSize: 12, padding: '8px 12px', color: '#666' }} placeholder="Heading" onFocus={e => (e.target.style.borderColor = '#000')} onBlur={e => (e.target.style.borderColor = '#e0e0e0')} />
                <input type="text" value={font.family} onChange={e => updateFont(index, e.target.value)} style={{ ...inputStyle, flex: 1, fontFamily: font.family || 'inherit', fontSize: 14, padding: '8px 14px' }} placeholder="e.g. Barlow, Montserrat, Fraunces..." onFocus={e => (e.target.style.borderColor = '#000')} onBlur={e => (e.target.style.borderColor = '#e0e0e0')} />
                {fonts.length > 1 && (
                  <button onClick={() => removeFont(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
                )}
              </div>
              {font.family && (
                <div style={{ fontSize: 14, fontFamily: `${font.family}, sans-serif`, color: 'var(--muted)', padding: '0 0 0 120px' }}>
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
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
