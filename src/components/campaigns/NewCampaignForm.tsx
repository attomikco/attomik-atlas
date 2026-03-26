'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Product } from '@/types'
import { Loader2, ChevronDown } from 'lucide-react'

const TYPES = [
  { value: 'funnel', label: 'Funnel — creative + ad copy + landing brief' },
  { value: 'ad_copy', label: 'Ad copy' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social' },
  { value: 'seo', label: 'SEO' },
  { value: 'dtc_brief', label: 'DTC strategy brief' },
]

const ALL_CATALOG = '__all__'

interface Brand {
  id: string
  name: string
  primary_color: string | null
  products: Product[] | null
  target_audience: string | null
}

function formatProduct(p: Product) {
  return `${p.name}${p.price_range ? ` ($${p.price_range})` : ''}${p.description ? ` — ${p.description}` : ''}`
}

function buildOffer(brand: Brand | undefined, productSelection: string) {
  if (!brand?.products?.length) return ''
  if (productSelection === ALL_CATALOG) {
    return brand.products.map(formatProduct).join('\n')
  }
  const p = brand.products.find(pr => pr.name === productSelection)
  return p ? formatProduct(p) : ''
}

export default function NewCampaignForm({ brands, defaultBrandId }: { brands: Brand[]; defaultBrandId?: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialBrand = brands.find(b => b.id === (defaultBrandId || brands[0]?.id))

  const [form, setForm] = useState({
    brand_id: defaultBrandId || brands[0]?.id || '',
    name: '',
    type: 'funnel',
    angle: '',
    goal: '',
    key_message: '',
    offer: '',
    audience_notes: initialBrand?.target_audience || '',
  })
  const [productSelection, setProductSelection] = useState(ALL_CATALOG)

  const brand = brands.find(b => b.id === form.brand_id)
  const products = brand?.products ?? []

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function onBrandChange(brandId: string) {
    const b = brands.find(br => br.id === brandId)
    setProductSelection(ALL_CATALOG)
    setForm(f => ({
      ...f,
      brand_id: brandId,
      offer: buildOffer(b, ALL_CATALOG),
      audience_notes: b?.target_audience || '',
    }))
  }

  function onProductChange(val: string) {
    setProductSelection(val)
    setForm(f => ({ ...f, offer: buildOffer(brand, val) }))
  }

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  async function submit() {
    if (!form.brand_id || !form.name) return
    setSaving(true)
    setError(null)

    const { data, error: err } = await supabase.from('campaigns').insert({
      brand_id: form.brand_id,
      name: form.name,
      type: form.type,
      angle: form.angle || null,
      goal: form.goal || null,
      key_message: form.key_message || null,
      offer: form.offer || null,
      audience_notes: form.audience_notes || null,
    }).select('id').single()

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push(`/campaigns/${data.id}`)
  }

  return (
    <div className="bg-paper border border-border rounded-card p-6 space-y-5">
      {/* Brand + Type row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label block mb-1.5">Brand *</label>
          <div className="relative">
            <select value={form.brand_id} onChange={e => onBrandChange(e.target.value)} className={inputCls + ' pr-8 appearance-none'}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="label block mb-1.5">Type</label>
          <div className="relative">
            <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls + ' pr-8 appearance-none'}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Campaign name */}
      <div>
        <label className="label block mb-1.5">Campaign name *</label>
        <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Luxury Premium Taste — Spring 2026" />
      </div>

      {/* Angle — shown for funnel type */}
      {form.type === 'funnel' && (
        <div>
          <label className="label block mb-1.5">Angle / concept</label>
          <input className={inputCls} value={form.angle} onChange={e => set('angle', e.target.value)}
            placeholder="e.g. Luxury Premium Taste" />
          <p className="text-xs text-muted mt-1">The creative concept that ties the whole funnel together.</p>
        </div>
      )}

      {/* Product selector */}
      <div>
        <label className="label block mb-1.5">Product focus</label>
        {products.length > 0 ? (
          <div className="relative">
            <select value={productSelection} onChange={e => onProductChange(e.target.value)} className={inputCls + ' pr-8 appearance-none'}>
              <option value={ALL_CATALOG}>All catalog ({products.length} products)</option>
              {products.map(p => (
                <option key={p.name} value={p.name}>{p.name}{p.price_range ? ` — $${p.price_range}` : ''}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        ) : (
          <p className="text-xs text-muted">No products set up for this brand. Add them in brand details.</p>
        )}
      </div>

      {/* Offer — auto-filled from product selection, editable */}
      <div>
        <label className="label block mb-1.5">Offer details</label>
        <textarea className={inputCls + ' resize-none'} rows={3} value={form.offer} onChange={e => set('offer', e.target.value)}
          placeholder="Auto-filled from product selection. Add pricing, discounts, or promo details." />
      </div>

      <div>
        <label className="label block mb-1.5">Key message</label>
        <textarea className={inputCls + ' resize-none'} rows={2} value={form.key_message} onChange={e => set('key_message', e.target.value)}
          placeholder="The core value proposition in one sentence" />
      </div>

      <div>
        <label className="label block mb-1.5">Goal</label>
        <input className={inputCls} value={form.goal} onChange={e => set('goal', e.target.value)}
          placeholder="e.g. Drive conversions on spring collection launch" />
      </div>

      <div>
        <label className="label block mb-1.5">Audience notes</label>
        <textarea className={inputCls + ' resize-none'} rows={2} value={form.audience_notes} onChange={e => set('audience_notes', e.target.value)}
          placeholder="Who is this for?" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button onClick={submit} disabled={saving || !form.brand_id || !form.name}
        className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ background: '#00ff97', color: '#000' }}>
        {saving ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : 'Create campaign'}
      </button>
    </div>
  )
}
