'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import { colors, fontSize, spacing } from '@/lib/design-tokens'
import AuditClient from '@/components/audit/AuditClient'

// Query-scoped page — mirrors /store and /insights. The active brand comes
// from the `useBrand()` context, not a URL path segment. The audit API route
// still takes the brand id as a path segment (that's a server endpoint,
// path-scoped is standard REST).

type BrandSnapshot = {
  id: string
  name: string
  hasKlaviyoKey: boolean
}

export default function AuditPage() {
  const { activeBrandId, brandsLoaded } = useBrand()
  const [brand, setBrand] = useState<BrandSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBrandId) {
      setBrand(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase
        .from('brands')
        .select('id, name, notes')
        .eq('id', activeBrandId)
        .single()
      if (!data) {
        setBrand(null)
        setLoading(false)
        return
      }
      const notes = (() => {
        try { return data.notes ? JSON.parse(data.notes) : {} } catch { return {} }
      })()
      const hasKey = typeof notes?.klaviyo_api_key === 'string' && notes.klaviyo_api_key.trim().length > 0
      setBrand({ id: data.id, name: data.name, hasKlaviyoKey: hasKey })
      setLoading(false)
    })()
  }, [activeBrandId])

  if (!brandsLoaded || loading) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ color: colors.gray750, fontSize: fontSize.body }}>Loading…</div>
      </div>
    )
  }

  if (!activeBrandId || !brand) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ color: colors.gray750, fontSize: fontSize.body }}>Select a brand to run an audit.</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: spacing[8] }}>
        <div style={{
          fontSize: fontSize.caption,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: colors.muted,
          marginBottom: 6,
        }}>
          Retention Audit
        </div>
      </div>
      <AuditClient brandId={brand.id} brandName={brand.name} hasKlaviyoKey={brand.hasKlaviyoKey} />
    </div>
  )
}
