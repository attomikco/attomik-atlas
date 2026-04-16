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
      // Run getUser and the brands list in parallel. getUser() usually
      // resolves from the local JWT, but the brands select is a real
      // round-trip — overlapping them shaves the common load path down
      // to a single network leg.
      //
      // RLS now filters brands through brand_members (see
      // 20260413_brand_teams_fix.sql). Filtering by user_id here would
      // miss brands the user was invited to, so we let RLS do the work.
      const [{ data: { user } }, { data: brandsData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('brands')
          .select('id, name, primary_color, logo_url')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
      ])
      if (!user?.id) { setBrandsLoaded(true); return }
      const data = brandsData
      if (data?.length) {
        setBrands(data)
        const validSaved = saved && data.find(b => b.id === saved)
        const resolvedId = validSaved ? saved : data[0].id
        setActiveBrandIdState(resolvedId)
        localStorage.setItem('attomik_active_brand_id', resolvedId)
        // Sync the URL's ?brand= param with the resolved brand so subsequent
        // reloads stay on this brand. Mirrors the same write that
        // setActiveBrandId does on user-initiated switches. See that callback
        // for the rationale.
        try {
          const url = new URL(window.location.href)
          if (url.searchParams.get('brand') !== resolvedId) {
            url.searchParams.set('brand', resolvedId)
            window.history.replaceState(null, '', url.toString())
          }
        } catch {}

        // Restore active campaign only if it belongs to the resolved brand.
        // Single fetch: pull the full row up front and validate brand_id
        // in memory. The previous code did two sequential round trips —
        // one to check brand_id, another to hydrate the rest of the row.
        if (savedCampaignId) {
          const { data: campaign, error } = await supabase
            .from('campaigns')
            .select('id, name, goal, offer, key_message, angle, type, status, brand_id, scheduled_at')
            .eq('id', savedCampaignId)
            .maybeSingle()
          if (campaign && campaign.brand_id === resolvedId) {
            setActiveCampaignIdState(savedCampaignId)
            setActiveCampaign(campaign as ActiveCampaign)
          } else if (campaign) {
            // Belongs to a different brand — drop it.
            localStorage.removeItem('attomik_active_campaign_id')
          } else {
            // Not found / deleted / no access — clear stale state.
            localStorage.removeItem('attomik_active_campaign_id')
            if (error) console.warn('[brand-context] Active campaign no longer accessible, cleared:', savedCampaignId, error.message)
          }
        }
      } else if (saved) {
        setActiveBrandIdState(null)
        localStorage.removeItem('attomik_active_brand_id')
        localStorage.removeItem('attomik_active_campaign_id')
      }
      setBrandsLoaded(true)
    }
    load()
  }, [fetchCampaign])

  const setActiveBrandId = useCallback((id: string) => {
    setActiveBrandIdState(prev => {
      if (prev === id) return prev
      localStorage.setItem('attomik_active_brand_id', id)
      return id
    })
    // URL is owned by Next's router (see TopNav.switchBrand). We used to
    // call history.replaceState here to keep ?brand= synced, but it raced
    // router.push and silently killed navigation diffs — the dashboard
    // server component would skip re-rendering because Next saw the new
    // URL already applied.
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
    // RLS filters by brand_members — see load() above.
    const { data } = await supabase.from('brands')
      .select('id, name, primary_color, logo_url')
      .eq('status', 'active')
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
