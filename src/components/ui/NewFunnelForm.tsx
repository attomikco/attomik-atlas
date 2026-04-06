'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewFunnelForm() {
  const [url, setUrl] = useState('')
  const router = useRouter()

  function handleSubmit() {
    if (!url.trim()) return
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
    router.push(`/onboarding?url=${encodeURIComponent(normalized)}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 480 }}>
      <input
        value={url}
        onChange={e => setUrl(e.target.value.toLowerCase())}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="yourbrand.com"
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          width: '100%', padding: '14px 18px', fontSize: 16, fontWeight: 500,
          background: '#fff', border: '2px solid #e0e0e0', borderRadius: 12,
          color: '#000', outline: 'none', textAlign: 'center', textTransform: 'lowercase' as any,
        }}
        onFocus={e => { e.target.style.borderColor = '#000' }}
        onBlur={e => { e.target.style.borderColor = '#e0e0e0' }}
      />
      <button
        onClick={handleSubmit}
        disabled={!url.trim()}
        style={{
          width: '100%', padding: 15,
          background: !url.trim() ? '#ccc' : '#00ff97',
          color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 16,
          border: 'none', borderRadius: 12,
          cursor: !url.trim() ? 'not-allowed' : 'pointer',
        }}
      >
        Build funnel →
      </button>
    </div>
  )
}
