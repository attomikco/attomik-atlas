import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Authority for brand access is brand_members (see CLAUDE.md + migration
  // 20260413_brand_teams_fix.sql). brands.user_id still exists but can lag
  // behind on older brands or edge-case claim flows, which was returning 403
  // on legitimate owners. Gate on role='owner' in brand_members instead.
  const { data: membership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  if (membership.role !== 'owner') return NextResponse.json({ error: 'Only owners can delete a brand' }, { status: 403 })

  // Delete brand images from storage
  const { data: images } = await supabase.from('brand_images').select('storage_path').eq('brand_id', id)
  if (images?.length) {
    const paths = images.map(i => i.storage_path.replace(/^brand-images\//, ''))
    await supabase.storage.from('brand-images').remove(paths)
  }

  // Cascade row deletes. Capture errors so silent RLS blocks surface instead
  // of returning success while the brand stays in the DB.
  const errs: string[] = []
  const gc = await supabase.from('generated_content').delete().eq('brand_id', id)
  if (gc.error) errs.push(`generated_content: ${gc.error.message}`)
  const fs = await supabase.from('funnel_starts').delete().eq('brand_id', id)
  if (fs.error && !/relation .* does not exist/i.test(fs.error.message)) errs.push(`funnel_starts: ${fs.error.message}`)
  const bi = await supabase.from('brand_images').delete().eq('brand_id', id)
  if (bi.error) errs.push(`brand_images: ${bi.error.message}`)
  const cp = await supabase.from('campaigns').delete().eq('brand_id', id)
  if (cp.error) errs.push(`campaigns: ${cp.error.message}`)
  const br = await supabase.from('brands').delete().eq('id', id)
  if (br.error) errs.push(`brands: ${br.error.message}`)

  if (errs.length) return NextResponse.json({ error: errs.join('; ') }, { status: 500 })
  return NextResponse.json({ success: true })
}
