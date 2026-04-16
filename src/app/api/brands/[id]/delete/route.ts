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
      // Legacy owner — brand_members row was never created (pre-backfill).
      // Self-heal so future ops go through the normal membership path.
      await supabaseAdmin
        .from('brand_members')
        .insert({ brand_id: id, user_id: user.id, role: 'owner' })
        .select()
        .single()
        .then(() => undefined, () => undefined)
      isOwner = true
    } else if (!brand.user_id) {
      // Orphan: brands.user_id is null. Confirm brand_members is also empty
      // for this brand before treating it as deletable garbage.
      const { data: anyMember } = await supabaseAdmin
        .from('brand_members')
        .select('user_id')
        .eq('brand_id', id)
        .limit(1)
        .maybeSingle()
      if (!anyMember) isOwner = true
    }
  }

  if (!isOwner) {
    if (membership && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can delete a brand' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Collect storage paths from every brand-scoped bucket in parallel before
  // we delete any rows. Three buckets carry files tied to a brand:
  //   brand-images     — every row in brand_images
  //   brand-assets     — every row in brand_assets (logos, PDFs) + saved-
  //                      creative thumbnails under thumbnails/<brand_id>/
  //   campaign-assets  — every row in campaign_assets (saved creative PNGs)
  const [
    brandImagesRes,
    brandAssetsRes,
    campaignAssetsRes,
    thumbFolderRes,
  ] = await Promise.all([
    supabaseAdmin.from('brand_images').select('storage_path').eq('brand_id', id),
    supabaseAdmin.from('brand_assets').select('storage_path').eq('brand_id', id),
    supabaseAdmin.from('campaign_assets').select('storage_path').eq('brand_id', id),
    supabaseAdmin.storage.from('brand-assets').list(`thumbnails/${id}`),
  ])

  const errs: string[] = []
  const pathsFrom = (rows: unknown, stripPrefix?: string): string[] => {
    if (!Array.isArray(rows)) return []
    return (rows as Array<{ storage_path?: string | null }>)
      .map(r => r.storage_path)
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
      .map(p => (stripPrefix ? p.replace(new RegExp(`^${stripPrefix}`), '') : p))
  }

  const brandImagePaths = pathsFrom(brandImagesRes.data, 'brand-images/')
  if (brandImagePaths.length) {
    const r = await supabaseAdmin.storage.from('brand-images').remove(brandImagePaths)
    if (r.error) errs.push(`brand-images storage: ${r.error.message}`)
  }

  const brandAssetPaths = pathsFrom(brandAssetsRes.data)
  if (brandAssetPaths.length) {
    const r = await supabaseAdmin.storage.from('brand-assets').remove(brandAssetPaths)
    if (r.error) errs.push(`brand-assets storage: ${r.error.message}`)
  }

  // Thumbnails live under thumbnails/<brand_id>/<creative_id>.png regardless
  // of whether saved_creatives.thumbnail_url has been populated yet.
  const thumbFiles = thumbFolderRes.data
  if (Array.isArray(thumbFiles) && thumbFiles.length) {
    const thumbPaths = thumbFiles.map(f => `thumbnails/${id}/${f.name}`)
    const r = await supabaseAdmin.storage.from('brand-assets').remove(thumbPaths)
    if (r.error) errs.push(`thumbnails storage: ${r.error.message}`)
  }

  const campaignAssetPaths = pathsFrom(campaignAssetsRes.data)
  if (campaignAssetPaths.length) {
    const r = await supabaseAdmin.storage.from('campaign-assets').remove(campaignAssetPaths)
    if (r.error) errs.push(`campaign-assets storage: ${r.error.message}`)
  }

  // Row cleanup. The following tables have ON DELETE CASCADE on brand_id
  // and get swept by the brands delete at the end — no explicit delete:
  //   brand_assets, brand_images, brand_voice_examples, campaigns,
  //   campaign_assets, generated_content, email_templates, store_themes,
  //   brand_members, brand_invites, brand_insights, brand_insight_rows.
  //
  // These need explicit deletes because their FK is not ON DELETE CASCADE
  // (or the table isn't in repo migrations and its cascade can't be verified):
  const pushError = (label: string, r: { error: { message?: string } | null }) => {
    if (!r.error) return
    if (/relation .* does not exist/i.test(r.error.message ?? '')) return
    errs.push(`${label}: ${r.error.message}`)
  }
  pushError('email_sends',     await supabaseAdmin.from('email_sends').delete().eq('brand_id', id))
  pushError('funnel_starts',   await supabaseAdmin.from('funnel_starts').delete().eq('brand_id', id))
  pushError('saved_creatives', await supabaseAdmin.from('saved_creatives').delete().eq('brand_id', id))
  pushError('brands',          await supabaseAdmin.from('brands').delete().eq('id', id))

  if (errs.length) return NextResponse.json({ error: errs.join('; ') }, { status: 500 })
  return NextResponse.json({ success: true })
}
