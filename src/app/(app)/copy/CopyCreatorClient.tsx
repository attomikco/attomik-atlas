'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Variation {
  id?: string
  headline: string
  primary_text: string
  description: string
  created_at?: string
  angle?: string
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }
const inputStyle: React.CSSProperties = { border: '1.5px solid #e0e0e0', borderRadius: 10, padding: '11px 14px', fontSize: 14, width: '100%', outline: 'none', color: '#000', background: '#fff' }

function VariationCard({ variation, index, isStarred, onStar, onUpdate, onDelete }: {
  variation: Variation; index: number; isStarred: boolean
  onStar: () => void; onUpdate: (field: string, value: string) => void; onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copyAll() {
    const text = `HEADLINE:\n${variation.headline}\n\nPRIMARY TEXT:\n${variation.primary_text}\n\nDESCRIPTION:\n${variation.description}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{
      background: '#fff', border: isStarred ? '2px solid #000' : '1px solid var(--border)',
      borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column',
      transition: 'border-color 0.15s', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Variation {index + 1}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onStar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: isStarred ? '#f59e0b' : '#ddd', padding: 0, transition: 'color 0.15s' }}>★</button>
          <button onClick={copyAll} style={{ background: copied ? '#00ff97' : '#f0f0f0', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: copied ? '#000' : '#666', transition: 'all 0.15s' }}>{copied ? '✓ Copied' : 'Copy all'}</button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#ddd', padding: 0 }}>×</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', marginBottom: 5 }}>Headline</div>
        <div contentEditable suppressContentEditableWarning onBlur={e => onUpdate('headline', e.currentTarget.textContent || '')}
          style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, lineHeight: 1.2, color: '#000', outline: 'none', padding: '4px 8px', borderRadius: 6, border: '1.5px solid transparent', cursor: 'text', minHeight: 28 }}
          onFocus={e => (e.currentTarget.style.borderColor = '#e0e0e0')} onBlurCapture={e => (e.currentTarget.style.borderColor = 'transparent')}>
          {variation.headline}
        </div>
      </div>

      <div style={{ height: 1, background: '#f0f0f0', marginBottom: 12 }} />

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#bbb', marginBottom: 5 }}>Primary text</div>
        <div contentEditable suppressContentEditableWarning onBlur={e => onUpdate('primary_text', e.currentTarget.textContent || '')}
          style={{ fontSize: 14, lineHeight: 1.7, color: '#444', outline: 'none', padding: '4px 8px', borderRadius: 6, border: '1.5px solid transparent', cursor: 'text', minHeight: 60 }}
          onFocus={e => (e.currentTarget.style.borderColor = '#e0e0e0')} onBlurCapture={e => (e.currentTarget.style.borderColor = 'transparent')}>
          {variation.primary_text}
        </div>
      </div>

      <div contentEditable suppressContentEditableWarning onBlur={e => onUpdate('description', e.currentTarget.textContent || '')}
        style={{ display: 'inline-block', background: '#f5f5f5', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#666', outline: 'none', cursor: 'text', border: '1.5px solid transparent', alignSelf: 'flex-start' }}
        onFocus={e => (e.currentTarget.style.borderColor = '#e0e0e0')} onBlurCapture={e => (e.currentTarget.style.borderColor = 'transparent')}>
        {variation.description}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
        {[
          { label: 'Headline', chars: variation.headline.length, max: 27 },
          { label: 'Description', chars: variation.description.length, max: 27 },
        ].map(({ label, chars, max }) => (
          <span key={label} style={{ fontSize: 10, fontWeight: 600, color: chars > max ? '#ef4444' : '#bbb' }}>{label}: {chars}/{max}</span>
        ))}
        <span style={{ fontSize: 10, fontWeight: 600, color: '#bbb' }}>Body: {variation.primary_text.length} chars</span>
      </div>
    </div>
  )
}

const ANGLES = [
  { value: 'problem-solution', label: 'Problem → Solution', desc: 'Lead with pain, offer relief' },
  { value: 'social-proof', label: 'Social Proof', desc: 'Results, reviews, credibility' },
  { value: 'curiosity', label: 'Curiosity Hook', desc: 'Open loop, make them want more' },
  { value: 'direct-offer', label: 'Direct Offer', desc: 'Lead with the deal' },
  { value: 'story', label: 'Story', desc: 'Narrative, emotional connection' },
  { value: 'custom', label: 'Custom...', desc: 'Write your own angle' },
]

export default function CopyCreatorClient({ campaigns, initialCampaignId, initialVariations, selectedCampaign }: {
  brands: any[]; campaigns: any[]; initialCampaignId: string; initialVariations: any[]; selectedCampaign: any
}) {
  const router = useRouter()
  const [campaignId, setCampaignId] = useState(initialCampaignId)
  const [variations, setVariations] = useState<Variation[]>(initialVariations)
  const [angle, setAngle] = useState('problem-solution')
  const [customAngle, setCustomAngle] = useState('')
  const [count, setCount] = useState(3)
  const [audienceOverride, setAudienceOverride] = useState('')
  const [generating, setGenerating] = useState(false)
  const [starred, setStarred] = useState<number[]>([])

  function toggleStar(i: number) { setStarred(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]) }
  function updateVariation(i: number, field: string, value: string) { setVariations(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v)) }
  function deleteVariation(i: number) { setVariations(prev => prev.filter((_, idx) => idx !== i)); setStarred(prev => prev.filter(x => x !== i).map(x => x > i ? x - 1 : x)) }

  async function generate() {
    if (!campaignId || generating) return
    setGenerating(true)
    try {
      const body: any = { count }
      if (angle && angle !== 'custom') body.angle = angle
      if (angle === 'custom' && customAngle) body.angle = customAngle
      if (audienceOverride) body.audience = audienceOverride
      const res = await fetch(`/api/campaigns/${campaignId}/ad-copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.variations) {
        setVariations(prev => [...data.variations.map((v: any) => ({ ...v, angle })), ...prev])
      }
    } catch (e) { console.error('Copy generation failed:', e) }
    setGenerating(false)
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Left panel */}
        <div style={{ width: 320, flexShrink: 0, position: 'sticky', top: 104 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Campaign</label>
              <select value={campaignId} onChange={e => { setCampaignId(e.target.value); router.push(`/copy?campaign=${e.target.value}`) }}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.brand?.name} — {c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Angle</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ANGLES.map(a => (
                  <button key={a.value} onClick={() => setAngle(a.value)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: '10px 14px', borderRadius: 10,
                    border: angle === a.value ? '2px solid #000' : '1.5px solid #e0e0e0',
                    background: angle === a.value ? '#000' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: angle === a.value ? '#00ff97' : '#000' }}>{a.label}</span>
                    <span style={{ fontSize: 11, color: angle === a.value ? 'rgba(255,255,255,0.5)' : '#999', marginTop: 1 }}>{a.desc}</span>
                  </button>
                ))}
              </div>
              {angle === 'custom' && (
                <textarea value={customAngle} onChange={e => setCustomAngle(e.target.value)} placeholder="Describe the angle..." rows={3}
                  style={{ ...inputStyle, marginTop: 8, resize: 'vertical', fontSize: 13 }} />
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Variations to generate</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[3, 5, 10].map(n => (
                  <button key={n} onClick={() => setCount(n)} style={{
                    flex: 1, padding: 8, borderRadius: 8,
                    border: count === n ? '2px solid #000' : '1.5px solid #e0e0e0',
                    background: count === n ? '#000' : '#fff',
                    color: count === n ? '#00ff97' : '#000',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Audience focus <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10 }}>optional override</span></label>
              <input value={audienceOverride} onChange={e => setAudienceOverride(e.target.value)}
                placeholder={selectedCampaign?.audience_notes || 'e.g. Busy moms who want healthy snacks'}
                style={{ ...inputStyle, fontSize: 13 }} />
            </div>

            <button onClick={generate} disabled={generating} style={{
              width: '100%', padding: 14, background: generating ? '#e0e0e0' : '#000',
              color: generating ? '#999' : '#00ff97', fontFamily: 'Barlow, sans-serif',
              fontWeight: 900, fontSize: 15, borderRadius: 12, border: 'none',
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {generating ? (
                <><span style={{ width: 14, height: 14, border: '2px solid #bbb', borderTopColor: '#666', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Writing copy...</>
              ) : `Generate ${count} variations →`}
            </button>

            {variations.length > 0 && (
              <button onClick={() => setVariations([])} style={{
                width: '100%', marginTop: 8, padding: 8, background: 'none',
                border: '1px solid #eee', borderRadius: 8, fontSize: 12, color: '#999', cursor: 'pointer',
              }}>Clear all</button>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 4 }}>Copy Creator</h1>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {variations.length > 0 ? `${variations.length} variation${variations.length !== 1 ? 's' : ''} — click any field to edit` : 'Select a campaign and angle, then generate.'}
              </div>
            </div>
            {starred.length > 0 && (
              <div style={{ background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.2)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#00a86b' }}>
                ★ {starred.length} starred
              </div>
            )}
          </div>

          {variations.length === 0 && !generating && (
            <div style={{ border: '2px dashed var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', marginBottom: 8 }}>Ready to write.</div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>Pick an angle and hit generate.</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {variations.map((v, i) => (
              <VariationCard key={i} variation={v} index={i} isStarred={starred.includes(i)}
                onStar={() => toggleStar(i)} onUpdate={(field, value) => updateVariation(i, field, value)}
                onDelete={() => deleteVariation(i)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
