'use client'
import { useState, useEffect } from 'react'
import { Brand, Campaign, GeneratedContent, CampaignAsset } from '@/types'
import BriefTab from './tabs/BriefTab'
import CreativeTab from './tabs/CreativeTab'
import AdCopyTab from './tabs/AdCopyTab'
import LandingBriefTab from './tabs/LandingBriefTab'
import FunnelPreview from './FunnelPreview'
import GenerationModal, { ModalStep } from '@/components/ui/GenerationModal'

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
  const [showModal, setShowModal] = useState(!!autoGenerate)
  const [freshAdVariation, setFreshAdVariation] = useState<{ primary_text: string; headline: string; description: string } | null>(null)
  const [freshLandingBrief, setFreshLandingBrief] = useState<any>(null)
  const [modalSteps, setModalSteps] = useState<ModalStep[]>([
    { id: 'ad-copy', label: 'Ad copy', status: 'pending' },
    { id: 'landing', label: 'Landing page brief', status: 'pending' },
    { id: 'creative', label: 'Creative', status: 'pending' },
  ])
  const isFunnel = campaign.type === 'funnel'
  const tabs = isFunnel ? FUNNEL_TABS : [{ id: 'brief', label: 'Brief' }]

  const adCopyContent = generatedContent.filter(c => c.type === 'fb_ad')
  const landingContent = generatedContent.filter(c => c.type === 'landing_brief')

  function updateStep(id: string, status: ModalStep['status']) {
    setModalSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  // Auto-generate on mount for new funnel campaigns
  useEffect(() => {
    if (!autoGenerate || !isFunnel) return

    // Start ad copy first
    updateStep('ad-copy', 'loading')
    fetch(`/api/campaigns/${campaign.id}/ad-copy`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log('[AutoGenerate] Ad copy response:', data)
        if (data?.variations?.[0]) {
          setFreshAdVariation(data.variations[0])
          updateStep('ad-copy', 'done')
        } else {
          updateStep('ad-copy', 'error')
        }
      })
      .catch(() => updateStep('ad-copy', 'error'))

    // Start landing brief — stagger visual by 2s but fire in parallel
    const landingPromise = fetch(`/api/campaigns/${campaign.id}/landing-brief`, { method: 'POST' })
    setTimeout(() => updateStep('landing', 'loading'), 2000)
    landingPromise
      .then(res => res.json())
      .then(data => {
        console.log('[AutoGenerate] Landing brief response:', data)
        if (data?.hero) {
          setFreshLandingBrief(data)
          updateStep('landing', 'done')
        } else {
          updateStep('landing', 'error')
        }
      })
      .catch(() => updateStep('landing', 'error'))
  }, [])

  // Mark creative as done once both others finish
  useEffect(() => {
    const adDone = modalSteps.find(s => s.id === 'ad-copy')?.status === 'done'
    const landDone = modalSteps.find(s => s.id === 'landing')?.status === 'done'
    const creativePending = modalSteps.find(s => s.id === 'creative')?.status !== 'done'
    if (adDone && landDone && creativePending) {
      updateStep('creative', 'loading')
      setTimeout(() => updateStep('creative', 'done'), 1500)
    }
  }, [modalSteps])

  if (showPreview && isFunnel) {
    return (
      <>
        <GenerationModal
          isOpen={showModal}
          steps={modalSteps}
          brandName={brand.name}
          onClose={() => setShowModal(false)}
        />
        <FunnelPreview
          adVariation={freshAdVariation}
          landingBrief={freshLandingBrief}
          brand={brand}
          onDismiss={() => { setShowPreview(false); setTab('ad-copy') }}
        />
      </>
    )
  }

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
