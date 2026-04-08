'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import CreativeBuilder from '@/components/creatives/CreativeBuilder'

export default function CreativesPage() {
  const searchParams = useSearchParams()
  const urlCampaignId = searchParams.get('campaign') || undefined
  const { activeBrandId, activeCampaignId, activeCampaign, brandsLoaded } = useBrand()
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

      // Fallback: build usable creative copy from campaign brief fields
      if (campaign) {
        // Headline: key_message is the hook, best for headline. Offer next.
        const headline = campaign.key_message || campaign.offer || campaign.name || ''

        // Body: combine angle + offer into a real sentence, not raw field values
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

        // CTA: derive from goal type
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

        if (headline || primary_text) {
          setPreloadedCopy({ headline, primary_text, description })
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

  if (loading || !brandsLoaded) return null

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
