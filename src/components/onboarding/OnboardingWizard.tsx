'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, ArrowLeft } from 'lucide-react'
import AttomikLogo from '@/components/ui/AttomikLogo'

const inputCls = "w-full text-base border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1 — two states
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected] = useState(false)
  const [detectedName, setDetectedName] = useState<string | null>(null)
  const [detectedImage, setDetectedImage] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')
  const [brandFont, setBrandFont] = useState('')
  const [fontTransform, setFontTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none')
  const [fontLetterSpacing, setFontLetterSpacing] = useState<'wide' | 'tight' | 'normal'>('normal')
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [accentColor, setAccentColor] = useState('#00ff97')

  // Step 2
  type DetectedProduct = { name: string; description: string | null; price: string | null; image: string | null }
  type ScrapedImage = { url: string; tag: 'product' | 'lifestyle' | 'background' | 'other'; score: number }
  const [detectedImages, setDetectedImages] = useState<ScrapedImage[]>([])
  const [detectedProducts, setDetectedProducts] = useState<DetectedProduct[]>([])
  const [selectedProductIdx, setSelectedProductIdx] = useState<number | null>(null)
  const [showManualProduct, setShowManualProduct] = useState(false)
  const [productName, setProductName] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null)
  const [targetAudience, setTargetAudience] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [campaignName, setCampaignName] = useState('')

  async function analyzeWebsite() {
    if (!website.trim()) { setErrors({ website: 'Enter a URL' }); return }
    setDetecting(true)
    setErrors({})
    try {
      const res = await fetch('/api/brands/detect-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website.trim() }),
      })
      const data = await res.json()
      if (data.name) { setBrandName(data.name); setDetectedName(data.name) }
      if (data.colors?.[0]) setPrimaryColor(data.colors[0])
      if (data.colors?.[1]) setSecondaryColor(data.colors[1])
      if (data.colors?.[2]) setAccentColor(data.colors[2])
      if (data.font) setBrandFont(data.font)
      if (data.fontTransform && data.fontTransform !== 'none') setFontTransform(data.fontTransform)
      if (data.letterSpacing && data.letterSpacing !== 'normal') setFontLetterSpacing(data.letterSpacing)
      if (data.ogImage) setDetectedImage(data.ogImage)
      if (data.products?.length > 0) setDetectedProducts(data.products)
      if (data.images?.length > 0) setDetectedImages(data.images)
      setDetected(true)
    } catch {
      setDetected(true) // show manual form even on failure
    }
    setDetecting(false)
  }

  function skipToManual() {
    setDetected(true)
  }

  function selectProduct(idx: number) {
    const p = detectedProducts[idx]
    if (!p) return
    setSelectedProductIdx(idx)
    setProductName(p.name)
    setProductDesc(p.description || '')
    setPriceRange(p.price || '')
    setProductImageUrl(p.image || null)
  }

  function switchToManualProduct() {
    setShowManualProduct(true)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (step === 0 && !brandName.trim()) errs.brandName = 'Brand name is required'
    if (step === 1 && !productName.trim() && selectedProductIdx === null) errs.productName = 'Select or add a product'
    if (step === 2 && !campaignName.trim()) errs.campaignName = 'Campaign name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (!validate()) return
    // Auto-select first product when entering step 2
    if (step === 0 && detectedProducts.length > 0 && selectedProductIdx === null) {
      selectProduct(0)
    }
    if (step === 1 && !campaignName) setCampaignName(`${brandName.trim()} — Launch Campaign`)
    setStep(s => Math.min(s + 1, 2))
  }

  function back() {
    setErrors({})
    setStep(s => Math.max(s - 1, 0))
  }

  async function uploadImagesInBackground(brandId: string) {
    // Upload manually selected files
    for (const file of imageFiles) {
      try {
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const storagePath = `${brandId}/${fileName}`
        const { error: uploadErr } = await supabase.storage.from('brand-images').upload(storagePath, file, { contentType: file.type })
        if (!uploadErr) {
          await supabase.from('brand_images').insert({
            brand_id: brandId, file_name: file.name, storage_path: storagePath,
            tag: 'product', mime_type: file.type, size_bytes: file.size,
          })
        }
      } catch { continue }
    }
    // Download and upload detected product image
    if (productImageUrl) {
      try {
        const imgRes = await fetch(productImageUrl)
        if (imgRes.ok) {
          const blob = await imgRes.blob()
          const ext = productImageUrl.split('.').pop()?.split('?')[0] || 'jpg'
          const fileName = `${Date.now()}-product.${ext}`
          const storagePath = `${brandId}/${fileName}`
          const { error: uploadErr } = await supabase.storage.from('brand-images').upload(storagePath, blob, { contentType: blob.type || 'image/jpeg' })
          if (!uploadErr) {
            await supabase.from('brand_images').insert({
              brand_id: brandId, file_name: fileName, storage_path: storagePath,
              tag: 'product', mime_type: blob.type || 'image/jpeg', size_bytes: blob.size,
            })
          }
        }
      } catch {}
    }
    // Upload scraped images from website (prepend OG image as lifestyle)
    const ogEntry: typeof detectedImages = detectedImage
      ? [{ url: detectedImage, tag: 'lifestyle' as const, score: 10 }]
      : []
    const allToUpload = [...ogEntry, ...detectedImages].slice(0, 9)
    for (const img of allToUpload) {
      try {
        const imgRes = await fetch('/api/brands/proxy-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: img.url }),
        })
        if (!imgRes.ok) continue
        const blob = await imgRes.blob()
        const ext = img.url.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'jpg'
        const filename = `scraped_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const path = `${brandId}/${filename}`
        const { error: upErr } = await supabase.storage.from('brand-images').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
        if (!upErr) {
          await supabase.from('brand_images').insert({
            brand_id: brandId, file_name: filename, storage_path: path,
            mime_type: blob.type || 'image/jpeg', tag: img.tag, size_bytes: blob.size,
          })
        }
      } catch { continue }
    }
  }

  async function submit() {
    if (!validate()) return
    setSaving(true)

    const slug = brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6)

    const { data: brand, error: brandErr } = await supabase.from('brands').insert({
      name: brandName.trim(),
      slug,
      website: website.trim() || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      accent_color: secondaryColor || null,
      font_primary: brandFont ? `${brandFont}|700|${fontTransform}` : null,
      font_heading: brandFont ? { family: brandFont, weight: '700', transform: fontTransform, letterSpacing: fontLetterSpacing } : null,
      products: productName.trim() ? [{ name: productName.trim(), description: productDesc.trim() || null, price_range: priceRange.trim() || null }] : null,
      status: 'draft',
    }).select('id').single()

    if (brandErr || !brand) {
      setErrors({ submit: brandErr?.message || 'Failed to create brand' })
      setSaving(false)
      return
    }

    const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
      brand_id: brand.id, name: campaignName.trim(), type: 'funnel', status: 'draft',
    }).select('id').single()

    if (campErr || !campaign) {
      setErrors({ submit: campErr?.message || 'Failed to create campaign' })
      setSaving(false)
      return
    }

    sessionStorage.setItem('attomik_draft_brand_id', brand.id)
    sessionStorage.setItem('attomik_draft_campaign_id', campaign.id)

    // Redirect immediately — images upload silently in background
    router.push(`/preview/${campaign.id}`)

    // Fire and forget — user is already seeing MagicModal animations
    uploadImagesInBackground(brand.id)
  }

  // ── Step 1 content ──────────────────────────────────────────────
  const step1Content = !detected ? (
    // STATE A: Enter website
    <div className="space-y-4">
      <div>
        <input className={inputCls + ' !py-3 !text-base'} value={website}
          onChange={e => setWebsite(e.target.value)}
          placeholder="https://yourbrand.com"
          onKeyDown={e => e.key === 'Enter' && analyzeWebsite()} />
        {errors.website && <p className="text-danger text-sm mt-1">{errors.website}</p>}
      </div>
      <button onClick={analyzeWebsite} disabled={detecting}
        className="w-full flex items-center justify-center gap-2 text-base font-bold py-3 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: '#00ff97', color: '#000' }}>
        {detecting ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : 'Analyze my site →'}
      </button>
      <button onClick={skipToManual} className="text-sm text-muted hover:text-ink transition-colors cursor-pointer w-full text-center">
        or set up manually →
      </button>
    </div>
  ) : (
    // STATE B: Brand reveal
    <div key="review" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
      {/* Tiny back link */}
      <button onClick={() => { setDetected(false); setDetectedName(null) }} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 16, fontWeight: 700, color: '#00ff97', background: 'none',
        border: 'none', cursor: 'pointer', marginBottom: 16,
        padding: 0,
      }}>
        <ArrowLeft size={14} /> Back to website detection
      </button>

      {/* Brand identity card */}
      <div style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
        position: 'relative',
        minHeight: 140,
        background: primaryColor || '#111',
      }}>
        <div style={{ position: 'relative', zIndex: 1, padding: '16px 18px', display: 'flex', alignItems: 'stretch', gap: 16 }}>
          {/* Left: brand info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 900,
              fontSize: 38,
              color: '#fff',
              letterSpacing: '-0.02em',
              marginBottom: 16,
              lineHeight: 1.1,
              textTransform: (fontTransform || 'none') as React.CSSProperties['textTransform'],
            }}>
              {brandName || 'Your Brand'}
            </div>
            {/* Colors row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Primary', value: primaryColor },
                { label: 'Secondary', value: secondaryColor },
                { label: 'Accent', value: accentColor },
              ].filter(c => c.value).map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: value!, border: '3px solid rgba(255,255,255,0.4)',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.3)',
                    outline: '2px solid rgba(255,255,255,0.15)', outlineOffset: '2px',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
                    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  }}>{label}</span>
                </div>
              ))}
            </div>
            {/* Font + detected row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {brandFont && (
                <div style={{
                  background: 'rgba(255,255,255,0.15)', borderRadius: 20,
                  padding: '5px 14px', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                }}>{brandFont}</div>
              )}
              <div style={{
                background: 'rgba(0,255,151,0.15)', border: '1px solid rgba(0,255,151,0.4)',
                borderRadius: 20, padding: '5px 14px', fontSize: 13, color: '#00ff97', fontWeight: 700,
                marginLeft: 'auto',
              }}>
                {detectedName ? '✦ Detected' : '✦ Manual'}
              </div>
            </div>
          </div>

          {/* Right: detected image — full bleed */}
          {detectedImage && (
            <div style={{
              width: 130, flexShrink: 0,
              alignSelf: 'stretch',
              borderRadius: '0 12px 12px 0',
              overflow: 'hidden',
              margin: '-16px -18px -16px 0',
            }}>
              <img src={detectedImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { e.currentTarget.parentElement!.style.display = 'none' }} />
            </div>
          )}
        </div>
      </div>

      {/* Detected images strip */}
      {detectedImages.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#999',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Detected images ({Math.min(detectedImages.length, 8)})
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, minHeight: 80 }}>
            {detectedImages.slice(0, 8).map((img, i) => (
              <img key={i} src={img.url} alt="" style={{
                width: 80, height: 80, objectFit: 'cover', borderRadius: 8,
                border: '1px solid var(--border)', flexShrink: 0,
              }} onError={e => { e.currentTarget.style.display = 'none' }} />
            ))}
          </div>
        </div>
      )}

      {/* Editable fields — compact 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Brand name *</label>
          <input className={inputCls} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Afterdream" />
          {errors.brandName && <p className="text-danger text-sm mt-1">{errors.brandName}</p>}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Website</label>
          <input className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Brand font</label>
          <input className={inputCls} value={brandFont} onChange={e => setBrandFont(e.target.value)} placeholder="Fraunces, Barlow..." />
        </div>
      </div>

      {/* Color inputs label */}
      <div style={{ marginBottom: 10, marginTop: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
          Pick your brand colors
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)' }}>
          For a better preview — edit anything we detected.
        </div>
      </div>

      {/* Color inputs — 3 swatches */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
        {[
          { label: 'Primary', value: primaryColor, set: setPrimaryColor, id: 'color-primary' },
          { label: 'Secondary', value: secondaryColor, set: setSecondaryColor, id: 'color-secondary' },
          { label: 'Accent', value: accentColor, set: setAccentColor, id: 'color-accent' },
        ].map(({ label, value, set, id }) => (
          <div key={id}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: value || '#000', border: '1px solid var(--border)',
                flexShrink: 0, cursor: 'pointer',
              }} onClick={() => (document.getElementById(id) as HTMLInputElement)?.click()} />
              <input id={id} type="color" value={value || '#000000'} onChange={e => set(e.target.value)}
                style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
              <input className={inputCls + ' font-mono'} style={{ fontSize: 13, padding: '6px 8px' }}
                value={value} placeholder="#000000" onChange={e => set(e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const steps = [
    {
      title: detected ? 'Review your brand' : "Let's find your brand",
      subtitle: detected ? 'Edit anything below before continuing.' : "Enter your website and we'll pull in your brand automatically.",
      content: step1Content,
    },
    {
      title: 'Your product & audience',
      subtitle: detectedProducts.length > 0 && !showManualProduct
        ? 'Pick the product you want to market first.'
        : 'Just add one product for now — you can add more later and change any of this anytime.',
      content: (
        <div className="space-y-4" style={{ textAlign: 'center' }}>
          {/* Product picker — shown when products detected and not in manual mode */}
          {detectedProducts.length > 0 && !showManualProduct ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#000', marginBottom: 16 }}>Tap to select your hero product</div>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#444', marginBottom: 12 }}>We found {detectedProducts.length} {detectedProducts.length === 1 ? 'product' : 'products'}. Select one for your first campaign.</p>
              <div className="grid grid-cols-2 gap-3" style={{ textAlign: 'left' }}>
                {detectedProducts.map((p, idx) => (
                  <button key={idx} onClick={() => selectProduct(idx)}
                    className="rounded-card p-3 text-left transition-all cursor-pointer"
                    style={{ border: selectedProductIdx === idx ? '2px solid #00ff97' : '2px solid #e0e0e0', background: selectedProductIdx === idx ? 'rgba(0,255,151,0.05)' : 'transparent' }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full aspect-square object-cover rounded-btn mb-2" />
                    ) : (
                      <div className="w-full aspect-square bg-cream rounded-btn mb-2 flex items-center justify-center text-2xl font-black text-muted">
                        {p.name?.[0] || '?'}
                      </div>
                    )}
                    <div style={{ fontSize: 17, fontWeight: 700 }} className="truncate">{p.name}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      {p.price && <span style={{ fontSize: 16 }} className="text-muted">${p.price}</span>}
                      <span className="font-semibold" style={{ fontSize: 12, color: selectedProductIdx === idx ? '#00cc6a' : '#ccc' }}>
                        {selectedProductIdx === idx ? '✓ Selected' : 'Tap to select'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {errors.productName && <p className="text-danger text-sm">{errors.productName}</p>}
              <button onClick={switchToManualProduct} className="text-sm text-muted hover:text-ink transition-colors cursor-pointer w-full text-center mt-1">
                or add a different product →
              </button>
            </>
          ) : (
            /* Manual product entry */
            <>
              <div>
                <label className="text-sm font-semibold block mb-1">Product name *</label>
                <input className={inputCls} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Dream Blend Coffee" />
                {errors.productName && <p className="text-danger text-sm mt-1">{errors.productName}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">Single unit price</label>
                <input className={inputCls} value={priceRange} onChange={e => setPriceRange(e.target.value)} placeholder="$24" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1">One-line description</label>
                <input className={inputCls} value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="Organic single-origin pour-over coffee" />
              </div>
            </>
          )}

          {/* Shared fields */}
          {/* Image uploads + detected product image */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                Product images
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', marginLeft: 8 }}>optional</span>
              </div>
              <div style={{ fontSize: 16, color: 'var(--muted)' }}>
                Add images for a better preview — you can always do this later too.
              </div>
            </div>
            {productImageUrl && (
              <div className="flex items-center gap-2 mb-2">
                <img src={productImageUrl} alt="" className="w-14 h-14 object-cover rounded-btn border border-border" />
                <span className="text-sm text-muted">from site</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => setImageFiles(Array.from(e.target.files || []))} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-base text-muted hover:text-ink transition-colors border border-dashed border-border rounded-btn px-4 py-3 w-full justify-center">
              <Upload size={14} />
              {imageFiles.length > 0 ? `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} selected` : 'Choose images'}
            </button>
          </div>
        </div>
      ),
    },
    {
      title: 'Almost there',
      subtitle: "We'll generate your full funnel automatically — ad copy, landing page brief, and creatives.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1">Campaign name *</label>
            <input className={inputCls} value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Spring Launch — Premium Taste" />
            {errors.campaignName && <p className="text-danger text-sm mt-1">{errors.campaignName}</p>}
          </div>
          {errors.submit && <p className="text-danger text-sm">{errors.submit}</p>}
        </div>
      ),
    },
  ]

  const current = steps[step]
  // On step 0 STATE A, hide Next — the Analyze button handles progression
  const showNext = step > 0 || detected

  return (
    <div className="fixed inset-0 bg-ink z-50 flex flex-col items-center justify-center">
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Logo above card */}
      <div className="flex justify-center mb-8">
        <AttomikLogo height={38} color="#ffffff" />
      </div>

      <div className="max-w-lg w-full bg-paper rounded-card p-8 mx-4 max-h-[90vh] overflow-y-auto">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i === step ? '#00ff97' : 'transparent',
              border: i === step ? '2px solid #00ff97' : '2px solid #ddd',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>

        <h2 className="text-center uppercase tracking-tight" style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 4 }}>{current.title}</h2>
        <p className="text-muted text-base mb-6 text-center">{current.subtitle}</p>

        {current.content}

        {/* Navigation */}
        {showNext && (
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button onClick={back} className="text-base text-muted hover:text-ink transition-colors font-semibold">Back</button>
            ) : <div />}

            {step < 2 ? (
              <button onClick={next}
                className="text-base font-bold px-6 py-2.5 rounded-btn transition-opacity hover:opacity-90"
                style={{ background: '#00ff97', color: '#000' }}>
                Next
              </button>
            ) : (
              <button onClick={submit} disabled={saving}
                className="flex items-center gap-2 text-base font-bold px-6 py-2.5 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#00ff97', color: '#000' }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Creating your funnel...' : 'Launch my funnel →'}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
