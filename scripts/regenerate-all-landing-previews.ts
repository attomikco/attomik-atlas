// Back-populate every generated_content landing_brief row with a
// renderPreview snapshot uploaded to Supabase Storage. Runs overwrite
// existing files + column values; idempotent because state is always
// computed from the current brief + brand (no diffing).
//
// Run:
//   node --experimental-strip-types --env-file=.env.local scripts/regenerate-all-landing-previews.ts
//
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// No AI calls — brief content is read from the existing row, never
// regenerated. Template + brand metadata are the only inputs.

import { createClient } from '@supabase/supabase-js'
import { renderPreview, type LandingBrief } from '../src/lib/landing-preview-renderer.ts'
import type { Brand, BrandImage, Product } from '../src/types/index.ts'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const BUCKET = 'landing-previews'

interface ContentRow {
  id: string
  brand_id: string
  content: string
}

async function main() {
  const { data: rows, error: selectErr } = await admin
    .from('generated_content')
    .select('id, brand_id, content')
    .eq('type', 'landing_brief')

  if (selectErr) {
    console.error('Fetch failed:', selectErr.message)
    process.exit(1)
  }

  const eligible = (rows ?? []) as ContentRow[]
  console.log(`Found ${eligible.length} landing_brief row(s).`)
  if (eligible.length === 0) return

  let successes = 0
  const failures: Array<{ row: string; brand: string; error: string }> = []

  for (const row of eligible) {
    const label = `${row.id} (brand ${row.brand_id})`
    try {
      const brief = JSON.parse(row.content) as LandingBrief

      const { data: brand, error: brandErr } = await admin
        .from('brands')
        .select('*')
        .eq('id', row.brand_id)
        .single()
      if (brandErr || !brand) throw new Error(`brand not found: ${brandErr?.message || 'missing'}`)

      const { data: images, error: imgErr } = await admin
        .from('brand_images')
        .select('*')
        .eq('brand_id', row.brand_id)
        .order('created_at')
      if (imgErr) throw new Error(`images fetch: ${imgErr.message}`)

      const html = renderPreview({
        brand: brand as Brand,
        brief,
        brandImages: (images || []) as BrandImage[],
        products: ((brand as Brand).products || []) as Product[],
        supabaseUrl: SUPABASE_URL!,
      })

      const path = `${row.brand_id}.html`
      const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, html, {
        upsert: true,
        contentType: 'text/html',
        cacheControl: '60',
      })
      if (uploadErr) throw new Error(`upload: ${uploadErr.message}`)

      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
      const url = pub.publicUrl

      const { error: updateErr } = await admin
        .from('generated_content')
        .update({ landing_preview_url: url })
        .eq('id', row.id)
      if (updateErr) throw new Error(`row update: ${updateErr.message}`)

      successes += 1
      console.log(`  ✓ ${label}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      failures.push({ row: row.id, brand: row.brand_id, error: msg })
      console.log(`  ✗ ${label}: ${msg}`)
    }
  }

  console.log('')
  console.log(`Summary: ${successes}/${eligible.length} regenerated, ${failures.length} failed.`)
  if (failures.length) {
    console.log('')
    console.log('Failures:')
    for (const f of failures) console.log(`  - row=${f.row} brand=${f.brand} error=${f.error}`)
    process.exit(1)
  }
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
