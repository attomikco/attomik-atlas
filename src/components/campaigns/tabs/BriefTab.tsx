'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brand, Campaign, Product } from '@/types'
import { Check, Loader2, ChevronDown } from 'lucide-react'

const ALL_CATALOG = '__all__'

function formatProduct(p: Product) {
  return `${p.name}${p.price_range ? ` ($${p.price_range})` : ''}${p.description ? ` — ${p.description}` : ''}`
}

function buildOffer(products: Product[], selection: string) {
  if (!products.length) return ''
  if (selection === ALL_CATALOG) return products.map(formatProduct).join('\n')
  const p = products.find(pr => pr.name === selection)
  return p ? formatProduct(p) : ''
}

export default function BriefTab({ campaign, brand }: { campaign: Campaign; brand: Brand }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const products = brand.products ?? []

  // Try to match existing offer to a product for the dropdown
  const initialSelection = () => {
    if (!campaign.offer || !products.length) return ALL_CATALOG
    const match = products.find(p => campaign.offer?.includes(p.name))
    if (match) {
      // Check if it's just one product or all
      const allOffer = products.map(formatProduct).join('\n')
      if (campaign.offer === allOffer) return ALL_CATALOG
      return match.name
    }
    return ALL_CATALOG
  }

  const [productSelection, setProductSelection] = useState(initialSelection)
  const [form, setForm] = useState({
    name: campaign.name || '',
    angle: campaign.angle || '',
    goal: campaign.goal || '',
    key_message: campaign.key_message || '',
    offer: campaign.offer || '',
    audience_notes: campaign.audience_notes || '',
  })

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))
  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  function onProductChange(val: string) {
    setProductSelection(val)
    setForm(f => ({ ...f, offer: buildOffer(products, val) }))
  }

  async function save() {
    setSaving(true)
    await supabase.from('campaigns').update({
      name: form.name,
      angle: form.angle || null,
      goal: form.goal || null,
      key_message: form.key_message || null,
      offer: form.offer || null,
      audience_notes: form.audience_notes || null,
    }).eq('id', campaign.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-paper border border-border rounded-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="label">Campaign brief</div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-btn transition-colors disabled:opacity-50"
          style={{ background: saving || saved ? '#e6fff5' : '#000', color: saving || saved ? '#007a48' : '#00ff97' }}>
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label block mb-1.5">Campaign name</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        {campaign.type === 'funnel' && (
          <div>
            <label className="label block mb-1.5">Angle / concept</label>
            <input className={inputCls} value={form.angle} onChange={e => set('angle', e.target.value)}
              placeholder="The creative concept that ties the funnel together" />
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
            <p className="text-xs text-muted">No products set up for this brand.</p>
          )}
        </div>

        <div>
          <label className="label block mb-1.5">Offer details</label>
          <textarea className={inputCls + ' resize-none'} rows={3} value={form.offer}
            onChange={e => set('offer', e.target.value)} placeholder="Auto-filled from product selection. Add pricing, discounts, or promo details." />
        </div>

        <div>
          <label className="label block mb-1.5">Key message</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.key_message}
            onChange={e => set('key_message', e.target.value)} placeholder="Core value proposition" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Goal</label>
            <input className={inputCls} value={form.goal} onChange={e => set('goal', e.target.value)}
              placeholder="e.g. Drive conversions" />
          </div>
          <div>
            <label className="label block mb-1.5">Audience notes</label>
            <input className={inputCls} value={form.audience_notes} onChange={e => set('audience_notes', e.target.value)}
              placeholder="Override brand default audience" />
          </div>
        </div>
      </div>
    </div>
  )
}
