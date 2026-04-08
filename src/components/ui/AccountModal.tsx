'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { colors, font, fontWeight, fontSize, radius, zIndex, shadow, transition } from '@/lib/design-tokens'

interface AccountModalProps {
  isOpen: boolean
  campaignId: string
  onClose: () => void
}

export default function AccountModal({ isOpen, campaignId, onClose }: AccountModalProps) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (authErr) {
      setError(authErr.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: zIndex.modal,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: colors.paper, borderRadius: radius['2xl'],
        padding: '48px 40px', maxWidth: 440, width: '100%',
        boxShadow: shadow.modal, position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: fontSize['2xl'], color: colors.gray600, lineHeight: 1,
        }}>×</button>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading,
              fontSize: fontSize['4xl'], textTransform: 'uppercase',
              color: colors.ink, marginBottom: 12, lineHeight: 1.1,
            }}>
              Check your email
            </div>
            <div style={{ fontSize: fontSize.md, color: colors.muted, lineHeight: 1.6, marginBottom: 24 }}>
              We sent a magic link to <strong>{email}</strong>. Click it to save your funnel and get started.
            </div>
            <button onClick={() => { setSent(false); setEmail(''); setError('') }} style={{
              fontSize: fontSize.body, color: colors.muted, background: 'none',
              border: 'none', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Try a different email
            </button>
          </div>
        ) : (
          <>
            <div style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading,
              fontSize: fontSize['4xl'], textTransform: 'uppercase',
              color: colors.ink, marginBottom: 8, lineHeight: 1.1,
            }}>
              Save your funnel
            </div>
            <div style={{ fontSize: fontSize.md, color: colors.muted, lineHeight: 1.6, marginBottom: 28 }}>
              Create a free account to save your brand kit, creatives, and copy.
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{
                  width: '100%', padding: '14px 16px',
                  border: `2px solid ${colors.border}`, borderRadius: radius.xl,
                  fontSize: fontSize.lg, fontWeight: fontWeight.medium,
                  color: colors.ink, outline: 'none',
                  transition: `border-color ${transition.base}`,
                }}
                onFocus={e => { e.target.style.borderColor = colors.ink }}
                onBlur={e => { e.target.style.borderColor = colors.border }}
              />

              {error && (
                <div style={{ fontSize: fontSize.body, color: colors.danger, marginTop: 8 }}>{error}</div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', marginTop: 16, padding: '14px 24px',
                background: colors.ink, color: colors.accent,
                fontFamily: font.heading, fontWeight: fontWeight.extrabold,
                fontSize: fontSize.base, borderRadius: radius.pill,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: `opacity ${transition.normal}`,
              }}>
                {loading ? 'Sending...' : 'Send magic link →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
