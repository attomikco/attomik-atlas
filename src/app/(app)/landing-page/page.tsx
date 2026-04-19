'use client'
// Phase 2 wrapper. Client component because the active brand comes from
// useBrand() (localStorage-backed context) — there's no server equivalent
// in this app.
//
// Flow:
//   1. Wait for brandsLoaded + activeBrandId.
//   2. GET /api/landing-pages?brand_id=<id>. If a row exists → render builder.
//   3. Otherwise fetch the brand + latest landing_brief (if any), run
//      briefToBlocks, POST a new landing_pages row, render builder.
//   4. Show a thin loading surface during the roundtrip.

import { useEffect, useState } from 'react'
import { useBrand } from '@/lib/brand-context'
import { createClient } from '@/lib/supabase/client'
import { colors, font, fontSize, spacing } from '@/lib/design-tokens'
import { briefToBlocks } from '@/components/landing-page/lib/briefToBlocks'
import {
  EMPTY_IMAGE_BUNDLE,
  resolveBrandImageBundle,
  type BrandImageBundle,
} from '@/components/landing-page/lib/brandImageBundle'
import BuilderClient from '@/components/landing-page/BuilderClient'
import type { LandingBrief, LandingPageDocument } from '@/components/landing-page/types'
import type { Brand, BrandImage, LandingPage } from '@/types'

type Status = 'idle' | 'loading' | 'ready' | 'error'

export default function LandingPageRoute() {
  const { activeBrandId, brandsLoaded } = useBrand()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<LandingPage | null>(null)
  // Brand fetched unconditionally on page load so BuilderClient can run
  // regeneratePage without re-fetching. Stale-brand concern on the next
  // edit is the same tradeoff every other (app) page makes — acceptable.
  const [brand, setBrand] = useState<Brand | null>(null)
  const [brandImages, setBrandImages] = useState<BrandImageBundle>(EMPTY_IMAGE_BUNDLE)

  useEffect(() => {
    if (!brandsLoaded || !activeBrandId) return
    let cancelled = false
    const supabase = createClient()

    async function run() {
      setStatus('loading')
      setError(null)

      try {
        // Brand + images + landing-pages lookup in parallel. Images are
        // rendered as defaults on hero/solution/product/gallery blocks —
        // see resolveBrandImageBundle for the per-slot picking rules.
        const [brandRes, imagesRes, listRes] = await Promise.all([
          supabase.from('brands').select('*').eq('id', activeBrandId).single(),
          supabase.from('brand_images').select('*').eq('brand_id', activeBrandId).order('created_at'),
          fetch(`/api/landing-pages?brand_id=${activeBrandId}`),
        ])
        if (brandRes.error || !brandRes.data) throw new Error('brand not found')
        if (!listRes.ok) throw new Error(`list failed: HTTP ${listRes.status}`)
        const brandRow = brandRes.data as Brand
        const imageRows = (imagesRes.data || []) as BrandImage[]
        const toUrl = (img: BrandImage) => {
          const cleanPath = img.storage_path.replace(/^brand-images\//, '')
          return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
        }
        const bundle = resolveBrandImageBundle(imageRows, brandRow, toUrl)
        const listJson = (await listRes.json()) as { pages?: LandingPage[] }

        if (listJson.pages && listJson.pages.length > 0) {
          if (cancelled) return
          setBrand(brandRow)
          setBrandImages(bundle)
          setPage(listJson.pages[0])
          setStatus('ready')
          return
        }

        // No row — look up legacy brief + adapt + create.
        const { data: briefRow } = await supabase
          .from('generated_content')
          .select('content')
          .eq('brand_id', activeBrandId)
          .eq('type', 'landing_brief')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let brief: LandingBrief | null = null
        if (briefRow?.content) {
          try { brief = JSON.parse(briefRow.content) as LandingBrief }
          catch { brief = null }
        }

        const { blocks, pageSettings } = briefToBlocks(brief, brandRow)
        const doc: LandingPageDocument = { blocks, pageSettings, version: 1 }

        const createRes = await fetch('/api/landing-pages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand_id: activeBrandId,
            name: pageSettings.title,
            slug: pageSettings.slug,
            meta: pageSettings.meta,
            content: doc,
          }),
        })
        if (!createRes.ok) {
          const errBody = await createRes.json().catch(() => ({ error: `HTTP ${createRes.status}` }))
          throw new Error(`create failed: ${errBody.error}`)
        }
        const created = (await createRes.json()) as { page?: LandingPage }
        if (!created.page) throw new Error('create returned no row')

        if (cancelled) return
        setBrand(brandRow)
        setBrandImages(bundle)
        setPage(created.page)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    }

    run()
    return () => { cancelled = true }
  }, [activeBrandId, brandsLoaded])

  if (status === 'ready' && page && brand && activeBrandId) {
    return (
      <BuilderClient
        brandId={activeBrandId}
        brand={brand}
        brandImages={brandImages}
        initialLandingPage={page}
      />
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: colors.cream, fontFamily: font.mono, fontSize: fontSize.caption, color: colors.ink,
    }}>
      <div style={{
        background: colors.paper, padding: spacing[5],
        border: `1px solid ${colors.border}`, borderRadius: 8, maxWidth: 480,
      }}>
        {status === 'error' ? (
          <>
            <div style={{ fontWeight: 700, marginBottom: spacing[2] }}>Couldn&rsquo;t load landing page</div>
            <div style={{ color: colors.muted }}>{error}</div>
          </>
        ) : (
          <div style={{ color: colors.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Loading landing page…
          </div>
        )}
      </div>
    </div>
  )
}
