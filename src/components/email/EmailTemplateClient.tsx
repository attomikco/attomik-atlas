'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { type EmailConfig, DEFAULT_EMAIL_CONFIG, buildPreviewHtml } from '@/lib/email-preview'
import EmailActions from './EmailActions'

const BLOCK_LIST: { key: string; label: string; required?: boolean }[] = [
  { key: 'hero', label: 'Hero', required: true },
  { key: 'products', label: 'Products' },
  { key: 'cta', label: 'CTA Banner' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'promo', label: 'Promo / Discount code' },
  { key: 'experience', label: 'Experience / Lifestyle' },
  { key: 'faq', label: 'FAQ' },
  { key: 'subscribeBar', label: 'Subscribe bar' },
  { key: 'referral', label: 'Referral' },
  { key: 'blog', label: 'Blog / Journal' },
]

interface Brand {
  id: string; name: string; website: string | null; logo_url: string | null
  primary_color: string | null; accent_color: string | null
  font_primary: string | null; font_heading: any
  products: any[] | null; notes: string | null
}

export default function EmailTemplateClient({ brand, initialConfig, emails }: {
  brand: Brand
  initialConfig: EmailConfig | null
  emails: any[]
}) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'Template' | 'Sent emails'>('Template')
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(600)

  const [config, setConfig] = useState<EmailConfig>(() => ({
    ...DEFAULT_EMAIL_CONFIG,
    primaryColor: brand.primary_color || '#000000',
    accentColor: brand.accent_color || '#00ff97',
    headingFont: brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'Arial, sans-serif',
    ...initialConfig,
  }))

  const brandPreview = useMemo(() => ({
    name: brand.name,
    website: brand.website || '#',
    logoUrl: brand.logo_url || '',
    products: (brand.products || []).slice(0, 3).map((p: any) => ({
      name: p.name, price: p.price_range || '', image: p.image || '',
    })),
  }), [brand])

  const previewHtml = useMemo(() => buildPreviewHtml(config, brandPreview), [config, brandPreview])

  async function saveConfig() {
    setSaving(true)
    const existingNotes = (() => { try { return brand.notes ? JSON.parse(brand.notes) : {} } catch { return {} } })()
    await supabase.from('brands').update({
      notes: JSON.stringify({ ...existingNotes, email_config: config }),
    }).eq('id', brand.id)
    setSaving(false)
    setIsDirty(false)
  }

  function updateConfig(updater: (prev: EmailConfig) => EmailConfig) {
    setConfig(updater)
    setIsDirty(true)
  }

  // ── Template tab ──
  const templatePanel = (
    <>
      {/* Block toggles */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Email blocks</div>
        {BLOCK_LIST.map(({ key, label, required }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: required ? 'var(--muted)' : 'var(--ink)' }}>
              {label}
              {required && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>required</span>}
            </span>
            <button
              onClick={() => { if (required) return; updateConfig(prev => ({ ...prev, blocks: { ...prev.blocks, [key]: !prev.blocks[key as keyof typeof prev.blocks] } })) }}
              style={{ width: 36, height: 20, borderRadius: 10, background: config.blocks[key as keyof typeof config.blocks] ? '#000' : '#e0e0e0', border: 'none', cursor: required ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ position: 'absolute', top: 2, left: config.blocks[key as keyof typeof config.blocks] ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Colors */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Email colors</div>
        {([
          { key: 'primaryColor' as const, label: 'Primary' },
          { key: 'accentColor' as const, label: 'Accent' },
          { key: 'bgColor' as const, label: 'Background' },
        ]).map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <label style={{ width: 32, height: 32, borderRadius: 8, background: config[key], border: '1.5px solid #e0e0e0', cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
              <input type="color" value={config[key]} onChange={e => updateConfig(prev => ({ ...prev, [key]: e.target.value }))}
                style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
            </label>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{config[key].toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Testimonials editor */}
      {config.blocks.testimonials && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Testimonials</div>
          {config.testimonials.map((t, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <textarea value={t.quote} onChange={e => { const u = [...config.testimonials]; u[i] = { ...u[i], quote: e.target.value }; updateConfig(prev => ({ ...prev, testimonials: u })) }}
                placeholder="Customer quote..." rows={2}
                style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', boxSizing: 'border-box' as const }} />
              <input value={t.author} onChange={e => { const u = [...config.testimonials]; u[i] = { ...u[i], author: e.target.value }; updateConfig(prev => ({ ...prev, testimonials: u })) }}
                placeholder="Author name"
                style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '6px 10px', fontSize: 12, marginTop: 4, boxSizing: 'border-box' as const }} />
            </div>
          ))}
          <button onClick={() => updateConfig(prev => ({ ...prev, testimonials: [...prev.testimonials, { quote: '', author: '' }] }))}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', width: '100%' }}>
            + Add testimonial
          </button>
        </div>
      )}

      {/* FAQ editor */}
      {config.blocks.faq && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>FAQ</div>
          {config.faq.map((f, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <input value={f.question} onChange={e => { const u = [...config.faq]; u[i] = { ...u[i], question: e.target.value }; updateConfig(prev => ({ ...prev, faq: u })) }}
                placeholder="Question"
                style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, marginBottom: 4, boxSizing: 'border-box' as const }} />
              <textarea value={f.answer} onChange={e => { const u = [...config.faq]; u[i] = { ...u[i], answer: e.target.value }; updateConfig(prev => ({ ...prev, faq: u })) }}
                placeholder="Answer" rows={2}
                style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none', boxSizing: 'border-box' as const }} />
            </div>
          ))}
          <button onClick={() => updateConfig(prev => ({ ...prev, faq: [...prev.faq, { question: '', answer: '' }] }))}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', width: '100%' }}>
            + Add FAQ
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>Footer</div>
        <input value={config.footerAddress} onChange={e => updateConfig(prev => ({ ...prev, footerAddress: e.target.value }))}
          placeholder="Company address (CAN-SPAM)" style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px 10px', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' as const }} />
      </div>

      {/* Save */}
      {isDirty && (
        <button onClick={saveConfig} disabled={saving}
          style={{ width: '100%', padding: '12px', background: '#000', color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13, borderRadius: 999, border: 'none', cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Save template'}
        </button>
      )}
    </>
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
      {/* Left panel */}
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
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => setPreviewWidth(600)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 600 ? '#000' : '#fff', color: previewWidth === 600 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Desktop</button>
          <button onClick={() => setPreviewWidth(375)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 375 ? '#000' : '#fff', color: previewWidth === 375 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Mobile</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 24px', height: '100%', overflowY: 'auto' }}>
          <iframe srcDoc={previewHtml} style={{ width: previewWidth, height: 800, border: 'none', background: '#fff', borderRadius: 4, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', transition: 'width 0.3s ease' }} title="Email preview" />
        </div>
      </div>
    </div>
  )
}
