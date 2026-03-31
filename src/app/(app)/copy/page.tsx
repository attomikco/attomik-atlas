import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CopyCreatorClient from './CopyCreatorClient'

export default async function CopyPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string; brand?: string }>
}) {
  const { campaign: campaignId, brand: brandParam } = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands').select('*').eq('status', 'active').order('name')

  if (!brands?.length) redirect('/onboarding')

  const activeBrandId = brandParam || brands[0]?.id

  const query = supabase
    .from('campaigns')
    .select('*, brand:brands(name, primary_color)')
    .order('created_at', { ascending: false })

  if (activeBrandId) query.eq('brand_id', activeBrandId)

  const { data: campaigns } = await query

  let existingVariations: any[] = []
  let selectedCampaign: any = null

  if (campaignId) {
    selectedCampaign = campaigns?.find((c: any) => c.id === campaignId) || null
    const { data: content } = await supabase
      .from('generated_content')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('type', 'fb_ad')
      .order('created_at', { ascending: false })

    if (content?.length) {
      content.forEach((row: any) => {
        try {
          const parsed = JSON.parse(row.content)
          if (parsed.variations) {
            existingVariations.push(...parsed.variations.map((v: any) => ({
              ...v, id: row.id, created_at: row.created_at,
            })))
          } else {
            existingVariations.push({ ...parsed, id: row.id, created_at: row.created_at })
          }
        } catch {}
      })
    }
  }

  const brandId = selectedCampaign?.brand_id || brands[0]?.id
  let brandAudience = ''
  let brandVoice = ''
  if (brandId) {
    const { data: brandData } = await supabase
      .from('brands').select('target_audience, brand_voice').eq('id', brandId).single()
    brandAudience = brandData?.target_audience || ''
    brandVoice = brandData?.brand_voice || ''
  }

  return (
    <CopyCreatorClient
      brands={brands}
      campaigns={campaigns || []}
      initialCampaignId={campaignId || campaigns?.[0]?.id || ''}
      initialVariations={existingVariations}
      selectedCampaign={selectedCampaign}
      brandAudience={brandAudience}
      brandVoice={brandVoice}
    />
  )
}
