'use client'

interface ComparisonSidebarProps {
  brandName: string
  oldWayItems: string[]
  setOldWayItems: (fn: (prev: string[]) => string[]) => void
  newWayItems: string[]
  setNewWayItems: (fn: (prev: string[]) => string[]) => void
  inputCls: string
}

export default function ComparisonSidebar({ brandName, oldWayItems, setOldWayItems, newWayItems, setNewWayItems, inputCls }: ComparisonSidebarProps) {
  return (
    <div className="bg-paper border border-border rounded-card p-4 space-y-2.5">
      <label className="label block">Old way</label>
      {oldWayItems.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-red-500 text-sm font-bold flex-shrink-0">{'\u2717'}</span>
          <input className={inputCls} value={item}
            onChange={e => setOldWayItems(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`Problem ${i + 1}`} />
        </div>
      ))}
      <label className="label block pt-1">The {brandName} way</label>
      {newWayItems.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-green-500 text-sm font-bold flex-shrink-0">{'\u2713'}</span>
          <input className={inputCls} value={item}
            onChange={e => setNewWayItems(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`Benefit ${i + 1}`} />
        </div>
      ))}
    </div>
  )
}
