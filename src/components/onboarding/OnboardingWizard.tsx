'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload } from 'lucide-react'

const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savingLabel, setSavingLabel] = useState('Creating…')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1
  const [brandName, setBrandName] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [accentColor, setAccentColor] = useState('')

  // Step 2
  const [productName, setProductName] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 3
  const [campaignName, setCampaignName] = useState('')

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (step === 0 && !brandName.trim()) errs.brandName = 'Brand name is required'
    if (step === 1 && !productName.trim()) errs.productName = 'Product name is required'
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

  async function submit() {
    if (!validate()) return
    setSaving(true)
    setSavingLabel('Creating brand…')

    const slug = brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // 1. Create brand
    const { data: brand, error: brandErr } = await supabase.from('brands').insert({
      name: brandName.trim(),
      slug,
      website: website.trim() || null,
      industry: category.trim() || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor.trim() || null,
      accent_color: accentColor.trim() || null,
      target_audience: targetAudience.trim() || null,
      products: productName.trim() ? [{ name: productName.trim(), description: productDesc.trim() || null, price_range: priceRange.trim() || null }] : null,
      status: 'active',
    }).select('id').single()

    if (brandErr || !brand) {
      setErrors({ submit: brandErr?.message || 'Failed to create brand' })
      setSaving(false)
      return
    }

    // 2. Upload images
    if (imageFiles.length > 0) {
      setSavingLabel('Uploading images…')
      for (const file of imageFiles) {
        const ext = file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const storagePath = `${brand.id}/${fileName}`
        const { error: uploadErr } = await supabase.storage.from('brand-images').upload(storagePath, file, { contentType: file.type })
        if (!uploadErr) {
          await supabase.from('brand_images').insert({
            brand_id: brand.id,
            file_name: file.name,
            storage_path: storagePath,
            tag: 'product',
            mime_type: file.type,
            size_bytes: file.size,
          })
        }
      }
    }

    // 3. Create campaign
    setSavingLabel('Creating campaign…')
    const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
      brand_id: brand.id,
      name: campaignName.trim(),
      type: 'funnel',
      status: 'draft',
    }).select('id').single()

    if (campErr || !campaign) {
      setErrors({ submit: campErr?.message || 'Failed to create campaign' })
      setSaving(false)
      return
    }

    router.push(`/campaigns/${campaign.id}?new=1`)
  }

  const colorField = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <div>
      <label className="text-xs font-semibold block mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div style={{ width: 36, height: 36, borderRadius: 6, background: value || '#f2f2f2', border: '1px solid #ddd', flexShrink: 0 }} />
        <input className={inputCls + ' font-mono'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </div>
  )

  const steps = [
    {
      title: 'Set up your brand',
      subtitle: 'Tell us about your brand so we can create on-brand content.',
      content: (
        <div className="space-y-4">
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
          {colorField('Primary color', primaryColor, setPrimaryColor, '#000000')}
          {colorField('Secondary color', secondaryColor, setSecondaryColor, '#ffffff')}
          {colorField('Accent color', accentColor, setAccentColor, '#00ff97')}
        </div>
      ),
    },
    {
      title: 'Your product & audience',
      subtitle: 'Just add one product for now — you can add more later and change any of this anytime.',
      content: (
        <div className="space-y-4">
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
          <div>
            <label className="text-xs font-semibold block mb-1">Target audience</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Women 28–45 who value premium quality and mindful living" />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Product images (optional)</label>
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
      subtitle: 'We\'ll generate your full funnel automatically — ad copy, landing page brief, and creatives.',
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

  return (
    <div className="fixed inset-0 bg-ink z-50 flex items-center justify-center">
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

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{current.title}</h2>
        <p className="text-muted text-sm mb-6">{current.subtitle}</p>

        {/* Content */}
        {current.content}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <button onClick={back} className="text-sm text-muted hover:text-ink transition-colors font-semibold">
              Back
            </button>
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
      </div>
    </div>
  )
}
