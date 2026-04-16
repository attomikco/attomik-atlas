'use client'
import { useEffect, useRef, useState } from 'react'
import { colors, font, fontWeight, fontSize, radius, zIndex, transition, letterSpacing } from '@/lib/design-tokens'
import AttomikLogo from '@/components/ui/AttomikLogo'

interface MagicModalProps {
  isOpen: boolean
  mode: 'scan' | 'adcopy' | 'landing'
  isDone: boolean
  brandName?: string
  onComplete?: () => void
  headline?: string
  bodyText?: string
  brandColors?: string[]
  brandImages?: string[]
  generationReady?: boolean
}

const LOG_LINES: Array<{ text: string; color: string; bold?: boolean }> = [
  { text: '✦ Scanning brand identity...', color: colors.whiteAlpha60 },
  { text: '✦ Extracting color palette', color: colors.whiteAlpha60 },
  { text: '✦ Loading typography system', color: colors.whiteAlpha60 },
  { text: '✦ Analyzing brand voice', color: colors.whiteAlpha60 },
  { text: '✦ Mapping target audience', color: colors.whiteAlpha60 },
  { text: '✦ Building creative strategy', color: colors.whiteAlpha60 },
  { text: '✦ Generating ad creative 1/3', color: colors.accent },
  { text: '✦ Generating ad creative 2/3', color: colors.accent },
  { text: '✦ Generating ad creative 3/3', color: colors.accent },
  { text: '✦ Writing email campaign', color: colors.accent },
  { text: '✦ Structuring landing page', color: colors.accent },
  { text: '✦ Calibrating brand systems', color: colors.whiteAlpha60 },
  { text: '✓ Atlas ready.', color: colors.accent, bold: true },
]

const LINE_INTERVAL_MS = 1300
const PCT_INTERVAL_MS = 80
const TOTAL_DURATION_MS = LOG_LINES.length * LINE_INTERVAL_MS
const PCT_INCREMENT = 100 / (TOTAL_DURATION_MS / PCT_INTERVAL_MS)

const IMAGE_POSITIONS = [
  { top: '8%', left: '4%' },
  { top: '6%', right: '5%' },
  { top: '35%', left: '2%' },
  { top: '30%', right: '3%' },
  { top: '62%', left: '5%' },
  { top: '65%', right: '4%' },
]
const IMAGE_ROTATIONS = ['-4deg', '3deg', '-2deg', '5deg', '-3deg', '2deg']
const IMAGE_ROT_START = ['-8deg', '6deg', '-5deg', '8deg', '-6deg', '4deg']

