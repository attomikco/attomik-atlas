import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Admin client is used because the invite row is looked up by opaque token
// — the requester might not be a brand member yet, so RLS would otherwise
// block the select.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/invites/[token]
// Accept a brand invite. Requires the current user's email to match the
// invited email. Inserts the user into brand_members and marks the invite
// accepted. Idempotent: if the user is already a member, returns the brand
// id so the client can still redirect.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invite } = await supabaseAdmin
    .from('brand_invites')
    .select('id, brand_id, email, role, invited_by, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.accepted_at) {
    // Idempotent — if the user is already the member, still redirect them.
    const { data: existingMember } = await supabaseAdmin
      .from('brand_members')
      .select('id')
      .eq('brand_id', invite.brand_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existingMember) {
      return NextResponse.json({ brand_id: invite.brand_id })
    }
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
  }

  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invite was sent to a different email address' },
      { status: 403 }
    )
  }

  // Insert membership via admin client — the target user has no membership
  // yet, so RLS-based insert would fail.
  const { error: insertErr } = await supabaseAdmin
    .from('brand_members')
    .insert({
      brand_id: invite.brand_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by,
    })

  if (insertErr && insertErr.code !== '23505' /* unique_violation */) {
    console.error('[invites accept] insert failed:', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Mark the invite accepted.
  await supabaseAdmin
    .from('brand_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ brand_id: invite.brand_id })
}
