'use client'
import { useEffect, useState } from 'react'
import { colors, font, fontWeight, fontSize, zIndex, transition, letterSpacing } from '@/lib/design-tokens'

interface MagicModalProps {
  isOpen: boolean
  mode: 'scan' | 'adcopy' | 'landing'
  isDone: boolean
  brandName?: string
  onComplete?: () => void
  headline?: string
  bodyText?: string
}

const STEPS = [
  'Scanning brand identity',
  'Building creative strategy',
  'Generating ad creatives',
  'Preparing your Atlas',
]

const STEP_STAGGER_MS = 1200

export default function MagicModal({
  isOpen,
  mode: _mode,
  isDone,
  brandName,
  onComplete: _onComplete,
  headline: _headline,
  bodyText: _bodyText,
}: MagicModalProps) {
  const [visible, setVisible] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  // Mount fade-in
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [isOpen])

  // Sequential step progression — 1.2s stagger. The last step stays
  // "active" (pulsing) until the parent flips `isDone`, at which point
  // every step snaps to the complete state.
  useEffect(() => {
    if (!isOpen || isDone) return
    setActiveStep(0)
    const timers: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i < STEPS.length; i++) {
      timers.push(setTimeout(() => setActiveStep(i), i * STEP_STAGGER_MS))
    }
    return () => timers.forEach(clearTimeout)
  }, [isOpen, isDone])

  if (!isOpen) return null

  const displayName = brandName && brandName.trim() ? brandName.trim() : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: zIndex.modal,
      background: colors.ink,
      opacity: visible ? 1 : 0,
      transition: `opacity ${transition.overlay}`,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes atlasBreathe { 0%, 100% { opacity: 0.4 } 50% { opacity: 1 } }
        @keyframes radialPulse { 0% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.55 } 100% { transform: translate(-50%, -50%) scale(1.25); opacity: 1 } }
        @keyframes stepPulse { 0%, 100% { opacity: 1; transform: scale(1) } 50% { opacity: 0.35; transform: scale(0.75) } }
      `}</style>

      {/* Slow radial gradient pulse — sits behind the content */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '150vmax', height: '150vmax',
        background: `radial-gradient(circle at center, ${colors.accentAlpha10} 0%, transparent 55%)`,
        transform: 'translate(-50%, -50%)',
        animation: 'radialPulse 4s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />

      {/* Centered content stack */}
      <div style={{
        position: 'relative',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
      }}>
        {/* ATLAS wordmark — breathing opacity */}
        <div style={{
          fontFamily: font.heading,
          fontWeight: fontWeight.heading,
          fontSize: 'clamp(48px, 8vw, 96px)',
          lineHeight: 1,
          letterSpacing: letterSpacing.tight,
          color: colors.paper,
          textTransform: 'uppercase',
          animation: 'atlasBreathe 3s ease-in-out infinite',
          marginBottom: 20,
          textAlign: 'center',
        }}>
          ATLAS
        </div>

        {/* Brand name — only when provided */}
        <div style={{
          fontFamily: font.mono,
          fontSize: fontSize.caption,
          color: colors.whiteAlpha60,
          textTransform: 'uppercase',
          letterSpacing: letterSpacing.wide,
          marginBottom: 56,
          minHeight: fontSize.caption + 4,
          textAlign: 'center',
        }}>
          {displayName ? `Processing · ${displayName}` : ''}
        </div>

        {/* Progress steps */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 16, alignItems: 'flex-start',
        }}>
          {STEPS.map((label, i) => {
            const isComplete = isDone || i < activeStep
            const isActive = !isDone && i === activeStep
            const isPending = !isDone && i > activeStep

            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                opacity: isPending ? 0 : 1,
                transform: isPending ? 'translateY(6px)' : 'translateY(0)',
                transition: `opacity ${transition.modal}, transform ${transition.modal}`,
              }}>
                <div style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: colors.accent,
                  flexShrink: 0,
                  animation: isActive ? 'stepPulse 1.4s ease-in-out infinite' : 'none',
                  opacity: isComplete ? 1 : isActive ? 1 : 0.3,
                }} />
                <span style={{
                  fontFamily: font.mono,
                  fontSize: fontSize.caption,
                  color: isComplete ? colors.paper : colors.whiteAlpha60,
                  textTransform: 'uppercase',
                  letterSpacing: letterSpacing.wide,
                  transition: `color ${transition.modal}`,
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
