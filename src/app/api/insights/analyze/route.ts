import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Parse creative type from ad name
function parseCreativeType(adName: string): string {
  const lower = adName.toLowerCase()
  if (lower.includes('ugc') || lower.includes('billo')) return 'UGC'
  if (lower.includes(' ai ') || lower.startsWith('ai ') || lower.includes('ai-')) return 'AI Creative'
  if (lower.includes('shar')) return 'Influencer'
  return 'Other'
}

interface AggRow {
  ad_name: string
  creative_type: string
  impressions: number
  clicks: number
  spend: number
  purchases: number
  purchase_value: number
  // CTR and ROAS are ratio-of-totals over the window, NOT averages of
  // per-day stored rates. The "avg_" prefix was dropped when those
  // averaging bugs were fixed.
  ctr: number
  roas: number
  avg_cpa: number
}

export async function POST(req: NextRequest) {
  const { brandId, rows, timeRange } = await req.json()
  if (!brandId || !rows) return NextResponse.json({ error: 'brandId and rows required' }, { status: 400 })

  const supabase = await createClient()

  const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  // Aggregate rows by ad_name
  const map: Record<string, { impressions: number; clicks: number; spend: number; purchases: number; purchase_value: number; count: number }> = {}
  for (const r of rows) {
    const name = r.ad_name || '(no ad name)'
    if (!map[name]) map[name] = { impressions: 0, clicks: 0, spend: 0, purchases: 0, purchase_value: 0, count: 0 }
    map[name].impressions += r.impressions || 0
    map[name].clicks += r.clicks || 0
    map[name].spend += r.spend || 0
    map[name].purchases += r.purchases || 0
    map[name].purchase_value += r.purchase_value || 0
    map[name].count++
  }

  const aggregated: AggRow[] = Object.entries(map).map(([name, v]) => ({
    ad_name: name,
    creative_type: parseCreativeType(name),
    impressions: v.impressions,
    clicks: v.clicks,
    spend: v.spend,
    purchases: v.purchases,
    purchase_value: v.purchase_value,
    // Per-ad CTR as ratio-of-totals (matches ROAS pattern). Averaging
    // per-day stored CTR across days weights every day equally regardless
    // of impression volume — wrong for multi-day ads with variable reach.
    // × 100 keeps the percentage format the prompt expects (CTR X.XX%).
    ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
    // Per-ad ROAS as ratio-of-totals. Previously this averaged per-day
    // stored ROAS, which is mathematically wrong for multi-day ads and
    // was feeding skewed numbers to Claude in the per-creative breakdown.
    roas: v.spend > 0 ? v.purchase_value / v.spend : 0,
    avg_cpa: v.purchases > 0 ? v.spend / v.purchases : 0,
  }))
  aggregated.sort((a, b) => b.spend - a.spend)

  // Also aggregate by creative type
  const byType: Record<string, { spend: number; purchases: number; purchase_value: number; impressions: number; clicks: number; count: number }> = {}
  for (const a of aggregated) {
    if (!byType[a.creative_type]) byType[a.creative_type] = { spend: 0, purchases: 0, purchase_value: 0, impressions: 0, clicks: 0, count: 0 }
    byType[a.creative_type].spend += a.spend
    byType[a.creative_type].purchases += a.purchases
    byType[a.creative_type].purchase_value += a.purchase_value
    byType[a.creative_type].impressions += a.impressions
    byType[a.creative_type].clicks += a.clicks
    byType[a.creative_type].count++
  }

  const typeBreakdown = Object.entries(byType)
    .map(([type, v]) => `${type}: ${v.count} ads, $${v.spend.toFixed(2)} spend, ${v.purchases} purchases, $${v.purchase_value.toFixed(2)} revenue, ROAS ${v.purchases > 0 ? (v.purchase_value / v.spend).toFixed(2) : '0'}x`)
    .join('\n')

  const adBreakdown = aggregated.slice(0, 20)
    .map(a => `"${a.ad_name}" [${a.creative_type}]: $${a.spend.toFixed(2)} spend, ${a.impressions} impr, ${a.clicks} clicks, CTR ${a.ctr.toFixed(2)}%, ${a.purchases} purchases, ROAS ${a.roas.toFixed(2)}x, CPA ${a.avg_cpa > 0 ? '$' + a.avg_cpa.toFixed(2) : 'N/A'}`)
    .join('\n')

  const totalSpend = aggregated.reduce((s, a) => s + a.spend, 0)
  const totalPurchases = aggregated.reduce((s, a) => s + a.purchases, 0)
  const totalRevenue = aggregated.reduce((s, a) => s + a.purchase_value, 0)

  const systemPrompt = buildBrandSystemPrompt(brand)

  const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0'

  const userPrompt = `You are a creative strategist analyzing Meta Ads performance for a DTC brand (${brand.name}).
Meta Advantage+ automatically allocates budget across ads, so do not recommend pausing or killing specific ads — budget decisions are handled by the platform.

Your job is to find creative and marketing insights: what messaging is resonating, what creative formats are working, what angles to double down on, what to test next, and what the data suggests about the audience.

Use the performance data to draw conclusions about WHY certain creatives are working — not just THAT they are working. Think about hooks, format, creator type, offer framing, and emotional angle.

TIME RANGE: ${timeRange === '7d' ? 'Last 7 days' : timeRange === '14d' ? 'Last 14 days' : timeRange === '30d' ? 'Last 30 days' : timeRange === '90d' ? 'Last 90 days' : 'Custom range'}

ACCOUNT TOTALS:
- Spend: $${totalSpend.toFixed(2)}
- Revenue: $${totalRevenue.toFixed(2)}
- ROAS: ${overallRoas}x
- Purchases: ${totalPurchases}
- Ads tracked: ${aggregated.length}

BY CREATIVE TYPE:
${typeBreakdown}

PER-CREATIVE METRICS (up to 20, sorted by spend):
${adBreakdown}

Return exactly 4 insights as ONLY valid JSON. No markdown, no preamble, no explanation. Each must:
- Reference a specific ad by name with its actual numbers
- Explain what the data suggests about the creative or audience
- Give a concrete creative or marketing action (not a budget action)
- Use type: "scale" (replicate this creative angle), "test" (try this variation), "watch" (monitor this trend), or "learn" (key audience or messaging insight)
- Never recommend pausing, killing, or reducing spend on any ad

JSON shape:
{
  "headline": "One sentence. The most important creative insight from this period. Specific.",
  "insights": [
    {
      "title": "Short title 3-5 words",
      "detail": "2-3 sentences. What the data shows and what it means creatively.",
      "action": "One concrete creative or marketing next step. Start with a verb.",
      "priority": "high | medium | low",
      "type": "scale | test | watch | learn"
    }
  ]
}

Order by priority (high first). No generic observations. No budget recommendations.`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}
