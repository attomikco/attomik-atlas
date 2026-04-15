'use client'
import { useEffect } from 'react'
import { useBrand } from '@/lib/brand-context'

// Reconciles the server-rendered brand with the context's activeBrandId
// and mirrors it into the `activeBrandId` cookie so the next no-param
// /dashboard render can resolve to the same brand on the first pass.
//
// The old version called router.replace('/dashboard?brand=<saved>') when
// context disagreed with the server, which re-fired every Supabase query
// in the dashboard. Now the server reads the cookie directly, so we can
// drop the redirect entirely: trust the server-rendered brand and sync
// context to match.
export default function BrandSync({
  brandId,
  paramExplicit,
}: {
  brandId: string
  paramExplicit: boolean
}) {
  const { activeBrandId, brandsLoaded, setActiveBrandId } = useBrand()

  useEffect(() => {
    // Mirror the server-rendered brand into a long-lived cookie. The
    // dashboard server component reads this cookie to resolve the right
    // brand on the next no-param load.
    if (typeof document !== 'undefined' && brandId) {
      document.cookie = `activeBrandId=${brandId}; path=/; max-age=31536000; SameSite=Lax`
    }

    if (paramExplicit) {
      // URL was authoritative — sync context to match.
      if (brandId && brandId !== activeBrandId) {
        setActiveBrandId(brandId)
      }
      return
    }

    // No URL param. Wait for context to finish resolving its brand from
    // localStorage. If it disagrees with the server-rendered brand, trust
    // the server (which read from the cookie) and sync context — no
    // redirect, so we don't double-render all the dashboard queries.
    if (!brandsLoaded || !activeBrandId) return
    if (activeBrandId !== brandId) {
      setActiveBrandId(brandId)
    }
  }, [brandId, paramExplicit, activeBrandId, brandsLoaded, setActiveBrandId])

  return null
}
