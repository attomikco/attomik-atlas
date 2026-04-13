'use client'
import { useState, useEffect } from 'react'
import { useProfile } from '@/lib/profile-context'
import InitialsAvatar from '@/components/ui/InitialsAvatar'
import {
  colors, font, fontWeight, fontSize, radius, shadow,
  spacing, letterSpacing, transition,
} from '@/lib/design-tokens'

export default function ProfileSettingsPage() {
  const { loading, user, profile, updateProfile } = useProfile()

  const [fullName, setFullName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [dirty, setDirty] = useState(false)

  // Hydrate the form once the profile loads.
  useEffect(() => {
    if (!loading && profile) {
      setFullName(profile.full_name || '')
      setJobTitle(profile.job_title || '')
      setDirty(false)
    }
  }, [loading, profile])

  // Auto-dismiss toast after a few seconds.
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(id)
  }, [toast])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setToast({ kind: 'err', text: 'Full name is required.' })
      return
    }
    setSaving(true)
    const res = await updateProfile({
      full_name: trimmedName,
      job_title: jobTitle.trim() || null,
    })
    setSaving(false)
    if (res.error) {
      setToast({ kind: 'err', text: res.error })
      return
    }
    setDirty(false)
    setToast({ kind: 'ok', text: 'Profile saved' })
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: font.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
    marginBottom: spacing[2],
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    fontFamily: font.mono,
    fontSize: fontSize.md,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    boxSizing: 'border-box',
    background: colors.paper,
    color: colors.ink,
    transition: `border-color ${transition.base}`,
  }

  return (
    <div style={{ padding: `${spacing[10]}px ${spacing[8]}px`, maxWidth: 720, margin: '0 auto' }}>
      <div style={{
        fontFamily: font.heading, fontWeight: fontWeight.heading,
        fontSize: fontSize['9xl'], color: colors.ink,
        textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
        lineHeight: 1, marginBottom: spacing[2],
      }}>
        Profile
      </div>
      <p style={{
        margin: 0, marginBottom: spacing[10],
        fontFamily: font.mono, fontSize: fontSize.md, color: colors.muted,
      }}>
        How you show up across Attomik.
      </p>

      <form onSubmit={handleSave}>
        <div style={{
          background: colors.paper,
          border: `1px solid ${colors.border}`,
          borderRadius: radius['3xl'],
          boxShadow: shadow.card,
          padding: spacing[8],
        }}>
          {/* Live avatar preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: spacing[5],
            marginBottom: spacing[8],
          }}>
            <InitialsAvatar name={fullName || user?.email || ''} size="lg" />
            <div>
              <div style={{
                fontFamily: font.heading, fontWeight: fontWeight.heading,
                fontSize: fontSize['3xl'], color: colors.ink,
                textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
                lineHeight: 1.1,
              }}>
                {fullName || 'Your Name'}
              </div>
              <div style={{
                marginTop: 4,
                fontFamily: font.mono, fontSize: fontSize.body, color: colors.muted,
              }}>
                {jobTitle || user?.email || '\u00a0'}
              </div>
            </div>
          </div>

          {/* Full name */}
          <div style={{ marginBottom: spacing[5] }}>
            <label style={labelStyle} htmlFor="profile-full-name">Full name</label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setDirty(true) }}
              placeholder="First and Last Name"
              disabled={loading || saving}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = colors.ink)}
              onBlur={e => (e.currentTarget.style.borderColor = colors.border)}
            />
          </div>

          {/* Job title */}
          <div style={{ marginBottom: spacing[5] }}>
            <label style={labelStyle} htmlFor="profile-job-title">Job title</label>
            <input
              id="profile-job-title"
              type="text"
              value={jobTitle}
              onChange={e => { setJobTitle(e.target.value); setDirty(true) }}
              placeholder="Growth Lead"
              disabled={loading || saving}
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = colors.ink)}
              onBlur={e => (e.currentTarget.style.borderColor = colors.border)}
            />
          </div>

          {/* Email (read-only) */}
          <div style={{ marginBottom: spacing[8] }}>
            <label style={labelStyle}>Email</label>
            <div style={{
              ...inputStyle,
              background: colors.gray100,
              color: colors.muted,
              cursor: 'not-allowed',
            }}>
              {user?.email || (loading ? 'Loading…' : '—')}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || loading || !dirty || !fullName.trim()}
            style={{
              padding: '12px 28px',
              background: colors.ink, color: colors.accent,
              fontFamily: font.heading, fontWeight: fontWeight.extrabold,
              fontSize: fontSize.body, textTransform: 'uppercase',
              letterSpacing: letterSpacing.wide,
              border: 'none', borderRadius: radius.pill,
              cursor: saving || !dirty || !fullName.trim() ? 'not-allowed' : 'pointer',
              opacity: saving || !dirty || !fullName.trim() ? 0.55 : 1,
              transition: `opacity ${transition.base}`,
            }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {toast && (
        <div style={{
          position: 'fixed', right: spacing[6], bottom: spacing[6],
          padding: '12px 18px',
          background: toast.kind === 'ok' ? colors.ink : colors.danger,
          color: toast.kind === 'ok' ? colors.accent : colors.paper,
          fontFamily: font.heading, fontWeight: fontWeight.extrabold,
          fontSize: fontSize.caption, textTransform: 'uppercase',
          letterSpacing: letterSpacing.wide,
          borderRadius: radius.pill, boxShadow: shadow.lg,
          zIndex: 300,
        }}>
          {toast.kind === 'ok' ? '✓ ' : ''}{toast.text}
        </div>
      )}
    </div>
  )
}
