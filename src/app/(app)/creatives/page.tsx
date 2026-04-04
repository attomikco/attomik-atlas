'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import CreativeBuilder from '@/components/creatives/CreativeBuilder'

export default function CreativesPage() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaign') || undefined
  const brandParam = searchParams.get('brand')
  const { activeBrandId, setActiveBrandId } = useBrand()

  // URL brand param overrides context (e.g. navigating from preview)
  useEffect(() => {
    if (brandParam && brandParam !== activeBrandId) {
      setActiveBrandId(brandParam)
    }
  }, [brandParam])

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

    supabase.from('generated_content').select('*')
      .eq('campaign_id', campaignId).eq('type', 'fb_ad')
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data: content }) => {
        if (content) {
          try {
            const parsed = JSON.parse(content.content)
            setPreloadedCopy(parsed.variations?.[0] || parsed)
          } catch { setPreloadedCopy(null) }
        }
      })

    supabase.from('campaigns').select('name, key_message, goal')
      .eq('id', campaignId).single()
      .then(({ data: campaign }) => {
        setCampaignBrief(campaign?.key_message || campaign?.name || '')
      })
  }, [campaignId])

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
