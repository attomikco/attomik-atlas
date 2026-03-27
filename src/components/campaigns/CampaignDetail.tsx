'use client'
import { useState } from 'react'
import { Brand, Campaign, GeneratedContent, CampaignAsset } from '@/types'
import BriefTab from './tabs/BriefTab'
import CreativeTab from './tabs/CreativeTab'
import AdCopyTab from './tabs/AdCopyTab'
import LandingBriefTab from './tabs/LandingBriefTab'

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
}: {
  campaign: Campaign
  brand: Brand
  brands: Brand[]
  generatedContent: GeneratedContent[]
  campaignAssets: CampaignAsset[]
}) {
  const [tab, setTab] = useState('brief')
  const isFunnel = campaign.type === 'funnel'
  const tabs = isFunnel ? FUNNEL_TABS : [{ id: 'brief', label: 'Brief' }]

  const adCopyContent = generatedContent.filter(c => c.type === 'fb_ad')
  const landingContent = generatedContent.filter(c => c.type === 'landing_brief')

  return (
    <div>
      {/* Tab bar */}
      <div className="tabs flex gap-1 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab-btn text-sm px-4 py-2 rounded-btn border transition-all font-semibold ${tab === t.id ? 'active' : ''}`}
            style={tab === t.id
              ? { background: '#000', color: '#00ff97', borderColor: '#000' }
              : { borderColor: '#e0e0e0', color: '#666' }}>
            {t.label}
            {t.id === 'ad-copy' && adCopyContent.length > 0 && (
              <span className="ml-1.5 text-xs opacity-60">{adCopyContent.length}</span>
            )}
            {t.id === 'landing' && landingContent.length > 0 && (
              <span className="ml-1.5 text-xs opacity-60">&#10003;</span>
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
