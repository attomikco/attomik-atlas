'use client'
import { useEffect } from 'react'
import { useBrand } from '@/lib/brand-context'

// Only syncs context when dashboard renders with an explicit ?brand= param
// This handles: user switches brand via TopNav dropdown → navigates to /dashboard?brand=X
// Does NOT override context when navigating to /dashboard without params
export default function BrandSync({ brandId }: { brandId: string }) {
  const { activeBrandId, setActiveBrandId } = useBrand()
  useEffect(() => {
    // Only sync if the dashboard's resolved brand differs from context
    // This happens when ?brand= param was explicitly set (e.g. from TopNav switch)
    if (brandId && brandId !== activeBrandId) {
      setActiveBrandId(brandId)
    }
  }, [brandId])
  return null
}
