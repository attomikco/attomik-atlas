// Klaviyo → AuditContext transformer.
//
// Orchestrates the calls the retention audit needs and reshapes Klaviyo's
// responses into the normalized Flow[] that scoring.ts consumes. All
// classification is delegated to classifier.ts; all transport is delegated
// to KlaviyoClient. This file's job is the plumbing in between, plus the
// crude HTML heuristics we use on message bodies.
//
// Klaviyo API endpoints consumed:
//   GET  /accounts                          — sender info, currency
//   GET  /flows?filter=...                  — live, non-archived flows
//   GET  /flows/{id}/flow-actions           — per-flow structure (messages, delays, branching)
//   GET  /flow-messages/{id}                — per-message content (subject, preview, body HTML)
//   POST /flow-series-reports               — per-flow + per-message performance for the window
//   GET  /segments                          — segment list (count only, for the audit context)
//
// Assumed Klaviyo permissions / scopes (for when we swap the raw private API
// key for OAuth later): `accounts:read`, `flows:read`, `segments:read`,
// `metrics:read`, `events:read` (the reports endpoint aggregates events).
// No write scopes are needed — the audit is read-only.

import type {
  KlaviyoAccount,
  KlaviyoFlow,
  KlaviyoFlowAction,
  KlaviyoFlowMessage,
  KlaviyoListResponse,
  KlaviyoSegment,
  KlaviyoSingleResponse,
} from '../klaviyo/types.ts'
import { KlaviyoClient } from '../klaviyo/klaviyoClient.ts'
import { classifyFlow } from './classifier.ts'
import type {
  AuditWarning,
  Flow,
  FlowFetchSummary,
  FlowMessage,
  FlowPerformance,
} from './types.ts'

export type AuditContext = {
  brandId: string
  fetchedAt: string
  account: {
    senderEmail: string
    senderName: string
    currency: string
  }
  flows: Flow[]
  totalSubscribers: number
  totalSegments: number
  performanceWindowDays: number
  warnings: AuditWarning[]
  flowFetchSummary: FlowFetchSummary
}

export type FetchAuditDataOptions = {
  client: KlaviyoClient
  brandId: string
  performanceWindowDays?: number
}

// --- HTML heuristics -------------------------------------------------------

// Intentionally crude — fine for keyword analysis, not for layout inspection.
// If we ever need layout-aware parsing, move to parse5 behind a server-side
// boundary.
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countImageTags(html: string): number {
  const m = html.match(/<img\b/gi)
  return m ? m.length : 0
}

export function countAnchorTags(html: string): number {
  const m = html.match(/<a\b/gi)
  return m ? m.length : 0
}

export function countWords(text: string): number {
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}

export function computeImageToTextRatio(html: string): number {
  const images = countImageTags(html)
  const words = countWords(stripHtmlToText(html))
  const denom = images + Math.max(words / 50, 1)
  const ratio = images / denom
  if (!Number.isFinite(ratio)) return 0
  return Math.max(0, Math.min(1, ratio))
}

