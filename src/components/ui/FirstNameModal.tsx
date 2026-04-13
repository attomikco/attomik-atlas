'use client'
import { useState, useEffect, useRef } from 'react'
import { useProfile } from '@/lib/profile-context'
import {
  colors, font, fontWeight, fontSize, radius, shadow, zIndex,
  spacing, letterSpacing,
} from '@/lib/design-tokens'

// Full-screen blocking modal shown the first time a user lands in the app
// without a full_name on their profile. Non-dismissable until they submit.
export default function FirstNameModal() {
  const { loading, user, profile, updateProfile } = useProfile()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const shouldShow =
    !loading && !!user && (!profile?.full_name || !profile.full_name.trim())

  useEffect(() => {
    if (shouldShow) {
      // Focus the input once the overlay mounts.
      const id = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(id)
    }
  }, [shouldShow])

  if (!shouldShow) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter your name.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await updateProfile({ full_name: trimmed })
    if (res.error) {
      setError(res.error)
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: zIndex.modal,
      background: colors.blackAlpha50, backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing[5],
    }}>
      <div style={{
        background: colors.paper, borderRadius: radius['3xl'], boxShadow: shadow.modal,
        padding: `${spacing[10]}px ${spacing[8]}px`,
        maxWidth: 460, width: '100%', boxSizing: 'border-box',
      }}>
        <div style={{
          fontFamily: font.heading, fontWeight: fontWeight.heading,
          fontSize: fontSize['9xl'], color: colors.ink,
          textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
          lineHeight: 1, marginBottom: spacing[3], textAlign: 'center',
        }}>
          Welcome to Attomik
        </div>
        <p style={{
          margin: 0, marginBottom: spacing[8],
          fontFamily: font.mono, fontSize: fontSize.md, color: colors.muted,
          textAlign: 'center',
        }}>
          What should we call you?
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
            color: colors.muted, textTransform: 'uppercase',
            letterSpacing: letterSpacing.label, marginBottom: spacing[2],
          }}>
            Full name
          </div>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); if (error) setError(null) }}
            placeholder="First and Last Name"
            disabled={saving}
            style={{
              width: '100%', padding: '12px 14px',
              marginBottom: spacing[3], boxSizing: 'border-box',
              fontFamily: font.mono, fontSize: fontSize.md,
              border: `1.5px solid ${colors.border}`, borderRadius: radius.md,
              outline: 'none', background: colors.paper, color: colors.ink,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = colors.ink }}
            onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
          />
          {error && (
            <div style={{
              color: colors.danger, fontSize: fontSize.sm,
              marginBottom: spacing[3],
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              width: '100%', padding: '14px 20px',
              background: colors.ink, color: colors.accent,
              fontFamily: font.heading, fontWeight: fontWeight.extrabold,
              fontSize: fontSize.md, textTransform: 'uppercase',
              letterSpacing: letterSpacing.wide,
              border: 'none', borderRadius: radius.pill,
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !name.trim() ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : "Let's go →"}
          </button>
        </form>
      </div>
    </div>
  )
}
