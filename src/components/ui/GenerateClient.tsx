'use client'
import { useState } from 'react'
import { Sparkles, Copy, Check, ChevronDown } from 'lucide-react'

const TOOLS = [
  { id: 'ad_copy',   label: 'Ad copy',        platforms: ['Instagram','Facebook','Google Search','TikTok','Pinterest'] },
  { id: 'social',    label: 'Social captions', platforms: ['Instagram','TikTok','LinkedIn','Facebook','Pinterest'] },
  { id: 'email',     label: 'Email',           types: ['Welcome','Product launch','Abandoned cart','Promotional','Re-engagement','Post-purchase'] },
  { id: 'seo',       label: 'SEO content',     types: ['Blog outline','Meta title & description','Product description','Category page','FAQ section'] },
  { id: 'dtc_brief', label: 'DTC strategy',    stages: ['Pre-launch','Launch','Growth','Scale'] },
]
const TONES = ['Playful','Sophisticated','Bold','Warm','Casual','Minimal','Storytelling']

interface Brand { id: string; name: string; primary_color: string | null; tone_keywords: string[] | null }

export default function GenerateClient({ brands, defaultBrandId }: { brands: Brand[]; defaultBrandId?: string }) {
  const [brandId, setBrandId] = useState(defaultBrandId || brands[0]?.id || '')
  const [tool, setTool]       = useState(TOOLS[0].id)
  const [tone, setTone]       = useState('Playful')
  const [platform, setPlatform] = useState('')
  const [subtype, setSubtype]   = useState('')
  const [brief, setBrief]       = useState('')
  const [output, setOutput]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const activeTool = TOOLS.find(t => t.id === tool)!
  const brand = brands.find(b => b.id === brandId)

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors appearance-none placeholder:text-[#bbb]"

  async function generate() {
    if (!brandId || !brief) return
    setLoading(true); setOutput('')
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, tool, tone, platform, subtype, brief }),
    })
    if (!res.body) { setLoading(false); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const p = JSON.parse(data)
          if (p.delta?.text) { text += p.delta.text; setOutput(text) }
        } catch {}
      }
    }
    setLoading(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(output)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Controls */}
      <div className="lg:col-span-2 space-y-5">
        {/* Brand */}
        <div>
          <label className="label block mb-1.5">Brand</label>
          <div className="relative">
            <select value={brandId} onChange={e => setBrandId(e.target.value)} className={inputCls + ' pr-8'}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
          {brand?.tone_keywords && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {brand.tone_keywords.slice(0, 3).map(kw => (
                <span key={kw} className="text-xs px-2 py-0.5 bg-cream rounded-pill text-muted">{kw}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tool */}
        <div>
          <label className="label block mb-1.5">Content type</label>
          <div className="grid grid-cols-2 gap-2">
            {TOOLS.map(t => (
              <button key={t.id} onClick={() => { setTool(t.id); setPlatform(''); setSubtype('') }}
                className="text-sm px-3 py-2 rounded-btn border transition-all duration-150 text-left font-medium"
                style={tool === t.id
                  ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                  : { background: 'white', color: '#666', borderColor: '#e0e0e0' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform or subtype */}
        {activeTool.platforms && (
          <div>
            <label className="label block mb-1.5">Platform</label>
            <div className="relative">
              <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls + ' pr-8'}>
                <option value="">Select platform</option>
                {activeTool.platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>
        )}
        {(activeTool.types || activeTool.stages) && (
          <div>
            <label className="label block mb-1.5">{activeTool.stages ? 'Brand stage' : 'Type'}</label>
            <div className="relative">
              <select value={subtype} onChange={e => setSubtype(e.target.value)} className={inputCls + ' pr-8'}>
                <option value="">Select</option>
                {(activeTool.types || activeTool.stages || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
          </div>
        )}

        {/* Tone */}
        <div>
          <label className="label block mb-1.5">Tone</label>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(t => (
              <button key={t} onClick={() => setTone(t)}
                className="text-xs px-2.5 py-1 rounded-pill border transition-all duration-150 font-medium"
                style={tone === t
                  ? { background: '#000', color: '#00ff97', borderColor: '#000' }
                  : { borderColor: '#e0e0e0', color: '#666' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Brief */}
        <div>
          <label className="label block mb-1.5">Brief / context</label>
          <textarea className={inputCls + ' resize-none'} rows={4} value={brief}
            onChange={e => setBrief(e.target.value)}
            placeholder="What should this content be about? Include the offer, goal, or key message..." />
        </div>

        <button onClick={generate} disabled={loading || !brandId || !brief}
          className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: '#00ff97', color: '#000' }}
        >
          <Sparkles size={15} />
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Output */}
      <div className="lg:col-span-3">
        <div className="bg-paper border border-border rounded-card flex flex-col" style={{ minHeight: 480 }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="label">Output</span>
            {output && (
              <button onClick={copy} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <div className="flex-1 p-5 overflow-y-auto">
            {output ? (
              <pre className="text-sm whitespace-pre-wrap font-sans text-ink leading-relaxed animate-fadeIn">{output}</pre>
            ) : (
              <div className="h-full flex items-center justify-center">
                {loading ? (
                  <div className="flex items-center gap-2">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-2 h-2 rounded-full"
                        style={{ background: '#00ff97', animation: `bounce 1s ease infinite ${delay}ms` }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm text-center leading-relaxed">
                    Select a brand, choose a content type,<br />fill in the brief, and hit generate.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
