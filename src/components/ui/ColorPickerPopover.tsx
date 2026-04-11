'use client'
import { useState, useRef, useEffect, type ReactNode } from 'react'

export interface ColorPickerPopoverProps {
  value: string
  onChange: (hex: string) => void
  presets: string[]
  /** Override the trigger swatch background (e.g. text-on-color pickers show the bg they'll render on). Defaults to `value`. */
  triggerBg?: string
  /** Optional overlay inside the trigger swatch (e.g. an "A" to preview text-on-bg). */
  triggerContent?: ReactNode
  triggerSize?: number
}

function dedupeHex(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of list) {
    if (typeof c !== 'string') continue
    if (!/^#[0-9a-fA-F]{6}$/.test(c)) continue
    const lower = c.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(lower)
  }
  return out
}

export default function ColorPickerPopover({
  value,
  onChange,
  presets,
  triggerBg,
  triggerContent,
  triggerSize = 40,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState(value.toUpperCase())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setHexDraft(value.toUpperCase()) }, [value])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleHexInput(raw: string) {
    if (!/^#?[0-9A-Fa-f]{0,6}$/.test(raw)) return
    const withHash = raw.startsWith('#') ? raw : '#' + raw
    setHexDraft(withHash.toUpperCase())
    if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) onChange(withHash.toLowerCase())
  }

  const swatches = dedupeHex(presets)

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: triggerSize,
          height: triggerSize,
          borderRadius: 10,
          background: triggerBg || value,
          border: open ? '3px solid #000' : '2px solid #eee',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {triggerContent}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: triggerSize + 8, left: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 14, padding: 14, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Brand colors</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {swatches.map(swatch => (
              <div
                key={swatch}
                onClick={() => { onChange(swatch); setOpen(false) }}
                title={swatch}
                style={{
                  width: 28, height: 28, borderRadius: 8, background: swatch,
                  border: value.toLowerCase() === swatch ? '3px solid #000' : '1.5px solid #e0e0e0',
                  cursor: 'pointer', transition: 'transform 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Custom</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: value, flexShrink: 0, border: '1px solid #eee' }} />
            <input
              type="text"
              value={hexDraft}
              onChange={e => handleHexInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              maxLength={7}
              spellCheck={false}
              style={{
                flex: 1, fontFamily: 'monospace', fontSize: 13, padding: '6px 10px',
                textTransform: 'uppercase', border: '1.5px solid #e0e0e0', borderRadius: 8,
                boxSizing: 'border-box', outline: 'none', minWidth: 0,
              }}
            />
            <label style={{
              width: 28, height: 28, borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
              border: '1px solid #eee', flexShrink: 0,
              background: 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ opacity: 0, width: 0, height: 0 }} />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
