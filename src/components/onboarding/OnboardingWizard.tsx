'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, ArrowLeft } from 'lucide-react'

const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState('Creating…')
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

  async function submit() {
    if (!validate()) return
    setSaving(true)
    setSavingLabel('Creating brand…')

    const slug = brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6)

    const { data: brand, error: brandErr } = await supabase.from('brands').insert({
      name: brandName.trim(),
      slug,
      website: website.trim() || null,
      industry: category.trim() || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      accent_color: accentColor || null,
      font_primary: brandFont ? `${brandFont}|700|${fontTransform}` : null,
      font_heading: brandFont ? { family: brandFont, weight: '700', transform: fontTransform, letterSpacing: fontLetterSpacing } : null,
      target_audience: targetAudience.trim() || null,
      products: productName.trim() ? [{ name: productName.trim(), description: productDesc.trim() || null, price_range: priceRange.trim() || null }] : null,
      status: 'active',
    }).select('id').single()

    if (brandErr || !brand) {
      setErrors({ submit: brandErr?.message || 'Failed to create brand' })
      setSaving(false)
      return
    }

    if (imageFiles.length > 0 || productImageUrl) {
      setSavingLabel('Uploading images…')
      // Upload manually selected files
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const storagePath = `${brand.id}/${fileName}`
        const { error: uploadErr } = await supabase.storage.from('brand-images').upload(storagePath, file, { contentType: file.type })
        if (!uploadErr) {
          await supabase.from('brand_images').insert({
            brand_id: brand.id, file_name: file.name, storage_path: storagePath,
            tag: 'product', mime_type: file.type, size_bytes: file.size,
          })
        }
      }
      // Download and upload detected product image
      if (productImageUrl) {
        try {
          const imgRes = await fetch(productImageUrl)
          if (imgRes.ok) {
            const blob = await imgRes.blob()
            const ext = productImageUrl.split('.').pop()?.split('?')[0] || 'jpg'
            const fileName = `${Date.now()}-product.${ext}`
            const storagePath = `${brand.id}/${fileName}`
            const { error: uploadErr } = await supabase.storage.from('brand-images').upload(storagePath, blob, { contentType: blob.type || 'image/jpeg' })
            if (!uploadErr) {
              await supabase.from('brand_images').insert({
                brand_id: brand.id, file_name: fileName, storage_path: storagePath,
                tag: 'product', mime_type: blob.type || 'image/jpeg', size_bytes: blob.size,
              })
            }
          }
        } catch {}
      }
    }

    setSavingLabel('Creating campaign…')
    const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
      brand_id: brand.id, name: campaignName.trim(), type: 'funnel', status: 'draft',
    }).select('id').single()

    if (campErr || !campaign) {
      setErrors({ submit: campErr?.message || 'Failed to create campaign' })
      setSaving(false)
      return
    }

    router.push(`/campaigns/${campaign.id}?new=1`)
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
        {errors.website && <p className="text-danger text-xs mt-1">{errors.website}</p>}
      </div>
      <button onClick={analyzeWebsite} disabled={detecting}
        className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: '#00ff97', color: '#000' }}>
        {detecting ? <><Loader2 size={15} className="animate-spin" /> Analyzing...</> : 'Analyze my site →'}
      </button>
      <button onClick={skipToManual} className="text-xs text-muted hover:text-ink transition-colors cursor-pointer w-full text-center">
        or set up manually →
      </button>
    </div>
  ) : (
    // STATE B: Review detected brand
    <div key="review" className="space-y-4" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
      <button onClick={() => { setDetected(false); setDetectedName(null) }}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-2">
        <ArrowLeft size={14} /> Back to website detection
      </button>
      {detectedName ? (
        <p className="text-xs font-medium mb-4" style={{ color: '#00cc6a' }}>✦ Found {detectedName}. Review and continue.</p>
      ) : (
        <p className="text-xs text-muted mb-4">Couldn&apos;t read the site — fill in manually.</p>
      )}

      {detectedImage && (
        <div className="mb-3">
          <span className="text-xs text-muted block mb-1">Detected image</span>
          <img src={detectedImage} alt="" className="w-20 h-20 object-cover rounded-btn border border-border" />
        </div>
      )}

      <div>
        <label className="text-xs font-semibold block mb-1">Brand name *</label>
        <input className={inputCls} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Afterdream" />
        {errors.brandName && <p className="text-danger text-xs mt-1">{errors.brandName}</p>}
      </div>
      <div>
        <label className="text-xs font-semibold block mb-1">Website</label>
        <input className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" />
      </div>
      <div>
        <label className="text-xs font-semibold block mb-1">Product category</label>
        <input className={inputCls} value={category} onChange={e => setCategory(e.target.value)} placeholder="Coffee, Skincare, Wine…" />
      </div>
      {brandFont && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1">Brand font</label>
            <input className={inputCls} value={brandFont} onChange={e => setBrandFont(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5">Font style</label>
            <div className="flex gap-2">
              <div className="flex gap-1">
                {([
                  { label: 'Normal', value: 'none' as const },
                  { label: 'ALL CAPS', value: 'uppercase' as const },
                  { label: 'all lower', value: 'lowercase' as const },
                  { label: 'Title Case', value: 'capitalize' as const },
                ]).map(t => (
                  <button key={t.value} onClick={() => setFontTransform(t.value)}
                    className="px-3 py-1.5 text-xs font-medium border rounded-btn transition-all"
                    style={fontTransform === t.value
                      ? { background: '#111', color: '#fff', borderColor: '#111' }
                      : { borderColor: '#ddd', color: '#888' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <span className="w-px bg-border" />
              <div className="flex gap-1">
                {([
                  { label: 'Tight', value: 'tight' as const },
                  { label: 'Normal', value: 'normal' as const },
                  { label: 'Wide', value: 'wide' as const },
                ]).map(s => (
                  <button key={s.value} onClick={() => setFontLetterSpacing(s.value)}
                    className="px-3 py-1.5 text-xs font-medium border rounded-btn transition-all"
                    style={fontLetterSpacing === s.value
                      ? { background: '#111', color: '#fff', borderColor: '#111' }
                      : { borderColor: '#ddd', color: '#888' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div>
        <label className="text-xs font-semibold block mb-2">Brand colors</label>
        <div className="flex gap-4">
          {[
            { label: 'Primary', value: primaryColor, set: setPrimaryColor },
            { label: 'Secondary', value: secondaryColor, set: setSecondaryColor },
            { label: 'Accent', value: accentColor, set: setAccentColor },
          ].map(c => (
            <div key={c.label} className="flex-1">
              <div style={{ width: 40, height: 40, borderRadius: 8, background: c.value || '#f2f2f2', border: '1px solid #ddd', marginBottom: 4 }} />
              <span className="text-[10px] text-muted block mb-1">{c.label}</span>
              <input className={inputCls + ' font-mono !text-xs !py-1.5'} value={c.value} onChange={e => c.set(e.target.value)} placeholder="#000000" />
            </div>
          ))}
        </div>
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
        <div className="space-y-4">
          {/* Product picker — shown when products detected and not in manual mode */}
          {detectedProducts.length > 0 && !showManualProduct ? (
            <>
              <div className="label mb-0.5">Tap to select your hero product</div>
              <p className="text-xs text-muted mb-3">We found {detectedProducts.length} products. Pick the one you want to market first.</p>
              <div className="grid grid-cols-2 gap-3">
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
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      {p.price && <span className="text-xs text-muted">${p.price}</span>}
                      <span className="text-[10px] font-semibold" style={{ color: selectedProductIdx === idx ? '#00cc6a' : '#ccc' }}>
                        {selectedProductIdx === idx ? '✓ Selected' : 'Tap to select'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {errors.productName && <p className="text-danger text-xs">{errors.productName}</p>}
              <button onClick={switchToManualProduct} className="text-xs text-muted hover:text-ink transition-colors cursor-pointer w-full text-center mt-1">
                or add a different product →
              </button>
            </>
          ) : (
            /* Manual product entry */
            <>
              <div>
                <label className="text-xs font-semibold block mb-1">Product name *</label>
                <input className={inputCls} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Dream Blend Coffee" />
                {errors.productName && <p className="text-danger text-xs mt-1">{errors.productName}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Single unit price</label>
                <input className={inputCls} value={priceRange} onChange={e => setPriceRange(e.target.value)} placeholder="$24" />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">One-line description</label>
                <input className={inputCls} value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="Organic single-origin pour-over coffee" />
              </div>
            </>
          )}

          {/* Shared fields */}
          <div>
            <label className="text-xs font-semibold block mb-1">Target audience</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Women 28–45 who value premium quality and mindful living" />
          </div>

          {/* Image uploads + detected product image */}
          <div>
            <label className="text-xs font-semibold block mb-1">Product images (optional)</label>
            {productImageUrl && (
              <div className="flex items-center gap-2 mb-2">
                <img src={productImageUrl} alt="" className="w-14 h-14 object-cover rounded-btn border border-border" />
                <span className="text-xs text-muted">from site</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => setImageFiles(Array.from(e.target.files || []))} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors border border-dashed border-border rounded-btn px-4 py-3 w-full justify-center">
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
            <label className="text-xs font-semibold block mb-1">Campaign name *</label>
            <input className={inputCls} value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Spring Launch — Premium Taste" />
            {errors.campaignName && <p className="text-danger text-xs mt-1">{errors.campaignName}</p>}
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
    <div className="fixed inset-0 bg-ink z-50 flex items-center justify-center">
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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

        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{current.title}</h2>
        <p className="text-muted text-sm mb-6">{current.subtitle}</p>

        {current.content}

        {/* Navigation */}
        {showNext && (
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button onClick={back} className="text-sm text-muted hover:text-ink transition-colors font-semibold">Back</button>
            ) : <div />}

            {step < 2 ? (
              <button onClick={next}
                className="text-sm font-bold px-6 py-2.5 rounded-btn transition-opacity hover:opacity-90"
                style={{ background: '#00ff97', color: '#000' }}>
                Next
              </button>
            ) : (
              <button onClick={submit} disabled={saving}
                className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#00ff97', color: '#000' }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? savingLabel : 'Launch my funnel →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
