'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandVoiceExample } from '@/types'
import { Plus, Trash2, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  brandId: string
  examples: BrandVoiceExample[]
}

export default function BrandVoiceExamples({ brandId, examples }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'good' | 'bad'>('good')

  const [newExample, setNewExample] = useState({
    category: 'good' as 'good' | 'bad',
    label: '',
    content: '',
    notes: '',
  })

  const good = examples.filter(e => e.category === 'good')
  const bad = examples.filter(e => e.category === 'bad')
  const current = tab === 'good' ? good : bad

  async function handleAdd() {
    if (!newExample.content.trim()) return
    setSaving(true)
    await supabase.from('brand_voice_examples').insert({
      brand_id: brandId,
      category: newExample.category,
      label: newExample.label || null,
      content: newExample.content,
      notes: newExample.notes || null,
    })
    setSaving(false)
    setAdding(false)
    setNewExample({ category: 'good', label: '', content: '', notes: '' })
    router.refresh()
  }

  async function handleDelete(id: string) {
    await supabase.from('brand_voice_examples').delete().eq('id', id)
    router.refresh()
  }

  const inputCls = "w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[#bbb]"

  return (
    <div className="bg-paper border border-border rounded-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="label">Voice examples</div>
        <button onClick={() => { setAdding(!adding); setNewExample(prev => ({ ...prev, category: tab })) }}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors font-semibold">
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button onClick={() => setTab('good')}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-btn transition-colors ${tab === 'good' ? 'bg-ink text-paper font-semibold' : 'text-muted hover:text-ink'}`}>
          <ThumbsUp size={12} /> Good ({good.length})
        </button>
        <button onClick={() => setTab('bad')}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-btn transition-colors ${tab === 'bad' ? 'bg-ink text-paper font-semibold' : 'text-muted hover:text-ink'}`}>
          <ThumbsDown size={12} /> Bad ({bad.length})
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-cream rounded-btn p-4 mb-4 space-y-3">
          <div className="flex gap-2">
            <select className={inputCls + ' !w-auto'} value={newExample.category}
              onChange={e => setNewExample(prev => ({ ...prev, category: e.target.value as 'good' | 'bad' }))}>
              <option value="good">Good example</option>
              <option value="bad">Bad example</option>
            </select>
            <input className={inputCls} value={newExample.label}
              onChange={e => setNewExample(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Label (e.g. Homepage hero, Email subject)" />
          </div>
          <textarea className={inputCls + ' resize-none'} rows={3} value={newExample.content}
            onChange={e => setNewExample(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Paste the copy here..." />
          <input className={inputCls} value={newExample.notes}
            onChange={e => setNewExample(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Why is this good/bad? (optional)" />
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={saving || !newExample.content.trim()}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-btn transition-colors disabled:opacity-50"
              style={{ background: '#000', color: '#00ff97' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              Save example
            </button>
            <button onClick={() => setAdding(false)}
              className="text-sm text-muted hover:text-ink transition-colors px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Examples list */}
      {current.length > 0 ? (
        <div className="space-y-3">
          {current.map(ex => (
            <div key={ex.id} className="bg-cream rounded-btn p-4 relative group">
              <button onClick={() => handleDelete(ex.id)}
                className="absolute top-3 right-3 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                <Trash2 size={13} />
              </button>
              {ex.label && (
                <div className="text-xs font-semibold text-muted mb-1.5">{ex.label}</div>
              )}
              <blockquote className="text-sm leading-relaxed italic border-l-2 border-border pl-3">
                {ex.content}
              </blockquote>
              {ex.notes && (
                <p className="text-xs text-muted mt-2">{ex.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted text-sm">
          No {tab} examples yet. Add copy samples to teach the AI {tab === 'good' ? 'what to emulate' : 'what to avoid'}.
        </p>
      )}
    </div>
  )
}
