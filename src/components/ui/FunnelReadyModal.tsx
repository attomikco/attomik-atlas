'use client'
import { useState, useEffect } from 'react'
import { colors, font, fontWeight, fontSize, radius, zIndex, letterSpacing } from '@/lib/design-tokens'

interface FunnelReadyModalProps {
  isOpen: boolean
  brandName: string
  onContinue: () => void
  brandColors?: string[]
  brandLogo?: string
  primaryColor?: string
}

export default function FunnelReadyModal({
  isOpen,
  brandName,
  onContinue,
  brandColors,
  brandLogo,
  primaryColor,
}: FunnelReadyModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t) }
    setVisible(false)
  }, [isOpen])

  if (!isOpen) return null

  const displayColors = brandColors?.slice(0, 6) || []

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: colors.ink,
      opacity: visible ? 1 : 0,
      animation: 'revealFadeIn 0.6s ease-out forwards',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes revealFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes revealSlideUp { from { opacity: 0; transform: translateY(32px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes revealPulseGlow {
          0% { box-shadow: 0 0 0 0 ${colors.accentAlpha30} }
          70% { box-shadow: 0 0 0 12px transparent }
          100% { box-shadow: 0 0 0 0 transparent }
        }
      `}</style>

      {/* Background orb — brand primary color */}
      {primaryColor && (
        <div style={{
          position: 'absolute',
          width: '70vw', height: '70vw',
          borderRadius: '50%',
          background: primaryColor,
          filter: 'blur(160px)',
          opacity: 0.15,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Centered content */}
      <div style={{
        position: 'relative',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 24,
        padding: '48px 24px',
        opacity: 0,
        animation: 'revealSlideUp 0.7s 0.2s ease-out forwards',
      }}>
        {/* Brand logo */}
        {brandLogo && (
          <img
            src={brandLogo}
            alt=""
            style={{
              maxHeight: 64, maxWidth: 200,
              objectFit: 'contain', display: 'block',
            }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}

        {/* Accent rule */}
        <div style={{
          width: 48, height: 2,
          background: colors.accent,
          borderRadius: 1,
        }} />

        {/* Headline */}
        <div style={{
          fontFamily: font.heading,
          fontWeight: fontWeight.heading,
          fontSize: 'clamp(36px, 5vw, 64px)',
          color: colors.paper,
          textAlign: 'center',
          lineHeight: 1.1,
          textTransform: 'uppercase',
        }}>
          Your Atlas is ready.
        </div>

        {/* Subline */}
        <div style={{
          fontFamily: font.mono,
          fontSize: fontSize.body,
          color: colors.whiteAlpha60,
          textAlign: 'center',
          maxWidth: 420,
          lineHeight: 1.6,
        }}>
          We&apos;ve built your complete marketing funnel.
        </div>

        {/* Brand color swatches */}
        {displayColors.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center',
          }}>
            {displayColors.map((c, i) => (
              <div key={c + i} style={{
                width: 12, height: 12, borderRadius: '50%',
                background: c,
                border: `1px solid ${colors.whiteAlpha15}`,
              }} />
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onContinue}
          style={{
            background: colors.accent, color: colors.ink,
            fontFamily: font.heading, fontWeight: fontWeight.bold,
            fontSize: fontSize.lg,
            padding: '18px 48px',
            borderRadius: radius.pill,
            border: 'none',
            cursor: 'pointer',
            animation: 'revealPulseGlow 2s infinite',
            marginTop: 8,
          }}
        >
          View my Atlas →
        </button>

        {/* Brand name */}
        {brandName && (
          <div style={{
            fontFamily: font.mono,
            fontSize: fontSize.caption,
            color: colors.whiteAlpha30,
            textTransform: 'uppercase',
            letterSpacing: letterSpacing.wide,
          }}>
            {brandName}
          </div>
        )}
      </div>
    </div>
  )
}
