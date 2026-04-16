import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Service-role client for the RLS-bypassing ownership check + cascade delete.
// The authed SSR client is still used for authentication (cookie-bound), but
// the delete itself runs under admin so we don't depend on every cascade
// table's RLS policy being perfectly consistent.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Authority for brand access is brand_members (CLAUDE.md + migration
  // 20260413_brand_teams_fix.sql). Check that first — but some legacy brands
  // predate the brand_teams backfill and have brands.user_id set without a
  // matching brand_members row. For those we fall back to the legacy owner
  // match and self-heal the missing row so future ops behave.
  const { data: membership } = await supabaseAdmin
    .from('brand_members')
    .select('role')
    .eq('brand_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  let isOwner = membership?.role === 'owner'

  if (!membership) {
    const { data: brand } = await supabaseAdmin
      .from('brands')
      .select('user_id')
      .eq('id', id)
      .maybeSingle()
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    if (brand.user_id && brand.user_id === user.id) {
      await supabaseAdmin
        .from('brand_members')
        .insert({ brand_id: id, user_id: user.id, role: 'owner' })
        .select()
        .single()
        .then(() => undefined, () => undefined) // ignore unique-violation races
      isOwner = true
    }
  }

  if (!isOwner) {
    if (membership && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can delete a brand' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Storage cleanup (admin client — the bucket is public but write access
  // is gated; service-role always works).
  const { data: images } = await supabaseAdmin.from('brand_images').select('storage_path').eq('brand_id', id)
  if (images?.length) {
    const paths = images
      .map(i => (i as { storage_path?: string }).storage_path)
      .filter((p): p is string => typeof p === 'string')
      .map(p => p.replace(/^brand-images\//, ''))
    if (paths.length) await supabaseAdmin.storage.from('brand-images').remove(paths)
  }

  // Cascade row deletes under admin so RLS can't silently swallow them.
  const errs: string[] = []
  const gc = await supabaseAdmin.from('generated_content').delete().eq('brand_id', id)
  if (gc.error) errs.push(`generated_content: ${gc.error.message}`)
  const fs = await supabaseAdmin.from('funnel_starts').delete().eq('brand_id', id)
  if (fs.error && !/relation .* does not exist/i.test(fs.error.message)) errs.push(`funnel_starts: ${fs.error.message}`)
  const bi = await supabaseAdmin.from('brand_images').delete().eq('brand_id', id)
  if (bi.error) errs.push(`brand_images: ${bi.error.message}`)
  const cp = await supabaseAdmin.from('campaigns').delete().eq('brand_id', id)
  if (cp.error) errs.push(`campaigns: ${cp.error.message}`)
  // brand_members rows for this brand get dropped via the FK on delete cascade
  // declared in 20260413_brand_teams.sql — no explicit delete needed.
  const br = await supabaseAdmin.from('brands').delete().eq('id', id)
  if (br.error) errs.push(`brands: ${br.error.message}`)

  if (errs.length) return NextResponse.json({ error: errs.join('; ') }, { status: 500 })
  return NextResponse.json({ success: true })
}
