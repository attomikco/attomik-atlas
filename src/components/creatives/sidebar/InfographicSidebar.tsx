'use client'
import type { Callout } from '../templates/types'

interface InfographicSidebarProps {
  callouts: Callout[]
  setCallouts: (fn: (prev: Callout[]) => Callout[]) => void
  statStripText: string
  setStatStripText: (v: string) => void
  inputCls: string
}

export default function InfographicSidebar({ callouts, setCallouts, statStripText, setStatStripText, inputCls }: InfographicSidebarProps) {
  return (
    <div className="bg-paper border border-border rounded-card p-4 space-y-2.5">
      <label className="label block">Callouts</label>
      {callouts.map((c, i) => (
        <div key={i} className="flex gap-1.5">
          <input className={inputCls + ' !w-10 text-center flex-shrink-0'} value={c.icon} placeholder="&#x1F33F;"
            onChange={e => setCallouts(prev => prev.map((x, j) => j === i ? { ...x, icon: e.target.value } : x))} />
          <input className={inputCls + ' !w-24 flex-shrink-0'} value={c.label} placeholder="Label"
            onChange={e => setCallouts(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
          <input className={inputCls} value={c.description} placeholder="Description"
            onChange={e => setCallouts(prev => prev.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} />
        </div>
      ))}
      <div>
        <label className="text-[10px] text-muted uppercase tracking-wide font-semibold block mb-1">Stat strip</label>
        <input className={inputCls} value={statStripText} onChange={e => setStatStripText(e.target.value)} placeholder="Only 1g of Sugar" />
      </div>
    </div>
  )
}
