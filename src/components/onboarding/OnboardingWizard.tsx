'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, ArrowLeft } from 'lucide-react'
import AttomikLogo from '@/components/ui/AttomikLogo'

const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1 — two states
  const [detecting, setDetecting] = useState(!!searchParams.get('url'))
  const [detected, setDetected] = useState(false)
  const [detectedName, setDetectedName] = useState<string | null>(null)
  const [detectedImage, setDetectedImage] = useState<string | null>(null)
  const [detectedLogo, setDetectedLogo] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [website, setWebsite] = useState(searchParams.get('url') || '')
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
  const [productName, setProductName] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null)
  const [targetAudience, setTargetAudience] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoAnalyzed = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [step, detected])

  // Auto-analyze if URL param provided
  useEffect(() => {
    if (searchParams.get('url') && !autoAnalyzed.current && !detected) {
      autoAnalyzed.current = true
      analyzeWebsite()
    }
  }, [])

  // Step 3
  const [campaignName, setCampaignName] = useState('')

  async function analyzeWebsite() {
    if (!website.trim()) { setErrors({ website: 'Enter a URL' }); return }
    setBrandName('')
    setPrimaryColor('#000000')
    setSecondaryColor('#ffffff')
    setAccentColor('#00ff97')
    setBrandFont('')
    setDetectedImage(null)
    setDetectedLogo(null)
    setDetectedProducts([])
    setDetectedImages([])
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
      if (data.logo) setDetectedLogo(data.logo)
      if (data.products?.length > 0) setDetectedProducts(data.products)
      if (data.images?.length > 0) setDetectedImages(data.images)
      setDetected(true)
    } catch {
      setBrandName('')
      setDetected(true)
    }
    setDetecting(false)
  }

  function skipToManual() {
    setDetected(true)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (step === 0 && !brandName.trim()) errs.brandName = 'Brand name is required'
    if (step === 1 && detectedProducts.length === 0 && !productName.trim()) errs.productName = 'Add a product name'
    if (step === 2 && !campaignName.trim()) errs.campaignName = 'Campaign name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (!validate()) return
    if (step === 1 && !campaignName) setCampaignName(`${brandName.trim()} — Launch Campaign`)
    setStep(s => Math.min(s + 1, 2))
  }

  function back() {
    setErrors({})
    setStep(s => Math.max(s - 1, 0))
  }

  async function uploadImagesInBackground(brandId: string) {
    // Upload detected logo to brand-assets
    if (detectedLogo) {
      try {
        const logoRes = await fetch('/api/brands/proxy-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: detectedLogo }) })
        if (logoRes.ok) {
          const blob = await logoRes.blob()
          const ext = detectedLogo.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'png'
          const path = `${brandId}/logo_dark.${ext}`
          const { error } = await supabase.storage.from('brand-assets').upload(path, blob, { contentType: blob.type || 'image/png', upsert: true })
          if (!error) {
            const { data } = supabase.storage.from('brand-assets').getPublicUrl(path)
            await supabase.from('brands').update({ logo_url: data.publicUrl }).eq('id', brandId)
          } else {
            await supabase.from('brands').update({ logo_url: detectedLogo }).eq('id', brandId)
          }
        } else {
          await supabase.from('brands').update({ logo_url: detectedLogo }).eq('id', brandId)
        }
      } catch {
        await supabase.from('brands').update({ logo_url: detectedLogo }).eq('id', brandId)
      }
    }

    // Upload manually selected files — parallel
    await Promise.allSettled(imageFiles.map(async (file) => {
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
      } catch {}
    }))
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
    // Upload scraped images from website — parallel (prepend OG image as lifestyle)
    const ogEntry: typeof detectedImages = detectedImage
      ? [{ url: detectedImage, tag: 'lifestyle' as const, score: 10 }]
      : []
    const allToUpload = [...ogEntry, ...detectedImages].slice(0, 9)
    await Promise.allSettled(allToUpload.map(async (img) => {
      try {
        const imgRes = await fetch('/api/brands/proxy-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: img.url }),
        })
        if (!imgRes.ok) return
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
      } catch {}
    }))
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
      accent_color: accentColor || null,
      font_primary: brandFont ? `${brandFont}|700|${fontTransform}` : null,
      font_heading: brandFont ? { family: brandFont, weight: '700', transform: fontTransform, letterSpacing: fontLetterSpacing } : null,
      logo_url: null,
      products: (() => {
        if (detectedProducts.length > 0) {
          return detectedProducts.map(p => ({
            name: p.name, description: p.description || null,
            price_range: p.price || null, image: p.image || null,
          }))
        }
        if (productName.trim()) {
          return [{ name: productName.trim(), description: productDesc.trim() || null, price_range: priceRange.trim() || null, image: null }]
        }
        return null
      })(),
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
    // STATE A: rendered in the hero layout above, not inside the card
    null
  ) : (
    // STATE B: Brand reveal
    <div key="review" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
      {/* Tiny back link */}
      <button onClick={() => { setDetected(false); setDetectedName(null) }} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 14, fontWeight: 700, color: '#00ff97', background: 'none',
        border: 'none', cursor: 'pointer', marginBottom: 16,
        padding: 0,
      }}>
        <ArrowLeft size={14} /> Back to website detection
      </button>

      {/* Brand identity card */}
      <div className="wiz-brand-row" style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16, display: 'flex', background: '#2a2a2a' }}>
        {/* Left: brand info */}
        <div className="wiz-brand-info" style={{ flex: '0 0 50%', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 24, color: '#fff', lineHeight: 1.1 }}>
            {brandName || 'Your Brand'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[
              { label: 'Primary', value: primaryColor },
              { label: 'Secondary', value: secondaryColor },
              { label: 'Accent', value: accentColor },
            ].filter(c => c.value).map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: value!, border: '2px solid rgba(255,255,255,0.15)' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {brandFont && (
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{brandFont}</div>
            )}
            <div style={{ background: 'rgba(0,255,151,0.12)', border: '1px solid rgba(0,255,151,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#00ff97', fontWeight: 700, marginLeft: 'auto' }}>
              {detectedName ? '✦ Detected' : '✦ Manual'}
            </div>
          </div>
        </div>
        {/* Right: OG image — full bleed */}
        {detectedImage && (
          <div className="wiz-brand-img" style={{ flex: '0 0 50%', overflow: 'hidden' }}>
            <img src={detectedImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
          </div>
        )}
      </div>

      {/* Detected images strip */}
      {detectedImages.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#999',
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
      <div className="wiz-field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Brand name *</label>
          <input className={inputCls} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Afterdream" />
          {errors.brandName && <p className="text-danger text-xs mt-1">{errors.brandName}</p>}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Website</label>
          <input className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Brand font</label>
          <input className={inputCls} value={brandFont} onChange={e => setBrandFont(e.target.value)} placeholder="Fraunces, Barlow..." />
        </div>
      </div>

      {/* Color inputs label */}
      <div style={{ marginBottom: 10, marginTop: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
          Pick your brand colors
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          For a better preview — edit anything we detected.
        </div>
      </div>

      {/* Color inputs — 3 swatches */}
      <div className="wiz-color-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
        {[
          { label: 'Primary', value: primaryColor, set: setPrimaryColor, id: 'color-primary' },
          { label: 'Secondary', value: secondaryColor, set: setSecondaryColor, id: 'color-secondary' },
          { label: 'Accent', value: accentColor, set: setAccentColor, id: 'color-accent' },
        ].map(({ label, value, set, id }) => (
          <div key={id}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: value || '#000', border: '1px solid var(--border)',
                flexShrink: 0, cursor: 'pointer',
              }} onClick={() => (document.getElementById(id) as HTMLInputElement)?.click()} />
              <input id={id} type="color" value={value || '#000000'} onChange={e => set(e.target.value)}
                style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} />
              <input className={inputCls + ' font-mono'} style={{ fontSize: 12, padding: '6px 8px' }}
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
      title: detectedProducts.length > 0 ? 'Your products' : 'Your product & audience',
      subtitle: detectedProducts.length > 0
        ? 'All saved to your brand. You can edit them in Brand Hub later.'
        : "Add your hero product below — you can always update this later.",
      content: (
        <div className="space-y-4" style={{ textAlign: 'center' }}>
          {detectedProducts.length > 0 ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24 }}>✦</div>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 8 }}>
                  We found {detectedProducts.length} {detectedProducts.length === 1 ? 'product' : 'products'}.
                </div>
                <div style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
                  All saved to your brand. You can edit them in Brand Hub after your funnel is ready.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
                {detectedProducts.slice(0, 8).map((p, i) => (
                  <div key={i} style={{ background: '#f8f8f8', borderRadius: 14, overflow: 'hidden', border: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      <div style={{ width: '100%', height: 140, background: 'linear-gradient(135deg, #f0f0f0, #e0e0e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#ccc' }}>◻</div>
                    )}
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 2, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {p.price && <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>${p.price}</span>}
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#00a86b', background: 'rgba(0,255,151,0.12)', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(0,255,151,0.2)', letterSpacing: '0.04em', textTransform: 'uppercase', marginLeft: 'auto' }}>✓ Saved</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {detectedProducts.length > 8 && (
                <div style={{ fontSize: 12, color: '#999', textAlign: 'center', padding: '8px 0 0', fontWeight: 600 }}>+{detectedProducts.length - 8} more saved to Brand Hub</div>
              )}
            </>
          ) : (
            <>
              <div style={{ background: '#fff8ed', border: '1px solid #fde8bb', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#92660a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                <span>💡</span>
                <span>Tip: if you&apos;re on Shopify, make sure your store is public and not password protected.</span>
              </div>
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

          {/* Image uploads */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
                Product images
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginLeft: 8 }}>optional</span>
              </div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                Add images for a better preview — you can always do this later too.
              </div>
            </div>
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
          {errors.submit && <p className="text-danger text-xs">{errors.submit}</p>}
        </div>
      ),
    },
  ]

  const current = steps[step]
  // On step 0 STATE A, hide Next — the Analyze button handles progression
  const showNext = step > 0 || detected

  const hasUrlParam = !!searchParams.get('url')
  const isHeroState = step === 0 && !detected && !hasUrlParam

  return (
    <div ref={scrollRef} className="fixed inset-0 bg-ink z-50 flex flex-col items-center wizard-scroll" style={{ padding: 'clamp(16px, 4vw, 80px) 16px', overflowY: 'auto' }}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .wizard-scroll::-webkit-scrollbar { display: none; }
        .wizard-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 600px) {
          .wiz-card { padding: 20px !important; }
          .wiz-brand-row { flex-direction: column !important; }
          .wiz-brand-img { flex: none !important; width: 100% !important; height: 140px !important; border-radius: 0 0 14px 14px !important; }
          .wiz-brand-info { flex: none !important; width: 100% !important; }
          .wiz-color-grid { grid-template-columns: 1fr 1fr !important; }
          .wiz-field-grid { grid-template-columns: 1fr !important; }
          .wiz-field-grid > div { grid-column: auto !important; }
          .wiz-product-grid { grid-template-columns: 1fr !important; }
          .wiz-nav { flex-direction: column !important; gap: 8px !important; }
          .wiz-nav button { width: 100% !important; text-align: center !important; }
          .wiz-subtext { font-size: 15px !important; }
        }
      `}</style>

      {/* ANALYZING STATE: URL param provided, waiting for detection */}
      {step === 0 && !detected && hasUrlParam && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20, minHeight: '60vh' }}>
          <AttomikLogo height={32} color="#ffffff" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 18, height: 18, border: '2.5px solid rgba(0,255,151,0.3)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Analyzing {website}...</span>
          </div>
        </div>
      )}

      {/* STATE A: Full-screen hero on black */}
      {isHeroState && (
        <>
          {/* Logo */}
          <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
            <AttomikLogo height={28} color="#ffffff" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '100%', margin: '0 auto', padding: '0 16px', paddingTop: 120, textAlign: 'center' }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.25)', borderRadius: 999, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: '#00ff97', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24 }}>
              ✦ AI-Powered Funnel Builder
            </div>

            {/* Big headline */}
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(32px, 8vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: '#fff', marginBottom: 20, textTransform: 'uppercase' as const }}>
              How much revenue are{' '}
              <span style={{ color: '#00ff97' }}>you leaving on the table?</span>
            </div>

            {/* Subtext */}
            <div style={{ fontSize: 17, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 36, maxWidth: 420 }}>
              Enter your website. We&apos;ll build a complete ad funnel in 30 seconds — creatives, copy, and landing page.
            </div>

            {/* Input + button */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyzeWebsite()}
                placeholder="https://yourbrand.com"
                autoFocus
                style={{ width: '100%', padding: '16px 20px', fontSize: 16, fontWeight: 500, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 14, color: '#fff', outline: 'none', textAlign: 'center' }}
                onFocus={e => { e.target.style.borderColor = '#00ff97'; e.target.style.background = 'rgba(255,255,255,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.08)' }}
              />
              {errors.website && <p style={{ color: '#ff4444', fontSize: 13, margin: 0 }}>{errors.website}</p>}
              <button
                onClick={analyzeWebsite}
                disabled={detecting || !website.trim()}
                style={{
                  width: '100%', padding: 17,
                  background: detecting || !website.trim() ? 'rgba(0,255,151,0.3)' : '#00ff97',
                  color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 17,
                  border: 'none', borderRadius: 14,
                  cursor: detecting || !website.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: '-0.01em', transition: 'background 0.2s ease',
                }}
              >
                {detecting ? (
                  <>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Analyzing your site...
                  </>
                ) : 'Build my funnel →'}
              </button>
            </div>

            {/* Skip */}
            <button onClick={skipToManual} style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', marginTop: 16, padding: 0 }}>
              or set up manually →
            </button>
          </div>
        </>
      )}

      {/* STATE B + Steps 1-2: White card */}
      {!isHeroState && (step > 0 || detected) && (
        <>
          {/* Logo above card */}
          <div className="flex justify-center mb-8">
            <AttomikLogo height={38} color="#ffffff" />
          </div>

          <div className="mx-4 wiz-card" style={{
            maxWidth: '100%', width: 'min(540px, calc(100vw - 32px))', background: '#fff',
            borderRadius: 16, padding: '32px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: 40, flexShrink: 0,
          }}>
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

        <h2 className="text-center uppercase tracking-tight" style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>{current.title}</h2>
        <p className="text-muted text-sm mb-6 text-center">{current.subtitle}</p>

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
                {saving ? 'Creating your funnel...' : 'Launch my funnel →'}
              </button>
            )}
          </div>
        )}

          </div>
        </>
      )}
    </div>
  )
}
