import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import TeamPageClient, { type MemberRow, type InviteRow } from './TeamPageClient'

// Admin client is needed to join brand_members against auth.users emails,
// which the anon client cannot reach.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ brandId: string }>
}) {
  const { brandId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/brands/${brandId}/settings/team`)

  // Authorize: must be a member of this brand.
  const { data: callerMembership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!callerMembership) notFound()

  const [{ data: brand }, { data: memberRows }, { data: inviteRows }] = await Promise.all([
    supabase.from('brands').select('name').eq('id', brandId).maybeSingle(),
    supabaseAdmin
      .from('brand_members')
      .select('user_id, role, created_at')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('brand_invites')
      .select('id, email, role, expires_at, created_at')
      .eq('brand_id', brandId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  if (!brand) notFound()

  // Hydrate each member row with profile info + auth email.
  const userIds = (memberRows || []).map(r => r.user_id)
  const [{ data: profiles }, usersPage] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from('profiles').select('id, full_name, job_title').in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null; job_title: string | null }[] }),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ])

  const profileById = new Map<string, { full_name: string | null; job_title: string | null }>(
    (profiles || []).map(p => [p.id, { full_name: p.full_name, job_title: p.job_title }])
  )
  const emailByUserId = new Map<string, string | null>(
    (usersPage.data?.users || []).map(u => [u.id, u.email || null])
  )

  const members: MemberRow[] = (memberRows || []).map(r => {
    const p = profileById.get(r.user_id)
    return {
      user_id: r.user_id,
      role: r.role as MemberRow['role'],
      created_at: r.created_at,
      full_name: p?.full_name || null,
      job_title: p?.job_title || null,
      email: emailByUserId.get(r.user_id) || null,
    }
  })

  // Owner row first, then admins, then members — all alphabetically within
  // the group by display name so the list is stable.
  const roleRank: Record<MemberRow['role'], number> = { owner: 0, admin: 1, member: 2 }
  members.sort((a, b) => {
    if (roleRank[a.role] !== roleRank[b.role]) return roleRank[a.role] - roleRank[b.role]
    const an = (a.full_name || a.email || '').toLowerCase()
    const bn = (b.full_name || b.email || '').toLowerCase()
    return an.localeCompare(bn)
  })

  const invites: InviteRow[] = (inviteRows || []).map(r => ({
    id: r.id,
    email: r.email,
    role: r.role as InviteRow['role'],
    expires_at: r.expires_at,
    created_at: r.created_at,
  }))

  return (
    <TeamPageClient
      brandId={brandId}
      brandName={brand.name}
      currentUserId={user.id}
      currentUserRole={callerMembership.role as MemberRow['role']}
      initialMembers={members}
      initialInvites={invites}
    />
  )
}
