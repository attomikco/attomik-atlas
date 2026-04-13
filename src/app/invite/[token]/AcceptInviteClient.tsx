'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  colors, font, fontWeight, fontSize, radius, shadow,
  spacing, letterSpacing,
} from '@/lib/design-tokens'

// Client-side Accept button. If the user isn't signed in, we route them to
// the existing magic-link login with `?next=/invite/<token>` so they land
// back here after authenticating.
export default function AcceptInviteClient({
  token,
  brandName,
  inviterName,
  role,
  inviteEmail,
}: {
  token: string
  brandName: string
  inviterName: string
  role: string
  inviteEmail: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Send them through the normal login flow. The login page already
      // reads ?next= and redirects back here on successful auth.
      window.location.href = `/login?next=/invite/${encodeURIComponent(token)}`
      return
    }

    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Could not accept invite')
        setBusy(false)
        return
      }
      window.location.href = `/brand-setup/${data.brand_id}`
    } catch (e) {
      console.error('[AcceptInvite]', e)
      setError('Could not accept invite')
      setBusy(false)
    }
  }

  const roleLabel =
    role === 'owner' ? 'Owner' :
    role === 'admin' ? 'Admin' : 'Member'

  return (
    <div style={{
      minHeight: '100vh', background: colors.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing[5],
    }}>
      <div style={{
        background: colors.paper, borderRadius: radius['3xl'], boxShadow: shadow.modal,
        padding: `${spacing[10]}px ${spacing[8]}px`,
        maxWidth: 480, width: '100%', boxSizing: 'border-box',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: font.heading, fontWeight: fontWeight.bold,
          fontSize: fontSize.body, color: colors.muted,
          textTransform: 'uppercase', letterSpacing: letterSpacing.caps,
          marginBottom: spacing[5],
        }}>
          Attomik
        </div>
        <h1 style={{
          margin: 0, marginBottom: spacing[3],
          fontFamily: font.heading, fontWeight: fontWeight.heading,
          fontSize: fontSize['9xl'], color: colors.ink,
          textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
          lineHeight: 1.05,
        }}>
          You're invited to<br />{brandName}
        </h1>
        <p style={{
          margin: 0, marginTop: spacing[5], marginBottom: spacing[2],
          fontFamily: font.mono, fontSize: fontSize.md, color: colors.muted,
          lineHeight: 1.6,
        }}>
          <strong style={{ color: colors.ink }}>{inviterName}</strong> invited you to
          collaborate on <strong style={{ color: colors.ink }}>{brandName}</strong>{' '}
          as a <strong style={{ color: colors.ink }}>{roleLabel}</strong>.
        </p>
        <p style={{
          margin: 0, marginBottom: spacing[8],
          fontFamily: font.mono, fontSize: fontSize.sm, color: colors.subtle,
        }}>
          Sent to {inviteEmail}
        </p>

        {error && (
          <div style={{
            color: colors.danger, fontSize: fontSize.sm,
            fontFamily: font.mono, marginBottom: spacing[3],
          }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAccept}
          disabled={busy}
          style={{
            width: '100%', padding: '14px 20px',
            background: colors.ink, color: colors.accent,
            fontFamily: font.heading, fontWeight: fontWeight.extrabold,
            fontSize: fontSize.md, textTransform: 'uppercase',
            letterSpacing: letterSpacing.wide,
            border: 'none', borderRadius: radius.pill,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Accepting…' : 'Accept Invite →'}
        </button>

        <div style={{ marginTop: spacing[5] }}>
          <Link
            href="/"
            style={{
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.muted, textDecoration: 'underline',
            }}
          >
            Not you? Go to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
