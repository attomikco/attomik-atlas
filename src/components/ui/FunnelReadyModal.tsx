'use client'
import { useState, useEffect } from 'react'
import { Image, Palette, Type, FileText, Sparkles } from 'lucide-react'
import AttomikLogo from '@/components/ui/AttomikLogo'

export default function FunnelReadyModal({ isOpen, brandName, onContinue }: { isOpen: boolean; brandName: string; onContinue: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { if (isOpen) setTimeout(() => setVisible(true), 50); else setVisible(false) }, [isOpen])
  if (!isOpen) return null

  const items = [
    { icon: Image, title: 'Better images', body: 'Upload real product and lifestyle shots.' },
    { icon: Palette, title: 'Exact colors', body: 'Confirm your primary and accent colors.' },
    { icon: Type, title: 'Your fonts', body: 'Set the typeface and case your brand uses.' },
    { icon: FileText, title: 'Brand voice', body: 'Add tone, messaging and product detail.' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <style>{`@keyframes progressFill { from { width: 10%; } to { width: 85%; } }`}</style>
      <div style={{ position: 'absolute', top: 32, left: 32 }}><AttomikLogo height={20} color="rgba(255,255,255,0.25)" /></div>

      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Sparkles size={28} color="#00ff97" />
        </div>

        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 32, color: '#fff', marginBottom: 12, lineHeight: 1.2 }}>Your funnel is ready.</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 32px' }}>
          Built by scraping <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{brandName}</span> — which is just the start. It gets dramatically better once you fill in the gaps.
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Image size={16} color="#00ff97" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Importing brand images</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', background: '#00ff97', borderRadius: 4, animation: 'progressFill 2.5s ease forwards' }} /></div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>Scraping product images from your website...</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28, textAlign: 'left' }}>
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(0,255,151,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={12} color="#00ff97" /></div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{title}</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>

        <button onClick={onContinue} style={{ width: '100%', padding: 15, background: '#00ff97', color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 15, border: 'none', borderRadius: 12, cursor: 'pointer', marginBottom: 10 }}>
          See my funnel — let&apos;s improve it →
        </button>
        <button onClick={onContinue} style={{ width: '100%', padding: 12, background: 'transparent', color: 'rgba(255,255,255,0.25)', fontSize: 13, border: 'none', cursor: 'pointer' }}>
          Looks good for now
        </button>
      </div>
    </div>
  )
}
