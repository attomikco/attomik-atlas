'use client'
// Per-block AI rewrite. POSTs to /api/landing-pages/[id]/rewrite-block and
// applies the returned { data } via actions.updateData, which autosave
// picks up.
//
// Recent versions is an in-memory ring buffer keyed by block.id — the
// useState resets when the user switches blocks (acceptable v1 behavior).
// No localStorage, no DB persistence; restoring a version applies it via
// the same updateData path a fresh rewrite would.

import { useEffect, useState } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { BuilderActions } from '../BuilderClient'

type Tone = 'brand-default' | 'bold-direct' | 'warm-conversational' | 'editorial' | 'playful'
type Length = 'shorter' | 'similar' | 'longer'

interface Props {
  block: Block
  pageId: string
  actions: BuilderActions
}

const TONE_OPTIONS: Array<{ value: Tone; label: string }> = [
  { value: 'brand-default',       label: 'Brand default' },
  { value: 'bold-direct',         label: 'Bold & direct' },
  { value: 'warm-conversational', label: 'Warm & conversational' },
  { value: 'editorial',           label: 'Editorial' },
  { value: 'playful',             label: 'Playful' },
]

const LENGTH_OPTIONS: Array<{ value: Length; label: string }> = [
  { value: 'shorter', label: 'Shorter' },
  { value: 'similar', label: 'Similar' },
  { value: 'longer',  label: 'Longer' },
]

const QUICK_CHIPS: Array<{ label: string; prompt: string }> = [
  { label: 'Shorter',              prompt: 'Make this block more concise. Cut 30-40%.' },
  { label: 'Punchier',             prompt: 'Make this punchier. Shorter sentences, stronger verbs, more confidence.' },
  { label: 'Benefits-focused',     prompt: 'Reframe to emphasize customer benefits over features.' },
  { label: 'Add urgency',          prompt: 'Add a sense of urgency or scarcity without being salesy.' },
  { label: 'More specific',        prompt: 'Replace vague claims with specific, concrete details.' },
]

type HistoryEntry = {
  timestamp: number
  data: Record<string, unknown>
  prompt: string
}
const RING_SIZE = 5

