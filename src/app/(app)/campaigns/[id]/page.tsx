import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CampaignDetail from '@/components/campaigns/CampaignDetail'
import FirstRunBanner from '@/components/campaigns/FirstRunBanner'

export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const { id } = await params
  const { new: isNew } = await searchParams
  const supabase = await createClient()

  const [{ data: campaign }, { data: generatedContent }, { data: assets }, { data: brands }] = await Promise.all([
    supabase.from('campaigns').select('*, brand:brands(*)').eq('id', id).single(),
    supabase.from('generated_content').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
    supabase.from('campaign_assets').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
    supabase.from('brands').select('*').eq('status', 'active').order('name'),
  ])

  if (!campaign) notFound()

  const brand = campaign.brand

  return (
    <div className="p-4 md:p-10 max-w-6xl">
      <Link href="/campaigns" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6">
        <ArrowLeft size={14} /> All campaigns
      </Link>

      {isNew === '1' && <FirstRunBanner />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: brand?.primary_color || '#e0e0e0' }} />
            <span className="text-muted text-sm">{brand?.name}</span>
            <span className={`badge status-${campaign.status}`}>{campaign.status}</span>
            <span className="text-xs px-2 py-0.5 bg-cream rounded-pill text-muted capitalize">{campaign.type.replace('_', ' ')}</span>
          </div>
          <h1 className="mt-2">{campaign.name}</h1>
          {campaign.angle && <p className="text-muted mt-1">{campaign.angle}</p>}
        </div>
      </div>

      <CampaignDetail
        campaign={campaign}
        brand={brand}
        brands={brands ?? []}
        generatedContent={generatedContent ?? []}
        campaignAssets={assets ?? []}
        autoGenerate={isNew === '1'}
      />
    </div>
  )
}
