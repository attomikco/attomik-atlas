'use client'
import { useState, useEffect } from 'react'
import AttomikLogo from '@/components/ui/AttomikLogo'

export default function FunnelReadyModal({ isOpen, brandName, onContinue }: { isOpen: boolean; brandName: string; onContinue: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { if (isOpen) setTimeout(() => setVisible(true), 50); else setVisible(false) }, [isOpen])
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 24px', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 520, margin: '0 auto' }}>
        {/* Logo */}
        <AttomikLogo height={38} color="#ffffff" />
        <div style={{ height: 40 }} />

        {/* Main message */}
        <div style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 900,
          fontSize: 36,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.15,
          marginBottom: 16,
        }}>
          This is a basic preview.<br/>
          <span style={{ color: '#00ff97' }}>
            It gets dramatically better.
          </span>
        </div>

        {/* Explanation */}
        <div style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.45)',
          textAlign: 'center',
          lineHeight: 1.7,
          maxWidth: 420,
          marginBottom: 8,
        }}>
          We built this from scraping{' '}
          <strong style={{ color: 'rgba(255,255,255,0.8)' }}>
            {brandName}
          </strong>
          {' '}&mdash; website data is usually incomplete.
        </div>

        {/* SEO nudge */}
        <div style={{
          fontSize: 14,
          color: '#00ff97',
          textAlign: 'center',
          fontStyle: 'italic',
          marginBottom: 48,
        }}>
          (Psst &mdash; it also means your SEO could use some work 👀)
        </div>

        {/* CTA */}
        <button onClick={onContinue} style={{
          background: '#00ff97',
          color: '#000',
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 800,
          fontSize: 16,
          padding: '16px 40px',
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          maxWidth: 400,
        }}>
          I understand, show me the preview →
        </button>
      </div>
    </div>
  )
}
