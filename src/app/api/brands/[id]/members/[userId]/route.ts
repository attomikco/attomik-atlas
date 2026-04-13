import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// The admin client is used for delete/update because the member-management
// policies are scoped to the caller's role — we already verify that caller
// is an owner above, and using admin here avoids double-checking RLS on a
// privileged operation we just authorized.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function authorizeOwner(brandId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const, user: null }
  const { data: callerMembership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!callerMembership || callerMembership.role !== 'owner') {
    return { error: 'Only owners can manage members', status: 403 as const, user: null }
  }
  return { error: null, status: 200 as const, user }
}

// DELETE /api/brands/[id]/members/[userId]
// Owner removes a member. Cannot remove self. Cannot remove the last owner.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: brandId, userId } = await params
  const auth = await authorizeOwner(brandId)
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (userId === auth.user.id) {
    return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
  }

  // Target must exist in this brand.
  const { data: target } = await supabaseAdmin
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Never strand a brand without an owner.
  if (target.role === 'owner') {
    const { count: ownerCount } = await supabaseAdmin
      .from('brand_members')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('role', 'owner')
    if ((ownerCount ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last owner' },
        { status: 400 }
      )
    }
  }

  const { error } = await supabaseAdmin
    .from('brand_members')
    .delete()
    .eq('brand_id', brandId)
    .eq('user_id', userId)

  if (error) {
    console.error('[members DELETE] failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// PATCH /api/brands/[id]/members/[userId]
// Body: { role: 'admin' | 'member' }
// Owner changes a member's role. Cannot change own role (lockout prevention).
// Owner role itself is not assignable via this endpoint.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: brandId, userId } = await params
  const auth = await authorizeOwner(brandId)
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  if (userId === auth.user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const nextRole = body?.role
  if (nextRole !== 'admin' && nextRole !== 'member') {
    return NextResponse.json({ error: 'Role must be admin or member' }, { status: 400 })
  }

  // Can't demote an owner via this endpoint — ownership transfer is a
  // separate future action, not a casual role flip.
  const { data: target } = await supabaseAdmin
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!target) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }
  if (target.role === 'owner') {
    return NextResponse.json(
      { error: 'Cannot change an owner\'s role from here' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('brand_members')
    .update({ role: nextRole })
    .eq('brand_id', brandId)
    .eq('user_id', userId)

  if (error) {
    console.error('[members PATCH] failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, role: nextRole })
}
