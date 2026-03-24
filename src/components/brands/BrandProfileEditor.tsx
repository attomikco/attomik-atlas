'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brand, Competitor, Product, CustomerPersona } from '@/types'
import { Check, Loader2, Plus, Trash2, ChevronDown } from 'lucide-react'

export default function BrandProfileEditor({ brand }: { brand: Brand }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [mission, setMission] = useState(brand.mission || '')
  const [vision, setVision] = useState(brand.vision || '')
  const [values, setValues] = useState(brand.values?.join(', ') || '')
  const [competitors, setCompetitors] = useState<Competitor[]>(brand.competitors || [])
  const [products, setProducts] = useState<Product[]>(brand.products || [])
  const [personas, setPersonas] = useState<CustomerPersona[]>(brand.customer_personas || [])

  // Track which sections are open
  const [open, setOpen] = useState<Record<string, boolean>>({
    core: true,
    competitors: false,
    products: false,
    personas: false,
  })

  function toggle(key: string) {
    setOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function save() {
    setSaving(true)
    await supabase.from('brands').update({
      mission: mission || null,
      vision: vision || null,
      values: values ? values.split(',').map(s => s.trim()).filter(Boolean) : null,
      competitors: competitors.length > 0 ? competitors : [],
      products: products.length > 0 ? products : [],
      customer_personas: personas.length > 0 ? personas : [],
    }).eq('id', brand.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  function updateCompetitor(i: number, field: keyof Competitor, value: string) {
    setCompetitors(prev => prev.map((c, j) => j === i ? { ...c, [field]: value } : c))
  }

  function updateProduct(i: number, field: keyof Product, value: string) {
    setProducts(prev => prev.map((p, j) => j === i ? { ...p, [field]: value } : p))
  }

  function updatePersona(i: number, field: string, value: string) {
    setPersonas(prev => prev.map((p, j) => {
      if (j !== i) return p
      if (field === 'pain_points' || field === 'channels') {
        return { ...p, [field]: value.split(',').map(s => s.trim()).filter(Boolean) }
      }
      return { ...p, [field]: value }
    }))
  }

  const sectionCls = "border-t border-border pt-4"
  const headerCls = "flex items-center justify-between cursor-pointer select-none group"

  return (
    <div className="bg-paper border border-border rounded-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="label">Brand profile</div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-btn transition-colors disabled:opacity-50"
          style={{ background: saving || saved ? '#e6fff5' : '#000', color: saving || saved ? '#007a48' : '#00ff97' }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Core — Mission, Vision, Values */}
        <div>
          <div className={headerCls} onClick={() => toggle('core')}>
            <span className="text-sm font-semibold">Mission, vision & values</span>
            <ChevronDown size={14} className={`text-muted transition-transform ${open.core ? 'rotate-180' : ''}`} />
          </div>
          {open.core && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="label block mb-1.5">Mission</label>
                <textarea className={inputCls + ' resize-none'} rows={2} value={mission}
                  onChange={e => setMission(e.target.value)}
                  placeholder="Why does this brand exist? What problem does it solve?" />
              </div>
              <div>
                <label className="label block mb-1.5">Vision</label>
                <textarea className={inputCls + ' resize-none'} rows={2} value={vision}
                  onChange={e => setVision(e.target.value)}
                  placeholder="Where is this brand headed? What future does it see?" />
              </div>
              <div>
                <label className="label block mb-1.5">Values</label>
                <input className={inputCls} value={values}
                  onChange={e => setValues(e.target.value)}
                  placeholder="sustainability, inclusivity, transparency" />
                <p className="text-xs text-muted mt-1">Comma-separated</p>
              </div>
            </div>
          )}
        </div>

        {/* Competitors */}
        <div className={sectionCls}>
          <div className={headerCls} onClick={() => toggle('competitors')}>
            <span className="text-sm font-semibold">Competitors</span>
            <div className="flex items-center gap-2">
              {competitors.length > 0 && <span className="text-xs text-muted">{competitors.length}</span>}
              <ChevronDown size={14} className={`text-muted transition-transform ${open.competitors ? 'rotate-180' : ''}`} />
            </div>
          </div>
          {open.competitors && (
            <div className="space-y-3 mt-3">
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input className={inputCls} value={c.name} placeholder="Name"
                      onChange={e => updateCompetitor(i, 'name', e.target.value)} />
                    <input className={inputCls} value={c.website || ''} placeholder="Website"
                      onChange={e => updateCompetitor(i, 'website', e.target.value)} />
                    <input className={inputCls} value={c.notes || ''} placeholder="Notes (how they differ)"
                      onChange={e => updateCompetitor(i, 'notes', e.target.value)} />
                  </div>
                  <button onClick={() => setCompetitors(prev => prev.filter((_, j) => j !== i))}
                    className="text-muted hover:text-danger transition-colors mt-2.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => setCompetitors(prev => [...prev, { name: '' }])}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
                <Plus size={13} /> Add competitor
              </button>
            </div>
          )}
        </div>

        {/* Products / Services */}
        <div className={sectionCls}>
          <div className={headerCls} onClick={() => toggle('products')}>
            <span className="text-sm font-semibold">Products & services</span>
            <div className="flex items-center gap-2">
              {products.length > 0 && <span className="text-xs text-muted">{products.length}</span>}
              <ChevronDown size={14} className={`text-muted transition-transform ${open.products ? 'rotate-180' : ''}`} />
            </div>
          </div>
          {open.products && (
            <div className="space-y-3 mt-3">
              {products.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input className={inputCls} value={p.name} placeholder="Product name"
                        onChange={e => updateProduct(i, 'name', e.target.value)} />
                      <input className={inputCls} value={p.price_range || ''} placeholder="Price range"
                        onChange={e => updateProduct(i, 'price_range', e.target.value)} />
                      <input className={inputCls} value={p.url || ''} placeholder="URL"
                        onChange={e => updateProduct(i, 'url', e.target.value)} />
                    </div>
                    <input className={inputCls} value={p.description || ''} placeholder="Brief description"
                      onChange={e => updateProduct(i, 'description', e.target.value)} />
                  </div>
                  <button onClick={() => setProducts(prev => prev.filter((_, j) => j !== i))}
                    className="text-muted hover:text-danger transition-colors mt-2.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => setProducts(prev => [...prev, { name: '' }])}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
                <Plus size={13} /> Add product
              </button>
            </div>
          )}
        </div>

        {/* Customer Personas */}
        <div className={sectionCls}>
          <div className={headerCls} onClick={() => toggle('personas')}>
            <span className="text-sm font-semibold">Customer personas</span>
            <div className="flex items-center gap-2">
              {personas.length > 0 && <span className="text-xs text-muted">{personas.length}</span>}
              <ChevronDown size={14} className={`text-muted transition-transform ${open.personas ? 'rotate-180' : ''}`} />
            </div>
          </div>
          {open.personas && (
            <div className="space-y-4 mt-3">
              {personas.map((p, i) => (
                <div key={i} className="bg-cream rounded-btn p-4 relative">
                  <button onClick={() => setPersonas(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-3 right-3 text-muted hover:text-danger transition-colors">
                    <Trash2 size={13} />
                  </button>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input className={inputCls} value={p.name} placeholder="Persona name (e.g. Weekend Wino)"
                        onChange={e => updatePersona(i, 'name', e.target.value)} />
                      <input className={inputCls} value={p.age_range || ''} placeholder="Age range (e.g. 25-35)"
                        onChange={e => updatePersona(i, 'age_range', e.target.value)} />
                    </div>
                    <textarea className={inputCls + ' resize-none'} rows={2} value={p.description}
                      placeholder="Who are they? What do they care about?"
                      onChange={e => updatePersona(i, 'description', e.target.value)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input className={inputCls} value={p.pain_points?.join(', ') || ''}
                          placeholder="Pain points (comma-separated)"
                          onChange={e => updatePersona(i, 'pain_points', e.target.value)} />
                      </div>
                      <div>
                        <input className={inputCls} value={p.channels?.join(', ') || ''}
                          placeholder="Channels (Instagram, Email, TikTok)"
                          onChange={e => updatePersona(i, 'channels', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setPersonas(prev => [...prev, { name: '', description: '' }])}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
                <Plus size={13} /> Add persona
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
