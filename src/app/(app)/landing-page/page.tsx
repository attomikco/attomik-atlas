'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'

interface LandingBrief {
  hero: { headline: string; subheadline: string; cta_text: string }
  problem: { headline: string; body: string }
  solution: { headline: string; body: string }
  benefits: { headline: string; body: string }[]
  social_proof: { headline: string; testimonial: string; attribution: string; stat: string }
  faq: { question: string; answer: string }[]
  final_cta: { headline: string; body: string; cta_text: string }
}

const EMPTY_BRIEF: LandingBrief = {
  hero: { headline: '', subheadline: '', cta_text: 'Shop Now' },
  problem: { headline: '', body: '' },
  solution: { headline: '', body: '' },
  benefits: [{ headline: '', body: '' }, { headline: '', body: '' }, { headline: '', body: '' }],
  social_proof: { headline: '', testimonial: '', attribution: '', stat: '' },
  faq: [{ question: '', answer: '' }, { question: '', answer: '' }, { question: '', answer: '' }],
  final_cta: { headline: '', body: '', cta_text: 'Shop Now' },
}

const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, boxSizing: 'border-box' }
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const }

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

export default function LandingPageEditor() {
  const { activeBrandId, activeCampaignId, activeCampaign } = useBrand()
  const [brief, setBrief] = useState<LandingBrief>(EMPTY_BRIEF)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [hasBrief, setHasBrief] = useState(false)
  const [brand, setBrand] = useState<any>(null)
  const [previewWidth, setPreviewWidth] = useState(1200)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hero']))
  const [copied, setCopied] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [iframeKey, setIframeKey] = useState(0)

  const toggleSection = (name: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  function update(updater: (prev: LandingBrief) => LandingBrief) {
    setBrief(updater)
    setIsDirty(true)
    // Debounced iframe refresh
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setIframeKey(k => k + 1), 800)
  }

  function updateField<K extends keyof LandingBrief>(section: K, field: string, value: string) {
    update(prev => ({ ...prev, [section]: { ...(prev[section] as any), [field]: value } }))
  }

  function updateBenefit(i: number, field: string, value: string) {
    update(prev => {
      const benefits = [...prev.benefits]
      benefits[i] = { ...benefits[i], [field]: value }
      return { ...prev, benefits }
    })
  }

  function updateFaq(i: number, field: string, value: string) {
    update(prev => {
      const faq = [...prev.faq]
      faq[i] = { ...faq[i], [field]: value }
      return { ...prev, faq }
    })
  }

  // Load brand + existing brief
  useEffect(() => {
    if (!activeBrandId) return
    const supabase = createClient()

    supabase.from('brands')
      .select('id, name, website, logo_url, primary_color, accent_color, secondary_color, font_primary, font_heading, products, notes')
      .eq('id', activeBrandId).single()
      .then(({ data }) => { if (data) setBrand(data) })

    // Load existing brief — campaign-specific if in campaign mode, else brand-level
    const query = supabase.from('generated_content')
      .select('content')
      .eq('type', 'landing_brief')
      .order('created_at', { ascending: false })
      .limit(1)

    if (activeCampaignId) {
      query.eq('campaign_id', activeCampaignId)
    } else {
      query.eq('brand_id', activeBrandId)
    }

    query.maybeSingle().then(({ data }) => {
      if (data) {
        try {
          const parsed = JSON.parse(data.content)
          setBrief(parsed)
          setHasBrief(true)
        } catch {}
      }
    })
  }, [activeBrandId, activeCampaignId])

  // Generate brief via AI
  async function generate() {
    setGenerating(true)
    try {
      if (activeBrandId) {
        const res = await fetch('/api/landing-page/generate-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandId: activeBrandId, campaignId: activeCampaignId || undefined }),
        })
        const data = await res.json()
        if (data?.hero) { setBrief(data); setHasBrief(true); setIsDirty(false); setIframeKey(k => k + 1) }
      }
    } catch (e) {
      console.error('Landing brief generation failed:', e)
    } finally {
      setGenerating(false)
    }
  }

  // Save brief
  async function saveBrief() {
    if (!activeBrandId) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('generated_content').insert({
      brand_id: activeBrandId,
      campaign_id: activeCampaignId || null,
      type: 'landing_brief',
      content: JSON.stringify(brief),
    })
    setSaving(false)
    setIsDirty(false)
  }

  // Build iframe URL
  const iframeUrl = useMemo(() => {
    if (!hasBrief || !brief.hero.headline) return null
    const briefB64 = btoa(unescape(encodeURIComponent(JSON.stringify(brief))))
    const colorParams = brand ? `&primary=${encodeURIComponent(brand.primary_color || '#000')}&secondary=${encodeURIComponent(brand.secondary_color || brand.primary_color || '#000')}&accent=${encodeURIComponent(brand.accent_color || '#888')}&font=${encodeURIComponent(brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'system-ui')}&transform=${encodeURIComponent(brand.font_heading?.transform || 'none')}` : ''
    if (activeCampaignId) {
      return `/api/campaigns/${activeCampaignId}/landing-html?brief=${briefB64}${colorParams}`
    }
    return `/api/brands/${activeBrandId}/landing-preview?brief=${briefB64}${colorParams}`
  }, [iframeKey, hasBrief, activeBrandId, activeCampaignId, brand])

  async function copyHtml() {
    if (!iframeUrl) return
    try {
      const res = await fetch(iframeUrl)
      const html = await res.text()
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (!activeBrandId) return null

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 'calc(100vh - 72px)', padding: '24px 32px' }}>
      {/* Left panel — editor */}
      <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', paddingRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase' }}>Landing Page</div>
        </div>

        {/* Campaign context */}
        {activeCampaign && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(0,255,151,0.06)', borderRadius: 10, border: '1px solid rgba(0,255,151,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00a86b', marginBottom: 4 }}>Campaign Mode</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{activeCampaign.name}</div>
            {activeCampaign.goal && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{activeCampaign.goal}</div>}
            {activeCampaign.key_message && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{activeCampaign.key_message}</div>}
          </div>
        )}

        {/* Generate button */}
        <div style={{ padding: '0 0 16px' }}>
          <button onClick={generate} disabled={generating}
            style={{
              width: '100%', padding: '12px', background: generating ? '#333' : '#000',
              color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800,
              fontSize: 13, borderRadius: 999, border: 'none', cursor: generating ? 'wait' : 'pointer',
              letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s',
            }}>
            {generating ? 'Generating...' : hasBrief ? 'Regenerate Brief' : activeCampaign ? 'Generate from Campaign Brief' : 'Generate from Brand Hub'}
          </button>
          <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
            {activeCampaign ? 'AI uses campaign brief + brand voice' : 'AI uses brand hub data + products'}
          </div>
        </div>

        {/* Sections */}
        <Section id="hero" label="Hero" isOpen={openSections.has('hero')} onToggle={toggleSection}>
          <input value={brief.hero.headline} onChange={e => updateField('hero', 'headline', e.target.value)} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
          <textarea value={brief.hero.subheadline} onChange={e => updateField('hero', 'subheadline', e.target.value)} placeholder="Subheadline" rows={2} style={{ ...textareaStyle, marginBottom: 6 }} />
          <input value={brief.hero.cta_text} onChange={e => updateField('hero', 'cta_text', e.target.value)} placeholder="CTA button text" style={inputStyle} />
        </Section>

        <Section id="problem" label="Problem" isOpen={openSections.has('problem')} onToggle={toggleSection}>
          <input value={brief.problem.headline} onChange={e => updateField('problem', 'headline', e.target.value)} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
          <textarea value={brief.problem.body} onChange={e => updateField('problem', 'body', e.target.value)} placeholder="Body" rows={3} style={textareaStyle} />
        </Section>

        <Section id="solution" label="Solution" isOpen={openSections.has('solution')} onToggle={toggleSection}>
          <input value={brief.solution.headline} onChange={e => updateField('solution', 'headline', e.target.value)} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
          <textarea value={brief.solution.body} onChange={e => updateField('solution', 'body', e.target.value)} placeholder="Body" rows={3} style={textareaStyle} />
        </Section>

        <Section id="benefits" label={`Benefits (${brief.benefits.length})`} isOpen={openSections.has('benefits')} onToggle={toggleSection}>
          {brief.benefits.map((b, i) => (
            <div key={i} style={{ marginBottom: 10, padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
              <input value={b.headline} onChange={e => updateBenefit(i, 'headline', e.target.value)} placeholder={`Benefit ${i + 1} title`} style={{ ...inputStyle, marginBottom: 4 }} />
              <input value={b.body} onChange={e => updateBenefit(i, 'body', e.target.value)} placeholder={`Benefit ${i + 1} description`} style={inputStyle} />
            </div>
          ))}
        </Section>

        <Section id="social" label="Social Proof" isOpen={openSections.has('social')} onToggle={toggleSection}>
          <input value={brief.social_proof.headline} onChange={e => updateField('social_proof', 'headline', e.target.value)} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
          <textarea value={brief.social_proof.testimonial} onChange={e => updateField('social_proof', 'testimonial', e.target.value)} placeholder="Testimonial quote" rows={2} style={{ ...textareaStyle, marginBottom: 6 }} />
          <input value={brief.social_proof.attribution} onChange={e => updateField('social_proof', 'attribution', e.target.value)} placeholder="Attribution (name, title)" style={{ ...inputStyle, marginBottom: 6 }} />
          <input value={brief.social_proof.stat} onChange={e => updateField('social_proof', 'stat', e.target.value)} placeholder="Stat (e.g. 500+ 5-star reviews)" style={inputStyle} />
        </Section>

        <Section id="faq" label={`FAQ (${brief.faq.length})`} isOpen={openSections.has('faq')} onToggle={toggleSection}>
          {brief.faq.map((f, i) => (
            <div key={i} style={{ marginBottom: 10, padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
              <input value={f.question} onChange={e => updateFaq(i, 'question', e.target.value)} placeholder={`Question ${i + 1}`} style={{ ...inputStyle, marginBottom: 4 }} />
              <textarea value={f.answer} onChange={e => updateFaq(i, 'answer', e.target.value)} placeholder={`Answer ${i + 1}`} rows={2} style={textareaStyle} />
            </div>
          ))}
        </Section>

        <Section id="finalcta" label="Final CTA" isOpen={openSections.has('finalcta')} onToggle={toggleSection}>
          <input value={brief.final_cta.headline} onChange={e => updateField('final_cta', 'headline', e.target.value)} placeholder="Headline" style={{ ...inputStyle, marginBottom: 6 }} />
          <textarea value={brief.final_cta.body} onChange={e => updateField('final_cta', 'body', e.target.value)} placeholder="Body" rows={2} style={{ ...textareaStyle, marginBottom: 6 }} />
          <input value={brief.final_cta.cta_text} onChange={e => updateField('final_cta', 'cta_text', e.target.value)} placeholder="CTA button text" style={inputStyle} />
        </Section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, padding: '0 0 24px', flexWrap: 'wrap' }}>
          <button onClick={copyHtml} disabled={!hasBrief}
            style={{ flex: 1, padding: '10px', background: '#fff', color: '#000', fontWeight: 700, fontSize: 12, borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', opacity: hasBrief ? 1 : 0.4 }}>
            {copied ? 'Copied' : 'Copy HTML'}
          </button>
          {iframeUrl && (
            <a href={iframeUrl} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, padding: '10px', background: '#fff', color: '#000', fontWeight: 700, fontSize: 12, borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer', textDecoration: 'none', textAlign: 'center' }}>
              Open full page
            </a>
          )}
          {isDirty && (
            <button onClick={saveBrief} disabled={saving}
              style={{ flex: '1 1 100%', padding: '10px', background: '#000', color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 12, borderRadius: 999, border: 'none', cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save brief'}
            </button>
          )}
        </div>
      </div>

      {/* Right panel — live preview */}
      <div style={{ flex: 1, background: '#e0e0e0', borderRadius: 16, overflow: 'hidden', position: 'relative', minHeight: 600 }}>
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => setPreviewWidth(1200)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 1200 ? '#000' : '#fff', color: previewWidth === 1200 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Desktop</button>
          <button onClick={() => setPreviewWidth(375)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 375 ? '#000' : '#fff', color: previewWidth === 375 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Mobile</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 24px', height: '100%', overflowY: 'auto' }}>
          {iframeUrl ? (
            <iframe
              key={iframeKey}
              src={iframeUrl}
              style={{
                width: previewWidth,
                height: previewWidth === 375 ? 800 : 900,
                border: 'none',
                background: '#fff',
                borderRadius: 4,
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                transition: 'width 0.3s ease',
              }}
              title="Landing page preview"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 14, textAlign: 'center', padding: 40 }}>
              <div>
                <div style={{ fontSize: 32, marginBottom: 16 }}>&#9885;</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>No landing page yet</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>Click "Generate" to create a landing page brief, then edit the content here.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
