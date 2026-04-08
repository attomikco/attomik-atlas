'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

// ── Column mapping ──────────────────────────────────────────────
const COL_MAP: Record<string, string> = {
  'campaign name': 'campaign_name',
  'ad set name': 'ad_set_name',
  'age': 'age',
  'gender': 'gender',
  'placement': 'placement',
  'impressions': 'impressions',
  'clicks': 'clicks',
  'ctr': 'ctr',
  'amount spent': 'spend',
  'amount spent (usd)': 'spend',
  'results': 'results',
  'cost per result': 'cost_per_result',
  'reporting starts': 'date_start',
  'reporting ends': 'date_end',
  'day': 'date_start',
}

function mapRow(raw: Record<string, string>): Record<string, any> | null {
  const mapped: Record<string, any> = {}
  for (const [csvCol, val] of Object.entries(raw)) {
    const key = COL_MAP[csvCol]
    if (key) mapped[key] = val
  }
  if (!mapped.campaign_name && !mapped.impressions) return null
  // Parse numerics
  mapped.impressions = parseInt(mapped.impressions) || 0
  mapped.clicks = parseInt(mapped.clicks) || 0
  mapped.ctr = parseFloat(String(mapped.ctr || '0').replace('%', '')) || 0
  mapped.spend = parseFloat(String(mapped.spend || '0').replace(/[$,]/g, '')) || 0
  mapped.results = parseInt(mapped.results) || 0
  mapped.cost_per_result = parseFloat(String(mapped.cost_per_result || '0').replace(/[$,]/g, '')) || 0
  // Use date_start as the row date
  mapped.date = mapped.date_start || null
  return mapped
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
  topInsights: string[]
  angles: { angle: string; reasoning: string }[]
  audiences: { segment: string; reasoning: string }[]
  offers: { offer: string; reasoning: string }[]
}

