'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useBrand } from '@/lib/brand-context'

const CAMPAIGN_TYPES = [
  { id: 'new_product', icon: '✦', label: 'New product launch', description: 'Introduce a new product to your audience', color: '#a78bfa' },
  { id: 'offer', icon: '◈', label: 'Limited offer / sale', description: 'Drive urgency with a time-sensitive deal', color: '#fbbf24' },
  { id: 'seasonal', icon: '◆', label: 'Seasonal / holiday', description: 'Capitalize on a moment or season', color: '#34d399' },
  { id: 'awareness', icon: '○', label: 'Brand awareness', description: 'Reach new audiences, build recognition', color: '#60a5fa' },
  { id: 'retargeting', icon: '◎', label: 'Retargeting', description: 'Re-engage people who already know you', color: '#f472b6' },
  { id: 'cold_traffic', icon: '▲', label: 'New audience / cold traffic', description: "Test messaging with people who don't know you yet", color: '#fb923c' },
]

const AUDIENCE_ANGLES = [
  { id: 'problem', label: 'Problem → Solution' },
  { id: 'social_proof', label: 'Social proof' },
  { id: 'curiosity', label: 'Curiosity / hook' },
  { id: 'direct', label: 'Direct offer' },
  { id: 'story', label: 'Story / founder' },
  { id: 'benefit', label: 'Key benefit' },
]

const HOOK_PLACEHOLDERS: Record<string, string> = {
  new_product: 'e.g. Introducing our new Mango Habanero flavor',
  offer: 'e.g. 20% off sitewide this weekend only',
  seasonal: 'e.g. Dry January — the perfect time to try us',
  awareness: 'e.g. We make the hangover-free social drink',
  retargeting: "e.g. You've been thinking about it — here's 10% off",
  cold_traffic: 'e.g. What if you could socialize without alcohol?',
}

const DEFAULT_ANGLES: Record<string, string> = {
  new_product: 'benefit',
  offer: 'direct',
  seasonal: 'curiosity',
  awareness: 'problem',
  retargeting: 'social_proof',
  cold_traffic: 'problem',
}

const HOOK_SUGGESTIONS: Record<string, string[]> = {
  new_product: ['Introducing [Product Name]', 'New flavor just dropped', 'We made something new'],
  offer: ['20% off this weekend only', 'Buy 2 get 1 free — this week', 'Last chance: sale ends Sunday'],
  seasonal: ['Dry January starts now', 'Summer is here', 'New year, new you'],
  awareness: ['The hangover-free social drink', 'Finally, a [category] that actually works', 'This is what we do'],
  retargeting: ['Still thinking about it?', 'You left something behind', "Come back — here's 10% off"],
  cold_traffic: ['What if you could [outcome]?', "Most people don't know this exists", 'The alternative to [old solution]'],
}

interface Brand {
  id: string
  name: string
  primary_color: string | null
  logo_url: string | null
  products: any[] | null
  target_audience: string | null
  brand_voice: string | null
  mission: string | null
}

