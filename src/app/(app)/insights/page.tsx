'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import { colors, font, fontWeight, fontSize, radius, shadow, letterSpacing } from '@/lib/design-tokens'

// ── CSV Parser (handles quoted fields, no deps) ─────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i])
    if (vals.length === 0) continue
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = (vals[j] || '').trim() })
    rows.push(row)
  }
  return rows
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { current += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { result.push(current); current = '' }
      else { current += ch }
    }
  }
  result.push(current)
  return result
}

// ── Column mapping (Meta Ads CSV → DB) ─────────────────────────
const COL_MAP: Record<string, string> = {
  'campaign name': 'campaign_name',
  'ad set name': 'ad_set_name',
  'ad name': 'ad_name',
  'day': 'date',
  'reach': 'reach',
  'impressions': 'impressions',
  'link clicks': 'clicks',
  'ctr (all)': 'ctr',
  'cpm (cost per 1,000 impressions)': 'cpm',
  'amount spent (usd)': 'spend',
  'results': 'results',
  'cost per result': 'cost_per_result',
  'result type': 'result_type',
  'purchases': 'purchases',
  'purchases conversion value': 'purchase_value',
  'results roas': 'roas',
  'delivery status': 'delivery_status',
}

const STRING_FIELDS = new Set(['campaign_name', 'ad_set_name', 'ad_name', 'result_type', 'delivery_status', 'date'])

function mapRow(raw: Record<string, string>): Record<string, any> | null {
  const mapped: Record<string, any> = {}
  for (const [csvCol, val] of Object.entries(raw)) {
    const key = COL_MAP[csvCol]
    if (key) mapped[key] = val
  }
  if (!mapped.campaign_name && !mapped.impressions) return null
  for (const [k, v] of Object.entries(mapped)) {
    if (STRING_FIELDS.has(k)) continue
    const cleaned = String(v || '0').replace(/[$,%]/g, '')
    mapped[k] = parseFloat(cleaned) || 0
  }
  return mapped
}

// ── Short ad name helper ────────────────────────────────────────
function shortAdName(adName: string): string {
  const parts = adName.split('|')
  return parts[parts.length - 1].trim()
}

// ── Creative type parser ────────────────────────────────────────
function parseCreativeType(adName: string): { label: string; color: string } | null {
  const lower = adName.toLowerCase()
  if (lower.includes('ugc') || lower.includes('billo')) return { label: 'UGC', color: colors.accent }
  if (lower.includes(' ai ') || lower.startsWith('ai ') || lower.includes('ai-')) return { label: 'AI Creative', color: colors.emailBlue }
  if (lower.includes('shar')) return { label: 'Influencer', color: colors.violet }
  return null
}

// ── Time range helpers ──────────────────────────────────────────
type TimeRange = '7d' | '30d' | 'all'

function getDateCutoff(range: TimeRange): string | null {
  if (range === 'all') return null
  const d = new Date()
  d.setDate(d.getDate() - (range === '7d' ? 7 : 30))
  return d.toISOString().split('T')[0]
}

// ── Action badge helpers ────────────────────────────────────────
function actionBadgeStyle(action: string): { bg: string; color: string } {
  switch (action) {
    case 'pause': return { bg: colors.dangerLight, color: colors.danger }
    case 'scale': return { bg: colors.successLight, color: colors.success }
    case 'test': return { bg: colors.infoLight, color: colors.info }
    case 'optimize': return { bg: colors.warningLight, color: colors.warning }
    default: return { bg: colors.cream, color: colors.muted }
  }
}

// ── Types ───────────────────────────────────────────────────────
interface InsightUpload {
  id: string
  csv_filename: string
  uploaded_at: string
  date_range_start: string | null
  date_range_end: string | null
  row_count: number
}

interface Analysis {
  summary: string
  working: { title: string; insight: string; attomikPrompt: string }[]
  opportunities: { title: string; insight: string; action: string; recommendation: string }[]
}

interface AggRow {
  ad_name: string
  ad_id: string | null
  impressions: number
  clicks: number
  ctr: number
  spend: number
  purchases: number
  roas: number
  cpa: number
  creative_title: string | null
  creative_body: string | null
  creative_image_url: string | null
  creative_cta: string | null
}

