import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify brand belongs to current user
  const { data: brand } = await supabase.from('brands').select('id, user_id').eq('id', id).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  if (brand.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete brand images from storage
  const { data: images } = await supabase.from('brand_images').select('storage_path').eq('brand_id', id)
  if (images?.length) {
    const paths = images.map(i => i.storage_path.replace(/^brand-images\//, ''))
    await supabase.storage.from('brand-images').remove(paths)
  }

  // Delete related rows in correct order
  await supabase.from('generated_content').delete().eq('brand_id', id)
  await supabase.from('funnel_starts').delete().eq('brand_id', id)
  await supabase.from('brand_images').delete().eq('brand_id', id)
  await supabase.from('campaigns').delete().eq('brand_id', id)
  await supabase.from('brands').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
