'use client'
import { useState, useEffect } from 'react'
import { Brand, Campaign, GeneratedContent, CampaignAsset } from '@/types'
import BriefTab from './tabs/BriefTab'
import CreativeTab from './tabs/CreativeTab'
import AdCopyTab from './tabs/AdCopyTab'
import LandingBriefTab from './tabs/LandingBriefTab'
import FunnelPreview from './FunnelPreview'

const FUNNEL_TABS = [
  { id: 'brief', label: 'Brief' },
  { id: 'creative', label: 'Creative' },
  { id: 'ad-copy', label: 'Ad Copy' },
  { id: 'landing', label: 'Landing Brief' },
]

export default function CampaignDetail({
  campaign,
  brand,
  brands,
  generatedContent,
  campaignAssets,
  autoGenerate,
}: {
  campaign: Campaign
  brand: Brand
  brands: Brand[]
  generatedContent: GeneratedContent[]
  campaignAssets: CampaignAsset[]
  autoGenerate?: boolean
}) {
  const [tab, setTab] = useState('brief')
  const [showPreview, setShowPreview] = useState(!!autoGenerate)
  const [freshAdVariation, setFreshAdVariation] = useState<{ primary_text: string; headline: string; description: string } | null>(null)
  const [freshLandingBrief, setFreshLandingBrief] = useState<any>(null)
  const isFunnel = campaign.type === 'funnel'
  const tabs = isFunnel ? FUNNEL_TABS : [{ id: 'brief', label: 'Brief' }]

  const adCopyContent = generatedContent.filter(c => c.type === 'fb_ad')
  const landingContent = generatedContent.filter(c => c.type === 'landing_brief')

  // Auto-generate on mount for new funnel campaigns
  useEffect(() => {
    if (!autoGenerate || !isFunnel) return

    // Generate ad copy
    fetch(`/api/campaigns/${campaign.id}/ad-copy`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data?.variations?.[0]) {
          setFreshAdVariation(data.variations[0])
        } else if (data?.content) {
          // Try to parse from content string
          try {
            const parsed = JSON.parse(data.content)
            if (parsed?.variations?.[0]) setFreshAdVariation(parsed.variations[0])
          } catch {}
        }
      })
      .catch(() => {})

    // Generate landing brief
    fetch(`/api/campaigns/${campaign.id}/landing-brief`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data?.sections) {
          setFreshLandingBrief(data.sections)
        } else if (data?.content) {
          try {
            const parsed = JSON.parse(data.content)
            if (parsed?.sections) setFreshLandingBrief(parsed.sections)
            else setFreshLandingBrief(parsed)
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  if (showPreview && isFunnel) {
    return (
      <FunnelPreview
        adVariation={freshAdVariation}
        landingBrief={freshLandingBrief}
        brand={brand}
        onDismiss={() => { setShowPreview(false); setTab('ad-copy') }}
      />
    )
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="text-sm px-4 py-2 rounded-btn border transition-all font-semibold"
            style={tab === t.id
              ? { background: '#000', color: '#00ff97', borderColor: '#000' }
              : { borderColor: '#e0e0e0', color: '#666' }}>
            {t.label}
            {t.id === 'ad-copy' && adCopyContent.length > 0 && (
              <span className="ml-1.5 text-xs opacity-60">{adCopyContent.length}</span>
            )}
            {t.id === 'landing' && landingContent.length > 0 && (
              <span className="ml-1.5 text-xs opacity-60">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'brief' && <BriefTab campaign={campaign} brand={brand} />}
      {tab === 'creative' && <CreativeTab brand={brand} brands={brands} campaign={campaign} assets={campaignAssets} />}
      {tab === 'ad-copy' && <AdCopyTab campaign={campaign} brand={brand} content={adCopyContent} />}
      {tab === 'landing' && <LandingBriefTab campaign={campaign} brand={brand} content={landingContent} />}
    </div>
  )
}
