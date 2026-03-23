'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function NewBrandForm() {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', website: '', industry: '', primary_color: '#000000', brand_voice: '', target_audience: '', tone_keywords: '' })

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors placeholder:text-[#bbb]"

  function toSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

  async function submit() {
    if (!form.name || !form.slug) { setError('Name and slug are required.'); return }
    setSaving(true); setError(null)
    const { data, error: err } = await supabase.from('brands').insert({
      name: form.name, slug: form.slug,
      website: form.website || null, industry: form.industry || null,
      primary_color: form.primary_color || null,
      brand_voice: form.brand_voice || null,
      target_audience: form.target_audience || null,
      tone_keywords: form.tone_keywords ? form.tone_keywords.split(',').map(s => s.trim()).filter(Boolean) : null,
      status: 'active',
    }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/brands/${data.id}`)
  }

  return (
    <div className="bg-paper border border-border rounded-card p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label block mb-1.5">Brand name *</label>
          <input className={inputCls} value={form.name} placeholder="Summer Water"
            onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: toSlug(e.target.value) }))} />
        </div>
        <div>
          <label className="label block mb-1.5">Slug *</label>
          <input className={inputCls + ' font-mono'} value={form.slug} placeholder="summer-water"
            onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label block mb-1.5">Website</label>
          <input className={inputCls} value={form.website} placeholder="https://brand.com"
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
        </div>
        <div>
          <label className="label block mb-1.5">Industry</label>
          <input className={inputCls} value={form.industry} placeholder="DTC Wine, DTC Coffee…"
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label block mb-1.5">Primary color</label>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-btn border border-border flex-shrink-0" style={{ background: form.primary_color }} />
            <input className={inputCls + ' font-mono'} value={form.primary_color} placeholder="#000000"
              onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} />
          </div>
        </div>
        <div className="col-span-2">
          <label className="label block mb-1.5">Tone keywords</label>
          <input className={inputCls} value={form.tone_keywords} placeholder="playful, premium, approachable"
            onChange={e => setForm(f => ({ ...f, tone_keywords: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="label block mb-1.5">Brand voice (optional — can add later)</label>
        <textarea className={inputCls + ' resize-none'} rows={3} value={form.brand_voice}
          placeholder="How does this brand speak?"
          onChange={e => setForm(f => ({ ...f, brand_voice: e.target.value }))} />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button onClick={submit} disabled={saving}
        className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: '#00ff97', color: '#000' }}
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? 'Creating…' : 'Create brand'}
      </button>
    </div>
  )
}
