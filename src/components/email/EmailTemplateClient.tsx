'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { buildMasterEmail, DEFAULT_MASTER_CONFIG, deriveEmailColorsFromBrand, type MasterEmailConfig, type EmailColors } from '@/lib/email-master-template'
import EmailActions from './EmailActions'

interface Brand {
  id: string; name: string; website: string | null; logo_url: string | null
  primary_color: string | null; accent_color: string | null; secondary_color?: string | null
  font_primary: string | null; font_heading: any; font_body?: any
  products: any[] | null; notes: string | null
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, display: 'block' }
const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const }
const sectionStyle: React.CSSProperties = { marginBottom: 24 }

// Defined at module scope so it keeps a stable identity across renders — prevents
// all children (inputs, color pickers) from unmounting when the parent state updates.
function Section({ id, label, isOpen, onToggle, children }: { id: string; label: string; isOpen: boolean; onToggle: (id: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <button onClick={() => onToggle(id)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: isOpen ? 'rgba(0,255,151,0.06)' : '#f8f8f8',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: isOpen ? '#00a86b' : 'var(--muted)', transition: 'all 0.15s',
      }}>
        <span>{label}</span>
        <span style={{ fontSize: 9 }}>{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && <div style={{ padding: '14px 16px' }}>{children}</div>}
    </div>
  )
}

