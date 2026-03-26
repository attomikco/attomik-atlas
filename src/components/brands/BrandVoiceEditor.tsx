'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brand, FontStyle } from '@/types'
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
    accent_font_color: brand.accent_font_color || '',
    heading_color:   brand.heading_color || '',
    body_color:      brand.body_color || '',
    logo_url:        brand.logo_url || '',
    font_primary:    brand.font_primary || '',
    font_secondary:  brand.font_secondary || '',
  })
  const [fontHeading, setFontHeading] = useState<FontStyle>(() => {
    if (brand.font_heading) return brand.font_heading
    const parts = (brand.font_primary || '').split('|')
    return { family: parts[0] || '', weight: parts[1] || '700', transform: (parts[2] as FontStyle['transform']) || 'none' }
  })
  const [fontBody, setFontBody] = useState<FontStyle>(() => {
    if (brand.font_body) return brand.font_body
    const parts = (brand.font_secondary || '').split('|')
    return { family: parts[0] || '', weight: parts[1] || '400', transform: (parts[2] as FontStyle['transform']) || 'none' }
  })
  const [customFontsCss, setCustomFontsCss] = useState(brand.custom_fonts_css || '')
  const [defaultCopy, setDefaultCopy] = useState({
    default_headline: brand.default_headline || '',
    default_body_text: brand.default_body_text || '',
    default_cta: brand.default_cta || '',
  })

  // Load Google Fonts for preview
  useEffect(() => {
    const fonts = [fontHeading.family, fontBody.family].filter(Boolean)
    if (fonts.length === 0) return
    const families = Array.from(new Set(fonts)).map(f => f.replace(/ /g, '+')).join('&family=')
    const id = 'brand-fonts-link'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = `https://fonts.googleapis.com/css2?family=${families}:wght@400;500;600;700;800;900&display=swap`
    // Inject custom @font-face CSS if present
    const styleId = 'brand-custom-fonts'
    let style = document.getElementById(styleId) as HTMLStyleElement | null
    if (customFontsCss) {
      if (!style) { style = document.createElement('style'); style.id = styleId; document.head.appendChild(style) }
      style.textContent = customFontsCss
    } else if (style) {
      style.remove()
    }
  }, [fontHeading.family, fontBody.family, customFontsCss])

  async function save() {
    setSaving(true)
    setError(null)

    // Core fields (columns that always exist)
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
      font_primary:    fontHeading.family ? `${fontHeading.family}|${fontHeading.weight}|${fontHeading.transform}` : null,
      font_secondary:  fontBody.family ? `${fontBody.family}|${fontBody.weight}|${fontBody.transform}` : null,
    }).eq('id', brand.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    // Newer columns — separate call so core save works even if migration hasn't been applied yet
    const { error: err2 } = await supabase.from('brands').update({
      accent_font_color: form.accent_font_color || null,
      heading_color:     form.heading_color || null,
      body_color:        form.body_color || null,
      font_heading:      fontHeading.family ? fontHeading : null,
      font_body:         fontBody.family ? fontBody : null,
      custom_fonts_css:  customFontsCss || null,
      default_headline:  defaultCopy.default_headline || null,
      default_body_text: defaultCopy.default_body_text || null,
      default_cta:       defaultCopy.default_cta || null,
    }).eq('id', brand.id)

    if (err2) {
      setError('Colors saved, but text color columns are missing — run the Supabase migration.')
      setSaving(false)
      return
    }

    setSaving(false)
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
        <div>
          <label className="label block mb-2">Brand colors</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: 'primary_color' as const, label: 'Primary', hint: 'Main brand color' },
              { key: 'secondary_color' as const, label: 'Secondary', hint: 'Supporting color' },
              { key: 'accent_color' as const, label: 'Accent / CTA bg', hint: 'Buttons & highlights' },
              { key: 'accent_font_color' as const, label: 'CTA text color', hint: 'Text on CTA buttons' },
              { key: 'heading_color' as const, label: 'Heading text', hint: 'Title / headline color' },
              { key: 'body_color' as const, label: 'Body text', hint: 'Paragraph / body color' },
            ]).map(({ key, label, hint }) => (
              <div key={key} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-btn border border-border flex-shrink-0"
                  style={{ background: form[key] || '#f2f2f2' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-[10px] text-muted">{hint}</span>
                  </div>
                  <input className={inputCls + ' font-mono !py-1.5 mt-0.5'} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="#000000" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {[
          { label: 'Heading font', font: fontHeading, setFont: setFontHeading },
          { label: 'Body font', font: fontBody, setFont: setFontBody },
        ].map(({ label, font, setFont }) => (
          <div key={label}>
            <label className="label block mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
              <input className={inputCls} value={font.family}
                onChange={e => setFont(f => ({ ...f, family: e.target.value }))}
                placeholder="e.g. Helvetica, Inter, Playfair Display" />
              <select value={font.weight}
                onChange={e => setFont(f => ({ ...f, weight: e.target.value }))}
                className={inputCls + ' !w-28 flex-shrink-0 appearance-none'}>
                <option value="300">Light</option>
                <option value="400">Regular</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="800">Extra Bold</option>
                <option value="900">Black</option>
              </select>
              <select value={font.transform}
                onChange={e => setFont(f => ({ ...f, transform: e.target.value as FontStyle['transform'] }))}
                className={inputCls + ' !w-28 flex-shrink-0 appearance-none'}>
                <option value="none">Normal</option>
                <option value="uppercase">ALL CAPS</option>
                <option value="capitalize">Title Case</option>
                <option value="lowercase">lowercase</option>
              </select>
            </div>
            {font.family && (
              <p className="text-sm mt-1.5 text-muted"
                style={{ fontFamily: font.family, fontWeight: parseInt(font.weight), textTransform: font.transform }}>
                Preview: The quick brown fox jumps over the lazy dog
              </p>
            )}
          </div>
        ))}
        <div>
          <label className="label block mb-1.5">Custom fonts CSS</label>
          <textarea className={inputCls + ' resize-none font-mono text-xs'} rows={4} value={customFontsCss}
            onChange={e => setCustomFontsCss(e.target.value)}
            placeholder={'@font-face {\n  font-family: "MyFont";\n  src: url("https://...") format("opentype");\n}'} />
          <p className="text-[10px] text-muted mt-1">Paste @font-face rules for non-Google fonts. Use the font-family name in heading/body font above.</p>
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
        <div>
          <label className="label block mb-2">Default creative copy</label>
          <div className="space-y-2">
            <input className={inputCls} value={defaultCopy.default_headline}
              onChange={e => setDefaultCopy(f => ({ ...f, default_headline: e.target.value }))}
              placeholder="Default headline — e.g. Discover Your Brand" />
            <textarea className={inputCls + ' resize-none'} rows={2} value={defaultCopy.default_body_text}
              onChange={e => setDefaultCopy(f => ({ ...f, default_body_text: e.target.value }))}
              placeholder="Default body text — e.g. Premium quality crafted for you" />
            <input className={inputCls} value={defaultCopy.default_cta}
              onChange={e => setDefaultCopy(f => ({ ...f, default_cta: e.target.value }))}
              placeholder="Default CTA — e.g. Shop Now" />
          </div>
          <p className="text-[10px] text-muted mt-1">Pre-fills the creative builder when this brand is selected.</p>
        </div>
      </div>
      {error && <p className="text-sm text-danger mt-4">{error}</p>}
    </div>
  )
}