// ═════════════════════════════════════════════════════════════════
export default function InsightsPage() {
  const router = useRouter()
  const { activeBrandId, setActiveCampaignId } = useBrand()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploads, setUploads] = useState<InsightUpload[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [launching, setLaunching] = useState<string | null>(null)

  // Load upload history
  useEffect(() => {
    if (!activeBrandId) return
    supabase
      .from('brand_insights')
      .select('id, csv_filename, uploaded_at, date_range_start, date_range_end, row_count')
      .eq('brand_id', activeBrandId)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => setUploads(data || []))
  }, [activeBrandId])

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

    // Fetch existing keys to deduplicate
    const { data: existing } = await supabase
      .from('brand_insight_rows')
      .select('date, campaign_name, ad_set_name, age, gender, placement')
      .eq('brand_id', activeBrandId)

    const existingKeys = new Set(
      (existing || []).map(r => `${r.date}|${r.campaign_name}|${r.ad_set_name}|${r.age}|${r.gender}|${r.placement}`)
    )

    const newRows = mappedRows.filter(r => {
      const key = `${r.date}|${r.campaign_name}|${r.ad_set_name}|${r.age}|${r.gender}|${r.placement}`
      return !existingKeys.has(key)
    })

    const dupeCount = mappedRows.length - newRows.length

    // Compute date range
    const dates = mappedRows.map(r => r.date).filter(Boolean).sort()
    const dateStart = dates[0] || null
    const dateEnd = dates[dates.length - 1] || null

    // Get user
    const { data: { user } } = await supabase.auth.getUser()

    // Insert insight record
    const { data: insight } = await supabase.from('brand_insights').insert({
      brand_id: activeBrandId,
      user_id: user?.id,
      csv_filename: file.name,
      date_range_start: dateStart,
      date_range_end: dateEnd,
      row_count: newRows.length,
    }).select().single()

    // Insert rows in batches
    if (insight && newRows.length > 0) {
      const BATCH = 200
      for (let i = 0; i < newRows.length; i += BATCH) {
        const batch = newRows.slice(i, i + BATCH).map(r => ({
          brand_id: activeBrandId,
          insight_id: insight.id,
          date: r.date,
          campaign_name: r.campaign_name || '',
          ad_set_name: r.ad_set_name || '',
          age: r.age || '',
          gender: r.gender || '',
          placement: r.placement || '',
          impressions: r.impressions,
          clicks: r.clicks,
          ctr: r.ctr,
          spend: r.spend,
          results: r.results,
          cost_per_result: r.cost_per_result,
        }))
        await supabase.from('brand_insight_rows').upsert(batch, { onConflict: 'brand_id,date,campaign_name,ad_set_name,age,gender,placement', ignoreDuplicates: true })
      }
    }

    setUploadResult(`${newRows.length} new rows added${dupeCount > 0 ? `, ${dupeCount} duplicates skipped` : ''}`)
    // Refresh uploads
    const { data: refreshed } = await supabase
      .from('brand_insights')
      .select('id, csv_filename, uploaded_at, date_range_start, date_range_end, row_count')
      .eq('brand_id', activeBrandId)
      .order('uploaded_at', { ascending: false })
    setUploads(refreshed || [])
    setUploading(false)
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

    // Fetch all rows
    const { data: rows } = await supabase
      .from('brand_insight_rows')
      .select('*')
      .eq('brand_id', activeBrandId)

    if (!rows || rows.length === 0) {
      setAnalyzing(false)
      return
    }

    // Aggregate by segments
    type Agg = { spend: number; clicks: number; impressions: number; results: number; ctr_sum: number; cpr_sum: number; count: number }
    const byAge: Record<string, Agg> = {}
    const byGender: Record<string, Agg> = {}
    const byPlacement: Record<string, Agg> = {}
    const byCampaign: Record<string, Agg> = {}

    function addTo(map: Record<string, Agg>, key: string, r: any) {
      if (!key) return
      if (!map[key]) map[key] = { spend: 0, clicks: 0, impressions: 0, results: 0, ctr_sum: 0, cpr_sum: 0, count: 0 }
      map[key].spend += r.spend || 0
      map[key].clicks += r.clicks || 0
      map[key].impressions += r.impressions || 0
      map[key].results += r.results || 0
      map[key].ctr_sum += r.ctr || 0
      map[key].cpr_sum += r.cost_per_result || 0
      map[key].count++
    }

    for (const r of rows) {
      addTo(byAge, r.age, r)
      addTo(byGender, r.gender, r)
      addTo(byPlacement, r.placement, r)
      addTo(byCampaign, r.campaign_name, r)
    }

    function formatAgg(map: Record<string, Agg>): string {
      return Object.entries(map)
        .sort((a, b) => b[1].spend - a[1].spend)
        .slice(0, 15)
        .map(([k, v]) => `${k}: $${v.spend.toFixed(2)} spend, ${v.clicks} clicks, ${v.impressions} impr, avg CTR ${(v.ctr_sum / v.count).toFixed(2)}%, ${v.results} results, avg CPR $${v.count > 0 ? (v.cpr_sum / v.count).toFixed(2) : '0'}`)
        .join('\n')
    }

    const aggregatedData = `TOTAL ROWS: ${rows.length}

BY AGE:
${formatAgg(byAge)}

BY GENDER:
${formatAgg(byGender)}

BY PLACEMENT:
${formatAgg(byPlacement)}

BY CAMPAIGN (top 15 by spend):
${formatAgg(byCampaign)}`

    try {
      const res = await fetch('/api/insights/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: activeBrandId, aggregatedData }),
      })
      const data = await res.json()
      if (data.summary) setAnalysis(data)
    } catch (e) {
      console.error('Analysis failed:', e)
    }
    setAnalyzing(false)
  }

  // ── Launch campaign ───────────────────────────────────────────
  async function launchCampaign(goal: string, angle: string, keyMessage: string) {
    if (!activeBrandId) return
    const key = `${goal}|${angle}`
    setLaunching(key)
    const { data } = await supabase.from('campaigns').insert({
      brand_id: activeBrandId,
      name: goal.slice(0, 60),
      type: 'funnel',
      status: 'draft',
      goal,
      angle,
      key_message: keyMessage,
    }).select().single()
    if (data) {
      setActiveCampaignId(data.id)
      router.push('/creatives')
    }
    setLaunching(null)
  }

  if (!activeBrandId) return null

  // ── Styles ────────────────────────────────────────────────────
  const sectionHeading: React.CSSProperties = {
    fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['8xl'],
    textTransform: 'uppercase', color: colors.ink, marginBottom: 8,
  }
  const sectionSub: React.CSSProperties = {
    fontSize: fontSize.lg, color: colors.muted, lineHeight: 1.6, maxWidth: 500, marginBottom: 24,
  }
  const cardStyle: React.CSSProperties = {
    background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius['3xl'],
    padding: 24, boxShadow: shadow.card,
  }
  const btnPrimary: React.CSSProperties = {
    background: colors.accent, color: colors.ink, fontFamily: font.heading,
    fontWeight: fontWeight.extrabold, fontSize: fontSize.md, padding: '12px 28px',
    borderRadius: radius.pill, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide,
  }
  const btnSmall: React.CSSProperties = {
    background: colors.ink, color: colors.accent, fontFamily: font.heading,
    fontWeight: fontWeight.bold, fontSize: fontSize.sm, padding: '8px 16px',
    borderRadius: radius.pill, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide, whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ═══ SECTION 1: Upload ═══ */}
      <div style={{ marginBottom: 48 }}>
        <div style={sectionHeading}>Insights</div>
        <div style={sectionSub}>Upload your Meta Ads CSV to unlock AI-powered performance analysis.</div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            ...cardStyle,
            border: dragOver ? `2px dashed ${colors.accent}` : `2px dashed ${colors.border}`,
            background: dragOver ? colors.accentAlpha6 : colors.paper,
            textAlign: 'center', padding: '48px 24px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <input ref={fileRef} type="file" accept=".csv" onChange={onFileSelect} style={{ display: 'none' }} />
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#8682;</div>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md,
            textTransform: 'uppercase', letterSpacing: letterSpacing.wider, color: colors.ink, marginBottom: 8,
          }}>
            {uploading ? 'Processing...' : 'Drop your Meta Ads CSV here'}
          </div>
          <div style={{ fontSize: fontSize.body, color: colors.muted }}>
            or click to browse. We&apos;ll parse and deduplicate automatically.
          </div>
        </div>

        {/* Upload result */}
        {uploadResult && (
          <div style={{
            marginTop: 12, padding: '12px 16px', background: colors.accentAlpha8,
            borderRadius: radius.lg, fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.brandGreen,
          }}>
            {uploadResult}
          </div>
        )}

        {/* Upload history */}
        {uploads.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.caption, fontWeight: fontWeight.bold,
              letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.muted, marginBottom: 12,
            }}>
              Upload History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uploads.map(u => (
                <div key={u.id} style={{
                  ...cardStyle, padding: '14px 20px',
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
      </div>

      {/* ═══ SECTION 2: AI Analysis ═══ */}
      <div>
        <div style={sectionHeading}>AI Analysis</div>
        <div style={sectionSub}>Let AI find your best-performing segments, angles, and audiences.</div>

        <button onClick={analyzeData} disabled={analyzing || uploads.length === 0} style={{
          ...btnPrimary,
          opacity: (analyzing || uploads.length === 0) ? 0.5 : 1,
          cursor: (analyzing || uploads.length === 0) ? 'not-allowed' : 'pointer',
          marginBottom: 32,
        }}>
          {analyzing ? 'Analyzing...' : 'Analyze with AI'}
        </button>

        {uploads.length === 0 && !analysis && (
          <div style={{ fontSize: fontSize.body, color: colors.disabled, marginTop: -16 }}>
            Upload a CSV first to enable analysis.
          </div>
        )}

        {analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Summary */}
            <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.accent}` }}>
              <div style={{
                fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.accent, marginBottom: 8,
              }}>Summary</div>
              <div style={{ fontSize: fontSize.lg, color: colors.ink, lineHeight: 1.7 }}>{analysis.summary}</div>
            </div>

            {/* Top Insights */}
            <div>
              <div style={{
                fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
                letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.accent, marginBottom: 12,
              }}>Top Insights</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {analysis.topInsights.map((insight, i) => (
                  <div key={i} style={{
                    background: colors.ink, color: colors.paper, borderRadius: radius['2xl'],
                    padding: 20, borderLeft: `3px solid ${colors.accent}`,
                    fontSize: fontSize.body, lineHeight: 1.6,
                  }}>
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Angles */}
            <RecommendationList
              label="Recommended Angles"
              items={analysis.angles.map(a => ({ title: a.angle, reasoning: a.reasoning }))}
              onLaunch={(title, reasoning) => launchCampaign(title, title, reasoning)}
              launching={launching}
              btnStyle={btnSmall}
            />

            {/* Recommended Audiences */}
            <RecommendationList
              label="Recommended Audiences"
              items={analysis.audiences.map(a => ({ title: a.segment, reasoning: a.reasoning }))}
              onLaunch={(title, reasoning) => launchCampaign(title, '', reasoning)}
              launching={launching}
              btnStyle={btnSmall}
            />

            {/* Recommended Offers */}
            <RecommendationList
              label="Recommended Offers"
              items={analysis.offers.map(o => ({ title: o.offer, reasoning: o.reasoning }))}
              onLaunch={(title, reasoning) => launchCampaign(title, '', reasoning)}
              launching={launching}
              btnStyle={btnSmall}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Recommendation list component ───────────────────────────────
function RecommendationList({ label, items, onLaunch, launching, btnStyle }: {
  label: string
  items: { title: string; reasoning: string }[]
  onLaunch: (title: string, reasoning: string) => void
  launching: string | null
  btnStyle: React.CSSProperties
}) {
  if (items.length === 0) return null
  return (
    <div>
      <div style={{
        fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
        letterSpacing: letterSpacing.wider, textTransform: 'uppercase', color: colors.accent, marginBottom: 12,
      }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => {
          const key = `${item.title}|${item.title}`
          return (
            <div key={i} style={{
              background: colors.paper, border: `1px solid ${colors.border}`, borderRadius: radius['2xl'],
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              boxShadow: shadow.card,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.ink, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: fontSize.sm, color: colors.muted, lineHeight: 1.5 }}>{item.reasoning}</div>
              </div>
              <button
                onClick={() => onLaunch(item.title, item.reasoning)}
                disabled={launching === key}
                style={{ ...btnStyle, opacity: launching === key ? 0.5 : 1 }}
              >
                {launching === key ? 'Creating...' : 'Launch Campaign'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
