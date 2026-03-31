import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CampaignBriefForm from '@/components/campaigns/CampaignBriefForm'

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>
}) {
  const { brand: brandParam } = await searchParams
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, primary_color, logo_url, products, target_audience, brand_voice, mission')
    .eq('status', 'active')
    .order('name')

  return (
    <div style={{ padding: '32px 40px', maxWidth: 720, margin: '0 auto' }}>
      <Link href="/campaigns" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', textDecoration: 'none', marginBottom: 28 }}>← All campaigns</Link>
      <CampaignBriefForm brands={brands ?? []} defaultBrandId={brandParam} />
    </div>
  )
}