export function AiTab({ block, pageId, actions }: Props) {
  // Footer block is content-sparse; AI rewrite isn't useful there and the
  // schema prompt would mostly shuffle the brand/tagline around. Hide the
  // full UI and show a short disabled message.
  if (block.type === 'footer') {
    return (
      <div style={{
        padding: spacing[4], textAlign: 'center',
        border: `1.5px dashed ${colors.border}`, borderRadius: radius.md,
        color: colors.muted,
      }}>
        <div style={{
          fontFamily: font.mono, fontSize: fontSize.xs,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
          marginBottom: spacing[2],
        }}>AI rewrite not available</div>
        <div style={{ fontSize: fontSize.caption, color: colors.muted, lineHeight: 1.5 }}>
          Footer content mostly comes from brand hub. Edit there instead.
        </div>
      </div>
    )
  }

  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState<Tone>('brand-default')
  const [length, setLength] = useState<Length>('similar')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Ring-buffer resets when the user switches blocks — v1 scope.
  useEffect(() => {
    setPrompt('')
    setError(null)
    setHistory([])
  }, [block.id])

  const submit = async (promptOverride?: string) => {
    const effective = (promptOverride ?? prompt).trim()
    if (!effective) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/landing-pages/${pageId}/rewrite-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId: block.id,
          blockType: block.type,
          variant: block.variant,
          currentData: block.data,
          prompt: effective,
          tone,
          length,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error ?? `HTTP ${res.status}`)
      }
      const newData = json.data as Record<string, unknown>
      actions.updateData(block.id, newData)
      setHistory(prev => [{ timestamp: Date.now(), data: newData, prompt: effective }, ...prev].slice(0, RING_SIZE))
      // Keep the prompt text so the user can tweak and re-run.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const restore = (entry: HistoryEntry) => {
    actions.updateData(block.id, entry.data)
    setHistory(prev => [{ ...entry, timestamp: Date.now() }, ...prev.filter(h => h !== entry)].slice(0, RING_SIZE))
  }

  const handleChipClick = (chipPrompt: string) => {
    setPrompt(chipPrompt)
    void submit(chipPrompt)
  }

  const canSubmit = prompt.trim().length > 0 && !busy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      {/* AI hero card */}
      <div style={{
        padding: spacing[3], borderRadius: radius.lg, background: colors.darkBg, color: colors.paper,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
          <div style={{
            width: 22, height: 22, borderRadius: radius.sm,
            background: colors.accent, color: colors.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: fontWeight.heading, fontFamily: font.heading,
          }}>✦</div>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md,
            textTransform: 'uppercase',
          }}>Rewrite this block</div>
        </div>
        <div style={{ fontSize: fontSize.xs, color: colors.gray600 }}>
          Uses brand voice + campaign context. Only replaces this block&rsquo;s content.
        </div>
      </div>

      {/* Prompt */}
      <div>
        <div style={labelStyle}>What should change?</div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g. make the headline punchier, lean into morning ritual"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {/* Tone + Length */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
        <div>
          <div style={labelStyle}>Tone</div>
          <select value={tone} onChange={e => setTone(e.target.value as Tone)} style={inputStyle}>
            {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={labelStyle}>Length</div>
          <select value={length} onChange={e => setLength(e.target.value as Length)} style={inputStyle}>
            {LENGTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Quick chips */}
      <div>
        <div style={labelStyle}>Quick apply</div>
        <div style={{ display: 'flex', gap: spacing[1] + 2, flexWrap: 'wrap' }}>
          {QUICK_CHIPS.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => handleChipClick(c.prompt)}
              disabled={busy}
              style={{
                padding: `4px ${spacing[2] + 2}px`,
                border: `1px solid ${colors.border}`, background: colors.paper,
                borderRadius: radius.pill, fontSize: fontSize.xs, fontFamily: font.mono,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: busy ? 'not-allowed' : 'pointer',
                color: colors.ink, opacity: busy ? 0.5 : 1,
              }}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          padding: `${spacing[2]}px ${spacing[3]}px`,
          background: colors.dangerLight, border: `1px solid ${colors.danger}`,
          borderRadius: radius.md, fontSize: fontSize.caption, color: colors.danger,
        }}>{error}</div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void submit()}
        style={{
          padding: `${spacing[3]}px ${spacing[4]}px`,
          background: canSubmit ? colors.ink : colors.gray300,
          color: canSubmit ? colors.accent : colors.subtle,
          border: 'none', borderRadius: radius.md,
          fontFamily: font.heading, fontWeight: fontWeight.extrabold,
          fontSize: fontSize.body, letterSpacing: '0.04em', textTransform: 'uppercase',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {busy ? 'Generating…' : '✦ Rewrite with AI'}
      </button>

      {/* Recent versions */}
      {history.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: `${spacing[2]}px 0` }} />
          <div>
            <div style={labelStyle}>Recent versions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
              {history.map((h, i) => {
                const preview = firstTextPreview(h.data)
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: spacing[2],
                    padding: `${spacing[1]}px ${spacing[2]}px`,
                    borderRadius: radius.sm,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: font.mono, fontSize: fontSize['2xs'],
                        letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.subtle,
                      }}>{relativeTime(h.timestamp)}</div>
                      <div style={{
                        fontSize: fontSize.caption, color: colors.ink,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{preview}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => restore(h)}
                      style={{
                        padding: `3px ${spacing[2]}px`, background: colors.cream,
                        border: `1px solid ${colors.border}`, borderRadius: radius.sm,
                        fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
                        cursor: 'pointer', color: colors.ink, fontFamily: 'inherit',
                      }}
                    >Restore</button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// First-populated string field from the rewritten data, truncated. Covers
// headline / quote / brand / caption — all blocks have one.
function firstTextPreview(data: Record<string, unknown>): string {
  const keys = ['headline', 'quote', 'brand', 'caption', 'body']
  for (const k of keys) {
    const v = data[k]
    if (typeof v === 'string' && v.trim()) return `\u201C${v.slice(0, 60)}${v.length > 60 ? '…' : ''}\u201D`
  }
  return '(updated)'
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 10_000) return 'Just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

const labelStyle: React.CSSProperties = {
  fontFamily: font.mono, fontSize: fontSize.xs,
  letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
  marginBottom: spacing[1],
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: `${spacing[2]}px ${spacing[2]}px`,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: fontSize.body,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  color: colors.ink,
  background: colors.paper,
}
