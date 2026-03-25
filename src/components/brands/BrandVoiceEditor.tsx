'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brand } from '@/types'
import { Check, Loader2 } from 'lucide-react'

export default function BrandVoiceEditor({ brand }: { brand: Brand }) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    brand_voice:     brand.brand_voice || '',
    target_audience: brand.target_audience || '',
    tone_keywords:   brand.tone_keywords?.join(', ') || '',
    avoid_words:     brand.avoid_words?.join(', ') || '',
    website:         brand.website || '',
    primary_color:   brand.primary_color || '',
    secondary_color: brand.secondary_color || '',
    accent_color:    brand.accent_color || '',
    logo_url:        brand.logo_url || '',
    font_primary:    brand.font_primary || '',
    font_secondary:  brand.font_secondary || '',
  })

  // Load Google Fonts for preview
  useEffect(() => {
    const fonts = [form.font_primary, form.font_secondary].filter(Boolean)
    if (fonts.length === 0) return
    const families = fonts.map(f => f.replace(/ /g, '+')).join('&family=')
    const id = 'brand-fonts-link'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`
  }, [form.font_primary, form.font_secondary])

  async function save() {
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('brands').update({
      brand_voice:     form.brand_voice || null,
      target_audience: form.target_audience || null,
      tone_keywords:   form.tone_keywords ? form.tone_keywords.split(',').map(s => s.trim()).filter(Boolean) : null,
      avoid_words:     form.avoid_words ? form.avoid_words.split(',').map(s => s.trim()).filter(Boolean) : null,
      website:         form.website || null,
      primary_color:   form.primary_color || null,
      secondary_color: form.secondary_color || null,
      accent_color:    form.accent_color || null,
      logo_url:        form.logo_url || null,
      font_primary:    form.font_primary || null,
      font_secondary:  form.font_secondary || null,
    }).eq('id', brand.id)
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  return (
    <div className="bg-paper border border-border rounded-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="label">Brand voice & identity</div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-btn transition-colors disabled:opacity-50"
          style={{ background: saving || saved ? '#e6fff5' : '#000', color: saving || saved ? '#007a48' : '#00ff97' }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label block mb-1.5">Website</label>
          <input className={inputCls} value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://brand.com" />
        </div>
        <div>
          <label className="label block mb-1.5">Brand voice</label>
          <textarea className={inputCls + ' resize-none'} rows={3} value={form.brand_voice}
            onChange={e => setForm(f => ({ ...f, brand_voice: e.target.value }))}
            placeholder="How does this brand speak? e.g. witty but never try-hard, warm and direct, premium without being cold..." />
        </div>
        <div>
          <label className="label block mb-1.5">Target audience</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.target_audience}
            onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
            placeholder="e.g. millennial women 25–35 who love wine and entertaining" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label block mb-1.5">Tone keywords</label>
            <input className={inputCls} value={form.tone_keywords}
              onChange={e => setForm(f => ({ ...f, tone_keywords: e.target.value }))}
              placeholder="playful, premium, approachable" />
          </div>
          <div>
            <label className="label block mb-1.5">Words to avoid</label>
            <input className={inputCls} value={form.avoid_words}
              onChange={e => setForm(f => ({ ...f, avoid_words: e.target.value }))}
              placeholder="cheap, discount, basic" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['primary_color','secondary_color','accent_color'] as const).map((key) => (
            <div key={key}>
              <label className="label block mb-1.5">
                {key === 'primary_color' ? 'Primary color' : key === 'secondary_color' ? 'Secondary' : 'Accent'}
              </label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-btn border border-border flex-shrink-0"
                  style={{ background: form[key] || '#f2f2f2' }} />
                <input className={inputCls + ' font-mono'} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="#000000" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label block mb-1.5">Primary font</label>
            <input className={inputCls} value={form.font_primary}
              onChange={e => setForm(f => ({ ...f, font_primary: e.target.value }))}
              placeholder="Barlow" />
            {form.font_primary && (
              <p className="text-xs mt-1" style={{ fontFamily: form.font_primary }}>Preview: The quick brown fox</p>
            )}
          </div>
          <div>
            <label className="label block mb-1.5">Secondary font</label>
            <input className={inputCls} value={form.font_secondary}
              onChange={e => setForm(f => ({ ...f, font_secondary: e.target.value }))}
              placeholder="Georgia" />
            {form.font_secondary && (
              <p className="text-xs mt-1" style={{ fontFamily: form.font_secondary }}>Preview: The quick brown fox</p>
            )}
          </div>
        </div>
        <div>
          <label className="label block mb-1.5">Logo URL</label>
          <div className="flex items-center gap-3">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo preview" className="w-10 h-10 rounded-btn border border-border object-contain flex-shrink-0" />
            )}
            <input className={inputCls} value={form.logo_url}
              onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://brand.com/logo.png" />
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-danger mt-4">{error}</p>}
    </div>
  )
}