export default function CampaignBriefForm({ brands, defaultBrandId }: { brands: Brand[]; defaultBrandId?: string }) {
  const supabase = createClient()
  const router = useRouter()
  const { activeBrandId, setActiveBrandId, setActiveCampaignId } = useBrand()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Brand comes from context — no selection UI
  const brandId = activeBrandId || defaultBrandId || brands[0]?.id || ''
  const [campaignType, setCampaignType] = useState('')
  const [hook, setHook] = useState('')
  const [angle, setAngle] = useState('problem')
  const [audienceOverride, setAudienceOverride] = useState('')
  const [productFocus, setProductFocus] = useState('all')

  const brand = brands.find(b => b.id === brandId)

  // Auto-select best angle when campaign type changes
  useEffect(() => {
    if (campaignType && DEFAULT_ANGLES[campaignType]) {
      setAngle(DEFAULT_ANGLES[campaignType])
    }
  }, [campaignType])

  // Derived campaign name — updates live
  const suggestedName = (() => {
    const brandName = brand?.name || ''
    const typeLabel = CAMPAIGN_TYPES.find(t => t.id === campaignType)?.label || ''
    if (hook.trim()) return `${brandName} — ${hook.trim()}`
    if (campaignType) return `${brandName} — ${typeLabel}`
    return `${brandName} — New Campaign`
  })()

  async function submit() {
    if (!brandId || !campaignType) return
    setSaving(true)
    setStep(2)

    const typeConfig = CAMPAIGN_TYPES.find(t => t.id === campaignType)
    const products = brand?.products || []
    const offerContext = productFocus === 'all'
      ? products.map((p: any) => p.name).join(', ')
      : products.find((p: any) => p.name === productFocus)?.name || ''

    const payload = {
      brand_id: brandId,
      name: suggestedName,
      type: 'funnel',
      status: 'draft',
      goal: typeConfig?.label || campaignType,
      angle: angle,
      key_message: hook.trim() || null,
      offer: offerContext || null,
      audience_notes: audienceOverride || brand?.target_audience || null,
    }
    console.log('[Campaign create] payload:', payload)

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert(payload)
      .select('id')
      .single()

    if (error || !campaign) {
      console.error('Campaign create failed:', JSON.stringify(error, null, 2), 'payload was:', payload)
      alert(`Couldn't create campaign: ${error?.message || error?.code || 'Unknown error. Check console.'}`)
      setSaving(false)
      setStep(1)
      return
    }

    // Fire-and-forget generation (runs in background)
    Promise.all([
      fetch(`/api/campaigns/${campaign.id}/ad-copy`, { method: 'POST' }),
      fetch(`/api/campaigns/${campaign.id}/landing-brief`, { method: 'POST' }),
      fetch(`/api/campaigns/${campaign.id}/email`, { method: 'POST' }),
    ]).catch(() => {})

    // Enter campaign mode and go to Creative Studio
    setActiveBrandId(brandId)
    setActiveCampaignId(campaign.id)
    router.push('/creatives')
  }

  // Step 0 — Campaign type selector
  if (step === 0) return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 8 }}>New campaign.</div>
        <div style={{ fontSize: 15, color: 'var(--muted)' }}>What&apos;s this campaign for?</div>
        {brand && (
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: brand.primary_color || '#000' }} />
            Creating campaign for <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{brand.name}</strong>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
        {CAMPAIGN_TYPES.map(type => (
          <button key={type.id} onClick={() => { setCampaignType(type.id); setStep(1) }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '20px 20px', borderRadius: 16, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#999'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${type.color}18`, border: `1px solid ${type.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 12, color: type.color }}>{type.icon}</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--ink)', marginBottom: 4 }}>{type.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{type.description}</div>
          </button>
        ))}
      </div>
    </div>
  )

  // Step 1 — Brief
  if (step === 1) {
    const typeConfig = CAMPAIGN_TYPES.find(t => t.id === campaignType)!
    const products = brand?.products || []

    return (
      <div>
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${typeConfig.color}15`, border: `1px solid ${typeConfig.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: typeConfig.color }}>{typeConfig.icon}</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase' }}>{typeConfig.label}</div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Give us context — the more specific, the better the output.</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hook */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              What&apos;s the hook or offer? <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>optional but recommended</span>
            </label>
            <input value={hook} onChange={e => setHook(e.target.value)}
              placeholder={HOOK_PLACEHOLDERS[campaignType] || 'What makes this campaign specific?'}
              style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '12px 14px', fontSize: 14, width: '100%', outline: 'none', color: '#000', background: '#fff', boxSizing: 'border-box' as const }}
              onFocus={e => { e.currentTarget.style.borderColor = '#000' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0' }}
            />
            {/* Hook suggestions */}
            {!hook.trim() && campaignType && HOOK_SUGGESTIONS[campaignType] && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600, alignSelf: 'center' }}>Try:</span>
                {HOOK_SUGGESTIONS[campaignType].map((s, i) => (
                  <button key={i} onClick={() => setHook(s)}
                    style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', background: '#f5f5f5', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 10px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#000' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                  >{s}</button>
                ))}
              </div>
            )}
            {/* Live campaign name */}
            {campaignType && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Campaign name:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{suggestedName}</span>
              </div>
            )}
          </div>

          {/* Product focus */}
          {products.length > 1 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Product focus</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setProductFocus('all')} style={{ padding: '7px 14px', borderRadius: 999, border: productFocus === 'all' ? '2px solid #000' : '1.5px solid var(--border)', background: productFocus === 'all' ? '#000' : '#fff', color: productFocus === 'all' ? '#fff' : 'var(--ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>All products</button>
                {products.map((p: any) => (
                  <button key={p.name} onClick={() => setProductFocus(p.name)} style={{ padding: '7px 14px', borderRadius: 999, border: productFocus === p.name ? '2px solid #000' : '1.5px solid var(--border)', background: productFocus === p.name ? '#000' : '#fff', color: productFocus === p.name ? '#fff' : 'var(--ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{p.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Angle */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Copy angle</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AUDIENCE_ANGLES.map(a => (
                <button key={a.id} onClick={() => setAngle(a.id)} style={{ padding: '7px 14px', borderRadius: 999, border: angle === a.id ? '2px solid #000' : '1.5px solid var(--border)', background: angle === a.id ? '#000' : '#fff', color: angle === a.id ? '#fff' : 'var(--ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>{a.label}</button>
              ))}
            </div>
          </div>

          {/* Audience override */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Target audience <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>optional override</span>
            </label>
            <input value={audienceOverride} onChange={e => setAudienceOverride(e.target.value)}
              placeholder={brand?.target_audience || 'e.g. Health-conscious women 25-35 who love going out'}
              style={{ border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '12px 14px', fontSize: 14, width: '100%', outline: 'none', color: '#000', background: '#fff', boxSizing: 'border-box' as const }}
              onFocus={e => { e.currentTarget.style.borderColor = '#000' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e0e0e0' }}
            />
            {brand?.target_audience && !audienceOverride && (
              <div style={{ fontSize: 12, color: '#00a86b', marginTop: 4 }}>Using brand default: &quot;{brand.target_audience.slice(0, 60)}...&quot;</div>
            )}
          </div>
        </div>

        {/* Live brief preview */}
        <div style={{ background: '#000', borderRadius: 14, padding: '20px 22px', marginTop: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>Campaign brief</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80, flexShrink: 0 }}>Brand</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{brand?.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80, flexShrink: 0 }}>Goal</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{typeConfig.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80, flexShrink: 0 }}>Hook</span>
              <span style={{ fontSize: 13, color: hook.trim() ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', fontWeight: hook.trim() ? 600 : 400, fontStyle: hook.trim() ? 'normal' : 'italic' }}>{hook.trim() || 'Add a hook for better copy'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80, flexShrink: 0 }}>Angle</span>
              <span style={{ fontSize: 13, color: '#00ff97', fontWeight: 600 }}>{AUDIENCE_ANGLES.find(a => a.id === angle)?.label || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80, flexShrink: 0 }}>Audience</span>
              <span style={{ fontSize: 13, color: (audienceOverride || brand?.target_audience) ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', fontWeight: 400, fontStyle: (audienceOverride || brand?.target_audience) ? 'normal' : 'italic' }}>{audienceOverride || brand?.target_audience || 'Add audience in Brand Hub'}</span>
            </div>
            {brand?.products && brand.products.length > 0 && (
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 80, flexShrink: 0 }}>Product</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>{productFocus === 'all' ? `All products (${brand.products.length})` : productFocus}</span>
              </div>
            )}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Brief completeness</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[!!brand, !!campaignType, !!hook.trim(), !!(audienceOverride || brand?.target_audience), !!angle].map((done, i) => (
                <div key={i} style={{ width: done ? 16 : 8, height: 6, borderRadius: 3, background: done ? '#00ff97' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div>
          <button onClick={submit} disabled={saving}
            style={{ width: '100%', padding: '16px', background: saving ? '#e0e0e0' : '#000', color: saving ? '#999' : '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em', borderRadius: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.15s' }}>
            {saving ? (
              <><div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#666', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Building your funnel...</>
            ) : '⚡ Enter Campaign Mode'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>Generates ad copy, landing page brief, and creatives for this campaign.</div>
        </div>
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    )
  }

  // Step 2 — generating (redirects quickly)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #f0f0f0', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>Building your funnel...</div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
