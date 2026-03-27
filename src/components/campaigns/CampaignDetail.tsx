'use client'
import { useState, useEffect } from 'react'
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
  const [generating, setGenerating] = useState(false)
  const isFunnel = campaign.type === 'funnel'
  const tabs = isFunnel ? FUNNEL_TABS : [{ id: 'brief', label: 'Brief' }]

  const adCopyContent = generatedContent.filter(c => c.type === 'fb_ad')
  const landingContent = generatedContent.filter(c => c.type === 'landing_brief')

  // Auto-generate on mount for new funnel campaigns
  useEffect(() => {
    if (!autoGenerate || !isFunnel) return
    setTab('ad-copy')
    setGenerating(true)

    Promise.all([
      fetch(`/api/campaigns/${campaign.id}/ad-copy`, { method: 'POST' }).catch(() => null),
      fetch(`/api/campaigns/${campaign.id}/landing-brief`, { method: 'POST' }).catch(() => null),
    ]).finally(() => {
      setGenerating(false)
    })
  }, [])

  return (
    <div>
      {/* Generating banner */}
      {generating && (
        <div className="bg-ink text-white rounded-card p-4 mb-4 flex items-center gap-3">
          <span style={{ color: '#00ff97' }}>✦</span>
          <span className="font-semibold">Generating your full funnel</span>
          <span className="flex gap-1 ml-1">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ff97', animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ff97', animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00ff97', animationDelay: '0.4s' }} />
          </span>
        </div>
      )}

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
