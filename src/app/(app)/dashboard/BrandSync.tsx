'use client'
import { useEffect } from 'react'
import { useBrand } from '@/lib/brand-context'

export default function BrandSync({ brandId }: { brandId: string }) {
  const { setActiveBrandId } = useBrand()
  useEffect(() => { setActiveBrandId(brandId) }, [brandId])
  return null
}
