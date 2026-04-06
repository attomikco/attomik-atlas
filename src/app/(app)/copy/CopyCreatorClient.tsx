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
  product?: string
  audience?: string
}

const ANGLE_LABELS: Record<string, string> = {
  'problem-solution': 'Problem → Solution',
  'social-proof': 'Social Proof',
  'curiosity': 'Curiosity Hook',
  'direct-offer': 'Direct Offer',
  'story': 'Story',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#bbb' }}>Variation {index + 1}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onStar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: isStarred ? '#f59e0b' : '#ddd', padding: 0, transition: 'color 0.15s' }}>★</button>
          <button onClick={copyAll} style={{ background: copied ? '#00ff97' : '#f0f0f0', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: copied ? '#000' : '#666', transition: 'all 0.15s' }}>{copied ? '✓ Copied' : 'Copy all'}</button>
          <button onClick={() => { if (confirm('Delete this variation?')) onDelete() }}
            title="Delete variation"
            style={{ background: '#fee', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#dc2626', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fee'; e.currentTarget.style.color = '#dc2626' }}>
            × Delete
          </button>
        </div>
      </div>

      {/* Context pills */}
      {(variation.angle || variation.product || variation.audience) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {variation.angle && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'rgba(167,139,250,0.1)', color: '#7c3aed', border: '1px solid rgba(167,139,250,0.25)' }}>
              {ANGLE_LABELS[variation.angle] || variation.angle}
            </span>
          )}
          {variation.product && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'rgba(244,114,182,0.1)', color: '#db2777', border: '1px solid rgba(244,114,182,0.25)' }}>
              {variation.product}
            </span>
          )}
          {variation.audience && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: '#2563eb', border: '1px solid rgba(96,165,250,0.25)' }}>
              {variation.audience}
            </span>
          )}
        </div>
      )}

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

