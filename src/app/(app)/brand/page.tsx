import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BrandPage() {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  const brand = brands?.[0]
  if (!brand) redirect('/dashboard')

  redirect(`/brand-setup/${brand.id}`)
}
