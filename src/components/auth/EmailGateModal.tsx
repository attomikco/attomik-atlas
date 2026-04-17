'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, fontWeight, fontSize, radius, zIndex, transition, letterSpacing } from '@/lib/design-tokens'

interface EmailGateModalProps {
  isOpen: boolean
  onAuthSuccess: () => void
  // Optional dismiss handler. When provided, a × close button renders in the
  // top-right corner of the card. Omit for modal flows where the only exit is
  // successful auth (e.g. onboarding).
  onClose?: () => void
  // Wizard state snapshot to persist across the auth redirect. Called
  // immediately before signInWithOAuth/signInWithOtp so the caller can capture
  // the freshest values. Return null to skip the stash (e.g. nothing to resume).
  getResumeState?: () => Record<string, unknown> | null
  // Per-caller copy overrides. Each field falls back to the onboarding-flavored
  // default below. Use choiceTitle with \n to split across two lines.
  copy?: {
    choiceTitle?: string
    choiceSubtitle?: string
    emailTitle?: string
    emailSubtitle?: string
    emailCta?: string
    sentSubtitle?: string
  }
}

// localStorage key for the pending wizard snapshot. Read by /auth/confirm
// (existence check, to route back to the wizard) and by OnboardingWizard
// (rehydrates state when mounted with ?resume=1).
const RESUME_KEY = 'attomik_pending_wizard'

function stashResume(getResumeState: (() => Record<string, unknown> | null) | undefined) {
  if (!getResumeState) return
  const state = getResumeState()
  if (!state) return
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify({ savedAt: Date.now(), state }))
  } catch {
    // quota / privacy mode — safe to ignore; user lands on /dashboard post-auth
  }
}

type Step = 'choice' | 'email' | 'sent'

function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed.includes('@') || !trimmed.includes('.')) return false
  const [local, domain] = trimmed.split('@')
  if (!local || !domain) return false
  if (!domain.includes('.') || domain.endsWith('.')) return false
  return true
}

