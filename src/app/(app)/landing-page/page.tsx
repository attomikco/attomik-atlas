'use client'
// PHASE 1 SMOKE TEST — replaced in Phase 2 with the real block builder shell.
//
// Purpose: verify the Phase 1 plumbing works end to end.
//   1. useBrand() → activeBrandId
//   2. GET /api/landing-pages?brand_id=<id> → latest row for brand
//   3. If no row, look up latest generated_content row (type='landing_brief'),
//      run briefToBlocks() against it + the brand, POST a new landing_pages
//      row, refetch.
//   4. Dump the resulting { blocks, pageSettings } as pre-formatted JSON.
//
// Intentionally minimal UI — design tokens only, no visual polish. The real
// builder replaces this file entirely in Phase 2.

import { useEffect, useState } from 'react'
import { useBrand } from '@/lib/brand-context'
import { createClient } from '@/lib/supabase/client'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import { briefToBlocks } from '@/components/landing-page/lib/briefToBlocks'
import type { Block, LandingBrief, LandingPageDocument, PageSettings } from '@/components/landing-page/types'
import type { Brand, LandingPage } from '@/types'

type Status = 'idle' | 'loading' | 'adapting' | 'ready' | 'error'

export default function LandingPageSmokeTest() {
  const { activeBrandId, brandsLoaded } = useBrand()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<LandingPageDocument | null>(null)
  const [source, setSource] = useState<'landing_pages' | 'adapted_from_brief' | 'default' | null>(null)

  useEffect(() => {
    if (!brandsLoaded || !activeBrandId) return
    let cancelled = false
    const supabase = createClient()

    async function run() {
      setStatus('loading')
      setError(null)

      try {
        // Step 1 — existing landing_pages row?
        const listRes = await fetch(`/api/landing-pages?brand_id=${activeBrandId}`)
        if (!listRes.ok) throw new Error(`list failed: HTTP ${listRes.status}`)
        const listJson = (await listRes.json()) as { pages?: LandingPage[] }

        if (listJson.pages && listJson.pages.length > 0) {
          if (cancelled) return
          const doc = listJson.pages[0].content as LandingPageDocument
          setDocument(doc)
          setSource('landing_pages')
          setStatus('ready')
          return
        }

        // Step 2 — no landing_pages row; look for a legacy brief and adapt.
        const { data: brand } = await supabase
          .from('brands')
          .select('*')
          .eq('id', activeBrandId)
          .single()
        if (!brand) throw new Error('brand not found')

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
          try {
            brief = JSON.parse(briefRow.content) as LandingBrief
          } catch {
            // malformed brief row — fall through to minimal default
            brief = null
          }
        }

        if (cancelled) return
        setStatus('adapting')

        const { blocks, pageSettings } = briefToBlocks(brief, brand as Brand)
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

        if (cancelled) return
        setDocument(doc)
        setSource(brief ? 'adapted_from_brief' : 'default')
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

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.cream,
      padding: spacing[6],
      fontFamily: font.mono,
      fontSize: fontSize.caption,
      color: colors.ink,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          fontFamily: font.heading,
          fontWeight: fontWeight.heading,
          fontSize: fontSize['2xl'],
          textTransform: 'uppercase',
          marginBottom: spacing[2],
        }}>
          Phase 1 Smoke Test
        </div>
        <div style={{ color: colors.muted, marginBottom: spacing[6] }}>
          Verifies briefToBlocks + /api/landing-pages plumbing. Replaced in Phase 2.
        </div>

        <div style={{
          background: colors.paper,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing[4],
          marginBottom: spacing[4],
          display: 'flex',
          gap: spacing[4],
          flexWrap: 'wrap',
        }}>
          <Pill label="brand" value={activeBrandId || '—'} />
          <Pill label="status" value={status} />
          <Pill label="source" value={source || '—'} />
          {document && <Pill label="blocks" value={String(document.blocks.length)} />}
          {document && <Pill label="version" value={String(document.version)} />}
        </div>

        {status === 'error' && (
          <div style={{
            background: colors.paper,
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors.accent}`,
            borderRadius: radius.md,
            padding: spacing[4],
            marginBottom: spacing[4],
            color: colors.ink,
          }}>
            <div style={{ fontWeight: fontWeight.bold, marginBottom: spacing[1] }}>Error</div>
            <div>{error}</div>
          </div>
        )}

        {document && (
          <pre style={{
            background: colors.paper,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: spacing[4],
            overflow: 'auto',
            fontFamily: font.mono,
            fontSize: fontSize.caption,
            lineHeight: 1.6,
            color: colors.ink,
            margin: 0,
          }}>
{JSON.stringify(document, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
      <span style={{
        fontFamily: font.mono,
        fontSize: fontSize.caption,
        color: colors.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>{label}</span>
      <span style={{
        background: colors.cream,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.pill,
        padding: `2px ${spacing[2]}px`,
        fontFamily: font.mono,
        fontSize: fontSize.caption,
        color: colors.ink,
      }}>{value}</span>
    </div>
  )
}
