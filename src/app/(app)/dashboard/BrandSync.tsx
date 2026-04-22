'use client'
import { useEffect, useRef } from 'react'
import { useBrand } from '@/lib/brand-context'

// Reconciles the server-rendered brand with the context's activeBrandId
// and mirrors it into the `activeBrandId` cookie so the next no-param
// /dashboard render can resolve to the same brand on the first pass.
//
// Only reacts to prop / brandsLoaded changes — never to `activeBrandId`.
// During the soft-navigation window after a user-initiated brand switch,
// context jumps to the new brand before the server re-renders, so the
// `brandId` prop is still the OLD server value. Reacting to the context
// change here would write that stale prop back into context (and into
// the cookie), flipping the brand back to its previous value, flashing
// the TopNav dropdown, and re-triggering the 500ms "switching" bar.
export default function BrandSync({
  brandId,
  paramExplicit,
}: {
  brandId: string
  paramExplicit: boolean
}) {
  const { activeBrandId, brandsLoaded, setActiveBrandId } = useBrand()
  const activeBrandIdRef = useRef(activeBrandId)
  activeBrandIdRef.current = activeBrandId

  useEffect(() => {
    if (typeof document !== 'undefined' && brandId) {
      document.cookie = `activeBrandId=${brandId}; path=/; max-age=31536000; SameSite=Lax`
    }

    if (paramExplicit) {
      if (brandId && brandId !== activeBrandIdRef.current) {
        setActiveBrandId(brandId)
      }
      return
    }

    if (!brandsLoaded || !activeBrandIdRef.current) return
    if (activeBrandIdRef.current !== brandId) {
      setActiveBrandId(brandId)
    }
  }, [brandId, paramExplicit, brandsLoaded, setActiveBrandId])

  return null
}
