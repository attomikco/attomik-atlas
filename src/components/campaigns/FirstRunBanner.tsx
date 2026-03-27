'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function FirstRunBanner() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div className="card card-dark bg-ink rounded-card p-6 mb-6 relative" style={{ color: '#fff' }}>
      <button onClick={() => setVisible(false)}
        className="absolute top-4 right-4 transition-colors"
        style={{ color: 'rgba(255,255,255,0.3)' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
        <X size={16} />
      </button>
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="font-bold text-lg">Your funnel is being built</div>
          <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Ad copy, landing page brief, and creatives — all from your brand context.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="badge badge-live rounded-full px-3 py-1 text-xs font-bold" style={{ background: '#00ff97', color: '#000' }}>Ad Copy</span>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>Landing Brief</span>
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>Creatives</span>
        </div>
      </div>
    </div>
  )
}
