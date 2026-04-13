import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'
import { buildInviteEmailHtml } from '@/lib/invite-email'

// Service-role client is needed for two things the anon client can't do:
//   1. Look up auth.users by email to detect existing-member conflicts.
//   2. (Not used here, but consistent with other admin-y routes.)
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/brands/[brandId]/invites
// Body: { email: string, role: 'admin' | 'member' }
// Requires caller to be owner or admin of the brand.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const role: 'admin' | 'member' = body?.role === 'admin' ? 'admin' : 'member'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Authorize: caller must be owner or admin of this brand.
  const { data: callerMembership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json(
      { error: 'Only owners and admins can invite members' },
      { status: 403 }
    )
  }

  // Already a member? Look up an auth user with this email via the admin API
  // and check brand_members. If the lookup fails (e.g., network), we fall
  // through — the unique(brand_id, user_id) constraint still protects us on
  // accept.
  try {
    const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })
    const existing = usersPage?.users.find(
      u => (u.email || '').toLowerCase() === email
    )
    if (existing?.id) {
      const { data: alreadyMember } = await supabaseAdmin
        .from('brand_members')
        .select('id')
        .eq('brand_id', brandId)
        .eq('user_id', existing.id)
        .maybeSingle()
      if (alreadyMember) {
        return NextResponse.json({ error: 'Already a member' }, { status: 400 })
      }
    }
  } catch (e) {
    console.error('[invites POST] existing-member check failed:', e)
    // Non-fatal — proceed.
  }

  // Pending, non-expired invite already exists?
  const nowIso = new Date().toISOString()
  const { data: pending } = await supabase
    .from('brand_invites')
    .select('id')
    .eq('brand_id', brandId)
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', nowIso)
    .maybeSingle()

  if (pending) {
    return NextResponse.json({ error: 'Already invited' }, { status: 400 })
  }

  // Insert the invite row. RLS enforces the caller membership check at the
  // DB level as well — belt and suspenders.
  const { data: invite, error: insertErr } = await supabase
    .from('brand_invites')
    .insert({
      brand_id: brandId,
      email,
      role,
      invited_by: user.id,
    })
    .select('id, brand_id, email, role, token, expires_at, created_at, accepted_at')
    .single()

  if (insertErr || !invite) {
    console.error('[invites POST] insert failed:', insertErr)
    return NextResponse.json(
      { error: insertErr?.message || 'Failed to create invite' },
      { status: 500 }
    )
  }

  // Fetch brand name + inviter's display name for the email template.
  const { data: brand } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .maybeSingle()
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const brandName = brand?.name || 'an Attomik brand'
  const inviterName = inviterProfile?.full_name || user.email || 'A teammate'

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '')
  const acceptUrl = `${appUrl}/invite/${invite.token}`

  try {
    await sendEmail({
      to: email,
      subject: `${brandName} invited you to Attomik`,
      html: buildInviteEmailHtml({ brandName, inviterName, role, acceptUrl }),
    })
  } catch (e) {
    console.error('[invites POST] email send failed:', e)
    // Do not roll back — the invite row is persisted and can be resent or
    // revoked by an admin.
    return NextResponse.json(
      { invite, warning: 'Invite created but email delivery failed' },
      { status: 200 }
    )
  }

  return NextResponse.json({ invite })
}
