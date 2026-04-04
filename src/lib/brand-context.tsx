'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type BrandContextType = {
  activeBrandId: string | null
  setActiveBrandId: (id: string) => void
  isSwitching: boolean
  brands: any[]
  brandsLoaded: boolean
}

const BrandContext = createContext<BrandContextType>({
  activeBrandId: null,
  setActiveBrandId: () => {},
  isSwitching: false,
  brands: [],
  brandsLoaded: false,
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  // Hydration-safe: start null, sync from localStorage in useEffect
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [brands, setBrands] = useState<any[]>([])
  const [brandsLoaded, setBrandsLoaded] = useState(false)

  // Read localStorage + fetch brands once on mount
  useEffect(() => {
    const saved = localStorage.getItem('attomik_active_brand_id')
    if (saved) setActiveBrandIdState(saved)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) { setBrandsLoaded(true); return }
      supabase.from('brands')
        .select('id, name, primary_color, logo_url')
        .eq('status', 'active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data?.length) {
            setBrands(data)
            if (!saved) {
              setActiveBrandIdState(data[0].id)
              localStorage.setItem('attomik_active_brand_id', data[0].id)
            }
          }
          setBrandsLoaded(true)
        })
    })
  }, [])

  const setActiveBrandId = (id: string) => {
    if (id === activeBrandId) return
    setIsSwitching(true)
    setActiveBrandIdState(id)
    localStorage.setItem('attomik_active_brand_id', id)
    setTimeout(() => setIsSwitching(false), 600)
  }

  return (
    <BrandContext.Provider value={{ activeBrandId, setActiveBrandId, isSwitching, brands, brandsLoaded }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrand = () => useContext(BrandContext)
