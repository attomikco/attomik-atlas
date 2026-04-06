'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import CreativeBuilder from '@/components/creatives/CreativeBuilder'

export default function CreativesPage() {
  const searchParams = useSearchParams()
  const urlCampaignId = searchParams.get('campaign') || undefined
  const { activeBrandId, activeCampaignId, activeCampaign } = useBrand()
  // Campaign mode (context) takes priority over URL param
  const campaignId = activeCampaignId || urlCampaignId

  const [brands, setBrands] = useState<any[]>([])
  const [campaignBrief, setCampaignBrief] = useState('')
  const [preloadedCopy, setPreloadedCopy] = useState<{ headline?: string; primary_text?: string; description?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('brands').select('*').eq('status', 'active').order('name')
      .then(({ data }) => {
        setBrands(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!campaignId) { setCampaignBrief(''); setPreloadedCopy(null); return }
    const supabase = createClient()

    // Fetch campaign + latest fb_ad in parallel, then decide what to preload
    Promise.all([
      supabase.from('generated_content').select('*')
        .eq('campaign_id', campaignId).eq('type', 'fb_ad')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('campaigns').select('name, key_message, goal, offer, angle')
        .eq('id', campaignId).single(),
    ]).then(([{ data: content }, { data: campaign }]) => {
      // Build brief string
      if (campaign) {
        const parts: string[] = []
        if (campaign.goal) parts.push(`Goal: ${campaign.goal}`)
        if (campaign.offer) parts.push(`Offer: ${campaign.offer}`)
        if (campaign.angle) parts.push(`Angle: ${campaign.angle}`)
        if (campaign.key_message) parts.push(`Key message: ${campaign.key_message}`)
        setCampaignBrief(parts.length ? parts.join('. ') : (campaign.name || ''))
      }

      // Prefer prior AI-generated fb_ad copy
      if (content) {
        try {
          const parsed = JSON.parse(content.content)
          setPreloadedCopy(parsed.variations?.[0] || parsed)
          return
        } catch {}
      }

      // Fallback: derive copy from campaign brief fields so the creative
      // reflects the campaign even before any fb_ad has been generated
      if (campaign) {
        const headline = campaign.key_message || campaign.offer || campaign.name || ''
        const primary_text = campaign.angle || campaign.offer || campaign.goal || ''
        if (headline || primary_text) {
          setPreloadedCopy({ headline, primary_text })
        } else {
          setPreloadedCopy(null)
        }
      } else {
        setPreloadedCopy(null)
      }
    })
  }, [campaignId])

  // When activeCampaign in context changes, also seed campaignBrief
  useEffect(() => {
    if (!activeCampaign) return
    const parts: string[] = []
    if (activeCampaign.goal) parts.push(`Goal: ${activeCampaign.goal}`)
    if (activeCampaign.offer) parts.push(`Offer: ${activeCampaign.offer}`)
    if (activeCampaign.angle) parts.push(`Angle: ${activeCampaign.angle}`)
    if (activeCampaign.key_message) parts.push(`Key message: ${activeCampaign.key_message}`)
    if (parts.length) setCampaignBrief(parts.join('. '))
  }, [activeCampaign])

  if (loading) return null

  return (
    <div className="p-4 md:p-10 max-w-[1600px]">
      <CreativeBuilder
        brands={brands}
        defaultBrandId={activeBrandId || undefined}
        campaignId={campaignId}
        campaignBrief={campaignBrief}
        preloadedCopy={preloadedCopy}
      />
    </div>
  )
}