export default function CopyCreatorClient({ campaigns, initialCampaignId, initialVariations, selectedCampaign, brandAudience = '', brandVoice = '', brandProducts = [] }: {
  brands: any[]; campaigns: any[]; initialCampaignId: string; initialVariations: any[]; selectedCampaign: any; brandAudience?: string; brandVoice?: string; brandProducts?: any[]
}) {
  const router = useRouter()
  const [campaignId, setCampaignId] = useState(initialCampaignId)
  const [variations, setVariations] = useState<Variation[]>(initialVariations)
  const [angle, setAngle] = useState('problem-solution')
  const [customAngle, setCustomAngle] = useState('')
  const [count, setCount] = useState(3)
  const [audienceOverride, setAudienceOverride] = useState('')
  const [selectedProductIdx, setSelectedProductIdx] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [starred, setStarred] = useState<number[]>([])
  const [loadingPhrase, setLoadingPhrase] = useState(0)

  const loadingPhrases = [
    'Reading your brand voice...',
    'Finding the right angle...',
    'Writing variation 1...',
    'Writing variation 2...',
    'Writing variation 3...',
    'Polishing the hooks...',
    'Almost there...',
  ]

  function toggleStar(i: number) { setStarred(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]) }
  function updateVariation(i: number, field: string, value: string) { setVariations(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v)) }
  function deleteVariation(i: number) { setVariations(prev => prev.filter((_, idx) => idx !== i)); setStarred(prev => prev.filter(x => x !== i).map(x => x > i ? x - 1 : x)) }

  async function generate() {
    if (!campaignId || generating) return
    setGenerating(true)
    setLoadingPhrase(0)
    const phraseInterval = setInterval(() => { setLoadingPhrase(p => (p + 1) % loadingPhrases.length) }, 1200)
    try {
      const body: any = { count }
      if (angle && angle !== 'custom') body.angle = angle
      if (angle === 'custom' && customAngle) body.angle = customAngle
      body.audience = audienceOverride || ''
      if (selectedProductIdx !== null && brandProducts[selectedProductIdx]) {
        body.product = brandProducts[selectedProductIdx]
      }
      const res = await fetch(`/api/campaigns/${campaignId}/ad-copy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.variations) {
        const productName = selectedProductIdx !== null && brandProducts[selectedProductIdx]
          ? (brandProducts[selectedProductIdx].name || brandProducts[selectedProductIdx].title || '')
          : ''
        const audienceLabel = audienceOverride ? audienceOverride.slice(0, 40) : ''
        const ctx = {
          angle: angle === 'custom' ? (customAngle ? 'custom' : undefined) : angle,
          product: productName || undefined,
          audience: audienceLabel || undefined,
        }
        setVariations(prev => [...data.variations.map((v: any) => ({ ...v, ...ctx })), ...prev])
      }
    } catch (e) { console.error('Copy generation failed:', e) }
    finally { clearInterval(phraseInterval); setGenerating(false) }
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:translate(-50%,-50%) scale(1)} 50%{opacity:0.5;transform:translate(-50%,-50%) scale(0.7)} }
      `}</style>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Left panel */}
        <div style={{ width: 320, flexShrink: 0, position: 'sticky', top: 104 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
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

            {brandProducts.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Product focus <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10 }}>optional</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => setSelectedProductIdx(null)} style={{
                    padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                    border: selectedProductIdx === null ? '2px solid #000' : '1.5px solid #e0e0e0',
                    background: selectedProductIdx === null ? '#000' : '#fff',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: selectedProductIdx === null ? '#00ff97' : '#000' }}>All products</span>
                    <div style={{ fontSize: 11, color: selectedProductIdx === null ? 'rgba(255,255,255,0.5)' : '#999', marginTop: 1 }}>Generic brand copy</div>
                  </button>
                  {brandProducts.slice(0, 6).map((p: any, i: number) => {
                    const name = p.name || p.title || `Product ${i + 1}`
                    return (
                      <button key={i} onClick={() => setSelectedProductIdx(i)} style={{
                        padding: '10px 14px', borderRadius: 10, textAlign: 'left',
                        border: selectedProductIdx === i ? '2px solid #000' : '1.5px solid #e0e0e0',
                        background: selectedProductIdx === i ? '#000' : '#fff',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: selectedProductIdx === i ? '#00ff97' : '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{name}</span>
                        {p.description && (
                          <div style={{ fontSize: 11, color: selectedProductIdx === i ? 'rgba(255,255,255,0.5)' : '#999', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Audience focus <span style={{ fontWeight: 400, marginLeft: 6, fontSize: 10 }}>optional override</span></label>
              <input value={audienceOverride} onChange={e => setAudienceOverride(e.target.value)}
                placeholder={selectedCampaign?.audience_notes || brandAudience || 'e.g. Busy moms who want healthy snacks'}
                style={{ ...inputStyle, fontSize: 13 }} />
              {(() => {
                const effectiveAudience = audienceOverride || selectedCampaign?.audience_notes || brandAudience
                if (audienceOverride) return <div style={{ fontSize: 11, color: '#00a86b', marginTop: 4 }}>Using your custom audience for this run.</div>
                if (effectiveAudience) return <div style={{ fontSize: 11, color: '#00a86b', marginTop: 4 }}>Using brand audience: &ldquo;{effectiveAudience.slice(0, 70)}{effectiveAudience.length > 70 ? '...' : ''}&rdquo;</div>
                return <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>No audience set — add one in Brand Hub for better copy.</div>
              })()}
            </div>

            <button onClick={generate} disabled={generating} style={{
              width: '100%', padding: 14, background: generating ? '#e0e0e0' : '#000',
              color: generating ? '#999' : '#00ff97', fontFamily: 'Barlow, sans-serif',
              fontWeight: 900, fontSize: 15, borderRadius: 12, border: 'none',
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {generating ? (
                <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Writing...</>
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

          {generating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 28 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #f0f0f0' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#000', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: '#00ff97', animation: 'pulse 1s ease infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 24, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#000', marginBottom: 8 }}>
                  {loadingPhrases[loadingPhrase]}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Generating {count} variation{count !== 1 ? 's' : ''} for {selectedCampaign?.brand?.name || 'your brand'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {loadingPhrases.map((_, i) => (
                  <div key={i} style={{ width: i === loadingPhrase ? 20 : 6, height: 6, borderRadius: 3, background: i === loadingPhrase ? '#000' : '#e0e0e0', transition: 'all 0.3s ease' }} />
                ))}
              </div>
            </div>
          ) : variations.length === 0 ? (
            <div style={{ border: '2px dashed var(--border)', borderRadius: 16, padding: '60px 40px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', marginBottom: 8 }}>Ready to write.</div>
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>Pick an angle and hit generate.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {variations.map((v, i) => (
                <VariationCard key={i} variation={v} index={i} isStarred={starred.includes(i)}
                  onStar={() => toggleStar(i)} onUpdate={(field, value) => updateVariation(i, field, value)}
                  onDelete={() => deleteVariation(i)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