export default function EmailTemplateClient({ brand, initialConfig, emails, lifestyleImages = [], productImages = [], campaignId = null }: {
  brand: Brand
  initialConfig: MasterEmailConfig | null
  emails: any[]
  lifestyleImages?: string[]
  productImages?: string[]
  campaignId?: string | null
}) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'Template' | 'Sent emails'>('Template')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(600)
  const [copied, setCopied] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hero']))

  const toggleSection = (name: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  const [config, setConfig] = useState<MasterEmailConfig>(() => {
    const base = { ...DEFAULT_MASTER_CONFIG }
    // Smart defaults from brand data
    const p0 = brand.products?.[0]
    const p1 = brand.products?.[1]
    base.heroHeadline = `Welcome to ${brand.name}`
    base.heroCta = 'Shop Now'
    base.heroCtaUrl = brand.website || ''
    base.instagramUrl = ''
    base.footerTagline = `Crafted with care — ${brand.name}`
    if (p0) {
      base.products = [
        { name: p0.name || p0.title || '', price: p0.price_range || p0.price || '', imageUrl: p0.image || '', url: brand.website || '' },
        ...(p1 ? [{ name: p1.name || p1.title || '', price: p1.price_range || p1.price || '', imageUrl: p1.image || '', url: brand.website || '' }] : []),
      ]
      base.featuredProductName = p0.name || p0.title || ''
      base.featuredProductBody = p0.description || ''
    }
    return { ...base, ...initialConfig }
  })

  // Build email HTML — recomputes on every config/brand change
  const previewHtml = buildMasterEmail(brand, config, productImages, lifestyleImages)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const el = iframeRef.current
    if (!el) return
    const doc = el.contentDocument
    if (doc) { doc.open(); doc.write(previewHtml); doc.close() }
  })


  function update(partial: Partial<MasterEmailConfig>) {
    setConfig(prev => ({ ...prev, ...partial }))
    setIsDirty(true)
  }

  // Debounced auto-save for color picker changes
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function scheduleAutoSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { saveConfig() }, 500)
  }
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }, [])

  // Resolve current email colors (user-set or derived from brand)
  const currentEmailColors: EmailColors = config.emailColors || deriveEmailColorsFromBrand(brand)

  function updateEmailColor(key: keyof EmailColors, value: string) {
    const next: EmailColors = { ...currentEmailColors, [key]: value }
    update({ emailColors: next })
    scheduleAutoSave()
  }

  // Compute the derived palette from brand colors (matches buildEmailPalette's auto-derive branch)
  function deriveColorsFromBrand(): EmailColors {
    const primary = brand.primary_color || '#154734'
    const accent = brand.accent_color || '#BFA46D'
    const secondary = brand.secondary_color || '#E9E3D8'
    const getLum = (hex: string) => {
      const n = parseInt(hex.replace('#', ''), 16)
      return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)) / 255
    }
    const primaryText = getLum(primary) < 0.5 ? '#ffffff' : '#000000'
    const accentText = getLum(accent) > 0.5 ? '#000000' : '#ffffff'
    const lightBg = getLum(secondary) > 0.7 ? secondary : '#f8f7f4'
    const darken = (hex: string, pct: number) => {
      const n = parseInt(hex.replace('#', ''), 16)
      const r = Math.max(0, (n >> 16) - Math.round(2.55 * pct))
      const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(2.55 * pct))
      const b = Math.max(0, (n & 0xff) - Math.round(2.55 * pct))
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
    }
    const lighten = (hex: string, pct: number) => {
      const n = parseInt(hex.replace('#', ''), 16)
      const r = Math.min(255, (n >> 16) + Math.round(2.55 * pct))
      const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(2.55 * pct))
      const b = Math.min(255, (n & 0xff) + Math.round(2.55 * pct))
      return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
    }
    const lum = getLum(primary)
    const altPrimaryBg = lum < 0.15 ? lighten(primary, 15) : lum < 0.35 ? darken(primary, 10) : darken(primary, 20)
    return {
      primaryBg: primary,
      primaryText,
      altPrimaryBg,
      altPrimaryText: primaryText,
      accentColor: accent,
      neutralBg: lightBg,
      neutralText: primary,
      buttonBg: primary,
      buttonText: primaryText,
      altButtonBg: accent,
      altButtonText: accentText,
      headlineColor: primaryText,
    }
  }

  // Initialize emailColors from brand on mount so sidebar swatches match preview immediately
  useEffect(() => {
    if (!config.emailColors && brand) {
      update({ emailColors: deriveColorsFromBrand() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id])

  function resetEmailColors() {
    update({ emailColors: deriveColorsFromBrand() })
    scheduleAutoSave()
  }

  async function generateWithAI() {
    setGenerating(true)
    try {
      const res = await fetch('/api/email/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brand.id, campaignId }),
      })
      const data = await res.json()
      if (data.config) {
        // Preserve emailColors (those come from brand, not AI)
        const { emailColors: _ignore, ...aiContent } = data.config
        update(aiContent)
        // Auto-save after generation
        setTimeout(() => saveConfig(), 100)
      }
    } catch (e) {
      console.error('AI generation failed:', e)
    } finally {
      setGenerating(false)
    }
  }

  async function saveConfig() {
    setSaving(true)
    const existingNotes = (() => { try { return brand.notes ? JSON.parse(brand.notes) : {} } catch { return {} } })()
    await supabase.from('brands').update({
      notes: JSON.stringify({ ...existingNotes, email_config: config }),
    }).eq('id', brand.id)
    setSaving(false)
    setIsDirty(false)
  }

  function copyHtml() {
    navigator.clipboard.writeText(previewHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const emailColorFields: Array<{ key: keyof EmailColors; label: string }> = [
    { key: 'primaryBg', label: 'Primary' },
    { key: 'primaryText', label: 'Text on Primary' },
    { key: 'accentColor', label: 'Accent' },
    { key: 'neutralBg', label: 'Light Background' },
    { key: 'neutralText', label: 'Text on Light' },
    { key: 'buttonBg', label: 'Button' },
    { key: 'buttonText', label: 'Button Text' },
  ]

  const templatePanel = (
    <div>
      {/* AI Generate button */}
      <div style={{ padding: '0 16px 16px' }}>
        <button onClick={generateWithAI} disabled={generating}
          style={{
            width: '100%', padding: '12px', background: generating ? '#333' : '#000',
            color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800,
            fontSize: 13, borderRadius: 999, border: 'none', cursor: generating ? 'wait' : 'pointer',
            letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {generating && <div style={{ width: 14, height: 14, border: '2px solid rgba(0,255,151,0.3)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
          {generating ? 'Generating...' : campaignId ? 'Generate from Campaign Brief' : 'Generate from Brand Hub'}
        </button>
        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
          {campaignId ? 'AI will use campaign brief + brand voice' : 'AI will use brand hub data + products'}
        </div>
      </div>

      <Section id="colors" label="Template Colors" isOpen={openSections.has("colors")} onToggle={toggleSection}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {emailColorFields.map(({ key, label }) => {
            const value = currentEmailColors[key]
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ position: 'relative', width: 32, height: 32, borderRadius: 6, border: '1.5px solid #e0e0e0', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, background: value }}>
                  <input type="color" value={value}
                    onChange={e => updateEmailColor(key, e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none' }} />
                </label>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 1 }}>{label}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#999' }}>{value}</div>
                </div>
              </div>
            )
          })}
          <button onClick={resetEmailColors}
            style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
            Reset to Brand Hub colors
          </button>
        </div>
      </Section>

      <Section id="announcement" label="Announcement Bar" isOpen={openSections.has("announcement")} onToggle={toggleSection}>
        <input value={config.announcementText} onChange={e => update({ announcementText: e.target.value })} onBlur={saveConfig} placeholder="Free Shipping On Orders Over $50" style={inputStyle} />
      </Section>

      <Section id="hero" label="Hero" isOpen={openSections.has("hero")} onToggle={toggleSection}>
        <input value={config.heroHeadline} onChange={e => update({ heroHeadline: e.target.value })} onBlur={saveConfig} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
        <textarea value={config.heroBody} onChange={e => update({ heroBody: e.target.value })} onBlur={saveConfig} placeholder="Body text" rows={2} style={{ ...textareaStyle, marginBottom: 6 }} />
        <input value={config.heroCta} onChange={e => update({ heroCta: e.target.value })} onBlur={saveConfig} placeholder="CTA button text" style={{ ...inputStyle, marginBottom: 6 }} />
        <input value={config.heroCtaUrl} onChange={e => update({ heroCtaUrl: e.target.value })} onBlur={saveConfig} placeholder="CTA URL (optional)" style={inputStyle} />
      </Section>

      <Section id="products" label={`Products (${config.products.length}/3)`} isOpen={openSections.has("products")} onToggle={toggleSection}>
        {config.products.map((p, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
            <input value={p.name} onChange={e => { const u = [...config.products]; u[i] = { ...u[i], name: e.target.value }; update({ products: u }) }} onBlur={saveConfig} placeholder="Name" style={{ ...inputStyle, marginBottom: 4 }} />
            <input value={p.price} onChange={e => { const u = [...config.products]; u[i] = { ...u[i], price: e.target.value }; update({ products: u }) }} onBlur={saveConfig} placeholder="Price" style={{ ...inputStyle, marginBottom: 4 }} />
            <input value={p.imageUrl} onChange={e => { const u = [...config.products]; u[i] = { ...u[i], imageUrl: e.target.value }; update({ products: u }) }} onBlur={saveConfig} placeholder="Image URL" style={inputStyle} />
          </div>
        ))}
        {config.products.length < 3 && (
          <button onClick={() => update({ products: [...config.products, { name: '', price: '', imageUrl: '', url: '' }] })}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', width: '100%' }}>
            + Add product
          </button>
        )}
      </Section>

      <Section id="cta" label="CTA Banner" isOpen={openSections.has("cta")} onToggle={toggleSection}>
        <input value={config.ctaBannerHeadline} onChange={e => update({ ctaBannerHeadline: e.target.value })} onBlur={saveConfig} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
        <textarea value={config.ctaBannerBody} onChange={e => update({ ctaBannerBody: e.target.value })} onBlur={saveConfig} placeholder="Body" rows={2} style={{ ...textareaStyle, marginBottom: 6 }} />
        <input value={config.ctaBannerCta} onChange={e => update({ ctaBannerCta: e.target.value })} onBlur={saveConfig} placeholder="Button text" style={inputStyle} />
      </Section>

      <Section id="howitworks" label="How It Works" isOpen={openSections.has("howitworks")} onToggle={toggleSection}>
        {[1, 2, 3].map(n => {
          const tKey = `step${n}Title` as keyof MasterEmailConfig
          const bKey = `step${n}Body` as keyof MasterEmailConfig
          return (
            <div key={n} style={{ marginBottom: 10, padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
              <input value={config[tKey] as string} onChange={e => update({ [tKey]: e.target.value } as any)} onBlur={saveConfig} placeholder={`Step ${n} title`} style={{ ...inputStyle, marginBottom: 4 }} />
              <input value={config[bKey] as string} onChange={e => update({ [bKey]: e.target.value } as any)} onBlur={saveConfig} placeholder={`Step ${n} body`} style={inputStyle} />
            </div>
          )
        })}
      </Section>

      <Section id="experience" label="Experience" isOpen={openSections.has("experience")} onToggle={toggleSection}>
        <input value={config.experienceHeadline} onChange={e => update({ experienceHeadline: e.target.value })} onBlur={saveConfig} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
        <textarea value={config.experienceBody} onChange={e => update({ experienceBody: e.target.value })} onBlur={saveConfig} placeholder="Body" rows={3} style={{ ...textareaStyle, marginBottom: 6 }} />
        <input value={config.experienceQuote} onChange={e => update({ experienceQuote: e.target.value })} onBlur={saveConfig} placeholder="Italic quote" style={{ ...inputStyle, marginBottom: 6 }} />
        <input value={config.experienceCta} onChange={e => update({ experienceCta: e.target.value })} onBlur={saveConfig} placeholder="CTA button text" style={inputStyle} />
      </Section>

      <Section id="testimonials" label="Testimonials" isOpen={openSections.has("testimonials")} onToggle={toggleSection}>
        {config.testimonials.map((t, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <textarea value={t.quote} onChange={e => { const u = [...config.testimonials]; u[i] = { ...u[i], quote: e.target.value }; update({ testimonials: u }) }} onBlur={saveConfig} placeholder="Quote" rows={2} style={{ ...textareaStyle, marginBottom: 4 }} />
            <input value={t.author} onChange={e => { const u = [...config.testimonials]; u[i] = { ...u[i], author: e.target.value }; update({ testimonials: u }) }} onBlur={saveConfig} placeholder="Author" style={inputStyle} />
          </div>
        ))}
      </Section>

      <Section id="social" label="Social Proof" isOpen={openSections.has("social")} onToggle={toggleSection}>
        <input value={config.reviewCount} onChange={e => update({ reviewCount: e.target.value })} onBlur={saveConfig} placeholder="e.g. 500+" style={{ ...inputStyle, marginBottom: 6 }} />
        <input value={config.socialProofQuote} onChange={e => update({ socialProofQuote: e.target.value })} onBlur={saveConfig} placeholder="Featured quote" style={inputStyle} />
      </Section>

      <Section id="origin" label="Founder / Origin" isOpen={openSections.has("origin")} onToggle={toggleSection}>
        <input value={config.originHeadline} onChange={e => update({ originHeadline: e.target.value })} onBlur={saveConfig} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
        <textarea value={config.originBody} onChange={e => update({ originBody: e.target.value })} onBlur={saveConfig} placeholder="Body" rows={3} style={textareaStyle} />
      </Section>

      <Section id="subscribe" label="Subscribe & Save" isOpen={openSections.has("subscribe")} onToggle={toggleSection}>
        <input value={config.subscribeHeadline} onChange={e => update({ subscribeHeadline: e.target.value })} onBlur={saveConfig} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
        {config.subscribePerks.map((p, i) => (
          <input key={i} value={p} onChange={e => { const u = [...config.subscribePerks]; u[i] = e.target.value; update({ subscribePerks: u }) }} onBlur={saveConfig} placeholder={`Perk ${i + 1}`} style={{ ...inputStyle, marginBottom: 4 }} />
        ))}
        <input value={config.subscribeCta} onChange={e => update({ subscribeCta: e.target.value })} onBlur={saveConfig} placeholder="CTA button text" style={{ ...inputStyle, marginTop: 6 }} />
      </Section>

      <Section id="bundle" label="Featured Bundle" isOpen={openSections.has("bundle")} onToggle={toggleSection}>
        <input value={config.bundleHeadline} onChange={e => update({ bundleHeadline: e.target.value })} onBlur={saveConfig} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
        <input value={config.bundlePrice} onChange={e => update({ bundlePrice: e.target.value })} onBlur={saveConfig} placeholder="Price (e.g. $72)" style={{ ...inputStyle, marginBottom: 6 }} />
        <textarea value={config.bundleBody} onChange={e => update({ bundleBody: e.target.value })} onBlur={saveConfig} placeholder="Body" rows={2} style={{ ...textareaStyle, marginBottom: 6 }} />
        <input value={config.bundleCta} onChange={e => update({ bundleCta: e.target.value })} onBlur={saveConfig} placeholder="CTA button text" style={inputStyle} />
      </Section>

      <Section id="featured" label="Single Product Feature" isOpen={openSections.has("featured")} onToggle={toggleSection}>
        <input value={config.featuredProductLabel} onChange={e => update({ featuredProductLabel: e.target.value })} onBlur={saveConfig} placeholder="Label (e.g. New Flavor)" style={{ ...inputStyle, marginBottom: 6 }} />
        <input value={config.featuredProductName} onChange={e => update({ featuredProductName: e.target.value })} onBlur={saveConfig} placeholder="Product name" style={{ ...inputStyle, marginBottom: 6 }} />
        <textarea value={config.featuredProductBody} onChange={e => update({ featuredProductBody: e.target.value })} onBlur={saveConfig} placeholder="Body" rows={2} style={{ ...textareaStyle, marginBottom: 6 }} />
        <input value={config.featuredProductCta} onChange={e => update({ featuredProductCta: e.target.value })} onBlur={saveConfig} placeholder="CTA button text" style={inputStyle} />
      </Section>

      <Section id="promo" label="Promo Code" isOpen={openSections.has("promo")} onToggle={toggleSection}>
        <input value={config.promoPercent} onChange={e => update({ promoPercent: e.target.value })} onBlur={saveConfig} placeholder="e.g. 15%" style={{ ...inputStyle, marginBottom: 6 }} />
        <input value={config.promoCode} onChange={e => update({ promoCode: e.target.value })} onBlur={saveConfig} placeholder="e.g. WELCOME15" style={inputStyle} />
      </Section>

      <Section id="referral" label="Referral" isOpen={openSections.has("referral")} onToggle={toggleSection}>
        <input value={config.referralAmount} onChange={e => update({ referralAmount: e.target.value })} onBlur={saveConfig} placeholder="e.g. $10" style={{ ...inputStyle, marginBottom: 6 }} />
        <textarea value={config.referralBody} onChange={e => update({ referralBody: e.target.value })} onBlur={saveConfig} placeholder="Body" rows={2} style={textareaStyle} />
      </Section>

      <Section id="blog" label="Blog Posts" isOpen={openSections.has("blog")} onToggle={toggleSection}>
        {config.blogPosts.map((p, i) => (
          <div key={i} style={{ marginBottom: 10, padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
            <input value={p.category} onChange={e => { const u = [...config.blogPosts]; u[i] = { ...u[i], category: e.target.value }; update({ blogPosts: u }) }} onBlur={saveConfig} placeholder="Category" style={{ ...inputStyle, marginBottom: 4 }} />
            <input value={p.title} onChange={e => { const u = [...config.blogPosts]; u[i] = { ...u[i], title: e.target.value }; update({ blogPosts: u }) }} onBlur={saveConfig} placeholder="Title" style={{ ...inputStyle, marginBottom: 4 }} />
            <textarea value={p.excerpt} onChange={e => { const u = [...config.blogPosts]; u[i] = { ...u[i], excerpt: e.target.value }; update({ blogPosts: u }) }} onBlur={saveConfig} placeholder="Excerpt" rows={2} style={textareaStyle} />
          </div>
        ))}
      </Section>

      <Section id="footer" label="Footer" isOpen={openSections.has("footer")} onToggle={toggleSection}>
        <input value={config.footerTagline} onChange={e => update({ footerTagline: e.target.value })} onBlur={saveConfig} placeholder="Tagline" style={{ ...inputStyle, marginBottom: 6 }} />
        <input value={config.instagramUrl} onChange={e => update({ instagramUrl: e.target.value })} onBlur={saveConfig} placeholder="Instagram URL" style={inputStyle} />
      </Section>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, padding: '0 16px' }}>
        <button onClick={copyHtml}
          style={{ flex: 1, padding: '10px', background: '#fff', color: '#000', fontWeight: 700, fontSize: 12, borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer' }}>
          {copied ? '✓ Copied' : 'Copy HTML'}
        </button>
        {isDirty && (
          <button onClick={saveConfig} disabled={saving}
            style={{ flex: 1, padding: '10px', background: '#000', color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 12, borderRadius: 999, border: 'none', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save template'}
          </button>
        )}
      </div>
    </div>
  )

  // ── Sent emails tab ──
  const sentPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {!emails?.length ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>✉</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>No emails generated yet.</div>
          <Link href="/campaigns/new" style={{ fontSize: 12, fontWeight: 700, color: '#000', background: '#00ff97', padding: '8px 20px', borderRadius: 999, textDecoration: 'none' }}>Create campaign →</Link>
        </div>
      ) : emails.map((e: any, i: number) => {
        let subject = ''
        let hasHtml = false
        try { const p = JSON.parse(e.content); subject = p.subject || ''; hasHtml = !!p.html } catch {}
        return (
          <div key={e.id} style={{ padding: '12px 0', borderBottom: i < emails.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.campaign?.name || 'Email'}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              {subject && <>&quot;{subject}&quot; · </>}
              {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {e.campaign?.id && <Link href={`/preview/${e.campaign.id}`} style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 999 }}>View</Link>}
              {hasHtml && e.campaign?.id && <EmailActions campaignId={e.campaign.id} content={e.content} />}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 'calc(100vh - 72px)', padding: '24px 32px' }}>
      {/* Left panel — editor */}
      <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', paddingRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase' }}>Email</div>
          <Link href="/campaigns/new" style={{ fontSize: 11, fontWeight: 700, color: '#000', background: '#00ff97', padding: '6px 14px', borderRadius: 999, textDecoration: 'none' }}>+ New</Link>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {(['Template', 'Sent emails'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '10px 20px', borderBottom: activeTab === tab ? '2px solid #000' : '2px solid transparent', background: 'none', border: 'none', borderBottomStyle: 'solid', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? '#000' : 'var(--muted)', cursor: 'pointer' }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Template' ? templatePanel : sentPanel}
      </div>

      {/* Right panel — live preview */}
      <div style={{ flex: 1, background: '#e0e0e0', borderRadius: 16, overflow: 'hidden', position: 'relative', minHeight: 600 }}>
        {generating && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generating email...</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Pulling from your Brand Hub</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => setPreviewWidth(600)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 600 ? '#000' : '#fff', color: previewWidth === 600 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Desktop</button>
          <button onClick={() => setPreviewWidth(375)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 375 ? '#000' : '#fff', color: previewWidth === 375 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Mobile</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', height: '100%', overflowY: 'auto' }}>
          <iframe ref={iframeRef} style={{ width: previewWidth, height: 'calc(100vh - 140px)', border: 'none', background: '#fff', borderRadius: 0 }} title="Email preview" />
        </div>
      </div>
    </div>
  )
}