export default function MagicModal({
  isOpen,
  mode: _mode,
  isDone: _isDone,
  brandName,
  onComplete,
  headline: _headline,
  bodyText: _bodyText,
  brandColors,
  brandImages,
  generationReady = false,
}: MagicModalProps) {
  const [visible, setVisible] = useState(false)
  const [currentLine, setCurrentLine] = useState(0)
  const [pct, setPct] = useState(0)
  const [animationDone, setAnimationDone] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [showFinalizing, setShowFinalizing] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)
  const lineInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const pctInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCurrentLine(0)
      setPct(0)
      setAnimationDone(false)
      setRevealed(false)
      setShowFinalizing(false)
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [isOpen])

  // Only show "finalizing" state if generation is still pending 2s after animation ends
  useEffect(() => {
    if (!animationDone || generationReady) { setShowFinalizing(false); return }
    const t = setTimeout(() => setShowFinalizing(true), 2000)
    return () => clearTimeout(t)
  }, [animationDone, generationReady])

  useEffect(() => {
    if (!isOpen || !visible) return
    let line = 0
    lineInterval.current = setInterval(() => {
      line++
      if (line >= LOG_LINES.length) {
        if (lineInterval.current) clearInterval(lineInterval.current)
        lineInterval.current = null
        setCurrentLine(LOG_LINES.length)
        setAnimationDone(true)
        return
      }
      setCurrentLine(line)
    }, LINE_INTERVAL_MS)
    return () => { if (lineInterval.current) clearInterval(lineInterval.current) }
  }, [isOpen, visible])

  useEffect(() => {
    if (!isOpen || !visible) return
    let p = 0
    pctInterval.current = setInterval(() => {
      p = Math.min(100, p + PCT_INCREMENT)
      setPct(Math.round(p))
      if (p >= 100) { if (pctInterval.current) clearInterval(pctInterval.current); pctInterval.current = null }
    }, PCT_INTERVAL_MS)
    return () => { if (pctInterval.current) clearInterval(pctInterval.current) }
  }, [isOpen, visible])

  // When both animation and generation are done, flip to revealed state
  useEffect(() => {
    if (!animationDone || !generationReady) return
    // 500ms pause on "✓ Atlas ready." before transitioning
    const t = setTimeout(() => setRevealed(true), 500)
    return () => clearTimeout(t)
  }, [animationDone, generationReady])

  // Hard fallback — reveal after 20s no matter what
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => setRevealed(true), 28000)
    return () => clearTimeout(t)
  }, [isOpen])

  // Auto-scroll terminal to show most recent lines
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [currentLine])

  if (!isOpen) return null

  const displayName = brandName?.trim() || null
  const displayColors = brandColors?.slice(0, 6) || []
  const displayImages = brandImages?.slice(0, 6) || []
  const isComplete = currentLine >= LOG_LINES.length
  const materialized = revealed

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: zIndex.modal,
      background: colors.ink,
      opacity: visible ? 1 : 0,
      transition: `opacity ${transition.overlay}`,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes mmFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mmBgPulse { from { opacity: 0.4 } to { opacity: 1 } }
        @keyframes mmPulseText { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        @keyframes mmBlink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes orbDrift0 { from { transform: translate(0,0) } to { transform: translate(60px,80px) } }
        @keyframes orbDrift1 { from { transform: translate(0,0) } to { transform: translate(-80px,-60px) } }
        @keyframes orbDrift2 { from { transform: translate(0,0) } to { transform: translate(40px,-70px) } }
        @keyframes orbDrift3 { from { transform: translate(0,0) } to { transform: translate(-50px,90px) } }
        @keyframes orbDrift4 { from { transform: translate(0,0) } to { transform: translate(70px,-40px) } }
        @keyframes orbDrift5 { from { transform: translate(0,0) } to { transform: translate(-60px,50px) } }
        @keyframes imageReveal { 0% { opacity:0; transform: scale(0.85) rotate(var(--rot-start)) } 100% { opacity:0.35; transform: scale(1) rotate(var(--rot)) } }
        @keyframes imagePulse { from { opacity: 0.25 } to { opacity: 0.45 } }
        @keyframes mmDotPulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        @keyframes mmTextPulse { 0%, 100% { opacity: 0.4 } 50% { opacity: 1 } }
        @keyframes mmRevealFadeIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes mmPulseGlow {
          0% { box-shadow: 0 0 0 0 ${colors.accentAlpha30} }
          70% { box-shadow: 0 0 0 12px transparent }
          100% { box-shadow: 0 0 0 0 transparent }
        }
        @media (max-width: 768px) {
          .mm-orb { opacity: 0.08 !important; filter: blur(80px) !important; }
          .mm-side-img { width: clamp(90px, 18vw, 130px) !important; }
        }
      `}</style>

      {/* ═══ LAYER 1 — Background atmosphere ═══ */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at center, ${colors.accentAlpha10} 0%, transparent 70%)`,
          animation: 'mmBgPulse 4s ease-in-out infinite alternate',
        }} />
        {displayColors.map((c, i) => (
          <div key={`orb-${i}`} className="mm-orb" style={{
            position: 'absolute',
            width: 'clamp(300px, 40vw, 600px)',
            height: 'clamp(300px, 40vw, 600px)',
            borderRadius: '50%',
            background: c,
            filter: 'blur(120px)',
            opacity: 0.12,
            top: `${[10, 60, 30, 70, 15, 55][i] ?? 40}%`,
            left: `${[5, 70, 50, 20, 80, 35][i] ?? 50}%`,
            transform: 'translate(-50%, -50%)',
            animation: `orbDrift${i % 6} ${8 + i * 2}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* ═══ LAYER 2 — Brand image reveal ═══ */}
      {displayImages.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          {displayImages.map((url, i) => {
            const pos = IMAGE_POSITIONS[i] || IMAGE_POSITIONS[0]
            return (
              <img
                key={url}
                src={url}
                alt=""
                className="mm-side-img"
                style={{
                  position: 'absolute',
                  ...pos,
                  width: 'clamp(140px, 16vw, 220px)',
                  aspectRatio: '3/4',
                  objectFit: 'cover',
                  borderRadius: radius.xl,
                  filter: materialized ? 'saturate(1.1)' : 'saturate(0.8)',
                  opacity: 0,
                  // @ts-expect-error CSS custom properties
                  '--rot': IMAGE_ROTATIONS[i] || '0deg',
                  '--rot-start': IMAGE_ROT_START[i] || '0deg',
                  animation: `imageReveal 1.2s ease ${i * 0.8}s forwards, imagePulse 4s ease-in-out ${1.2 + i * 0.8}s infinite alternate`,
                  transition: 'filter 1s ease, opacity 1s ease, transform 1s ease',
                  ...(materialized ? { opacity: 0.7, transform: `scale(1.04) rotate(${IMAGE_ROTATIONS[i] || '0deg'})` } : {}),
                } as React.CSSProperties}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )
          })}
        </div>
      )}

      {/* ═══ LAYER 3 — Center content ═══ */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
        gap: 40,
      }}>
        {/* Attomik logo + ATLAS wordmark — always visible */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', flexShrink: 0,
          opacity: 0, animation: 'mmFadeIn 0.5s ease 0s forwards',
        }}>
          <div style={{ marginBottom: 8 }}>
            <AttomikLogo height={28} color={colors.whiteAlpha45} />
          </div>
          <div style={{
            fontFamily: font.heading,
            fontWeight: fontWeight.heading,
            fontSize: fontSize['4xl'],
            color: colors.whiteAlpha45,
            letterSpacing: letterSpacing.widest,
            textTransform: 'uppercase',
          }}>
            ATLAS
          </div>
        </div>

        {/* Terminal + counter / Reveal CTA — crossfade zone */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 32,
          width: '100%', maxWidth: 520,
          flexShrink: 1, minHeight: 0,
          position: 'relative',
        }}>
          {/* ── Building state: terminal + counter ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 32, width: '100%',
            opacity: revealed ? 0 : 1,
            transition: 'opacity 0.5s ease',
            pointerEvents: revealed ? 'none' : 'auto',
            ...(revealed ? { position: 'absolute', top: 0, left: 0, right: 0 } : {}),
          }}>
            {/* Terminal window */}
            <div
              ref={logRef}
              style={{
                width: '100%',
                height: 280,
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${colors.whiteAlpha10}`,
                borderRadius: radius.xl,
                padding: '20px 40px 24px',
              }}>
              <div>
                {LOG_LINES.slice(0, currentLine).map((line, i) => {
                  const isLastLine = i === LOG_LINES.length - 1
                  const finalizing = isLastLine && showFinalizing
                  const done = isLastLine && revealed
                  const text = isLastLine
                    ? (done ? '✓ Atlas ready.' : finalizing ? '⟳ Finalizing atlas...' : line.text)
                    : line.text
                  const color = isLastLine
                    ? (done ? colors.accent : finalizing ? colors.whiteAlpha60 : line.color)
                    : line.color
                  return (
                    <div key={i} style={{
                      fontFamily: font.mono,
                      fontSize: fontSize.body,
                      color,
                      fontWeight: (done && isLastLine) ? fontWeight.bold : fontWeight.normal,
                      lineHeight: 2,
                      whiteSpace: 'nowrap',
                      animation: finalizing ? 'mmTextPulse 1.2s ease-in-out infinite' : 'none',
                    }}>
                      {text}
                    </div>
                  )
                })}
                {!isComplete && (
                  <span style={{
                    fontFamily: font.mono,
                    fontSize: fontSize.body,
                    color: colors.accent,
                    animation: 'mmBlink 0.8s step-end infinite',
                  }}>
                    ▋
                  </span>
                )}
              </div>
            </div>

            {/* Percentage counter */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: 'clamp(80px, 12vw, 140px)',
                lineHeight: 1,
                color: colors.paper,
                letterSpacing: letterSpacing.tight,
                animation: showFinalizing ? 'mmTextPulse 1.2s ease-in-out infinite' : 'none',
              }}>
                {pct}%
              </div>
              <div style={{
                fontFamily: font.mono,
                fontSize: fontSize.caption,
                color: showFinalizing ? colors.accent : colors.whiteAlpha45,
                letterSpacing: letterSpacing.widest,
                textTransform: 'uppercase',
                marginTop: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                animation: showFinalizing ? 'mmTextPulse 1.2s ease-in-out infinite' : 'none',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: colors.accent,
                  display: 'inline-block',
                  animation: 'mmDotPulse 1.4s ease-in-out infinite',
                }} />
                {showFinalizing ? 'finalizing your atlas...' : 'building your atlas'}
              </div>
            </div>
          </div>

          {/* ── Revealed state: brand name + CTA ── */}
          {revealed && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 0,
            }}>
              <div style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: 'clamp(32px, 4vw, 56px)',
                color: colors.paper,
                textAlign: 'center',
                lineHeight: 1.1,
                textTransform: 'uppercase',
                opacity: 0,
                animation: 'mmRevealFadeIn 0.5s ease 0s forwards',
              }}>
                {displayName || 'Your brand'}
              </div>
              <div style={{
                textAlign: 'center',
                marginTop: 8,
                maxWidth: 480,
                opacity: 0,
                animation: 'mmRevealFadeIn 0.5s ease 0.1s forwards',
              }}>
                <div style={{
                  fontFamily: font.mono,
                  fontSize: fontSize.body,
                  color: colors.whiteAlpha60,
                  lineHeight: 1.6,
                }}>
                  Your brand walked in as a URL.<br />It leaves as a full marketing engine.
                </div>
                <div style={{
                  fontFamily: font.mono,
                  fontSize: fontSize.caption,
                  color: colors.whiteAlpha45,
                  marginTop: 8,
                }}>
                  Customize your brand hub to make it truly yours.
                </div>
              </div>
              <button
                onClick={() => onComplete?.()}
                style={{
                  marginTop: 32,
                  background: colors.accent, color: colors.ink,
                  fontFamily: font.heading, fontWeight: fontWeight.bold,
                  fontSize: fontSize.lg,
                  padding: '18px 48px',
                  borderRadius: radius.pill,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0,
                  animation: 'mmRevealFadeIn 0.5s ease 0.2s forwards, mmPulseGlow 2s 0.7s infinite',
                }}
              >
                View my Atlas →
              </button>
            </div>
          )}
        </div>

        {/* Brand signal strip — always visible */}
        {(displayColors.length > 0 || displayName) && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10,
            flexShrink: 0,
            opacity: 0,
            animation: 'mmFadeIn 0.5s ease 1s forwards',
          }}>
            {displayColors.length > 0 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {displayColors.map((c, i) => (
                  <div key={c + i} style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: c,
                    border: `1px solid ${colors.whiteAlpha15}`,
                  }} />
                ))}
              </div>
            )}
            {displayName && (
              <div style={{
                fontFamily: font.mono,
                fontSize: fontSize.caption,
                color: colors.whiteAlpha30,
                textTransform: 'uppercase',
                letterSpacing: letterSpacing.wide,
              }}>
                {displayName}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
