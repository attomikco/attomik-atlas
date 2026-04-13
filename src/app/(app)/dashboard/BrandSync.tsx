'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBrand } from '@/lib/brand-context'

// Reconciles the server-rendered brand with the context's activeBrandId.
//
// Two paths:
//
//   1. paramExplicit = true  — the URL had `?brand=X`. The server already
//      rendered using X, so X is the source of truth. Sync context to match
//      so the TopNav and the dashboard agree.
//
//   2. paramExplicit = false — the URL had no param. The server fell back to
//      `brands[0]` (the most recent brand). Don't trust that — the user has
//      a saved brand in localStorage. Wait for BrandProvider to resolve, then
//      if its activeBrandId disagrees with the server's fallback, redirect
//      to `/dashboard?brand=<saved>` so the server re-renders with the right
//      brand. This is what fixes the "every reload teleports me" bug.
//
// Important: the OLD version of this component called setActiveBrandId(brandId)
// unconditionally, which overrode the user's saved brand on every reload of
// /dashboard. That's the bug we're fixing.
export default function BrandSync({
  brandId,
  paramExplicit,
}: {
  brandId: string
  paramExplicit: boolean
}) {
  const router = useRouter()
  const { activeBrandId, brandsLoaded, setActiveBrandId } = useBrand()

  useEffect(() => {
    if (paramExplicit) {
      // URL was authoritative — sync context to match.
      if (brandId && brandId !== activeBrandId) {
        setActiveBrandId(brandId)
      }
      return
    }

    // No URL param. Wait for context to finish resolving its brand from
    // localStorage / first-brand-fallback. If activeBrandId is null after
    // load, the user has zero brands; nothing to do.
    if (!brandsLoaded || !activeBrandId) return

    // If the server-rendered brand doesn't match the user's saved brand,
    // navigate to put it back. router.replace() avoids polluting the back
    // stack with the wrong-brand intermediate state.
    if (activeBrandId !== brandId) {
      router.replace(`/dashboard?brand=${activeBrandId}`)
    }
  }, [brandId, paramExplicit, activeBrandId, brandsLoaded, router, setActiveBrandId])

  return null
}
