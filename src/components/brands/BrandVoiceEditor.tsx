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
    // Extended colors
    bg_base:         brand.bg_base || '',
    bg_dark:         brand.bg_dark || '',
    bg_secondary:    brand.bg_secondary || '',
    bg_accent:       brand.bg_accent || '',
    text_on_base:    brand.text_on_base || '',
    text_on_dark:    brand.text_on_dark || '',
    text_on_accent:  brand.text_on_accent || '',
    btn_primary:     brand.btn_primary || '',
    btn_primary_text: brand.btn_primary_text || '',
    btn_secondary:   brand.btn_secondary || '',
    btn_secondary_text: brand.btn_secondary_text || '',
    btn_tertiary:    brand.btn_tertiary || '',
    btn_tertiary_text: brand.btn_tertiary_text || '',
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

    try {
      // Step 1: Core fields only (original columns)
      const { error: err1 } = await supabase.from('brands').update({
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

      if (err1) { setError(`Core: ${err1.message}`); setSaving(false); return }

      // Step 2: Newer columns (may not exist)
      supabase.from('brands').update({
        accent_font_color: form.accent_font_color || null,
        heading_color: form.heading_color || null,
        body_color: form.body_color || null,
        font_heading: fontHeading.family ? fontHeading : null,
        font_body: fontBody.family ? fontBody : null,
        custom_fonts_css: customFontsCss || null,
        default_headline: defaultCopy.default_headline || null,
        default_body_text: defaultCopy.default_body_text || null,
        default_cta: defaultCopy.default_cta || null,
      }).eq('id', brand.id).then(({ error }) => {
        if (error) console.warn('Step 2 failed:', error.message)
      })

      // Step 3: Extended colors (may not exist)
      supabase.from('brands').update({
        bg_base: form.bg_base || null, bg_dark: form.bg_dark || null,
        bg_secondary: form.bg_secondary || null, bg_accent: form.bg_accent || null,
        text_on_base: form.text_on_base || null, text_on_dark: form.text_on_dark || null,
        text_on_accent: form.text_on_accent || null,
        btn_primary: form.btn_primary || null, btn_primary_text: form.btn_primary_text || null,
        btn_secondary: form.btn_secondary || null, btn_secondary_text: form.btn_secondary_text || null,
        btn_tertiary: form.btn_tertiary || null, btn_tertiary_text: form.btn_tertiary_text || null,
      }).eq('id', brand.id).then(({ error }) => {
        if (error) console.warn('Step 3 failed:', error.message)
      })

      setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  return (
    <div className="card bg-paper border border-border rounded-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="label">Brand voice & identity</div>
        <button onClick={save} disabled={saving}
          className={`btn ${saving || saved ? 'btn-primary' : 'btn-dark'} flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-btn transition-colors disabled:opacity-50`}
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
        <div className="space-y-4">
          {([
            { title: 'Backgrounds', items: [
              { key: 'bg_base' as const, label: 'Base', hint: 'Light/default background' },
              { key: 'bg_dark' as const, label: 'Dark', hint: 'Dark background' },
              { key: 'bg_secondary' as const, label: 'Secondary', hint: 'Alternate sections' },
              { key: 'bg_accent' as const, label: 'Accent', hint: 'Highlight areas' },
            ]},
            { title: 'Text', items: [
              { key: 'heading_color' as const, label: 'Heading', hint: 'Title / headline' },
              { key: 'body_color' as const, label: 'Body', hint: 'Paragraph text' },
              { key: 'text_on_base' as const, label: 'On base bg', hint: 'Text on light bg' },
              { key: 'text_on_dark' as const, label: 'On dark bg', hint: 'Text on dark bg' },
              { key: 'text_on_accent' as const, label: 'On accent bg', hint: 'Text on accent bg' },
            ]},
            { title: 'Buttons / Actions', items: [
              { key: 'btn_primary' as const, label: 'Primary', hint: 'Main CTA bg' },
              { key: 'btn_primary_text' as const, label: 'Primary text', hint: 'Text on primary CTA' },
              { key: 'btn_secondary' as const, label: 'Secondary', hint: 'Alt CTA bg' },
              { key: 'btn_secondary_text' as const, label: 'Secondary text', hint: 'Text on alt CTA' },
              { key: 'btn_tertiary' as const, label: 'Tertiary', hint: 'Accent CTA bg' },
              { key: 'btn_tertiary_text' as const, label: 'Tertiary text', hint: 'Text on accent CTA' },
            ]},
            { title: 'Legacy', items: [
              { key: 'primary_color' as const, label: 'Primary', hint: 'Main brand color' },
              { key: 'secondary_color' as const, label: 'Secondary', hint: 'Supporting color' },
              { key: 'accent_color' as const, label: 'Accent', hint: 'Highlights' },
              { key: 'accent_font_color' as const, label: 'Accent text', hint: 'Text on accent' },
            ]},
          ]).map(section => (
            <div key={section.title}>
              <label className="label block mb-2">{section.title}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.items.map(({ key, label, hint }) => (
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
          ))}
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
