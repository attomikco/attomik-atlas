'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const TYPES = [
  { value: 'funnel', label: 'Funnel — creative + ad copy + landing brief' },
  { value: 'ad_copy', label: 'Ad copy' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social' },
  { value: 'seo', label: 'SEO' },
  { value: 'dtc_brief', label: 'DTC strategy brief' },
]

const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 1
  const [brandName, setBrandName] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#000000')

  // Step 2
  const [productName, setProductName] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [toneKeywords, setToneKeywords] = useState('')

  // Step 3
  const [campaignType, setCampaignType] = useState('funnel')
  const [campaignName, setCampaignName] = useState('')
  const [angle, setAngle] = useState('')

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
    setStep(s => Math.min(s + 1, 2))
  }

  function back() {
    setErrors({})
    setStep(s => Math.max(s - 1, 0))
  }

  async function submit() {
    if (!validate()) return
    setSaving(true)

    const slug = brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // 1. Create brand
    const { data: brand, error: brandErr } = await supabase.from('brands').insert({
      name: brandName.trim(),
      slug,
      website: website.trim() || null,
      industry: category.trim() || null,
      primary_color: primaryColor || null,
      target_audience: targetAudience.trim() || null,
      tone_keywords: toneKeywords ? toneKeywords.split(',').map(s => s.trim()).filter(Boolean) : null,
      products: productName.trim() ? [{ name: productName.trim(), description: productDesc.trim() || null, price_range: priceRange.trim() || null }] : null,
      status: 'active',
    }).select('id').single()

    if (brandErr || !brand) {
      setErrors({ submit: brandErr?.message || 'Failed to create brand' })
      setSaving(false)
      return
    }

    // 2. Create campaign
    const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
      brand_id: brand.id,
      name: campaignName.trim(),
      type: campaignType,
      angle: angle.trim() || null,
      status: 'draft',
    }).select('id').single()

    if (campErr || !campaign) {
      setErrors({ submit: campErr?.message || 'Failed to create campaign' })
      setSaving(false)
      return
    }

    router.push(`/campaigns/${campaign.id}`)
  }

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
          <div>
            <label className="text-xs font-semibold block mb-1">Primary color</label>
            <div className="flex items-center gap-3">
              <div style={{ width: 36, height: 36, borderRadius: 6, background: primaryColor, border: '1px solid #ddd', flexShrink: 0 }} />
              <input className={inputCls + ' font-mono'} value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#000000" />
            </div>
          </div>
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
        </div>
      ),
    },
    {
      title: 'Your first campaign',
      subtitle: 'Let\'s create your first campaign to start generating content.',
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Campaign type</label>
            <select className={inputCls + ' appearance-none'} value={campaignType} onChange={e => setCampaignType(e.target.value)}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Campaign name *</label>
            <input className={inputCls} value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Spring Launch — Premium Taste" />
            {errors.campaignName && <p className="text-danger text-xs mt-1">{errors.campaignName}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Angle / hook</label>
            <textarea className={inputCls + ' resize-none'} rows={3} value={angle} onChange={e => setAngle(e.target.value)} placeholder="What's the angle or offer? e.g. Limited-time 20% off for new customers" />
          </div>
          {errors.submit && <p className="text-danger text-sm">{errors.submit}</p>}
        </div>
      ),
    },
  ]

  const current = steps[step]

  return (
    <div className="fixed inset-0 bg-ink z-50 flex items-center justify-center">
      <div className="max-w-lg w-full bg-paper rounded-card p-8 mx-4">
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
              {saving ? 'Creating…' : 'Create & launch →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
