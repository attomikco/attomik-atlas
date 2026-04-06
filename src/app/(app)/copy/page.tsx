'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import CopyCreatorClient from './CopyCreatorClient'

export default function CopyPage() {
  const searchParams = useSearchParams()
  const urlCampaignParam = searchParams.get('campaign') || ''
  const { activeBrandId, activeCampaignId } = useBrand()
  // Campaign mode overrides URL param
  const campaignParam = activeCampaignId || urlCampaignParam

  const [brands, setBrands] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [initialVariations, setInitialVariations] = useState<any[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [brandAudience, setBrandAudience] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [brandProducts, setBrandProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBrandId) return
    setLoading(true)
    const supabase = createClient()

    Promise.all([
      supabase.from('brands').select('*').eq('status', 'active').order('name'),
      supabase.from('campaigns').select('*, brand:brands(name, primary_color)')
        .eq('brand_id', activeBrandId).order('created_at', { ascending: false }),
      supabase.from('brands').select('target_audience, brand_voice, products').eq('id', activeBrandId).single(),
    ]).then(async ([brandsRes, campaignsRes, brandDataRes]) => {
      const b = brandsRes.data ?? []
      const c = campaignsRes.data ?? []
      setBrands(b)
      setCampaigns(c)
      setBrandAudience(brandDataRes.data?.target_audience || '')
      setBrandVoice(brandDataRes.data?.brand_voice || '')
      setBrandProducts(Array.isArray(brandDataRes.data?.products) ? brandDataRes.data.products : [])

      const cid = campaignParam || c[0]?.id || ''
      const selected = c.find((x: any) => x.id === cid) || null
      setSelectedCampaign(selected)

      if (cid) {
        const { data: content } = await supabase.from('generated_content').select('*')
          .eq('campaign_id', cid).eq('type', 'fb_ad').order('created_at', { ascending: false })
        const vars: any[] = []
        content?.forEach((row: any) => {
          try {
            const parsed = JSON.parse(row.content)
            if (parsed.variations) {
              vars.push(...parsed.variations.map((v: any) => ({ ...v, id: row.id, created_at: row.created_at })))
            } else {
              vars.push({ ...parsed, id: row.id, created_at: row.created_at })
            }
          } catch {}
        })
        setInitialVariations(vars)
      } else {
        setInitialVariations([])
      }

      setLoading(false)
    })
  }, [activeBrandId])

  if (loading) return null

  return (
    <CopyCreatorClient
      brands={brands}
      campaigns={campaigns}
      initialCampaignId={campaignParam || campaigns[0]?.id || ''}
      initialVariations={initialVariations}
      selectedCampaign={selectedCampaign}
      brandAudience={brandAudience}
      brandVoice={brandVoice}
      brandProducts={brandProducts}
    />
  )
}
