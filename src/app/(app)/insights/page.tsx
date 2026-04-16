'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import { colors, font, fontWeight, fontSize, radius, shadow, letterSpacing } from '@/lib/design-tokens'
import { ComposedChart, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

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
type TimeRange = '7d' | '14d' | '30d' | '90d' | 'custom'

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
]

const DAYS_MAP: Record<string, number> = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 }

function getDateCutoff(range: TimeRange, customStart?: string): string | null {
  if (range === 'custom') return customStart || null
  const days = DAYS_MAP[range]
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function getDateEnd(range: TimeRange, customEnd?: string): string | null {
  if (range === 'custom') return customEnd || null
  return null // non-custom ranges always go to today
}

// ── Action badge helpers ────────────────────────────────────────
function actionBadgeStyle(action: string): { bg: string; color: string } {
  switch (action) {
    case 'scale': return { bg: colors.successLight, color: colors.success }
    case 'test': return { bg: colors.infoLight, color: colors.info }
    case 'watch': return { bg: colors.warningLight, color: colors.warning }
    case 'learn': return { bg: colors.cream, color: colors.muted }
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
  headline: string
  insights: {
    title: string
    detail: string
    action: string
    priority: 'high' | 'medium' | 'low'
    type: 'scale' | 'test' | 'watch' | 'learn'
  }[]
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
  const [analysisTimeRange, setAnalysisTimeRange] = useState<string>('')
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>('')
  const autoAnalysisTriggered = useRef(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [aggRows, setAggRows] = useState<AggRow[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [purgeConfirm, setPurgeConfirm] = useState(false)
  const [purging, setPurging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [hasMetaCredentials, setHasMetaCredentials] = useState(false)
  const [metaChecked, setMetaChecked] = useState(false)
  const [metaTokenInput, setMetaTokenInput] = useState('')
  const [metaAccountInput, setMetaAccountInput] = useState('')
  const [metaSaving, setMetaSaving] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('roas')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [chartData, setChartData] = useState<{ date: string; spend: number; revenue: number; roas: number; clicks: number }[]>([])
  const [sparklineData, setSparklineData] = useState<Record<string, { date: string; roas: number; spend: number; revenue: number }[]>>({})

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

    // Check brand notes: Meta credentials + saved analysis
    setMetaChecked(false)
    const checkBrandNotes = async () => {
      const { data: brandData } = await supabase
        .from('brands')
        .select('notes')
        .eq('id', activeBrandId)
        .single()
      try {
        const notes = brandData?.notes ? JSON.parse(brandData.notes) : {}
        setHasMetaCredentials(!!(notes.meta_access_token && notes.meta_ad_account_id))
        // Load saved analysis if it exists
        if (notes.insights_analysis?.headline) {
          setAnalysis(notes.insights_analysis)
          setAnalysisTimeRange(notes.insights_analysis_time_range || '')
          setAnalysisTimestamp(notes.insights_analysis_timestamp || '')
        }
      } catch {}
      setMetaChecked(true)
    }
    checkBrandNotes()
    autoAnalysisTriggered.current = false
  }, [activeBrandId])

  // Load aggregated table data when time range changes
  useEffect(() => {
    if (!activeBrandId || !hasData) return
    loadAggregatedData()
  }, [activeBrandId, timeRange, customStart, customEnd, hasData])

  async function loadAggregatedData() {
    if (!activeBrandId) return
    let query = supabase
      .from('brand_insight_rows')
      .select('ad_name, ad_id, impressions, clicks, ctr, spend, purchases, purchase_value, roas, creative_title, creative_body, creative_image_url, creative_cta')
      .eq('brand_id', activeBrandId)
    const cutoff = getDateCutoff(timeRange, customStart)
    if (cutoff) query = query.gte('date', cutoff)
    const endDate = getDateEnd(timeRange, customEnd)
    if (endDate) query = query.lte('date', endDate)
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

  // ── Load daily account-level chart data ─────────────────────
  useEffect(() => {
    if (!activeBrandId || !hasData) { setChartData([]); return }

    async function loadDailyTotals() {
      let query = supabase
        .from('brand_insight_rows')
        .select('date, spend, clicks, purchases, purchase_value, roas')
        .eq('brand_id', activeBrandId!)
        .order('date', { ascending: true })
      const cutoff = getDateCutoff(timeRange, customStart)
      if (cutoff) query = query.gte('date', cutoff)
      const endDate = getDateEnd(timeRange, customEnd)
      if (endDate) query = query.lte('date', endDate)
      const { data: rows } = await query
      if (!rows || rows.length === 0) { setChartData([]); return }

      const dateMap: Record<string, { spend: number; revenue: number; clicks: number; roas_num: number; roas_den: number }> = {}
      for (const r of rows) {
        if (!r.date) continue
        if (!dateMap[r.date]) dateMap[r.date] = { spend: 0, revenue: 0, clicks: 0, roas_num: 0, roas_den: 0 }
        const d = dateMap[r.date]
        d.spend += r.spend || 0
        d.clicks += r.clicks || 0
        const rev = (r.purchases || 0) > 0 ? (r.roas || 0) * (r.spend || 0) : 0
        d.revenue += rev
        d.roas_num += rev
        d.roas_den += r.spend || 0
      }
      setChartData(
        Object.entries(dateMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => ({
            date,
            spend: Math.round(d.spend * 100) / 100,
            revenue: Math.round(d.revenue * 100) / 100,
            roas: d.roas_den > 0 ? Math.round((d.roas_num / d.roas_den) * 100) / 100 : 0,
            clicks: d.clicks,
          }))
      )
    }
    loadDailyTotals()
  }, [activeBrandId, hasData, timeRange, customStart, customEnd])

  // ── Load per-ad daily ROAS for sparklines ───────────────────
  useEffect(() => {
    if (!activeBrandId || aggRows.length === 0) { setSparklineData({}); return }
    // Same filter as topCreatives: purchases > 0, has image, top 6 by purchases
    const topAdNames = aggRows
      .filter(r => r.purchases > 0 && r.creative_image_url)
      .sort((a, b) => b.purchases - a.purchases)
      .slice(0, 6)
      .map(r => r.ad_name)
    if (topAdNames.length === 0) { setSparklineData({}); return }

    async function loadSparklines() {
      let query = supabase
        .from('brand_insight_rows')
        .select('ad_name, date, roas, spend, purchases')
        .eq('brand_id', activeBrandId!)
        .in('ad_name', topAdNames)
        .order('date', { ascending: true })
      const cutoff = getDateCutoff(timeRange, customStart)
      if (cutoff) query = query.gte('date', cutoff)
      const endDate = getDateEnd(timeRange, customEnd)
      if (endDate) query = query.lte('date', endDate)
      const { data: rows } = await query
      if (!rows || rows.length === 0) { setSparklineData({}); return }

      // Group by ad_name → date, compute weighted ROAS per date
      const adDateMap: Record<string, Record<string, { revenue: number; spend: number }>> = {}
      for (const r of rows) {
        if (!r.date || !r.ad_name) continue
        if (!adDateMap[r.ad_name]) adDateMap[r.ad_name] = {}
        if (!adDateMap[r.ad_name][r.date]) adDateMap[r.ad_name][r.date] = { revenue: 0, spend: 0 }
        const d = adDateMap[r.ad_name][r.date]
        d.spend += r.spend || 0
        d.revenue += (r.purchases || 0) > 0 ? (r.roas || 0) * (r.spend || 0) : 0
      }

      const result: Record<string, { date: string; roas: number; spend: number; revenue: number }[]> = {}
      for (const [adName, dates] of Object.entries(adDateMap)) {
        const points = Object.entries(dates)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => ({
            date,
            spend: Math.round(d.spend * 100) / 100,
            revenue: Math.round(d.revenue * 100) / 100,
            roas: d.spend > 0 ? Math.round((d.revenue / d.spend) * 100) / 100 : 0,
          }))
        if (points.length >= 2) result[adName] = points
      }
      setSparklineData(result)
    }
    loadSparklines()
  }, [activeBrandId, aggRows, timeRange, customStart, customEnd])

  // ── Auto-run analysis once if no saved result exists ────────
  useEffect(() => {
    if (!activeBrandId || !hasData || aggRows.length === 0) return
    if (!hasMetaCredentials) return
    if (analysis || analyzing || autoAnalysisTriggered.current) return
    autoAnalysisTriggered.current = true
    analyzeData()
  }, [activeBrandId, hasData, aggRows, analysis, analyzing, hasMetaCredentials])

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
    const cutoff = getDateCutoff(timeRange, customStart)
    if (cutoff) query = query.gte('date', cutoff)
    const endDate = getDateEnd(timeRange, customEnd)
    if (endDate) query = query.lte('date', endDate)
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
      if (data.headline) {
        setAnalysis(data)
        const rangeLabel = TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label || 'Custom range'
        const timestamp = new Date().toISOString()
        setAnalysisTimeRange(rangeLabel)
        setAnalysisTimestamp(timestamp)
        // Save to brand.notes so it persists across page loads
        const { data: brandData } = await supabase.from('brands').select('notes').eq('id', activeBrandId).single()
        const currentNotes = brandData?.notes ? JSON.parse(brandData.notes) : {}
        await supabase.from('brands').update({
          notes: JSON.stringify({
            ...currentNotes,
            insights_analysis: data,
            insights_analysis_time_range: rangeLabel,
            insights_analysis_timestamp: timestamp,
          })
        }).eq('id', activeBrandId)
      }
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

  // Sorted rows for the table (must be above early return to keep hook order stable)
  const sortedAggRows = useMemo(() => {
    const sorted = [...aggRows]
    sorted.sort((a, b) => {
      const aVal = (a as any)[sortColumn] ?? 0
      const bVal = (b as any)[sortColumn] ?? 0
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })
    return sorted
  }, [aggRows, sortColumn, sortDirection])

  if (!activeBrandId) return null

  // ── Gate: Meta not connected ──────────────────────────────────
  if (metaChecked && !hasMetaCredentials) {
    const handleMetaSave = async () => {
      if (!activeBrandId || !metaTokenInput.trim() || !metaAccountInput.trim()) return
      setMetaSaving(true)
      const { data: brandData } = await supabase.from('brands').select('notes').eq('id', activeBrandId).single()
      const currentNotes = brandData?.notes ? JSON.parse(brandData.notes) : {}
      const accountId = metaAccountInput.trim().replace(/^act_/, '')
      await supabase.from('brands').update({
        notes: JSON.stringify({
          ...currentNotes,
          meta_access_token: metaTokenInput.trim(),
          meta_ad_account_id: accountId,
          meta_token_saved_at: new Date().toISOString(),
        })
      }).eq('id', activeBrandId)
      setHasMetaCredentials(true)
      setMetaSaving(false)
    }

    return (
      <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" style={{ marginBottom: 16 }}>
              <circle cx="24" cy="24" r="24" fill={colors.ink} />
              <text x="24" y="33" textAnchor="middle" fill={colors.accent} style={{ fontSize: 28, fontWeight: 700, fontFamily: font.heading }}>f</text>
            </svg>
            <div style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['5xl'],
              textTransform: 'uppercase', letterSpacing: letterSpacing.tight, color: colors.ink,
              marginBottom: 10, borderLeft: `4px solid ${colors.accent}`, paddingLeft: 16, display: 'inline-block',
            }}>Meta Ads Not Connected</div>
            <div style={{
              fontSize: fontSize.body, color: colors.muted, lineHeight: 1.7, maxWidth: 520, margin: '0 auto',
            }}>
              This page requires your Meta access token and Ad Account ID to pull in your ad performance data.
            </div>
          </div>

          {/* Two options side by side */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
            {/* LEFT — Brand Hub */}
            <div style={{
              flex: 1, background: colors.paper, border: `1px solid ${colors.border}`,
              borderRadius: radius['3xl'], padding: '32px 28px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
                textTransform: 'uppercase', letterSpacing: letterSpacing.wide, color: colors.ink, marginBottom: 8,
              }}>Set up in Brand Hub</div>
              <div style={{ fontSize: fontSize.body, color: colors.muted, marginBottom: 20, lineHeight: 1.6 }}>
                Connect Meta in your brand settings
              </div>
              <a href={`/brand-setup/${activeBrandId}`} style={{
                display: 'inline-block', background: colors.ink, color: colors.accent,
                fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.xs,
                padding: '12px 28px', borderRadius: radius.pill, textDecoration: 'none',
                textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
              }}>{'\u2192'} Go to Brand Hub</a>
            </div>

            {/* RIGHT — Quick connect */}
            <div style={{
              flex: 1, background: colors.paper, border: `1px solid ${colors.border}`,
              borderRadius: radius['3xl'], padding: '32px 28px',
            }}>
              <div style={{
                fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
                textTransform: 'uppercase', letterSpacing: letterSpacing.wide, color: colors.ink, marginBottom: 16,
              }}>Quick connect here</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
                    textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.muted, marginBottom: 4,
                  }}>Meta Access Token</div>
                  <input
                    type="text"
                    value={metaTokenInput}
                    onChange={e => setMetaTokenInput(e.target.value)}
                    placeholder="EAAx..."
                    style={{
                      width: '100%', fontFamily: font.mono, fontSize: fontSize.body,
                      padding: '10px 14px', borderRadius: radius.lg,
                      border: `1px solid ${colors.border}`, background: colors.cream,
                      color: colors.ink, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
                    textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.muted, marginBottom: 4,
                  }}>Ad Account ID</div>
                  <input
                    type="text"
                    value={metaAccountInput}
                    onChange={e => setMetaAccountInput(e.target.value)}
                    placeholder="act_123456789"
                    style={{
                      width: '100%', fontFamily: font.mono, fontSize: fontSize.body,
                      padding: '10px 14px', borderRadius: radius.lg,
                      border: `1px solid ${colors.border}`, background: colors.cream,
                      color: colors.ink, outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={handleMetaSave}
                  disabled={metaSaving || !metaTokenInput.trim() || !metaAccountInput.trim()}
                  style={{
                    width: '100%', background: (!metaTokenInput.trim() || !metaAccountInput.trim()) ? colors.gray400 : colors.accent,
                    color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.heading,
                    fontSize: fontSize.xs, padding: '12px', borderRadius: radius.pill,
                    border: 'none', cursor: (!metaTokenInput.trim() || !metaAccountInput.trim()) ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                    opacity: metaSaving ? 0.6 : 1, marginTop: 4,
                  }}
                >{metaSaving ? 'Saving...' : 'Connect & Load Insights'}</button>
              </div>
            </div>
          </div>

          {/* Help link */}
          <div style={{ textAlign: 'center' }}>
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted,
                textDecoration: 'none', borderBottom: `1px solid ${colors.border}`,
                paddingBottom: 1,
              }}
            >How to find your Meta Access Token {'\u2192'}</a>
          </div>
        </div>
      </div>
    )
  }

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
  const totalClicks = aggRows.reduce((s, r) => s + r.clicks, 0)
  const totalImpressions = aggRows.reduce((s, r) => s + r.impressions, 0)
  const totalPurchases = aggRows.reduce((s, r) => s + r.purchases, 0)
  const totalRevenue = aggRows.reduce((s, r) => s + (r.purchases > 0 ? r.roas * r.spend : 0), 0)
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  const topCreatives = aggRows
    .filter(r => r.purchases > 0 && r.creative_image_url)
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 6)

  function toggleSort(col: string) {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      setSortDirection('desc')
    }
  }

  function sortArrow(col: string): string {
    if (sortColumn !== col) return ''
    return sortDirection === 'asc' ? ' \u25B2' : ' \u25BC'
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Time range toggle */}
          <div style={{ display: 'flex', background: colors.cream, borderRadius: radius.pill, padding: 3, gap: 2, flexWrap: 'wrap' }}>
            {TIME_RANGE_OPTIONS.map(r => (
              <button key={r.value} onClick={() => setTimeRange(r.value)} style={{
                background: timeRange === r.value ? colors.ink : 'transparent',
                color: timeRange === r.value ? colors.accent : colors.muted,
                fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize.xs,
                padding: '7px 14px', borderRadius: radius.pill, border: 'none',
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                transition: 'all 0.15s',
              }}>{r.label}</button>
            ))}
          </div>
          {/* Custom date inputs */}
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                style={{
                  fontFamily: font.mono, fontSize: fontSize.caption,
                  padding: '6px 10px', borderRadius: radius.lg,
                  border: `1px solid ${colors.border}`, background: colors.paper,
                  color: colors.ink, outline: 'none',
                }}
              />
              <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.muted }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                style={{
                  fontFamily: font.mono, fontSize: fontSize.caption,
                  padding: '6px 10px', borderRadius: radius.lg,
                  border: `1px solid ${colors.border}`, background: colors.paper,
                  color: colors.ink, outline: 'none',
                }}
              />
            </div>
          )}
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

      {/* ═══ SECTION 2 — PERFORMANCE SUMMARY ═══ */}
      {hasData && aggRows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'Total Spend', value: `$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, dark: true },
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, dark: false },
            { label: 'Blended ROAS', value: `${blendedRoas.toFixed(2)}x`, dark: false },
            { label: 'Total Clicks', value: totalClicks.toLocaleString(), dark: false },
            { label: 'Avg CTR', value: `${avgCtr.toFixed(2)}%`, dark: false },
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
                fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['8xl'],
                letterSpacing: letterSpacing.tight, color: dark ? colors.accent : colors.ink,
              }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ AI INSIGHTS ═══ */}
      {hasData && (
        <div style={{ marginBottom: 48 }}>
          {!analysis ? (
            <div style={{
              background: colors.ink, borderRadius: radius['3xl'], padding: '32px 40px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
            <div>
              {/* Date range label */}
              <div style={{
                fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.muted,
                marginBottom: 8,
              }}>
                Analyzed {analysisTimeRange || TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label || 'Custom range'}{analysisTimestamp ? ` \u00b7 ${new Date(analysisTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
              </div>

              {/* Headline */}
              <div style={{
                fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['5xl'],
                lineHeight: 1.3, color: colors.ink, marginBottom: 32,
              }}>{analysis.headline}</div>

              {/* Insights list */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {analysis.insights.map((insight, i) => {
                  const dotColor = insight.priority === 'high' ? colors.danger : insight.priority === 'medium' ? colors.warning : colors.gray500
                  const typeBadge = actionBadgeStyle(insight.type)
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 20, padding: '20px 0',
                      borderBottom: i < analysis.insights.length - 1 ? `1px solid ${colors.border}` : 'none',
                    }}>
                      {/* Left: priority dot + type badge */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 72, paddingTop: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor }} />
                        <span style={{
                          fontFamily: font.heading, fontWeight: fontWeight.bold, fontSize: fontSize['2xs'],
                          textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                          background: typeBadge.bg, color: typeBadge.color,
                          padding: '2px 8px', borderRadius: radius.pill, whiteSpace: 'nowrap',
                        }}>{insight.type}</span>
                      </div>

                      {/* Center: title + detail */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
                          textTransform: 'uppercase', color: colors.ink, marginBottom: 4,
                        }}>{insight.title}</div>
                        <div style={{
                          fontSize: fontSize.body, color: colors.muted, lineHeight: 1.6,
                        }}>{insight.detail}</div>
                      </div>

                      {/* Right: action callout */}
                      <div style={{ flexShrink: 0, width: 320 }}>
                        <div style={{
                          fontFamily: font.mono, fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
                          letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.muted,
                          marginBottom: 6,
                        }}>{'\u2192'} Action</div>
                        <div style={{
                          fontSize: fontSize.body, color: colors.ink, fontWeight: fontWeight.semibold,
                          background: colors.cream, padding: '10px 14px', borderRadius: radius.lg,
                          border: `1px solid ${colors.border}`, lineHeight: 1.5,
                        }}>{insight.action}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Re-analyze button */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button onClick={analyzeData} disabled={analyzing} style={{
                  background: colors.ink, color: colors.accent, fontFamily: font.heading,
                  fontWeight: fontWeight.bold, fontSize: fontSize.xs, padding: '10px 28px',
                  borderRadius: radius.pill, border: 'none', cursor: analyzing ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                  opacity: analyzing ? 0.5 : 1,
                }}>
                  {analyzing ? 'Analyzing...' : `Re-analyze \u00b7 ${TIME_RANGE_OPTIONS.find(o => o.value === timeRange)?.label || 'Custom range'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION 2B — GRAPHS ROW (line + bar side by side) ═══ */}
      {hasData && aggRows.length > 0 && (
        <div style={{ display: 'flex', gap: 20, marginBottom: 48 }}>

          {/* LEFT — account-level metrics over time (~65%) */}
          <div style={{ flex: '0 0 65%', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: colors.accent }} />
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['3xl'], textTransform: 'uppercase' as const }}>Performance Over Time</div>
            </div>
            <div style={{
              background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius['3xl'],
              padding: '24px 20px 16px', boxShadow: shadow.card, height: 380,
            }}>
              {chartData.length > 1 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontFamily: font.mono, fontSize: 10, fill: colors.muted }}
                        tickFormatter={v => { const d = new Date(v + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}` }}
                        stroke={colors.border}
                        interval={Math.ceil(chartData.length / 10) - 1}
                        angle={-35}
                        textAnchor="end"
                        height={40}
                      />
                      {/* Left Y-axis — dollars (Spend + Revenue bars) */}
                      <YAxis
                        yAxisId="left"
                        tick={{ fontFamily: font.mono, fontSize: 10, fill: colors.muted }}
                        tickFormatter={v => { const n = Number(v); return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }}
                        stroke={colors.border}
                        width={56}
                      />
                      {/* Right Y-axis — ROAS ratio */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontFamily: font.mono, fontSize: 10, fill: colors.gray700 }}
                        tickFormatter={v => `${Number(v).toFixed(1)}x`}
                        stroke={colors.border}
                        width={44}
                      />
                      <Tooltip
                        contentStyle={{
                          background: colors.ink, border: 'none', borderRadius: radius.lg,
                          fontFamily: font.mono, fontSize: 11, color: colors.paper,
                        }}
                        labelStyle={{ color: colors.accent, fontWeight: fontWeight.bold, marginBottom: 4 }}
                        formatter={(value: number, name: string) => {
                          if (name === 'roas') return [`${value.toFixed(2)}x`, 'ROAS']
                          const label = name === 'spend' ? 'Spend' : 'Revenue'
                          return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label]
                        }}
                        labelFormatter={v => { const d = new Date(v + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                      />
                      <Bar yAxisId="left" dataKey="spend" fill={colors.accent} opacity={0.85} radius={[3, 3, 0, 0]} />
                      <Bar yAxisId="left" dataKey="revenue" fill={colors.border} opacity={0.7} radius={[3, 3, 0, 0]} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="roas"
                        stroke={colors.gray700}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0, fill: colors.gray700 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
                    {[
                      { label: 'Spend', type: 'bar' as const, color: colors.accent },
                      { label: 'Revenue', type: 'bar' as const, color: colors.border },
                      { label: 'ROAS', type: 'line' as const, color: colors.gray700 },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {item.type === 'bar' ? (
                          <div style={{ width: 14, height: 10, borderRadius: 2, background: item.color, opacity: item.label === 'Revenue' ? 0.7 : 0.85 }} />
                        ) : (
                          <div style={{ width: 20, height: 0, borderTop: `2px dashed ${item.color}` }} />
                        )}
                        <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted, fontFamily: font.mono, fontSize: fontSize.caption }}>
                  Not enough daily data to chart
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — top 5 ads by spend bar chart (~35%) */}
          <div style={{ flex: '0 0 calc(35% - 20px)', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: colors.accent }} />
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['3xl'], textTransform: 'uppercase' as const }}>Top 5 Ads by Spend</div>
            </div>
            <div style={{
              background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius['3xl'],
              padding: '24px 20px 16px', boxShadow: shadow.card, height: 380,
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[...aggRows].sort((a, b) => b.spend - a.spend).slice(0, 5).map(r => ({
                    name: shortAdName(r.ad_name),
                    spend: Math.round(r.spend * 100) / 100,
                    fullName: r.ad_name,
                  }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontFamily: font.mono, fontSize: 9, fill: colors.muted }}
                    stroke={colors.border}
                    interval={0}
                    tickFormatter={v => v.length > 14 ? v.slice(0, 12) + '...' : v}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontFamily: font.mono, fontSize: 10, fill: colors.muted }}
                    tickFormatter={v => { const n = Number(v); return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }}
                    stroke={colors.border}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{
                      background: colors.ink, border: 'none', borderRadius: radius.lg,
                      fontFamily: font.mono, fontSize: 11, color: colors.paper,
                    }}
                    labelStyle={{ color: colors.accent, fontWeight: fontWeight.bold, marginBottom: 4 }}
                    formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Spend']}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar dataKey="spend" fill={colors.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ═══ SECTION 3 — BEST PERFORMING CREATIVES ═══ */}
      {topCreatives.length > 0 && (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader title="Best Performing Creatives" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {topCreatives.map((r, i) => {
              const creativeType = parseCreativeType(r.ad_name)
              const sparkPoints = sparklineData[r.ad_name]
              const hasChart = sparkPoints && sparkPoints.length >= 2
              let declining = false
              if (hasChart) declining = sparkPoints[sparkPoints.length - 1].roas < sparkPoints[0].roas

              return (
                <div key={i} style={{
                  display: 'flex', gap: 20,
                  background: colors.paper, borderRadius: radius['3xl'],
                  border: `1px solid ${colors.border}`, overflow: 'hidden',
                  boxShadow: shadow.card, padding: 20,
                }}>
                  {/* LEFT — creative card (~40%) */}
                  <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Thumbnail + name + sales badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                      {r.creative_image_url && (
                        <img
                          src={r.creative_image_url}
                          alt={shortAdName(r.ad_name)}
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: radius.md, border: `1px solid ${colors.border}`, flexShrink: 0 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
                          textTransform: 'uppercase', letterSpacing: letterSpacing.slight, color: colors.ink,
                          lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{shortAdName(r.ad_name)}</div>
                        <div style={{
                          background: colors.accent, color: colors.ink,
                          fontFamily: font.heading, fontWeight: fontWeight.heading,
                          fontSize: fontSize['2xs'], padding: '2px 8px', borderRadius: radius.pill,
                          display: 'inline-block', marginTop: 4, lineHeight: 1.3,
                        }}>{r.purchases} sales / {r.roas.toFixed(2)}x</div>
                      </div>
                    </div>

                    {/* Category tag */}
                    {creativeType && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{
                          fontSize: fontSize['2xs'], fontWeight: fontWeight.bold,
                          background: creativeType.color, color: colors.ink,
                          padding: '2px 8px', borderRadius: radius.pill,
                          textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                        }}>{creativeType.label}</span>
                      </div>
                    )}

                    {/* Body text */}
                    {r.creative_body && (
                      <div style={{
                        fontSize: fontSize.body, color: colors.muted, lineHeight: 1.6, marginBottom: 12,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }}>{r.creative_body}</div>
                    )}

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

                    {/* Inspire button */}
                    <button
                      onClick={() => copyPrompt(`Generate a creative inspired by "${shortAdName(r.ad_name)}" — ${r.roas.toFixed(2)}x ROAS, ${r.purchases} purchases, $${r.cpa.toFixed(0)} CPA. Copy angle: "${r.creative_body?.slice(0, 100)}". Match this style and hook.`, `inspire-card-${i}`)}
                      style={{
                        width: '100%', background: copied === `inspire-card-${i}` ? colors.success : colors.ink,
                        color: copied === `inspire-card-${i}` ? colors.paper : colors.accent,
                        fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.xs,
                        padding: '10px', borderRadius: radius.lg, border: 'none', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: letterSpacing.wide, transition: 'all 0.15s',
                        marginTop: 'auto',
                      }}
                    >{copied === `inspire-card-${i}` ? '\u2713 Copied!' : '\u2192 Inspire Creative'}</button>
                  </div>

                  {/* RIGHT — Spend / Revenue / ROAS chart (~60%) */}
                  <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                      fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.caption,
                      textTransform: 'uppercase', letterSpacing: letterSpacing.wide, color: colors.muted,
                      marginBottom: 8,
                    }}>{shortAdName(r.ad_name)}</div>
                    {hasChart ? (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <ComposedChart data={sparkPoints} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                            <XAxis
                              dataKey="date"
                              tick={{ fontFamily: font.mono, fontSize: 9, fill: colors.muted }}
                              tickFormatter={v => { const d = new Date(v + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}` }}
                              stroke={colors.border}
                              interval={Math.ceil(sparkPoints.length / 10) - 1}
                              angle={-35}
                              textAnchor="end"
                              height={40}
                            />
                            <YAxis
                              yAxisId="left"
                              tick={{ fontFamily: font.mono, fontSize: 9, fill: colors.muted }}
                              tickFormatter={v => { const n = Number(v); return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }}
                              stroke={colors.border}
                              width={46}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              tick={{ fontFamily: font.mono, fontSize: 9, fill: colors.gray700 }}
                              tickFormatter={v => `${Number(v).toFixed(1)}x`}
                              stroke={colors.border}
                              width={36}
                            />
                            <Tooltip
                              contentStyle={{
                                background: colors.ink, border: 'none', borderRadius: radius.lg,
                                fontFamily: font.mono, fontSize: 11, color: colors.paper,
                              }}
                              labelStyle={{ color: colors.accent, fontWeight: fontWeight.bold, marginBottom: 4 }}
                              formatter={(value: number, name: string) => {
                                if (name === 'roas') return [`${value.toFixed(2)}x`, 'ROAS']
                                const label = name === 'spend' ? 'Spend' : 'Revenue'
                                return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label]
                              }}
                              labelFormatter={v => { const d = new Date(v + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
                            />
                            <Bar yAxisId="left" dataKey="spend" fill={colors.accent} opacity={0.85} radius={[3, 3, 0, 0]} />
                            <Bar yAxisId="left" dataKey="revenue" fill={colors.border} opacity={0.7} radius={[3, 3, 0, 0]} />
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="roas"
                              stroke={declining ? colors.dangerSoft : colors.accent}
                              strokeWidth={1.5}
                              strokeDasharray="4 3"
                              dot={false}
                              activeDot={{ r: 3, strokeWidth: 0, fill: declining ? colors.dangerSoft : colors.accent }}
                              isAnimationActive={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 12, height: 8, borderRadius: 2, background: colors.accent, opacity: 0.85 }} />
                            <span style={{ fontFamily: font.mono, fontSize: 9, color: colors.muted }}>Spend</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 12, height: 8, borderRadius: 2, background: colors.border, opacity: 0.7 }} />
                            <span style={{ fontFamily: font.mono, fontSize: 9, color: colors.muted }}>Revenue</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 16, height: 0, borderTop: `2px dashed ${declining ? colors.dangerSoft : colors.accent}` }} />
                            <span style={{ fontFamily: font.mono, fontSize: 9, color: colors.muted }}>ROAS</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{
                        height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: colors.muted, fontFamily: font.mono, fontSize: fontSize.caption,
                        border: `1px dashed ${colors.border}`, borderRadius: radius.lg,
                      }}>
                        Not enough daily data
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
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
                    {([
                      { label: 'Impr', key: 'impressions' },
                      { label: 'Clicks', key: 'clicks' },
                      { label: 'CTR', key: 'ctr' },
                      { label: 'Spend', key: 'spend' },
                      { label: 'Purch', key: 'purchases' },
                      { label: 'ROAS', key: 'roas' },
                      { label: 'CPA', key: 'cpa' },
                    ]).map(h => (
                      <th key={h.key} onClick={() => toggleSort(h.key)} style={{
                        textAlign: 'right', padding: '13px 16px',
                        fontFamily: font.heading, fontWeight: fontWeight.heading,
                        textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
                        fontSize: fontSize.xs, color: sortColumn === h.key ? colors.ink : colors.muted,
                        borderBottom: `2px solid ${colors.border}`,
                        position: 'sticky', top: 0, background: colors.cream, zIndex: 1,
                        whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
                        transition: 'color 0.15s',
                      }}>{h.label}{sortArrow(h.key)}</th>
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
                  {sortedAggRows.map((r, i) => {
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
