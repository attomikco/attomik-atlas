// One-off migration: move frozen landing-preview HTML from the
// generated_content.generated_html TEXT column into the landing-previews
// Supabase Storage bucket at {brand_id}.html. After running, the
// generated_content row carries a landing_preview_url pointing at the
// public Storage URL; the generated_html column is left intact for one
// safety window and will be dropped in a later migration.
//
// Idempotent: only rows with generated_html IS NOT NULL AND
// landing_preview_url IS NULL are processed. Running twice no-ops on
// already-migrated rows.
//
// Run:
//   node --experimental-strip-types --env-file=.env.local scripts/migrate-generated-html-to-storage.ts
//
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const BUCKET = 'landing-previews'

interface Row {
  id: string
  brand_id: string
  generated_html: string
}

async function main() {
  const { data: rows, error: selectErr } = await admin
    .from('generated_content')
    .select('id, brand_id, generated_html')
    .eq('type', 'landing_brief')
    .is('landing_preview_url', null)
    .not('generated_html', 'is', null)

  if (selectErr) {
    console.error('Row fetch failed:', selectErr.message)
    process.exit(1)
  }

  const eligible = (rows ?? []) as Row[]
  console.log(`Found ${eligible.length} row(s) to migrate.`)
  if (eligible.length === 0) {
    console.log('Nothing to do. Exiting.')
    return
  }

  let successes = 0
  const failures: Array<{ row: string; brand: string; error: string }> = []

  for (const row of eligible) {
    const path = `${row.brand_id}.html`
    try {
      const { error: uploadErr } = await admin.storage.from(BUCKET).upload(path, row.generated_html, {
        upsert: true,
        contentType: 'text/html',
        cacheControl: '60',
      })
      if (uploadErr) throw uploadErr

      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
      const url = pub.publicUrl

      const { error: updateErr } = await admin
        .from('generated_content')
        .update({ landing_preview_url: url })
        .eq('id', row.id)
      if (updateErr) throw updateErr

      successes += 1
      console.log(`  ✓ ${row.id} → ${path}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      failures.push({ row: row.id, brand: row.brand_id, error: msg })
      console.log(`  ✗ ${row.id} (brand ${row.brand_id}): ${msg}`)
    }
  }

  console.log('')
  console.log(`Summary: ${successes}/${eligible.length} migrated, ${failures.length} failed.`)
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
