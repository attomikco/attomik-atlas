'use client'
import { useState, useEffect } from 'react'
import AttomikLogo from '@/components/ui/AttomikLogo'
import { colors, font, fontWeight, fontSize, radius, zIndex } from '@/lib/design-tokens'

export default function FunnelReadyModal({ isOpen, brandName, onContinue }: { isOpen: boolean; brandName: string; onContinue: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { if (isOpen) setTimeout(() => setVisible(true), 50); else setVisible(false) }, [isOpen])
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: zIndex.toast, background: colors.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '40px 24px', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' /* TODO: tokenize */ }}>
      {/* Logo — fixed at top */}
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <AttomikLogo height={36} color={colors.paper} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 520, margin: '0 auto', paddingTop: 100 }}>

        {/* Main message */}
        <div style={{
          fontFamily: font.heading,
          fontWeight: fontWeight.heading,
          fontSize: fontSize['9xl'],
          color: colors.paper,
          textAlign: 'center',
          lineHeight: 1.15,
          marginBottom: 16,
          textTransform: 'uppercase' as const,
        }}>
          This is a basic preview.<br/>
          <span style={{ color: colors.accent }}>
            It gets dramatically better once you add your images and styles.
          </span>
        </div>

        {/* Explanation */}
        <div style={{
          fontSize: fontSize.lg,
          color: colors.whiteAlpha45,
          textAlign: 'center',
          lineHeight: 1.7,
          maxWidth: 420,
          marginBottom: 8,
        }}>
          We built this from scraping{' '}
          <strong style={{ color: colors.whiteAlpha80 }}>
            {brandName}
          </strong>
          {' '}&mdash; website data is usually incomplete.
        </div>

        {/* SEO nudge */}
        <div style={{
          fontSize: fontSize.md,
          color: colors.accent,
          textAlign: 'center',
          fontStyle: 'italic',
          marginBottom: 48,
        }}>
          (Psst &mdash; it also means your SEO could use some work 👀)
        </div>

        {/* CTA */}
        <button onClick={onContinue} style={{
          background: colors.accent,
          color: colors.ink,
          fontFamily: font.heading,
          fontWeight: fontWeight.extrabold,
          fontSize: fontSize.lg,
          padding: '16px 40px',
          borderRadius: radius.pill,
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
