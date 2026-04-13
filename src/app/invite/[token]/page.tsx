import Link from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AcceptInviteClient from './AcceptInviteClient'
import {
  colors, font, fontWeight, fontSize, radius, shadow,
  spacing, letterSpacing,
} from '@/lib/design-tokens'

// Service-role client — the invite row lookup is keyed on an opaque token
// and happens before the visitor authenticates, so RLS on the anon client
// would block it.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data: invite } = await supabaseAdmin
    .from('brand_invites')
    .select('id, brand_id, email, role, invited_by, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  const nowMs = Date.now()
  const invalid =
    !invite ||
    !!invite.accepted_at ||
    new Date(invite.expires_at).getTime() < nowMs

  if (invalid) {
    return <InvalidInvite reason={
      !invite ? 'not_found'
      : invite.accepted_at ? 'already_accepted'
      : 'expired'
    } />
  }

  // Fetch brand + inviter for the accept card. Non-fatal if either fails.
  const [{ data: brand }, { data: inviter }] = await Promise.all([
    supabaseAdmin.from('brands').select('name').eq('id', invite.brand_id).maybeSingle(),
    invite.invited_by
      ? supabaseAdmin.from('profiles').select('full_name').eq('id', invite.invited_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <AcceptInviteClient
      token={token}
      brandName={brand?.name || 'an Attomik brand'}
      inviterName={inviter?.full_name || 'A teammate'}
      role={invite.role}
      inviteEmail={invite.email}
    />
  )
}

function InvalidInvite({ reason }: { reason: 'not_found' | 'already_accepted' | 'expired' }) {
  const message =
    reason === 'already_accepted'
      ? 'This invite has already been accepted.'
      : reason === 'expired'
      ? 'This invite has expired.'
      : 'This invite is invalid.'

  return (
    <div style={{
      minHeight: '100vh', background: colors.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing[5],
    }}>
      <div style={{
        background: colors.paper, borderRadius: radius['3xl'], boxShadow: shadow.modal,
        padding: `${spacing[10]}px ${spacing[8]}px`,
        maxWidth: 460, width: '100%', boxSizing: 'border-box', textAlign: 'center',
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
          fontSize: fontSize['8xl'], color: colors.ink,
          textTransform: 'uppercase', letterSpacing: letterSpacing.snug, lineHeight: 1.05,
        }}>
          Invite unavailable
        </h1>
        <p style={{
          margin: 0, marginBottom: spacing[8],
          fontFamily: font.mono, fontSize: fontSize.md, color: colors.muted,
        }}>
          {message} Ask whoever invited you to send a new one.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block', padding: '14px 32px',
            background: colors.ink, color: colors.accent,
            fontFamily: font.heading, fontWeight: fontWeight.extrabold,
            fontSize: fontSize.md, textTransform: 'uppercase',
            letterSpacing: letterSpacing.wide,
            borderRadius: radius.pill, textDecoration: 'none',
          }}
        >
          Go to homepage
        </Link>
      </div>
    </div>
  )
}
