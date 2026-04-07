'use client'
import { Brand, Campaign, CampaignAsset } from '@/types'
import CreativeBuilder from '@/components/creatives/CreativeBuilder'

function buildBrief(campaign: Campaign): string {
  const parts = []
  if (campaign.angle) parts.push(`Angle: ${campaign.angle}`)
  if (campaign.offer) parts.push(`Offer/product: ${campaign.offer}`)
  if (campaign.key_message) parts.push(`Key message: ${campaign.key_message}`)
  if (campaign.goal) parts.push(`Goal: ${campaign.goal}`)
  if (campaign.audience_notes) parts.push(`Audience: ${campaign.audience_notes}`)
  return parts.join('\n')
}

function buildPreloadedCopy(campaign: Campaign) {
  const headline = campaign.key_message || campaign.offer || campaign.name || ''
  let primary_text = ''
  if (campaign.angle && campaign.offer) {
    primary_text = `${campaign.angle}. ${campaign.offer}`
  } else if (campaign.angle) {
    primary_text = campaign.angle
  } else if (campaign.offer) {
    primary_text = campaign.offer
  } else if (campaign.key_message && campaign.name) {
    primary_text = `${campaign.name} — ${campaign.key_message}`
  }
  const goalCtaMap: Record<string, string> = {
    new_product_launch: 'Shop Now',
    limited_offer___sale: 'Claim Offer',
    seasonal___holiday: 'Shop the Collection',
    brand_awareness: 'Learn More',
    retargeting: 'Come Back',
    new_audience___cold_traffic: 'Discover More',
  }
  const goalKey = campaign.goal?.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_') || ''
  const description = goalCtaMap[goalKey] || 'Shop Now'
  if (headline || primary_text) return { headline, primary_text, description }
  return null
}

export default function CreativeTab({
  brand,
  brands,
  campaign,
  assets,
}: {
  brand: Brand
  brands: Brand[]
  campaign: Campaign
  assets: CampaignAsset[]
}) {
  return (
    <div>
      <CreativeBuilder
        brands={brands}
        defaultBrandId={brand.id}
        campaignId={campaign.id}
        campaignBrief={buildBrief(campaign)}
        preloadedCopy={buildPreloadedCopy(campaign)}
      />

      {/* Saved campaign creatives */}
      {assets.length > 0 && (
        <div className="bg-paper border border-border rounded-card p-5 mt-6">
          <div className="label mb-3">Saved creatives ({assets.length})</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {assets.map(a => (
              <div key={a.id} className="rounded-btn overflow-hidden border border-border">
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-assets/${a.storage_path}`}
                  alt={a.file_name}
                  className="w-full aspect-square object-cover"
                />
                <div className="px-2 py-1.5">
                  <div className="text-xs text-muted truncate">{a.file_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
