import { createClient } from '@/lib/supabase/server'

// Privileged-operation guard for Store routes. Deploys, base-theme installs,
// and settings pulls mutate real Shopify stores — we restrict them to
// brand owners and admins. Mirrors the existing `authorizeOwner` pattern in
// /api/brands/[id]/members/[userId]/route.ts, widened to include admins.

export async function authorizeOwnerOrAdmin(brandId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      supabase,
      user: null,
      error: 'Unauthorized',
      status: 401 as const,
    }
  }
  const { data: membership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return {
      supabase,
      user,
      error: 'Only owners and admins can perform this action',
      status: 403 as const,
    }
  }
  return { supabase, user, error: null, status: 200 as const }
}
