'use client'
import { useEffect, useRef, useState } from 'react'
import { colors, font, fontWeight, fontSize, radius, zIndex, transition, letterSpacing } from '@/lib/design-tokens'

interface MagicModalProps {
  isOpen: boolean
  mode: 'scan' | 'adcopy' | 'landing'
  isDone: boolean
  brandName?: string
  onComplete?: () => void
  headline?: string
  bodyText?: string
  brandColors?: string[]
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

const LINE_INTERVAL_MS = 600
const PCT_INTERVAL_MS = 80
const TOTAL_DURATION_MS = LOG_LINES.length * LINE_INTERVAL_MS
const PCT_INCREMENT = 100 / (TOTAL_DURATION_MS / PCT_INTERVAL_MS)

export default function MagicModal({
  isOpen,
  mode: _mode,
  isDone: _isDone,
  brandName,
  onComplete,
  headline: _headline,
  bodyText: _bodyText,
  brandColors,
}: MagicModalProps) {
  const [visible, setVisible] = useState(false)
  const [currentLine, setCurrentLine] = useState(0)
  const [pct, setPct] = useState(0)
  const [complete, setComplete] = useState(false)

  const logRef = useRef<HTMLDivElement>(null)
  const lineInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const pctInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const completeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCurrentLine(0)
      setPct(0)
      setComplete(false)
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [isOpen])

  // Log line progression
  useEffect(() => {
    if (!isOpen || !visible) return

    let line = 0
    lineInterval.current = setInterval(() => {
      line++
      if (line >= LOG_LINES.length) {
        if (lineInterval.current) clearInterval(lineInterval.current)
        lineInterval.current = null
        setCurrentLine(LOG_LINES.length)
        setComplete(true)
        completeTimeout.current = setTimeout(() => {
          onComplete?.()
        }, 800)
        return
      }
      setCurrentLine(line)
    }, LINE_INTERVAL_MS)

    return () => {
      if (lineInterval.current) clearInterval(lineInterval.current)
      if (completeTimeout.current) clearTimeout(completeTimeout.current)
    }
  }, [isOpen, visible]) // eslint-disable-line react-hooks/exhaustive-deps

  // Percentage counter
  useEffect(() => {
    if (!isOpen || !visible) return

    let p = 0
    pctInterval.current = setInterval(() => {
      p = Math.min(100, p + PCT_INCREMENT)
      setPct(Math.round(p))
      if (p >= 100) {
        if (pctInterval.current) clearInterval(pctInterval.current)
        pctInterval.current = null
      }
    }, PCT_INTERVAL_MS)

    return () => {
      if (pctInterval.current) clearInterval(pctInterval.current)
    }
  }, [isOpen, visible])

  // Auto-scroll the log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [currentLine])

  if (!isOpen) return null

  const displayName = brandName?.trim() || null
  const displayColors = brandColors?.slice(0, 6) || []
  const isComplete = currentLine >= LOG_LINES.length

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
      `}</style>

      {/* Background radial pulse */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at center, ${colors.accentAlpha10} 0%, transparent 70%)`,
        animation: 'mmBgPulse 4s ease-in-out infinite alternate',
        pointerEvents: 'none',
      }} />

      {/* Three-zone layout */}
      <div style={{
        position: 'relative',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
        gap: 40,
      }}>
        {/* ZONE 1 — Atlas wordmark */}
        <div style={{
          fontFamily: font.heading,
          fontWeight: fontWeight.heading,
          fontSize: fontSize['4xl'],
          color: colors.whiteAlpha45,
          letterSpacing: letterSpacing.widest,
          textTransform: 'uppercase',
          opacity: 0,
          animation: 'mmFadeIn 0.5s ease 0s forwards',
          flexShrink: 0,
        }}>
          ATLAS
        </div>

        {/* ZONE 2 — Terminal + counter */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 32,
          width: '100%', maxWidth: 640,
          flexShrink: 1, minHeight: 0,
        }}>
          {/* Terminal window */}
          <div
            ref={logRef}
            style={{
              width: '100%',
              maxHeight: 280,
              overflowY: 'auto',
              background: colors.whiteAlpha5,
              border: `1px solid ${colors.whiteAlpha10}`,
              borderRadius: radius.xl,
              padding: '32px 40px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none' as React.CSSProperties['msOverflowStyle'],
            }}
          >
            {LOG_LINES.slice(0, currentLine).map((line, i) => (
              <div key={i} style={{
                fontFamily: font.mono,
                fontSize: fontSize.body,
                color: line.color,
                fontWeight: line.bold ? fontWeight.bold : fontWeight.normal,
                lineHeight: 2,
                whiteSpace: 'nowrap',
                animation: (isComplete && i === LOG_LINES.length - 1)
                  ? 'mmPulseText 2s ease-in-out infinite'
                  : 'none',
              }}>
                {line.text}
              </div>
            ))}
            {/* Blinking cursor while lines are still appearing */}
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

          {/* Percentage counter */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading,
              fontSize: 'clamp(80px, 12vw, 140px)',
              lineHeight: 1,
              color: colors.paper,
              letterSpacing: letterSpacing.tight,
            }}>
              {pct}%
            </div>
            <div style={{
              fontFamily: font.mono,
              fontSize: fontSize.caption,
              color: colors.whiteAlpha45,
              letterSpacing: letterSpacing.widest,
              textTransform: 'uppercase',
              marginTop: 8,
            }}>
              building your atlas
            </div>
          </div>
        </div>

        {/* ZONE 3 — Brand signal strip */}
        {(displayColors.length > 0 || displayName) && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10,
            flexShrink: 0,
            opacity: 0,
            animation: 'mmFadeIn 0.5s ease 1s forwards',
          }}>
            {displayColors.length > 0 && (
              <div style={{
                display: 'flex', gap: 8, justifyContent: 'center',
              }}>
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
