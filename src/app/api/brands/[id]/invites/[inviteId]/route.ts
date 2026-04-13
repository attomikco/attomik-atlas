import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/brands/[id]/invites/[inviteId]
// Revoke a pending invite. Owner or admin only.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const { id: brandId, inviteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Authorize: owner or admin.
  const { data: callerMembership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json(
      { error: 'Only owners and admins can revoke invites' },
      { status: 403 }
    )
  }

  const { error } = await supabase
    .from('brand_invites')
    .delete()
    .eq('id', inviteId)
    .eq('brand_id', brandId)

  if (error) {
    console.error('[invites DELETE] failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
