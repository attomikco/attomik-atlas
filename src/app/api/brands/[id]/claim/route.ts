import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/brands/[id]/claim
// Authed endpoint that claims an unclaimed brand (brand.user_id IS NULL) for
// the current user. The DB trigger `on_brand_user_assigned` auto-creates the
// matching brand_members row once user_id is set, so a single UPDATE is all
// that's needed here.
//
// Used by the preview page's "Save this brand" CTA for logged-in users who
// just ran the onboarding wizard. Anonymous users go through a different
// path (AccountModal sign-up → /auth/confirm claimAndRedirect).
//
// Safety:
//   - Requires an authenticated session.
//   - Only claims brands where user_id IS NULL — refuses to overwrite an
//     existing owner. Returns 409 in that case so the UI can distinguish
//     between "already mine" and "someone else's".
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service-role client — the wizard creates unclaimed brands with no
  // brand_members row, so the user-scoped client can't read or update the
  // row under the is_brand_member RLS policy.
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existing, error: readErr } = await supabaseAdmin
    .from('brands')
    .select('id, user_id')
    .eq('id', id)
    .maybeSingle()

  if (readErr) {
    console.error('[brands/claim] read error:', readErr)
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  if (existing.user_id) {
    if (existing.user_id === user.id) {
      // Idempotent — already owned by this user.
      return NextResponse.json({ brandId: id, alreadyOwned: true })
    }
    return NextResponse.json(
      { error: 'Brand is already claimed by another user' },
      { status: 409 }
    )
  }

  const { error: updateErr } = await supabaseAdmin
    .from('brands')
    .update({
      user_id: user.id,
      client_email: user.email || null,
    })
    .eq('id', id)
    .is('user_id', null)

  if (updateErr) {
    console.error('[brands/claim] update error:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ brandId: id, alreadyOwned: false })
}