export function detectMobileOptimized(html: string): boolean {
  if (!html) return false
  if (/<meta[^>]+viewport/i.test(html)) return true
  if (/@media[^{]*\([^)]*max-width/i.test(html)) return true
  if (/<table[^>]+role=["']presentation["']/i.test(html)) return true
  return false
}

export function detectUnsubscribeLink(html: string): boolean {
  return /href=["'][^"']*unsubscribe/i.test(html) || /\{\{\s*unsubscribe_link/i.test(html)
}

export function detectPreferenceLink(html: string): boolean {
  return /href=["'][^"']*preference/i.test(html) || /\{\{\s*manage_preferences/i.test(html)
}

// --- Delay + structure -----------------------------------------------------

/** Normalize a Klaviyo TIME_DELAY setting block to hours. */
export function normalizeDelayToHours(settings: Record<string, unknown>): number {
  const value = Number(settings.value ?? settings.delay_value ?? 0)
  if (!Number.isFinite(value) || value <= 0) return 0

  const rawUnit = String(settings.unit ?? settings.delay_unit ?? 'hours').toLowerCase()
  switch (rawUnit) {
    case 'second':
    case 'seconds':
      return value / 3600
    case 'minute':
    case 'minutes':
      return value / 60
    case 'hour':
    case 'hours':
      return value
    case 'day':
    case 'days':
      return value * 24
    case 'week':
    case 'weeks':
      return value * 24 * 7
    default:
      return value
  }
}

// --- Performance -----------------------------------------------------------
//
// Klaviyo returns flow-series statistics as TIME-SERIES ARRAYS index-aligned
// to `data.attributes.date_times` — not scalars. For `interval: 'daily'` over
// 90 days, each stat is a 90-element array (e.g. `opens_unique: [12, 15, …]`).
// We sum the arrays to get window totals, then derive rates from the summed
// counts (opens_unique_total / recipients_total, etc.). Deriving rates from
// summed counts is more accurate than averaging daily rates — a day with
// 1000 sends and 40% open rate contributes correctly, whereas averaging
// weights a 10-send day the same as a 10,000-send day.
//
// The previous implementation treated each stat as a scalar and relied on
// `Number([…])`, which silently coerces multi-element arrays to NaN. That
// was the root cause of the "no performance data for any flow" warning in
// the Afterdream audit — the endpoint 400'd anyway because
// `conversion_metric_id` was missing, but even a successful response would
// have been silently corrupted by the scalar reader.

type StatValue = number | number[] | null | undefined

type PerformanceReportRow = {
  groupings: { flow_id?: string; flow_message_id?: string; send_channel?: string }
  statistics: Record<string, StatValue>
}

type PerformanceReportResponse = {
  data: {
    attributes: {
      results: PerformanceReportRow[]
      date_times?: string[]
    }
  }
}

function sumStat(v: StatValue): number {
  if (v == null) return 0
  if (Array.isArray(v)) {
    let total = 0
    for (const n of v) {
      if (typeof n === 'number' && Number.isFinite(n)) total += n
    }
    return total
  }
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return 0
}

function rowToPerformance(row: PerformanceReportRow | undefined): FlowPerformance {
  if (!row) {
    return {
      sent: 0,
      openRate: null,
      clickRate: null,
      conversionRate: null,
      revenuePerRecipient: null,
    }
  }
  const s = row.statistics
  const recipients = sumStat(s.recipients ?? s.delivered)
  const opens = sumStat(s.opens_unique)
  const clicks = sumStat(s.clicks_unique)
  const convUniques = sumStat(s.conversion_uniques)
  const revenue = sumStat(s.conversion_value)

  if (recipients === 0) {
    return {
      sent: 0,
      openRate: null,
      clickRate: null,
      conversionRate: null,
      revenuePerRecipient: null,
    }
  }

  return {
    sent: recipients,
    openRate: opens / recipients,
    clickRate: clicks / recipients,
    conversionRate: convUniques / recipients,
    revenuePerRecipient: revenue / recipients,
  }
}

function aggregateFlowPerformance(messages: FlowMessage[]): FlowPerformance {
  const withSends = messages.filter(m => m.performance.sent > 0)
  const totalSent = withSends.reduce((s, m) => s + m.performance.sent, 0)

  if (totalSent === 0) {
    return {
      sent: 0,
      openRate: null,
      clickRate: null,
      conversionRate: null,
      revenuePerRecipient: null,
    }
  }

  const weighted = (key: keyof FlowPerformance): number | null => {
    let accum = 0
    let weight = 0
    for (const m of withSends) {
      const v = m.performance[key]
      if (typeof v === 'number') {
        accum += v * m.performance.sent
        weight += m.performance.sent
      }
    }
    return weight > 0 ? accum / weight : null
  }

  return {
    sent: totalSent,
    openRate: weighted('openRate'),
    clickRate: weighted('clickRate'),
    conversionRate: weighted('conversionRate'),
    revenuePerRecipient: weighted('revenuePerRecipient'),
  }
}

// --- Main orchestration ----------------------------------------------------

const FLOW_FILTER = `equals(status,"live"),equals(archived,false)`

// Klaviyo requires a `conversion_metric_id` on every /flow-series-reports
// request. The ID is account-specific — discovered via GET /metrics. We try
// a name-filtered lookup first (cheap, one page) and fall back to a full
// paginated scan (expensive, only if the filter endpoint isn't cooperating).
// If neither yields a "Placed Order" metric, we skip the performance fetch
// and surface a NO_CONVERSION_METRIC warning — callers see "no performance
// data" instead of a cryptic 400.
async function findPlacedOrderMetricId(client: KlaviyoClient): Promise<string | null> {
  type MetricRow = { id: string; attributes: { name: string } }
  try {
    const filtered = await client.request<KlaviyoListResponse<MetricRow>>(
      '/metrics?filter=' + encodeURIComponent('equals(name,"Placed Order")'),
    )
    const hit = filtered.data?.[0]
    if (hit?.id) return hit.id
  } catch (err) {
    console.warn(`[audit] metric name-filter failed, falling back to paginated scan: ${String(err)}`)
  }
  try {
    const all = await client.paginate<MetricRow>('/metrics')
    const hit = all.find(m => m.attributes?.name?.toLowerCase() === 'placed order')
    return hit?.id ?? null
  } catch (err) {
    console.error(`[audit] paginated metrics scan failed: ${String(err)}`)
    return null
  }
}

// Default is 60 days — Klaviyo's `daily` interval caps at 60d. Longer
// windows require `weekly` or `monthly` interval (see selectInterval). We
// keep the default at the daily-interval cap so the common case returns the
// most granular data.
const DEFAULT_PERFORMANCE_WINDOW_DAYS = 60

export async function fetchAuditData(opts: FetchAuditDataOptions): Promise<AuditContext> {
  const { client, brandId } = opts
  const performanceWindowDays = opts.performanceWindowDays ?? DEFAULT_PERFORMANCE_WINDOW_DAYS
  const warnings: AuditWarning[] = []

  // 1. Account — hard requirement
  const accountRes = await client.request<{ data: KlaviyoAccount[] }>('/accounts')
  const account = accountRes.data?.[0]
  if (!account) throw new Error('Klaviyo /accounts returned no rows')

  // 2. Flows (live, non-archived) — hard requirement
  const rawFlows = await client.paginate<KlaviyoFlow>(
    `/flows?filter=${encodeURIComponent(FLOW_FILTER)}`,
  )
  console.log(
    `[audit] fetched ${rawFlows.length} live, non-archived flows: ${rawFlows.map(f => f.attributes?.name ?? f.id).join(', ')}`,
  )

  // 3. Performance — soft requirement. Requires a conversion_metric_id.
  const perfByFlow = new Map<string, PerformanceReportRow>()
  const perfByMessage = new Map<string, PerformanceReportRow>()
  const conversionMetricId = await findPlacedOrderMetricId(client)

  if (!conversionMetricId) {
    warnings.push({
      code: 'NO_CONVERSION_METRIC',
      message:
        'Could not find a "Placed Order" metric in this Klaviyo account. Performance scoring will use neutral fallbacks.',
    })
  } else {
    try {
      const body = buildFlowSeriesReportBody(performanceWindowDays, conversionMetricId)
      const perf = await client.request<PerformanceReportResponse>('/flow-series-reports', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      for (const row of perf.data?.attributes?.results ?? []) {
        if (row.groupings.flow_message_id) perfByMessage.set(row.groupings.flow_message_id, row)
        else if (row.groupings.flow_id) perfByFlow.set(row.groupings.flow_id, row)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Loud: this is a real failure, not a "might happen" warning. It
      // silently crippled the Afterdream audit; never let this go quiet
      // again.
      console.error(`[audit] flow-series-reports failed: ${msg}`)
      warnings.push({
        code: 'PERFORMANCE_FETCH_FAILED',
        message: `Klaviyo flow performance fetch failed: ${msg}. Performance scoring used neutral fallbacks.`,
      })
    }
  }

  // 4. Per-flow transformation — soft per-flow (skip failing flows)
  const flows: Flow[] = []
  for (const raw of rawFlows) {
    try {
      const flow = await transformFlow(client, raw, perfByMessage, perfByFlow)
      flows.push(flow)
    } catch (err) {
      const name = raw.attributes?.name ?? 'unnamed'
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[audit] skipping flow ${raw.id} (${name}): ${msg}`)
      warnings.push({
        code: 'FLOW_FETCH_FAILED',
        message: `Skipped flow "${name}": ${msg}`,
        affectedFlowIds: [raw.id],
      })
    }
  }

  // 5. Segments — best-effort, non-fatal
  let totalSegments = 0
  try {
    const segs = await client.paginate<KlaviyoSegment>('/segments')
    totalSegments = segs.length
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[audit] segments fetch failed: ${msg}`)
    warnings.push({
      code: 'SEGMENTS_FETCH_FAILED',
      message: `Klaviyo segments fetch failed: ${msg}. Segment count in the report is not authoritative.`,
    })
  }

  return {
    brandId,
    fetchedAt: new Date().toISOString(),
    account: {
      senderEmail: account.attributes.contact_information.default_sender_email,
      senderName: account.attributes.contact_information.default_sender_name,
      currency: account.attributes.preferred_currency,
    },
    flows,
    totalSubscribers: 0,
    totalSegments,
    performanceWindowDays,
    warnings,
    flowFetchSummary: {
      totalFlowsReturned: rawFlows.length,
      filterApplied: FLOW_FILTER,
    },
  }
}

// Klaviyo caps interval granularity per window length:
//   daily   → max 60-day window
//   weekly  → max ~1 year (365 days)
//   monthly → longer windows
// If we ask for `daily` on a 90-day window the endpoint 400s with
// "Cannot pass in an interval longer than 60 days for use with daily
// interval." Auto-select so the caller can change the window without
// separately keeping the interval in sync.
export function selectInterval(windowDays: number): 'daily' | 'weekly' | 'monthly' {
  if (windowDays <= 60) return 'daily'
  if (windowDays <= 365) return 'weekly'
  return 'monthly'
}

// Klaviyo's preset timeframe keys only cover a few specific windows —
// `last_30_days` and `last_60_days` are the ones we care about. Anything
// else requires a custom { start, end } timeframe. We compute ISO
// timestamps UTC-aligned so the boundary is deterministic across time
// zones.
export function buildTimeframe(windowDays: number): { key: string } | { start: string; end: string } {
  if (windowDays === 30) return { key: 'last_30_days' }
  if (windowDays === 60) return { key: 'last_60_days' }
  const end = new Date()
  const start = new Date()
  start.setUTCDate(end.getUTCDate() - windowDays)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function buildFlowSeriesReportBody(
  windowDays: number,
  conversionMetricId: string,
): unknown {
  return {
    data: {
      type: 'flow-series-report',
      attributes: {
        // Raw counts. We derive open/click/conversion rates from totals in
        // rowToPerformance — more accurate than averaging daily rates.
        statistics: [
          'recipients',
          'opens_unique',
          'clicks_unique',
          'conversion_uniques',
          'conversion_value',
        ],
        timeframe: buildTimeframe(windowDays),
        interval: selectInterval(windowDays),
        conversion_metric_id: conversionMetricId,
        // No group_by here — Klaviyo auto-groups by flow_id +
        // flow_message_id + send_channel and returns a `groupings` field per
        // result. Manually setting group_by isn't part of the v2024-10-15
        // request schema.
      },
    },
  }
}

async function transformFlow(
  client: KlaviyoClient,
  raw: KlaviyoFlow,
  perfByMessage: Map<string, PerformanceReportRow>,
  perfByFlow: Map<string, PerformanceReportRow>,
): Promise<Flow> {
  const actionsRes = await client.request<{ data: KlaviyoFlowAction[] }>(
    `/flows/${raw.id}/flow-actions`,
  )
  const actions = actionsRes.data ?? []

  const hasBranching = actions.some(a => a.attributes.action_type === 'CONDITIONAL_SPLIT')
  const hasExitCondition = actions.some(a => {
    if (a.attributes.action_type !== 'CONDITIONAL_SPLIT') return false
    const dump = JSON.stringify(a.attributes.settings || {}).toLowerCase()
    return dump.includes('purchase') || dump.includes('placed_order') || dump.includes('exit_on_')
  })

  // Walk actions, tracking cumulative delay, building FlowMessage[]
  const messages: FlowMessage[] = []
  let pendingDelayHours = 0
  let position = 0

  for (const action of actions) {
    const type = action.attributes.action_type
    if (type === 'TIME_DELAY') {
      pendingDelayHours += normalizeDelayToHours(action.attributes.settings || {})
      continue
    }
    if (type !== 'SEND_EMAIL') continue

    try {
      const msgRes = await client.request<KlaviyoSingleResponse<KlaviyoFlowMessage>>(
        `/flow-messages/${action.id}`,
      )
      const msg = msgRes.data
      const html = typeof msg.attributes.content.body === 'string' ? msg.attributes.content.body : ''
      const bodyText = stripHtmlToText(html)

      messages.push({
        id: msg.id,
        position,
        delayHours: pendingDelayHours,
        subjectLine: msg.attributes.content.subject || '',
        previewText: msg.attributes.content.preview_text ?? null,
        bodyText,
        hasImages: countImageTags(html) > 0,
        imageToTextRatio: computeImageToTextRatio(html),
        ctaCount: countAnchorTags(html),
        isMobileOptimized: detectMobileOptimized(html),
        hasUnsubscribeLink: detectUnsubscribeLink(html),
        hasPreferenceLink: detectPreferenceLink(html),
        performance: rowToPerformance(perfByMessage.get(msg.id)),
      })

      position += 1
      pendingDelayHours = 0
    } catch (err) {
      console.warn(`[audit] skipping message ${action.id} in flow ${raw.id}: ${String(err)}`)
    }
  }

  const classification = classifyFlow({
    name: raw.attributes.name,
    triggerType: raw.attributes.trigger_type,
    triggerMetricName: undefined, // Klaviyo flows endpoint doesn't inline the metric name;
    // the orchestrator can enrich with a metric lookup later if we need high-confidence classification.
  })

  // Prefer the flow-level report row if present; otherwise derive from messages.
  const flowPerf = perfByFlow.has(raw.id)
    ? rowToPerformance(perfByFlow.get(raw.id))
    : aggregateFlowPerformance(messages)

  return {
    id: raw.id,
    name: raw.attributes.name,
    stage: classification.stage,
    isLive: raw.attributes.status === 'live' && !raw.attributes.archived,
    messages,
    filters: [], // Klaviyo's filter shape isn't exposed on the flow list endpoint;
    // segmentation scoring degrades gracefully (zeros out the filter slots).
    // The orchestrator can enrich from /flows/{id}?include=trigger-filters later.
    hasExitCondition,
    hasBranching,
    performance: flowPerf,
  }
}
