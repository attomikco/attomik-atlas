import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmailTemplateClient from '@/components/email/EmailTemplateClient'

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>
}) {
  const { brand: brandParam } = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, website, logo_url, primary_color, accent_color, font_primary, font_heading, products, notes')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (!brands?.length) redirect('/onboarding')

  const activeBrandId = brandParam || brands[0]?.id
  const brand = brands.find(b => b.id === activeBrandId) || brands[0]

  // Parse email config from notes
  let emailConfig = null
  try {
    const notes = brand.notes ? JSON.parse(brand.notes) : {}
    emailConfig = notes.email_config || null
  } catch {}

  // Fetch generated emails for this brand
  const { data: emails } = await supabase
    .from('generated_content')
    .select('*, campaign:campaigns(id, name, goal)')
    .eq('brand_id', activeBrandId)
    .eq('type', 'email')
    .order('created_at', { ascending: false })

  return <EmailTemplateClient brand={brand} initialConfig={emailConfig} emails={emails || []} />
}
