'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ActiveCampaign {
  id: string
  name: string
  goal: string | null
  offer: string | null
  key_message: string | null
  angle: string | null
  type: string | null
  status: string | null
  brand_id: string
  scheduled_at: string | null
}

type BrandContextType = {
  activeBrandId: string | null
  setActiveBrandId: (id: string) => void
  isSwitching: boolean
  brands: any[]
  brandsLoaded: boolean
  refreshBrands: () => Promise<void>
  // Campaign mode
  activeCampaignId: string | null
  activeCampaign: ActiveCampaign | null
  setActiveCampaignId: (id: string | null) => void
  exitCampaignMode: () => void
}

const BrandContext = createContext<BrandContextType>({
  activeBrandId: null,
  setActiveBrandId: () => {},
  isSwitching: false,
  brands: [],
  brandsLoaded: false,
  refreshBrands: async () => {},
  activeCampaignId: null,
  activeCampaign: null,
  setActiveCampaignId: () => {},
  exitCampaignMode: () => {},
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [brands, setBrands] = useState<any[]>([])
  const [brandsLoaded, setBrandsLoaded] = useState(false)
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(null)
  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign | null>(null)

  const fetchCampaign = useCallback(async (id: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, goal, offer, key_message, angle, type, status, brand_id, scheduled_at')
      .eq('id', id)
      .maybeSingle()
    if (data) {
      setActiveCampaign(data as ActiveCampaign)
    } else {
      // Campaign not found / deleted / no access — clear stale state
      setActiveCampaign(null)
      setActiveCampaignIdState(null)
      localStorage.removeItem('attomik_active_campaign_id')
      if (error) console.warn('[brand-context] Active campaign no longer accessible, cleared:', id, error.message)
    }
  }, [])

  // Single load on mount: check URL param first, then localStorage, then first brand
  useEffect(() => {
    // URL param takes priority over localStorage
    const urlParams = new URLSearchParams(window.location.search)
    const urlBrandId = urlParams.get('brand')
    const saved = urlBrandId || localStorage.getItem('attomik_active_brand_id')
    const savedCampaignId = localStorage.getItem('attomik_active_campaign_id')

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) { setBrandsLoaded(true); return }
      const { data } = await supabase.from('brands')
        .select('id, name, primary_color, logo_url')
        .eq('status', 'active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data?.length) {
        setBrands(data)
        const validSaved = saved && data.find(b => b.id === saved)
        const resolvedId = validSaved ? saved : data[0].id
        setActiveBrandIdState(resolvedId)
        localStorage.setItem('attomik_active_brand_id', resolvedId)
      } else if (saved) {
        setActiveBrandIdState(null)
        localStorage.removeItem('attomik_active_brand_id')
      }
      setBrandsLoaded(true)
    }
    load()

    // Restore active campaign if present
    if (savedCampaignId) {
      setActiveCampaignIdState(savedCampaignId)
      fetchCampaign(savedCampaignId)
    }
  }, [fetchCampaign])

  const setActiveBrandId = useCallback((id: string) => {
    setActiveBrandIdState(prev => {
      if (prev === id) return prev
      localStorage.setItem('attomik_active_brand_id', id)
      return id
    })
    // Clear active campaign if it belongs to a different brand
    setActiveCampaign(prevCampaign => {
      if (prevCampaign && prevCampaign.brand_id !== id) {
        setActiveCampaignIdState(null)
        localStorage.removeItem('attomik_active_campaign_id')
        return null
      }
      return prevCampaign
    })
    setIsSwitching(true)
    setTimeout(() => setIsSwitching(false), 500)
  }, [])

  const refreshBrands = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return
    const { data } = await supabase.from('brands')
      .select('id, name, primary_color, logo_url')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setBrands(data)
  }, [])

  const setActiveCampaignId = useCallback((id: string | null) => {
    setActiveCampaignIdState(id)
    if (id) {
      localStorage.setItem('attomik_active_campaign_id', id)
      fetchCampaign(id)
    } else {
      localStorage.removeItem('attomik_active_campaign_id')
      setActiveCampaign(null)
    }
  }, [fetchCampaign])

  const exitCampaignMode = useCallback(() => {
    setActiveCampaignIdState(null)
    setActiveCampaign(null)
    localStorage.removeItem('attomik_active_campaign_id')
  }, [])

  return (
    <BrandContext.Provider value={{
      activeBrandId, setActiveBrandId, isSwitching, brands, brandsLoaded, refreshBrands,
      activeCampaignId, activeCampaign, setActiveCampaignId, exitCampaignMode,
    }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrand = () => useContext(BrandContext)
