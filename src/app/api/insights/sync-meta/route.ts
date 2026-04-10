import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const META_API_VERSION = 'v19.0'
const BATCH_SIZE = 50

// Helper to extract image URL from creative object
function extractImageUrl(c: any): string {
  const url = c.thumbnail_url ||
    c.image_url ||
    c.object_story_spec?.video_data?.image_url ||
    ''
  // Upgrade Meta thumbnail from 64x64 to 320x320 for better quality
  return url.replace('p64x64', 'p320x320').replace('dst-emg0_p64x64', 'dst-emg0_p320x320')
}

async function fetchAllPages(url: string): Promise<any[]> {
  const results: any[] = []
  let nextUrl: string | null = url
  while (nextUrl) {
    const res = await fetch(nextUrl)
    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    if (json.data) results.push(...json.data)
    nextUrl = json.paging?.next || null
  }
  return results
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { brandId } = await req.json()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get brand + Meta credentials from notes
  const { data: brand } = await supabase.from('brands').select('id, name, notes').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  let notes: any = {}
  try { notes = brand.notes ? JSON.parse(brand.notes) : {} } catch {}

  const token = notes.meta_access_token
  const adAccountId = notes.meta_ad_account_id

  if (!token || !adAccountId) {
    return NextResponse.json({ error: 'Meta credentials not configured. Add them in Brand Hub → Integrations.' }, { status: 400 })
  }

  // Determine date preset: initial sync = this_year, incremental = last_30d
  const { count } = await supabase
    .from('brand_insight_rows')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('sync_source', 'meta_api')

  const datePreset = (count || 0) === 0 ? 'this_year' : 'last_30d'

  // Fetch insights from Meta
  const insightsUrl = `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights?` +
    new URLSearchParams({
      access_token: token,
      fields: 'ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,reach,actions,action_values,cpc,cpm,ctr,date_start,date_stop',
      date_preset: datePreset,
      time_increment: '1',
      level: 'ad',
      limit: '500',
    })

  let insights: any[]
  try {
    insights = await fetchAllPages(insightsUrl)
  } catch (e: any) {
    return NextResponse.json({ error: `Meta API error: ${e.message}` }, { status: 400 })
  }

  if (!insights.length) {
    return NextResponse.json({ synced: 0, message: 'No data returned from Meta' })
  }

  // Step 1: Get creative IDs from ads (batch)
  const adIds = [...new Set(insights.map((r: any) => r.ad_id).filter(Boolean))].slice(0, 100)
  const creativeIdMap: Record<string, string> = {} // adId → creativeId
  const creativeMap: Record<string, { title?: string; body?: string; image_url?: string; cta?: string }> = {}

  for (let i = 0; i < adIds.length; i += BATCH_SIZE) {
    const batch = adIds.slice(i, i + BATCH_SIZE)
    try {
      const batchRes = await fetch(
        `https://graph.facebook.com/?access_token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch: batch.map((id: string) => ({
              method: 'GET',
              relative_url: `v19.0/${id}?fields=creative{id,title,body,thumbnail_url,image_url,call_to_action_type,object_story_spec{link_data{image_hash},video_data{image_url}}}`,
            }))
          }),
        }
      )
      const batchData = await batchRes.json()
      if (Array.isArray(batchData)) {
        for (let j = 0; j < batchData.length; j++) {
          const item = batchData[j]
          if (item?.code === 200) {
            try {
              const parsed = JSON.parse(item.body)
              const c = parsed?.creative
              if (c) {
                if (c.title || c.body || c.image_url || c.thumbnail_url) {
                  // Full creative data returned directly
                  creativeMap[batch[j]] = {
                    title: c.title || '',
                    body: c.body || '',
                    image_url: extractImageUrl(c),
                    cta: c.call_to_action_type || '',
                  }
                } else if (c.id) {
                  // Only got creative ID — need second fetch
                  creativeIdMap[batch[j]] = c.id
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  // Step 2: Fetch full creative data for ads that only returned creative ID
  const pendingCreativeIds = Object.entries(creativeIdMap) // [[adId, creativeId], ...]
  for (let i = 0; i < pendingCreativeIds.length; i += BATCH_SIZE) {
    const batch = pendingCreativeIds.slice(i, i + BATCH_SIZE)
    try {
      const batchRes = await fetch(
        `https://graph.facebook.com/?access_token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batch: batch.map(([_adId, creativeId]) => ({
              method: 'GET',
              relative_url: `v19.0/${creativeId}?fields=title,body,thumbnail_url,image_url,call_to_action_type,object_story_spec{link_data{image_hash},video_data{image_url}}`,
            }))
          }),
        }
      )
      const batchData = await batchRes.json()
      if (Array.isArray(batchData)) {
        for (let j = 0; j < batchData.length; j++) {
          const item = batchData[j]
          const adId = batch[j][0]
          if (item?.code === 200) {
            try {
              const c = JSON.parse(item.body)
              if (c) {
                creativeMap[adId] = {
                  title: c.title || '',
                  body: c.body || '',
                  image_url: extractImageUrl(c),
                  cta: c.call_to_action_type || '',
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  // Proxy and cache creative images in Supabase Storage (always re-upload for fresh URLs)
  const cachedImageMap: Record<string, string> = {}

  const imageEntries = Object.entries(creativeMap).filter(([_, c]) => c.image_url)

  await Promise.all(
    imageEntries.map(async ([adId, creative]) => {
      try {
        const metaUrl = creative.image_url!
        const filename = `meta-creatives/${brandId}/${adId}.jpg`

        const imgRes = await fetch(metaUrl)
        if (!imgRes.ok) return

        const imgBuffer = await imgRes.arrayBuffer()

        const { error: uploadError } = await supabase.storage
          .from('brand-assets')
          .upload(filename, imgBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('brand-assets')
            .getPublicUrl(filename)
          cachedImageMap[adId] = urlData.publicUrl
        }
      } catch {
        // silently skip
      }
    })
  )

  console.log('[meta-sync] cached images:', Object.keys(cachedImageMap).length)

  // Compute date range from insights
  const allDates = insights.map((r: any) => r.date_start).filter(Boolean).sort()
  const dateStart = allDates[0] || null
  const dateEnd = allDates[allDates.length - 1] || null

  // Delete old meta sync record for this brand, then insert fresh
  await supabase
    .from('brand_insights')
    .delete()
    .eq('brand_id', brandId)
    .eq('sync_source', 'meta_api')

  const { data: insight } = await supabase.from('brand_insights').insert({
    brand_id: brandId,
    user_id: user.id,
    csv_filename: `Meta API Sync (${datePreset})`,
    date_range_start: dateStart || null,
    date_range_end: dateEnd || null,
    row_count: 0,
    sync_source: 'meta_api',
    meta_date_preset: datePreset,
  }).select().single()

  if (!insight) {
    return NextResponse.json({ error: 'Failed to create sync record' }, { status: 500 })
  }

  // Map insights to DB rows
  const rows = insights.map((r: any) => {
    const purchases = r.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0
    const purchaseValue = r.action_values?.find((a: any) => a.action_type === 'purchase')?.value || 0
    const spend = parseFloat(r.spend || '0')
    const purchasesNum = parseInt(purchases, 10) || 0
    const roas = spend > 0 && purchaseValue > 0 ? parseFloat(purchaseValue) / spend : 0
    const creative = creativeMap[r.ad_id] || {}

    return {
      brand_id: brandId,
      insight_id: insight.id,
      date: r.date_start,
      campaign_name: r.campaign_name || '',
      ad_set_name: r.adset_name || '',
      ad_name: r.ad_name || '',
      ad_id: r.ad_id || null,
      reach: parseInt(r.reach || '0', 10),
      impressions: parseInt(r.impressions || '0', 10),
      clicks: parseInt(r.clicks || '0', 10),
      ctr: parseFloat(r.ctr || '0'),
      cpm: parseFloat(r.cpm || '0'),
      spend,
      purchases: purchasesNum,
      purchase_value: parseFloat(purchaseValue) || 0,
      roas,
      results: purchasesNum,
      cost_per_result: purchasesNum > 0 ? spend / purchasesNum : 0,
      result_type: 'purchase',
      delivery_status: 'active',
      creative_title: creative.title || null,
      creative_body: creative.body || null,
      creative_image_url: cachedImageMap[r.ad_id] || creative.image_url || null,
      creative_cta: creative.cta || null,
      sync_source: 'meta_api',
    }
  })

  // Deduplicate rows by unique key before inserting
  const seen = new Set<string>()
  const dedupedRows = rows.filter(r => {
    const key = `${r.brand_id}|${r.date}|${r.campaign_name}|${r.ad_set_name}|${r.ad_name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Delete existing meta_api rows for this date range before inserting fresh
  if (dateStart && dateEnd) {
    await supabase
      .from('brand_insight_rows')
      .delete()
      .eq('brand_id', brandId)
      .eq('sync_source', 'meta_api')
      .gte('date', dateStart)
      .lte('date', dateEnd)
  }

  // Insert in batches of 200
  let inserted = 0
  for (let i = 0; i < dedupedRows.length; i += 200) {
    const batch = dedupedRows.slice(i, i + 200)
    const { error } = await supabase
      .from('brand_insight_rows')
      .upsert(batch, {
        onConflict: 'brand_id,date,campaign_name,ad_set_name,ad_name',
        ignoreDuplicates: true,
      })
    if (error) console.error('[meta-sync] insert error:', JSON.stringify(error))
    if (!error) inserted += batch.length
  }

  // Update the sync record with actual row count
  await supabase.from('brand_insights').update({ row_count: inserted }).eq('id', insight.id)

  return NextResponse.json({
    synced: inserted,
    datePreset,
    dateRange: { start: dateStart, end: dateEnd },
    creativesFetched: Object.keys(creativeMap).length,
  })
}
