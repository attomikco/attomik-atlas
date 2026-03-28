'use client'
import { useState, useEffect } from 'react'
import { Image, Palette, Type, FileText, Sparkles, CheckCircle } from 'lucide-react'
import AttomikLogo from '@/components/ui/AttomikLogo'

export default function FunnelReadyModal({ isOpen, brandName, onContinue, imagesLoaded = true, imageCount = 0 }: { isOpen: boolean; brandName: string; onContinue: () => void; imagesLoaded?: boolean; imageCount?: number }) {
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
      <style>{`@keyframes progressPulse { 0% { width: 20%; opacity: 1; } 50% { width: 75%; opacity: 0.8; } 100% { width: 20%; opacity: 1; } }`}</style>
      <div style={{ position: 'absolute', top: 32, left: 32 }}><AttomikLogo height={24} color="rgba(255,255,255,0.4)" /></div>

      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Sparkles size={28} color="#00ff97" />
        </div>

        <div style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 900,
          fontSize: 28,
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: 12,
          textAlign: 'center',
        }}>
          This is a basic preview.<br/>
          <span style={{ color: '#00ff97' }}>
            It gets dramatically better.
          </span>
        </div>

        <div style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.7,
          textAlign: 'center',
          maxWidth: 380,
          margin: '0 auto 8px',
        }}>
          We built this from scraping{' '}
          <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
            {brandName}
          </span>
          {' '}&mdash; website data is usually incomplete.
        </div>

        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.3)',
          textAlign: 'center',
          marginBottom: 28,
          fontStyle: 'italic',
        }}>
          (Psst &mdash; it also means your SEO could use some work 👀)
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {imagesLoaded ? <CheckCircle size={16} color="#00ff97" /> : <Image size={16} color="#00ff97" />}
          </div>
          <div style={{ flex: 1 }}>
            {imagesLoaded ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                  {imageCount > 0 ? `${imageCount} brand image${imageCount !== 1 ? 's' : ''} imported` : 'Brand images imported'}
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: '100%', background: '#00ff97', borderRadius: 4 }} /></div>
                <div style={{ fontSize: 11, color: '#00ff97', marginTop: 5, fontWeight: 600 }}>Ready to use in your creatives</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Importing brand images</div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: '70%', background: '#00ff97', borderRadius: 4, animation: 'progressPulse 1.5s ease-in-out infinite' }} /></div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>Fetching images from your website...</div>
              </>
            )}
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

        <button onClick={onContinue} disabled={!imagesLoaded} style={{ width: '100%', padding: 15, background: '#00ff97', color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 15, border: 'none', borderRadius: 12, cursor: imagesLoaded ? 'pointer' : 'not-allowed', marginBottom: 10, opacity: imagesLoaded ? 1 : 0.5, transition: 'opacity 0.3s ease' }}>
          {imagesLoaded ? 'Make it better \u2014 add your brand \u2192' : 'Importing images...'}
        </button>
        <button onClick={onContinue} style={{ width: '100%', padding: 12, background: 'transparent', color: 'rgba(255,255,255,0.25)', fontSize: 13, border: 'none', cursor: 'pointer' }}>
          Show me the preview first
        </button>
      </div>
    </div>
  )
}