export default function EmailGateModal({ isOpen, onAuthSuccess, onClose, getResumeState, copy }: EmailGateModalProps) {
  const choiceTitle = copy?.choiceTitle ?? 'Your brand is\nalmost ready'
  const choiceSubtitle = copy?.choiceSubtitle ?? 'Enter your email to see your full marketing engine'
  const emailTitle = copy?.emailTitle ?? 'Enter your email'
  const emailSubtitle = copy?.emailSubtitle ?? 'We\u2019ll send a magic link to save your brand'
  const emailCta = copy?.emailCta ?? 'Send magic link →'
  const sentSubtitle = copy?.sentSubtitle ?? 'Click the link in your email. We\u2019ll pick up automatically.'

  const [visible, setVisible] = useState(false)
  const [readyToShow, setReadyToShow] = useState(false)
  const [step, setStep] = useState<Step>('choice')
  const [email, setEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState('')

  // Track the latest onAuthSuccess in a ref so the open-effect can stay
  // anchored on `isOpen` only — MagicModal passes an inline arrow that
  // changes identity every render, and depending on it would re-fire the
  // effect on each parent render (multiple getUser calls and, for authed
  // users, repeated onAuthSuccess invocations until gateOpen flips false).
  const onAuthSuccessRef = useRef(onAuthSuccess)
  useEffect(() => { onAuthSuccessRef.current = onAuthSuccess }, [onAuthSuccess])

  useEffect(() => {
    if (!isOpen) { setVisible(false); setReadyToShow(false); return }
    setStep('choice')
    setEmail('')
    setError('')
    setGoogleLoading(false)
    setEmailLoading(false)

    // Defensive self-check: if a logged-in user reaches this modal, skip
    // immediately without flashing the UI. MagicModal also gates on auth
    // before opening this, but we duplicate the check here so the gate is
    // safe to mount from anywhere.
    let cancelled = false
    let showTimer: ReturnType<typeof setTimeout> | null = null
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (user) {
        onAuthSuccessRef.current()
        return
      }
      setReadyToShow(true)
      showTimer = setTimeout(() => { if (!cancelled) setVisible(true) }, 50)
    })

    return () => { cancelled = true; if (showTimer) clearTimeout(showTimer) }
  }, [isOpen])

  // Session-aware gate for the magic-link flow. Once the modal enters the
  // 'sent' step we start watching for a real session instead of letting the
  // user click through. Two paths:
  //   1. onAuthStateChange → SIGNED_IN fires when the magic link is clicked
  //      in the same tab (the callback page calls back into here via the
  //      shared Supabase client). Instant.
  //   2. getUser() poll every 3s — cross-tab / cross-device clicks don't
  //      emit SIGNED_IN in this tab, but @supabase/ssr cookies are shared
  //      across tabs so getUser() will flip truthy once cookies land.
  // Either path fires onAuthSuccess exactly once (guarded by `fired`).
  useEffect(() => {
    if (!isOpen || step !== 'sent') return
    const supabase = createClient()
    let fired = false
    const succeed = () => {
      if (fired) return
      fired = true
      onAuthSuccessRef.current()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) succeed()
    })

    const poll = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) succeed()
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearInterval(poll)
    }
  }, [isOpen, step])

  if (!isOpen || !readyToShow) return null

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    stashResume(getResumeState)
    const supabase = createClient()
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthErr) {
      setError(oauthErr.message)
      setGoogleLoading(false)
    }
    // On success the browser navigates away — no further state to handle.
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    setEmailLoading(true)
    setError('')
    stashResume(getResumeState)
    const supabase = createClient()
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (otpErr) {
      setError(otpErr.message)
      setEmailLoading(false)
      return
    }
    setEmailLoading(false)
    setStep('sent')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: zIndex.modal + 10,
      background: colors.blackAlpha50,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      opacity: visible ? 1 : 0,
      transition: `opacity ${transition.overlay}`,
    }}>
      <style>{`
        @keyframes egmRise { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes egmPulseGlow {
          0% { box-shadow: 0 0 0 0 ${colors.accentAlpha30} }
          70% { box-shadow: 0 0 0 10px transparent }
          100% { box-shadow: 0 0 0 0 transparent }
        }
        @keyframes egmDotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8) }
          50% { opacity: 1; transform: scale(1) }
        }
        .egm-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: ${colors.accent};
          display: inline-block;
          animation: egmDotPulse 1.4s ease-in-out infinite;
        }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 460,
        background: colors.darkCard,
        border: `1px solid ${colors.whiteAlpha10}`,
        borderRadius: radius['3xl'],
        padding: '40px 36px 36px',
        opacity: 0,
        animation: 'egmRise 0.4s ease 0.1s forwards',
        position: 'relative',
      }}>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 32, height: 32,
              background: 'transparent', border: 'none',
              color: colors.whiteAlpha45,
              fontSize: 22, lineHeight: 1,
              cursor: 'pointer',
              transition: `color ${transition.normal}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = colors.paper }}
            onMouseLeave={e => { e.currentTarget.style.color = colors.whiteAlpha45 }}
          >
            ×
          </button>
        )}

        {/* ── Step: choice ── */}
        {step === 'choice' && (
          <>
            <div style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading,
              fontSize: 'clamp(28px, 4vw, 36px)',
              lineHeight: 1.05,
              color: colors.paper,
              textTransform: 'uppercase',
              letterSpacing: letterSpacing.tight,
              textAlign: 'center',
              marginBottom: 12,
              whiteSpace: 'pre-line',
            }}>
              {choiceTitle}
            </div>

            <div style={{
              fontFamily: font.mono,
              fontSize: fontSize.body,
              color: colors.whiteAlpha60,
              textAlign: 'center',
              lineHeight: 1.6,
              marginBottom: 32,
            }}>
              {choiceSubtitle}
            </div>

            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: colors.paper,
                color: colors.ink,
                fontFamily: font.heading,
                fontWeight: fontWeight.bold,
                fontSize: fontSize.lg,
                border: 'none',
                borderRadius: radius.pill,
                cursor: googleLoading ? 'wait' : 'pointer',
                opacity: googleLoading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                animation: googleLoading ? 'none' : 'egmPulseGlow 2.4s infinite',
                transition: `opacity ${transition.normal}`,
              }}
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>

            <button
              onClick={() => { setStep('email'); setError('') }}
              style={{
                width: '100%',
                marginTop: 14,
                padding: '12px',
                background: 'transparent',
                color: colors.whiteAlpha70,
                fontFamily: font.mono,
                fontSize: fontSize.body,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: letterSpacing.wide,
                transition: `color ${transition.normal}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = colors.accent }}
              onMouseLeave={e => { e.currentTarget.style.color = colors.whiteAlpha70 }}
            >
              or enter email →
            </button>

            {error && (
              <div style={{
                marginTop: 16, textAlign: 'center',
                fontFamily: font.mono, fontSize: fontSize.caption,
                color: colors.dangerSoft,
              }}>
                {error}
              </div>
            )}
          </>
        )}

        {/* ── Step: email input ── */}
        {step === 'email' && (
          <>
            <div style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading,
              fontSize: 'clamp(28px, 4vw, 36px)',
              lineHeight: 1.05,
              color: colors.paper,
              textTransform: 'uppercase',
              letterSpacing: letterSpacing.tight,
              textAlign: 'center',
              marginBottom: 12,
              whiteSpace: 'pre-line',
            }}>
              {emailTitle}
            </div>
            <div style={{
              fontFamily: font.mono,
              fontSize: fontSize.body,
              color: colors.whiteAlpha60,
              textAlign: 'center',
              lineHeight: 1.6,
              marginBottom: 28,
            }}>
              {emailSubtitle}
            </div>

            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@company.com"
                autoFocus
                required
                style={{
                  width: '100%', padding: '14px 18px',
                  fontSize: fontSize.lg, fontWeight: fontWeight.medium,
                  background: colors.whiteAlpha8,
                  border: `1.5px solid ${colors.whiteAlpha15}`,
                  borderRadius: radius['2xl'],
                  color: colors.paper, outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.background = colors.whiteAlpha10 }}
                onBlur={e => { e.currentTarget.style.borderColor = colors.whiteAlpha15; e.currentTarget.style.background = colors.whiteAlpha8 }}
              />

              {error && (
                <div style={{
                  marginTop: 10, textAlign: 'center',
                  fontFamily: font.mono, fontSize: fontSize.caption,
                  color: colors.dangerSoft,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading || !email.trim()}
                style={{
                  width: '100%',
                  marginTop: 16,
                  padding: '14px 20px',
                  background: !email.trim() ? colors.accentAlpha30 : colors.accent,
                  color: colors.ink,
                  fontFamily: font.heading,
                  fontWeight: fontWeight.bold,
                  fontSize: fontSize.lg,
                  border: 'none',
                  borderRadius: radius.pill,
                  cursor: emailLoading ? 'wait' : (!email.trim() ? 'not-allowed' : 'pointer'),
                  opacity: emailLoading ? 0.6 : 1,
                  transition: `opacity ${transition.normal}, background ${transition.normal}`,
                }}
              >
                {emailLoading ? 'Sending...' : emailCta}
              </button>
            </form>

            <button
              onClick={() => { setStep('choice'); setError('') }}
              style={{
                display: 'block', margin: '16px auto 0',
                background: 'transparent', border: 'none',
                color: colors.whiteAlpha45, cursor: 'pointer',
                fontFamily: font.mono, fontSize: fontSize.caption,
                textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
              }}
            >
              ← Back
            </button>
          </>
        )}

        {/* ── Step: sent confirmation ── */}
        {step === 'sent' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading,
              fontSize: 'clamp(28px, 4vw, 36px)',
              lineHeight: 1.05,
              color: colors.paper,
              textTransform: 'uppercase',
              letterSpacing: letterSpacing.tight,
              marginBottom: 12,
            }}>
              Check your email
            </div>
            <div style={{
              fontFamily: font.mono,
              fontSize: fontSize.body,
              color: colors.whiteAlpha60,
              lineHeight: 1.6,
              marginBottom: 28,
            }}>
              We sent a magic link to <strong style={{ color: colors.paper }}>{email}</strong>.<br />
              {sentSubtitle}
            </div>

            <button
              type="button"
              disabled
              aria-live="polite"
              style={{
                width: '100%',
                padding: '14px 20px',
                background: colors.whiteAlpha8,
                color: colors.whiteAlpha70,
                fontFamily: font.heading,
                fontWeight: fontWeight.bold,
                fontSize: fontSize.lg,
                border: `1px solid ${colors.whiteAlpha15}`,
                borderRadius: radius.pill,
                cursor: 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              <span className="egm-dot" aria-hidden="true" />
              Waiting for email verification…
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" />
    </svg>
  )
}