// ═════════════════════════════════════════════════════════════════
export default function InsightsPage() {
  const { activeBrandId } = useBrand()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploads, setUploads] = useState<InsightUpload[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [aggRows, setAggRows] = useState<AggRow[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [purgeConfirm, setPurgeConfirm] = useState(false)
  const [purging, setPurging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [hasMetaCredentials, setHasMetaCredentials] = useState(false)

  // Load upload history
  useEffect(() => {
    if (!activeBrandId) return
    supabase
      .from('brand_insights')
      .select('id, csv_filename, uploaded_at, date_range_start, date_range_end, row_count')
      .eq('brand_id', activeBrandId)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => {
        setUploads(data || [])
        setHasData((data || []).length > 0)
      })

    // Check if brand has Meta credentials
    const checkMeta = async () => {
      const { data: brandData } = await supabase
        .from('brands')
        .select('notes')
        .eq('id', activeBrandId)
        .single()
      try {
        const notes = brandData?.notes ? JSON.parse(brandData.notes) : {}
        setHasMetaCredentials(!!(notes.meta_access_token && notes.meta_ad_account_id))
      } catch {}
    }
    checkMeta()
  }, [activeBrandId])

  // Load aggregated table data when time range changes
  useEffect(() => {
    if (!activeBrandId || !hasData) return
    loadAggregatedData()
  }, [activeBrandId, timeRange, hasData])

  async function loadAggregatedData() {
    if (!activeBrandId) return
    let query = supabase
      .from('brand_insight_rows')
      .select('ad_name, ad_id, impressions, clicks, ctr, spend, purchases, purchase_value, roas, creative_title, creative_body, creative_image_url, creative_cta')
      .eq('brand_id', activeBrandId)
    const cutoff = getDateCutoff(timeRange)
    if (cutoff) query = query.gte('date', cutoff)
    const { data: rows } = await query
    if (!rows || rows.length === 0) { setAggRows([]); return }

    const map: Record<string, { impressions: number; clicks: number; spend: number; purchases: number; purchase_value: number; ctr_sum: number; roas_sum: number; count: number; ad_id: string | null; creative_title: string | null; creative_body: string | null; creative_image_url: string | null; creative_cta: string | null }> = {}
    for (const r of rows) {
      const name = r.ad_name || '(no ad name)'
      if (!map[name]) map[name] = { impressions: 0, clicks: 0, spend: 0, purchases: 0, purchase_value: 0, ctr_sum: 0, roas_sum: 0, count: 0, ad_id: null, creative_title: null, creative_body: null, creative_image_url: null, creative_cta: null }
      map[name].impressions += r.impressions || 0
      map[name].clicks += r.clicks || 0
      map[name].spend += r.spend || 0
      map[name].purchases += r.purchases || 0
      map[name].purchase_value += r.purchase_value || 0
      map[name].ctr_sum += r.ctr || 0
      map[name].roas_sum += r.roas || 0
      map[name].count++
      map[name].ad_id = map[name].ad_id || r.ad_id || null
      map[name].creative_title = map[name].creative_title || r.creative_title || null
      map[name].creative_body = map[name].creative_body || r.creative_body || null
      map[name].creative_image_url = map[name].creative_image_url || r.creative_image_url || null
      map[name].creative_cta = map[name].creative_cta || r.creative_cta || null
    }

    const agg: AggRow[] = Object.entries(map).map(([name, v]) => ({
      ad_name: name,
      ad_id: v.ad_id,
      impressions: v.impressions,
      clicks: v.clicks,
      ctr: v.count > 0 ? v.ctr_sum / v.count : 0,
      spend: v.spend,
      purchases: v.purchases,
      roas: v.count > 0 ? v.roas_sum / v.count : 0,
      cpa: v.purchases > 0 ? v.spend / v.purchases : 0,
      creative_title: v.creative_title,
      creative_body: v.creative_body,
      creative_image_url: v.creative_image_url,
      creative_cta: v.creative_cta,
    }))
    agg.sort((a, b) => b.roas - a.roas)
    setAggRows(agg)
  }

  // ── KPI computations ──────────────────────────────────────────
  const kpis = useMemo(() => {
    if (aggRows.length === 0) return null
    const totalSpend = aggRows.reduce((s, r) => s + r.spend, 0)
    const totalPurchases = aggRows.reduce((s, r) => s + r.purchases, 0)
    const totalRoasSum = aggRows.reduce((s, r) => s + r.roas, 0)
    const avgRoas = aggRows.length > 0 ? totalRoasSum / aggRows.length : 0
    const avgCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0
    return { totalSpend, totalPurchases, avgRoas, avgCpa }
  }, [aggRows])

  // ── Upload handler ────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!activeBrandId || !file) return
    setUploading(true)
    setUploadResult(null)

    const text = await file.text()
    const rawRows = parseCSV(text)
    const mappedRows = rawRows.map(mapRow).filter(Boolean) as Record<string, any>[]
    if (mappedRows.length === 0) {
      setUploadResult('No valid rows found in CSV. Check column headers.')
      setUploading(false)
      return
    }

    const { data: existing } = await supabase
      .from('brand_insight_rows')
      .select('date, campaign_name, ad_set_name, ad_name')
      .eq('brand_id', activeBrandId)

    const existingKeys = new Set(
      (existing || []).map(r => `${r.date}|${r.campaign_name}|${r.ad_set_name}|${r.ad_name}`)
    )

    const newRows = mappedRows.filter(r => {
      const key = `${r.date}|${r.campaign_name}|${r.ad_set_name}|${r.ad_name}`
      return !existingKeys.has(key)
    })

    const dupeCount = mappedRows.length - newRows.length

    const dates = mappedRows.map(r => r.date).filter(Boolean).sort()
    const dateStart = dates[0] || null
    const dateEnd = dates[dates.length - 1] || null

    const { data: { user } } = await supabase.auth.getUser()

    const { data: insight } = await supabase.from('brand_insights').insert({
      brand_id: activeBrandId,
      user_id: user?.id,
      csv_filename: file.name,
      date_range_start: dateStart,
      date_range_end: dateEnd,
      row_count: newRows.length,
    }).select().single()

    if (insight && newRows.length > 0) {
      const BATCH = 200
      for (let i = 0; i < newRows.length; i += BATCH) {
        const batch = newRows.slice(i, i + BATCH).map(r => ({
          brand_id: activeBrandId,
          insight_id: insight.id,
          date: r.date || null,
          campaign_name: r.campaign_name || '',
          ad_set_name: r.ad_set_name || '',
          ad_name: r.ad_name || '',
          reach: Math.round(r.reach || 0),
          impressions: Math.round(r.impressions || 0),
          clicks: Math.round(r.clicks || 0),
          ctr: r.ctr || 0,
          cpm: r.cpm || 0,
          spend: r.spend || 0,
          results: Math.round(r.results || 0),
          cost_per_result: r.cost_per_result || 0,
          result_type: r.result_type || '',
          purchases: Math.round(r.purchases || 0),
          purchase_value: r.purchase_value || 0,
          roas: r.roas || 0,
          delivery_status: r.delivery_status || '',
        }))
        await supabase.from('brand_insight_rows').upsert(batch, {
          onConflict: 'brand_id,date,campaign_name,ad_set_name,ad_name',
          ignoreDuplicates: true,
        })
      }
    }

    setUploadResult(`${newRows.length} new rows added${dupeCount > 0 ? `, ${dupeCount} duplicates skipped` : ''}`)
    const { data: refreshed } = await supabase
      .from('brand_insights')
      .select('id, csv_filename, uploaded_at, date_range_start, date_range_end, row_count')
      .eq('brand_id', activeBrandId)
      .order('uploaded_at', { ascending: false })
    setUploads(refreshed || [])
    setHasData(true)
    setUploading(false)
    loadAggregatedData()
  }, [activeBrandId, supabase])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }, [handleFile])

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  // ── Analyze ───────────────────────────────────────────────────
  async function analyzeData() {
    if (!activeBrandId) return
    setAnalyzing(true)
    setAnalysis(null)

    let query = supabase
      .from('brand_insight_rows')
      .select('*')
      .eq('brand_id', activeBrandId)
    const cutoff = getDateCutoff(timeRange)
    if (cutoff) query = query.gte('date', cutoff)
    const { data: rows } = await query

    if (!rows || rows.length === 0) {
      setAnalyzing(false)
      return
    }

    try {
      const res = await fetch('/api/insights/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: activeBrandId, rows, timeRange }),
      })
      const data = await res.json()
      if (data.summary) setAnalysis(data)
    } catch (e) {
      console.error('Analysis failed:', e)
    }
    setAnalyzing(false)
  }

  // ── Sync from Meta API ─────────────────────────────────────────
  async function syncFromMeta() {
    if (!activeBrandId) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/insights/sync-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: activeBrandId }),
      })
      const data = await res.json()
      if (data.error) {
        setSyncResult(`Error: ${data.error}`)
      } else {
        setSyncResult(`✓ Synced ${data.synced} rows (${data.datePreset}) — ${data.creativesFetched} creatives fetched`)
        // Refresh uploads list and table data
        const { data: refreshed } = await supabase
          .from('brand_insights')
          .select('id, csv_filename, uploaded_at, date_range_start, date_range_end, row_count')
          .eq('brand_id', activeBrandId)
          .order('uploaded_at', { ascending: false })
        setUploads(refreshed || [])
        setHasData(true)
        loadAggregatedData()
      }
    } catch (e) {
      setSyncResult('Sync failed — check your Meta credentials in Brand Hub')
    }
    setSyncing(false)
  }

  // ── Purge all data ────────────────────────────────────────────
  async function purgeData() {
    if (!activeBrandId) return
    setPurging(true)
    await supabase.from('brand_insight_rows').delete().eq('brand_id', activeBrandId)
    await supabase.from('brand_insights').delete().eq('brand_id', activeBrandId)
    setUploads([])
    setAnalysis(null)
    setAggRows([])
    setHasData(false)
    setUploadResult(null)
    setPurgeConfirm(false)
    setPurging(false)
    setToast('All insights data cleared')
    setTimeout(() => setToast(null), 3000)
  }

  // ── Copy to clipboard ─────────────────────────────────────────
  function copyPrompt(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!activeBrandId) return null

  // ── Shared styles ─────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius['3xl'],
    padding: 24, boxShadow: shadow.card,
  }
  const btnSmall: React.CSSProperties = {
    background: colors.ink, color: colors.accent, fontFamily: font.heading,
    fontWeight: fontWeight.bold, fontSize: fontSize.xs, padding: '6px 12px',
    borderRadius: radius.pill, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide, whiteSpace: 'nowrap',
  }

  function roasColor(roas: number, purchases: number): string {
    if (purchases === 0 || roas < 1) return colors.danger
    if (roas >= 2) return colors.success
    return colors.warning
  }

  // ── Section header component ──────────────────────────────────
  const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 3, height: 22, borderRadius: 2, background: colors.accent }} />
        <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], textTransform: 'uppercase' as const }}>{title}</div>
      </div>
      {action}
    </div>
  )

  // ── Computed values ───────────────────────────────────────────
  const totalSpend = aggRows.reduce((s, r) => s + r.spend, 0)
  const totalPurchases = aggRows.reduce((s, r) => s + r.purchases, 0)
  const purchasingAds = aggRows.filter(r => r.purchases > 0)
  const avgRoas = purchasingAds.length > 0 ? purchasingAds.reduce((s, r) => s + r.roas, 0) / purchasingAds.length : 0

  const topCreatives = aggRows
    .filter(r => r.purchases > 0 && r.creative_image_url)
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 6)

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: colors.ink, color: colors.accent, fontFamily: font.heading,
          fontWeight: fontWeight.bold, fontSize: fontSize.body, padding: '12px 24px',
          borderRadius: radius.pill, boxShadow: shadow.lg, zIndex: 300,
          textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
        }}>{toast}</div>
      )}

      {/* Sync result banner */}
      {syncResult && (
        <div style={{
          padding: '12px 16px', borderRadius: radius.lg, fontSize: fontSize.body,
          fontWeight: fontWeight.semibold, marginBottom: 16,
          background: syncResult.startsWith('Error') ? colors.dangerLight : colors.accentAlpha8,
          color: syncResult.startsWith('Error') ? colors.danger : colors.brandGreen,
        }}>{syncResult}</div>
      )}

      {/* Not connected banner */}
      {!hasMetaCredentials && !hasData && (
        <div style={{
          background: colors.cream, borderRadius: radius['3xl'], padding: '20px 24px',
          marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ fontSize: fontSize.body, color: colors.muted }}>
            Connect Meta Ads in Brand Hub → Integrations to enable automatic sync with creative data.
          </div>
          <a href={`/brand-setup/${activeBrandId}`} style={{
            background: colors.ink, color: colors.accent, fontFamily: font.heading,
            fontWeight: fontWeight.heading, fontSize: fontSize.xs, padding: '10px 20px',
            borderRadius: radius.pill, textDecoration: 'none', textTransform: 'uppercase',
            letterSpacing: letterSpacing.wide, whiteSpace: 'nowrap', marginLeft: 16,
          }}>Connect →</a>
        </div>
      )}

      {/* ═══ SECTION 1 — HEADER BAR ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 32, gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['10xl'], textTransform: 'uppercase', letterSpacing: letterSpacing.tight }}>
          Insights
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Time range toggle */}
          <div style={{ display: 'flex', background: colors.cream, borderRadius: radius.pill, padding: 3, gap: 2 }}>
            {(['7d', '30d', 'all'] as TimeRange[]).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} style={{
                background: timeRange === r ? colors.ink : 'transparent',
                color: timeRange === r ? colors.accent : colors.muted,
                fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize.xs,
                padding: '7px 16px', borderRadius: radius.pill, border: 'none',
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                transition: 'all 0.15s',
              }}>{r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'All time'}</button>
            ))}
          </div>
          {/* Sync button */}
          {hasMetaCredentials && (
            <button onClick={syncFromMeta} disabled={syncing} style={{
              background: syncing ? colors.gray400 : colors.accent,
              color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.heading,
              fontSize: fontSize.xs, padding: '10px 20px', borderRadius: radius.pill,
              border: 'none', cursor: syncing ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
            }}>{syncing ? 'Syncing...' : '\u21BB Sync'}</button>
          )}
        </div>
      </div>

      {/* ═══ SECTION 2 — KPI STRIP ═══ */}
      {hasData && aggRows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'Total Spend', value: `$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, dark: true },
            { label: 'Purchases', value: totalPurchases.toLocaleString(), dark: false },
            { label: 'Avg ROAS', value: `${avgRoas.toFixed(2)}x`, dark: false },
            { label: 'Active Ads', value: aggRows.length.toString(), dark: false },
          ].map(({ label, value, dark }) => (
            <div key={label} style={{
              background: dark ? colors.ink : colors.paper,
              border: `1px solid ${dark ? colors.ink : colors.border}`,
              borderRadius: radius.xl, padding: '20px 24px',
            }}>
              <div style={{
                fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                textTransform: 'uppercase', letterSpacing: letterSpacing.wider,
                color: dark ? colors.whiteAlpha40 : colors.muted, marginBottom: 8,
              }}>{label}</div>
              <div style={{
                fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['9xl'],
                letterSpacing: letterSpacing.tight, color: dark ? colors.accent : colors.ink,
              }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SECTION 3 — BEST PERFORMING CREATIVES ═══ */}
      {topCreatives.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader title="Best Performing Creatives" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {topCreatives.map((r, i) => {
              const creativeType = parseCreativeType(r.ad_name)
              return (
                <div key={i} style={{
                  background: colors.paper, borderRadius: radius['3xl'],
                  border: `1px solid ${colors.border}`, overflow: 'hidden',
                  boxShadow: shadow.card, transition: 'transform 0.15s, box-shadow 0.15s',
                }}>
                  <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {/* Thumbnail — small and crisp */}
                    {r.creative_image_url && (
                      <div style={{ flexShrink: 0, position: 'relative' }}>
                        <img
                          src={r.creative_image_url}
                          alt={shortAdName(r.ad_name)}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: radius.md, border: `1px solid ${colors.border}` }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        {/* Creative type badge below image */}
                        {creativeType && (
                          <div style={{
                            marginTop: 4, textAlign: 'center',
                            fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
                            background: creativeType.color, color: colors.ink,
                            padding: '2px 6px', borderRadius: radius.pill,
                            textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                          }}>{creativeType.label}</div>
                        )}
                      </div>
                    )}
                    {/* Right: name + ROAS badge */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div style={{
                          fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
                          textTransform: 'uppercase', letterSpacing: letterSpacing.slight, color: colors.ink,
                        }}>{shortAdName(r.ad_name)}</div>
                        {/* Purchases + ROAS badge */}
                        <div style={{
                          background: colors.accent, color: colors.ink,
                          fontFamily: font.heading, fontWeight: fontWeight.heading,
                          fontSize: fontSize.xs, padding: '4px 10px', borderRadius: radius.pill,
                          whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'center', lineHeight: 1.3,
                        }}>
                          <div>{r.purchases} sales</div>
                          <div style={{ fontSize: fontSize['2xs'], fontWeight: fontWeight.semibold }}>{r.roas.toFixed(2)}x</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Copy body below the header */}
                  <div style={{ padding: '10px 20px 0' }}>
                    {r.creative_body && (
                      <div style={{
                        fontSize: fontSize.body, color: colors.muted, lineHeight: 1.6,
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }}>{r.creative_body}</div>
                    )}
                  </div>

                  {/* Card content */}
                  <div style={{ padding: '14px 20px 20px' }}>
                    {/* Metrics row */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                      {[
                        { label: 'Spend', value: `$${r.spend.toFixed(0)}` },
                        { label: 'Purch', value: r.purchases.toString() },
                        { label: 'CTR', value: `${r.ctr.toFixed(2)}%` },
                        { label: 'CPA', value: r.cpa > 0 ? `$${r.cpa.toFixed(0)}` : '-' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontFamily: font.mono, fontSize: fontSize['2xs'], color: colors.muted, textTransform: 'uppercase', letterSpacing: letterSpacing.wide }}>{label}</div>
                          <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: colors.ink }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Inspire Creative button */}
                    <button
                      onClick={() => copyPrompt(`Generate a creative inspired by "${shortAdName(r.ad_name)}" — ${r.roas.toFixed(2)}x ROAS, ${r.purchases} purchases, $${r.cpa.toFixed(0)} CPA. Copy angle: "${r.creative_body?.slice(0, 100)}". Match this style and hook.`, `inspire-card-${i}`)}
                      style={{
                        width: '100%', background: copied === `inspire-card-${i}` ? colors.success : colors.ink,
                        color: copied === `inspire-card-${i}` ? colors.paper : colors.accent,
                        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.xs,
                        padding: '10px', borderRadius: radius.lg, border: 'none', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: letterSpacing.wide, transition: 'all 0.15s',
                      }}
                    >{copied === `inspire-card-${i}` ? '\u2713 Copied!' : '\u2192 Inspire Creative'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ SECTION 4 — AI INSIGHTS ═══ */}
      {hasData && (
        <div style={{ marginBottom: 48 }}>
          {!analysis ? (
            <div style={{
              background: colors.ink, borderRadius: radius['3xl'], padding: '32px 40px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32,
            }}>
              <div>
                <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], textTransform: 'uppercase', color: colors.paper, marginBottom: 6 }}>
                  AI Analysis
                </div>
                <div style={{ fontSize: fontSize.body, color: colors.whiteAlpha50 }}>
                  Get AI-powered insights on what&apos;s working, what to pause, and what to test next.
                </div>
              </div>
              <button onClick={analyzeData} disabled={analyzing} style={{
                background: analyzing ? colors.gray800 : colors.accent,
                color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.heading,
                fontSize: fontSize.md, padding: '16px 40px', borderRadius: radius.pill,
                border: 'none', cursor: analyzing ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase', letterSpacing: letterSpacing.wide, whiteSpace: 'nowrap',
              }}>{analyzing ? 'Analyzing...' : '\u2726 Analyze'}</button>
            </div>
          ) : (
            <>
              <SectionHeader title="AI Insights" action={
                <button onClick={analyzeData} disabled={analyzing} style={{
                  background: colors.ink, color: colors.accent, fontFamily: font.heading,
                  fontWeight: fontWeight.bold, fontSize: fontSize.xs, padding: '8px 20px',
                  borderRadius: radius.pill, border: 'none', cursor: analyzing ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                  opacity: analyzing ? 0.5 : 1,
                }}>
                  {analyzing ? 'Analyzing...' : 'Re-analyze'}
                </button>
              } />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Summary */}
                <div style={{
                  background: colors.ink, borderRadius: radius['3xl'], padding: 32,
                  borderLeft: `4px solid ${colors.accent}`, boxShadow: shadow.card,
                }}>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                    letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.accent, marginBottom: 12,
                  }}>Summary</div>
                  <div style={{ fontSize: fontSize.xl, color: colors.paper, lineHeight: 1.7 }}>{analysis.summary}</div>
                </div>

                {/* 3 Things Working Well */}
                <div>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                    letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.success, marginBottom: 14,
                  }}>3 Things Working Well</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {analysis.working.map((w, i) => (
                      <div key={i} style={{
                        background: colors.ink, borderRadius: radius['3xl'], padding: '24px 24px 20px',
                        borderLeft: `4px solid ${colors.accent}`, boxShadow: shadow.card,
                        display: 'flex', flexDirection: 'column',
                      }}>
                        <div style={{
                          fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md,
                          textTransform: 'uppercase', color: colors.paper, marginBottom: 8,
                        }}>{w.title}</div>
                        <div style={{
                          fontSize: fontSize.body, color: colors.whiteAlpha70, lineHeight: 1.6, marginBottom: 16, flex: 1,
                        }}>{w.insight}</div>
                        <button
                          onClick={() => copyPrompt(w.attomikPrompt, `w-${i}`)}
                          style={{
                            background: copied === `w-${i}` ? colors.success : colors.accent,
                            color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.bold,
                            fontSize: fontSize.xs, padding: '8px 16px', borderRadius: radius.pill,
                            border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                            letterSpacing: letterSpacing.wide, alignSelf: 'flex-start',
                          }}
                        >
                          {copied === `w-${i}` ? 'Copied!' : '\u2192 Use in Attomik'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Opportunities */}
                <div>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                    letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.warning, marginBottom: 14,
                  }}>3 Opportunities</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {analysis.opportunities.map((o, i) => {
                      const badge = actionBadgeStyle(o.action)
                      return (
                        <div key={i} style={{
                          background: colors.cream, borderRadius: radius['3xl'], padding: '24px 24px 20px',
                          borderLeft: `4px solid ${colors.warning}`, position: 'relative',
                          display: 'flex', flexDirection: 'column',
                        }}>
                          <div style={{
                            position: 'absolute', top: 16, right: 16,
                            background: badge.bg, color: badge.color,
                            fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize['2xs'],
                            padding: '3px 10px', borderRadius: radius.pill, textTransform: 'uppercase',
                            letterSpacing: letterSpacing.wide,
                          }}>{o.action}</div>
                          <div style={{
                            fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md,
                            textTransform: 'uppercase', color: colors.ink, marginBottom: 8, paddingRight: 80,
                          }}>{o.title}</div>
                          <div style={{
                            fontSize: fontSize.body, color: colors.muted, lineHeight: 1.6, marginBottom: 12, flex: 1,
                          }}>{o.insight}</div>
                          <div style={{
                            fontSize: fontSize.body, color: colors.ink, fontWeight: fontWeight.semibold,
                            background: colors.paper, padding: '10px 14px', borderRadius: radius.lg,
                            border: `1px solid ${colors.border}`,
                          }}>
                            {o.recommendation}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ SECTION 5 — CREATIVE PERFORMANCE TABLE ═══ */}
      {hasData && aggRows.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader title="Creative Performance" />

          <div style={{
            borderRadius: radius['3xl'], border: `1px solid ${colors.border}`,
            overflow: 'hidden', boxShadow: shadow.card,
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: colors.cream }}>
                    <th style={{
                      textAlign: 'left', padding: '13px 16px', minWidth: 300,
                      fontFamily: font.heading, fontWeight: fontWeight.heading,
                      textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                      fontSize: fontSize.xs, color: colors.muted,
                      borderBottom: `2px solid ${colors.border}`,
                      position: 'sticky', top: 0, background: colors.cream, zIndex: 1,
                    }}>Ad Name</th>
                    {['Impr', 'Clicks', 'CTR', 'Spend', 'Purch', 'ROAS', 'CPA'].map(h => (
                      <th key={h} style={{
                        textAlign: 'right', padding: '13px 16px',
                        fontFamily: font.heading, fontWeight: fontWeight.heading,
                        textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                        fontSize: fontSize.xs, color: colors.muted,
                        borderBottom: `2px solid ${colors.border}`,
                        position: 'sticky', top: 0, background: colors.cream, zIndex: 1,
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                    <th style={{
                      textAlign: 'right', padding: '13px 16px',
                      fontFamily: font.heading, fontWeight: fontWeight.heading,
                      fontSize: fontSize.xs, color: colors.muted,
                      borderBottom: `2px solid ${colors.border}`,
                      position: 'sticky', top: 0, background: colors.cream, zIndex: 1,
                    }}></th>
                  </tr>
                </thead>
                <tbody>
                  {aggRows.map((r, i) => {
                    const creative = parseCreativeType(r.ad_name)
                    return (
                      <tr key={i} style={{
                        borderBottom: `1px solid ${colors.border}`,
                        background: i % 2 === 0 ? colors.paper : colors.gray100,
                      }}>
                        <td style={{ padding: '13px 16px', minWidth: 300 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            {r.creative_image_url && (
                              <img
                                src={r.creative_image_url}
                                alt=""
                                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: radius.lg, flexShrink: 0, border: `1px solid ${colors.border}` }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            )}
                            <div>
                              <div style={{ fontSize: fontSize.body, color: colors.ink, lineHeight: 1.4 }}>{r.ad_name}</div>
                              {r.creative_title && (
                                <div style={{ fontSize: fontSize.sm, color: colors.muted, marginTop: 2, fontStyle: 'italic' }}>"{r.creative_title}"</div>
                              )}
                              {r.creative_body && (
                                <div style={{
                                  fontSize: fontSize.xs, color: colors.muted, marginTop: 4, lineHeight: 1.5,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                                  overflow: 'hidden', maxWidth: 320,
                                }}>{r.creative_body}</div>
                              )}
                              {creative && (
                                <span style={{
                                  fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
                                  background: creative.color, color: colors.ink,
                                  padding: '2px 8px', borderRadius: radius.pill,
                                  textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                                  whiteSpace: 'nowrap', display: 'inline-block', marginTop: 4,
                                }}>{creative.label}</span>
                              )}
                              {r.creative_cta && (
                                <span style={{
                                  fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
                                  background: colors.cream, color: colors.muted,
                                  padding: '2px 8px', borderRadius: radius.pill,
                                  textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                                  whiteSpace: 'nowrap', display: 'inline-block', marginTop: 4,
                                }}>{r.creative_cta.replace(/_/g, ' ')}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.caption, color: colors.ink }}>{r.impressions.toLocaleString()}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.caption, color: colors.ink }}>{r.clicks.toLocaleString()}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.caption, color: colors.ink }}>{r.ctr.toFixed(2)}%</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.caption, color: colors.ink }}>${r.spend.toFixed(2)}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.caption, color: colors.ink }}>{r.purchases}</td>
                        <td style={{
                          padding: '13px 16px', textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.caption,
                          fontWeight: fontWeight.bold, color: roasColor(r.roas, r.purchases),
                        }}>{r.roas.toFixed(2)}x</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right', fontFamily: font.mono, fontSize: fontSize.caption, color: colors.ink }}>{r.cpa > 0 ? `$${r.cpa.toFixed(2)}` : '-'}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {r.roas >= 2 && (
                              <button
                                onClick={() => copyPrompt(`Scale budget on "${r.ad_name}" — ROAS ${r.roas.toFixed(2)}x with ${r.purchases} purchases`, `scale-${i}`)}
                                style={{ ...btnSmall, fontSize: fontSize['2xs'], padding: '4px 10px', background: copied === `scale-${i}` ? colors.success : colors.ink, color: copied === `scale-${i}` ? colors.paper : colors.accent }}
                              >{copied === `scale-${i}` ? '\u2713' : 'Scale \u2191'}</button>
                            )}
                            {r.roas < 1 && r.spend > 0 && (
                              <button
                                onClick={() => copyPrompt(`Pause "${r.ad_name}" — spent $${r.spend.toFixed(2)} with ROAS ${r.roas.toFixed(2)}x`, `pause-${i}`)}
                                style={{ ...btnSmall, fontSize: fontSize['2xs'], padding: '4px 10px', background: copied === `pause-${i}` ? colors.danger : colors.ink, color: copied === `pause-${i}` ? colors.paper : colors.accent }}
                              >{copied === `pause-${i}` ? '\u2713' : 'Pause'}</button>
                            )}
                            <button
                              onClick={() => copyPrompt(`Generate a creative inspired by "${r.ad_name}" which has ${r.impressions.toLocaleString()} impressions, ${r.clicks} clicks, and ${r.roas.toFixed(2)}x ROAS. Match the style and angle that made this ad perform.`, `inspire-${i}`)}
                              style={{ ...btnSmall, fontSize: fontSize['2xs'], padding: '4px 10px', background: copied === `inspire-${i}` ? colors.success : colors.ink, color: copied === `inspire-${i}` ? colors.paper : colors.accent }}
                            >{copied === `inspire-${i}` ? '\u2713' : 'Inspire Creative'}</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SECTION 6 — DATA MANAGEMENT (collapsed) ═══ */}
      <details style={{ marginTop: 48 }}>
        <summary style={{
          fontFamily: font.mono, fontSize: fontSize.caption, fontWeight: fontWeight.bold,
          letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.muted,
          cursor: 'pointer', userSelect: 'none' as const, padding: '16px 0',
          borderTop: `1px solid ${colors.border}`,
        }}>Data management ▾</summary>
        <div style={{ paddingTop: 24 }}>

          {/* Upload history */}
          {uploads.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{
                  fontFamily: font.mono, fontSize: fontSize.caption, fontWeight: fontWeight.bold,
                  letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.muted,
                }}>Sync History</div>
                {!purgeConfirm ? (
                  <button onClick={() => setPurgeConfirm(true)} style={{
                    background: 'transparent', color: colors.danger,
                    fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize.xs,
                    padding: '5px 14px', borderRadius: radius.pill, cursor: 'pointer',
                    border: `1px solid ${colors.dangerLight}`, textTransform: 'uppercase',
                    letterSpacing: letterSpacing.wide,
                  }}>Purge all data</button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: fontSize.caption, color: colors.muted }}>
                      Are you sure? This deletes all imported data for this brand.
                    </span>
                    <button onClick={purgeData} disabled={purging} style={{
                      background: colors.danger, color: colors.paper,
                      fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize.xs,
                      padding: '5px 14px', borderRadius: radius.pill, border: 'none', cursor: 'pointer',
                      textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                      opacity: purging ? 0.5 : 1,
                    }}>{purging ? 'Deleting...' : 'Yes, delete all'}</button>
                    <button onClick={() => setPurgeConfirm(false)} style={{
                      background: 'transparent', color: colors.muted,
                      fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize.xs,
                      padding: '5px 14px', borderRadius: radius.pill, cursor: 'pointer',
                      border: `1px solid ${colors.border}`, textTransform: 'uppercase',
                      letterSpacing: letterSpacing.wide,
                    }}>Cancel</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {uploads.map(u => (
                  <div key={u.id} style={{
                    ...cardStyle, padding: '12px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.ink }}>{u.csv_filename}</div>
                      <div style={{ fontSize: fontSize.sm, color: colors.muted, marginTop: 2 }}>
                        {u.date_range_start && u.date_range_end ? `${u.date_range_start} → ${u.date_range_end}` : 'No date range'}
                        {' · '}{u.row_count} rows
                      </div>
                    </div>
                    <div style={{ fontSize: fontSize.xs, color: colors.disabled, fontFamily: font.mono }}>
                      {new Date(u.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CSV upload */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              ...cardStyle,
              border: dragOver ? `2px dashed ${colors.accent}` : `2px dashed ${colors.border}`,
              background: dragOver ? colors.accentAlpha6 : colors.paper,
              textAlign: 'center', padding: '40px 24px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={onFileSelect} style={{ display: 'none' }} />
            <div style={{ fontSize: 32, marginBottom: 10 }}>&#8682;</div>
            <div style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md,
              textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.ink, marginBottom: 6,
            }}>
              {uploading ? 'Processing...' : 'Drop your Meta Ads export here'}
            </div>
            <div style={{ fontSize: fontSize.body, color: colors.muted }}>
              or click to browse. We&apos;ll parse and deduplicate automatically.
            </div>
          </div>

          {uploadResult && (
            <div style={{
              marginTop: 12, padding: '12px 16px', background: colors.accentAlpha8,
              borderRadius: radius.lg, fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.brandGreen,
            }}>
              {uploadResult}
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
