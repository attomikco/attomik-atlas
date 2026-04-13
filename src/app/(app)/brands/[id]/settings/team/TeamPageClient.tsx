'use client'
import { useState } from 'react'
import Link from 'next/link'
import InitialsAvatar from '@/components/ui/InitialsAvatar'
import {
  colors, font, fontWeight, fontSize, radius, shadow,
  spacing, letterSpacing, transition,
} from '@/lib/design-tokens'

type Role = 'owner' | 'admin' | 'member'

export type MemberRow = {
  user_id: string
  role: Role
  created_at: string
  full_name: string | null
  job_title: string | null
  email: string | null
}

export type InviteRow = {
  id: string
  email: string
  role: 'admin' | 'member'
  expires_at: string
  created_at: string
}

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

const ROLE_BADGE_COLORS: Record<Role, { bg: string; fg: string }> = {
  owner: { bg: colors.ink, fg: colors.accent },
  admin: { bg: colors.accent, fg: colors.ink },
  member: { bg: colors.gray250, fg: colors.ink },
}

export default function TeamPageClient({
  brandId,
  brandName,
  currentUserId,
  currentUserRole,
  initialMembers,
  initialInvites,
}: {
  brandId: string
  brandName: string
  currentUserId: string
  currentUserRole: Role
  initialMembers: MemberRow[]
  initialInvites: InviteRow[]
}) {
  const [members, setMembers] = useState<MemberRow[]>(initialMembers)
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null)

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviting(true)
    setInviteMessage(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteMessage({ kind: 'err', text: data?.error || 'Could not send invite' })
        setInviting(false)
        return
      }
      if (data.warning) {
        setInviteMessage({ kind: 'err', text: data.warning })
      } else {
        setInviteMessage({ kind: 'ok', text: `Invite sent to ${email}` })
      }
      if (data.invite) {
        setInvites(prev => [
          {
            id: data.invite.id,
            email: data.invite.email,
            role: data.invite.role,
            expires_at: data.invite.expires_at,
            created_at: data.invite.created_at,
          },
          ...prev,
        ])
      }
      setInviteEmail('')
      setInviteRole('member')
    } catch {
      setInviteMessage({ kind: 'err', text: 'Could not send invite' })
    } finally {
      setInviting(false)
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!window.confirm('Revoke this invite?')) return
    setBusyInviteId(inviteId)
    try {
      const res = await fetch(`/api/brands/${brandId}/invites/${inviteId}`, { method: 'DELETE' })
      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== inviteId))
      } else {
        const data = await res.json().catch(() => ({}))
        window.alert(data?.error || 'Could not revoke invite')
      }
    } finally {
      setBusyInviteId(null)
    }
  }

  async function handleRemoveMember(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from ${brandName}?`)) return
    setBusyMemberId(userId)
    try {
      const res = await fetch(`/api/brands/${brandId}/members/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.user_id !== userId))
      } else {
        const data = await res.json().catch(() => ({}))
        window.alert(data?.error || 'Could not remove member')
      }
    } finally {
      setBusyMemberId(null)
    }
  }

  async function handleChangeRole(userId: string, nextRole: 'admin' | 'member') {
    setBusyMemberId(userId)
    try {
      const res = await fetch(`/api/brands/${brandId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      })
      if (res.ok) {
        setMembers(prev =>
          prev.map(m => (m.user_id === userId ? { ...m, role: nextRole } : m))
        )
      } else {
        const data = await res.json().catch(() => ({}))
        window.alert(data?.error || 'Could not update role')
      }
    } finally {
      setBusyMemberId(null)
    }
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    color: colors.muted, textTransform: 'uppercase',
    letterSpacing: letterSpacing.label, marginBottom: spacing[2],
    display: 'block',
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    fontFamily: font.mono, fontSize: fontSize.md,
    border: `1.5px solid ${colors.border}`, borderRadius: radius.md,
    outline: 'none', boxSizing: 'border-box',
    background: colors.paper, color: colors.ink,
    transition: `border-color ${transition.base}`,
  }

  return (
    <div style={{ padding: `${spacing[10]}px ${spacing[8]}px`, maxWidth: 860, margin: '0 auto' }}>
      {/* Header + nav */}
      <div style={{ marginBottom: spacing[5] }}>
        <Link
          href={`/brand-setup/${brandId}`}
          style={{
            fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
            color: colors.muted, textDecoration: 'none',
            textTransform: 'uppercase', letterSpacing: letterSpacing.label,
          }}
        >
          ← Back to Brand Hub
        </Link>
      </div>
      <div style={{
        fontFamily: font.heading, fontWeight: fontWeight.heading,
        fontSize: fontSize['9xl'], color: colors.ink,
        textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
        lineHeight: 1, marginBottom: spacing[2],
      }}>
        Team
      </div>
      <p style={{
        margin: 0, marginBottom: spacing[8],
        fontFamily: font.mono, fontSize: fontSize.md, color: colors.muted,
      }}>
        Manage who can collaborate on {brandName}.
      </p>

      {/* Settings tab nav — extensible, currently just Team */}
      <div style={{
        display: 'flex', gap: 2,
        borderBottom: `1px solid ${colors.border}`,
        marginBottom: spacing[8],
      }}>
        <div style={{
          padding: '10px 16px',
          borderBottom: `2px solid ${colors.ink}`,
          fontFamily: font.heading, fontSize: fontSize.body, fontWeight: fontWeight.bold,
          color: colors.ink, textTransform: 'uppercase',
          letterSpacing: letterSpacing.label,
        }}>
          Team
        </div>
      </div>

      {/* Invite Someone — owners/admins only */}
      {canManage && (
        <section style={{
          background: colors.paper, border: `1px solid ${colors.border}`,
          borderRadius: radius['3xl'], boxShadow: shadow.card,
          padding: spacing[8], marginBottom: spacing[8],
        }}>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: fontSize['3xl'], color: colors.ink,
            textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
            marginBottom: spacing[2],
          }}>
            Invite Someone
          </div>
          <p style={{
            margin: 0, marginBottom: spacing[5],
            fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted,
          }}>
            They'll get an email with a link to join this brand.
          </p>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 240 }}>
              <label style={labelStyle} htmlFor="invite-email">Email</label>
              <input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                disabled={inviting}
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = colors.ink)}
                onBlur={e => (e.currentTarget.style.borderColor = colors.border)}
              />
            </div>
            <div style={{ width: 140 }}>
              <label style={labelStyle} htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
                disabled={inviting}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              style={{
                padding: '12px 24px',
                background: colors.ink, color: colors.accent,
                fontFamily: font.heading, fontWeight: fontWeight.extrabold,
                fontSize: fontSize.body, textTransform: 'uppercase',
                letterSpacing: letterSpacing.wide,
                border: 'none', borderRadius: radius.pill,
                cursor: inviting || !inviteEmail.trim() ? 'not-allowed' : 'pointer',
                opacity: inviting || !inviteEmail.trim() ? 0.55 : 1,
                whiteSpace: 'nowrap', height: 46,
              }}
            >
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </form>
          {inviteMessage && (
            <div style={{
              marginTop: spacing[3],
              fontFamily: font.mono, fontSize: fontSize.sm,
              color: inviteMessage.kind === 'ok' ? colors.success : colors.danger,
            }}>
              {inviteMessage.kind === 'ok' ? '✓ ' : ''}{inviteMessage.text}
            </div>
          )}
        </section>
      )}

      {/* Team Members */}
      <section style={{
        background: colors.paper, border: `1px solid ${colors.border}`,
        borderRadius: radius['3xl'], boxShadow: shadow.card,
        padding: spacing[8], marginBottom: spacing[8],
      }}>
        <div style={{
          fontFamily: font.heading, fontWeight: fontWeight.heading,
          fontSize: fontSize['3xl'], color: colors.ink,
          textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
          marginBottom: spacing[5],
        }}>
          Team Members ({members.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {members.map(m => {
            const isSelf = m.user_id === currentUserId
            const displayName = m.full_name || m.email || 'Unnamed user'
            const badge = ROLE_BADGE_COLORS[m.role]
            const canRemove = isOwner && !isSelf
            const canChangeRole = isOwner && !isSelf && m.role !== 'owner'
            return (
              <div key={m.user_id} style={{
                display: 'flex', alignItems: 'center', gap: spacing[4],
                padding: `${spacing[3]}px ${spacing[4]}px`,
                border: `1px solid ${colors.border}`, borderRadius: radius.lg,
                background: isSelf ? colors.gray100 : colors.paper,
              }}>
                <InitialsAvatar name={displayName} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: font.heading, fontWeight: fontWeight.bold,
                    fontSize: fontSize.md, color: colors.ink,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {displayName}{isSelf ? ' (you)' : ''}
                  </div>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize.caption, color: colors.muted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.job_title || m.email || ''}
                  </div>
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  background: badge.bg, color: badge.fg,
                  fontFamily: font.heading, fontSize: fontSize['2xs'], fontWeight: fontWeight.extrabold,
                  textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                  borderRadius: radius.pill,
                }}>
                  {ROLE_LABELS[m.role]}
                </div>
                {canChangeRole && (
                  <select
                    value={m.role}
                    onChange={e => handleChangeRole(m.user_id, e.target.value as 'admin' | 'member')}
                    disabled={busyMemberId === m.user_id}
                    style={{
                      fontFamily: font.mono, fontSize: fontSize.sm,
                      border: `1px solid ${colors.border}`, borderRadius: radius.md,
                      padding: '6px 10px', background: colors.paper, cursor: 'pointer',
                    }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(m.user_id, displayName)}
                    disabled={busyMemberId === m.user_id}
                    title="Remove member"
                    style={{
                      background: 'none', border: `1px solid ${colors.border}`,
                      borderRadius: radius.pill,
                      padding: '6px 12px',
                      fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                      color: colors.danger, cursor: busyMemberId === m.user_id ? 'wait' : 'pointer',
                      textTransform: 'uppercase', letterSpacing: letterSpacing.label,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <section style={{
          background: colors.paper, border: `1px solid ${colors.border}`,
          borderRadius: radius['3xl'], boxShadow: shadow.card,
          padding: spacing[8],
        }}>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: fontSize['3xl'], color: colors.ink,
            textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
            marginBottom: spacing[5],
          }}>
            Pending Invites ({invites.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {invites.map(i => {
              const expiresAt = new Date(i.expires_at)
              const daysLeft = Math.max(
                0,
                Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              )
              return (
                <div key={i.id} style={{
                  display: 'flex', alignItems: 'center', gap: spacing[4],
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  border: `1px solid ${colors.border}`, borderRadius: radius.lg,
                }}>
                  <InitialsAvatar name={i.email} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: font.heading, fontWeight: fontWeight.bold,
                      fontSize: fontSize.md, color: colors.ink,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {i.email}
                    </div>
                    <div style={{
                      fontFamily: font.mono, fontSize: fontSize.caption, color: colors.muted,
                    }}>
                      Expires in {daysLeft} day{daysLeft === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    background: ROLE_BADGE_COLORS[i.role].bg,
                    color: ROLE_BADGE_COLORS[i.role].fg,
                    fontFamily: font.heading, fontSize: fontSize['2xs'], fontWeight: fontWeight.extrabold,
                    textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                    borderRadius: radius.pill,
                  }}>
                    {ROLE_LABELS[i.role]}
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(i.id)}
                      disabled={busyInviteId === i.id}
                      style={{
                        background: 'none', border: `1px solid ${colors.border}`,
                        borderRadius: radius.pill,
                        padding: '6px 12px',
                        fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                        color: colors.danger, cursor: busyInviteId === i.id ? 'wait' : 'pointer',
                        textTransform: 'uppercase', letterSpacing: letterSpacing.label,
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}
