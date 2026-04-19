// Per-flow scoring engine for the retention audit.
//
// Pure and deterministic — no fetch, no fs, no AI calls. The copy dimension
// consumes a pre-computed `CopyAnalysisInput` that the orchestrator fills in
// (that's where the Claude call lives). Keeping scoring.ts I/O-free makes it
// trivially unit-testable and safe to invoke from anywhere.

import { getMetricBenchmark, scoreAgainstBenchmark } from './benchmarks.ts'
import type {
  CopyAnalysisInput,
  DimensionScore,
  Flow,
  FlowBenchmark,
  FlowMessage,
  FlowMetric,
  FlowScore,
  LifecycleStage,
} from './types.ts'

// --- Structure --------------------------------------------------------------

type SpanWindowHours = { minHours: number; maxHours: number }

const STAGE_SPAN_WINDOWS: Partial<Record<LifecycleStage, SpanWindowHours>> = {
  welcome: { minHours: 5 * 24, maxHours: 14 * 24 },
  abandoned_cart: { minHours: 1 * 24, maxHours: 3 * 24 },
  abandoned_checkout: { minHours: 4, maxHours: 48 },
  browse_abandonment: { minHours: 1 * 24, maxHours: 7 * 24 },
  post_purchase: { minHours: 14 * 24, maxHours: 90 * 24 },
  win_back: { minHours: 14 * 24, maxHours: 30 * 24 },
}

function sequenceSpanHours(messages: FlowMessage[]): number {
  if (messages.length <= 1) return 0
  const sorted = [...messages].sort((a, b) => a.position - b.position)
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    total += sorted[i].delayHours
  }
  return total
}

function hasConsecutiveWithinOneHour(messages: FlowMessage[]): boolean {
  if (messages.length <= 1) return false
  const sorted = [...messages].sort((a, b) => a.position - b.position)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].delayHours < 1) return true
  }
  return false
}

function formatDaysRange(window: SpanWindowHours): string {
  const lowDays = window.minHours / 24
  const highDays = window.maxHours / 24
  const fmt = (n: number) => (n < 1 ? `${n * 24}h` : `${n}d`)
  return `${fmt(lowDays)}–${fmt(highDays)}`
}

function formatSpan(hours: number): string {
  if (hours < 24) return `${Math.round(hours)}h`
  const days = hours / 24
  return Number.isInteger(days) ? `${days}d` : `${days.toFixed(1)}d`
}

export function scoreStructure(flow: Flow): DimensionScore {
  const issues: string[] = []
  const strengths: string[] = []
  let score = 0

  // 5 pts: message count
  const n = flow.messages.length
  if (n >= 3) {
    score += 5
    strengths.push(`Sequence has ${n} messages — enough touchpoints to convert.`)
  } else if (n === 2) {
    score += 3
    issues.push('Two-message sequence — consider adding a third follow-up.')
  } else {
    issues.push('Single-send flow — needs 2-3 follow-ups.')
  }

  // 5 pts: delay quality
  const tooClose = hasConsecutiveWithinOneHour(flow.messages)
  const window = STAGE_SPAN_WINDOWS[flow.stage]
  const span = sequenceSpanHours(flow.messages)

  if (tooClose) {
    issues.push('Two or more messages fire within 1 hour of each other — too aggressive.')
  }

  if (window) {
    if (n >= 2) {
      if (!tooClose && span >= window.minHours && span <= window.maxHours) {
        score += 5
        strengths.push(`Sequence spans ${formatSpan(span)} — within the recommended ${formatDaysRange(window)} for this stage.`)
      } else if (span < window.minHours) {
        issues.push(`Sequence spans only ${formatSpan(span)} — recommended ${formatDaysRange(window)} for ${flow.stage}.`)
      } else if (span > window.maxHours) {
        issues.push(`Sequence spans ${formatSpan(span)} — longer than recommended ${formatDaysRange(window)} for ${flow.stage}.`)
      }
    } else {
      issues.push(`Single-message flow can't span the recommended ${formatDaysRange(window)} for ${flow.stage}.`)
    }
  } else {
    // Other stages — just check no two within 1 hour
    if (!tooClose && n >= 2) {
      score += 5
      strengths.push('Delays between messages are reasonable.')
    }
  }

  // 5 pts: exit condition
  if (flow.hasExitCondition) {
    score += 5
    strengths.push('Has an exit condition — avoids emailing customers who already converted.')
  } else {
    issues.push('No exit condition — risks emailing customers who already purchased.')
  }

  // 5 pts: branching
  if (flow.hasBranching) {
    score += 5
    strengths.push('Uses conditional branching — tailors follow-ups to engagement.')
  } else {
    issues.push('No conditional branching — every recipient gets the same sequence regardless of behavior.')
  }

  return { score, issues, strengths }
}

// --- Performance ------------------------------------------------------------

function bucketFromBenchmarkScore(s: number): number {
  if (s >= 1) return 5
  if (s >= 0.5) return 4
  if (s >= 0) return 3
  if (s >= -0.3) return 2
  if (s >= -0.6) return 1
  return 0
}

const METRIC_LABELS: Record<FlowMetric, string> = {
  openRate: 'Open rate',
  clickRate: 'Click rate',
  conversionRate: 'Conversion rate',
  revenuePerRecipient: 'Revenue per recipient',
}

function formatMetricValue(metric: FlowMetric, v: number): string {
  if (metric === 'revenuePerRecipient') return `$${v.toFixed(2)}`
  return `${(v * 100).toFixed(1)}%`
}

function formatRange(metric: FlowMetric, low: number, high: number): string {
  if (metric === 'revenuePerRecipient') return `$${low.toFixed(2)}–$${high.toFixed(2)}`
  return `${(low * 100).toFixed(0)}-${(high * 100).toFixed(0)}%`
}

export function scorePerformance(flow: Flow, benchmark: FlowBenchmark): DimensionScore {
  const issues: string[] = []
  const strengths: string[] = []
  let score = 0

  const metrics: FlowMetric[] = ['openRate', 'clickRate', 'conversionRate', 'revenuePerRecipient']

  for (const metric of metrics) {
    const value = flow.performance[metric]
    const range = getMetricBenchmark(flow.stage, metric)

    if (value === null) {
      score += 2.5
      issues.push(`No ${METRIC_LABELS[metric].toLowerCase()} data available — flow may be too new or low-volume.`)
      continue
    }

    const benchScore = scoreAgainstBenchmark(value, flow.stage, metric)
    score += bucketFromBenchmarkScore(benchScore)

    if (benchScore >= 0.5) {
      strengths.push(`${METRIC_LABELS[metric]} ${formatMetricValue(metric, value)} is at the top of the ${formatRange(metric, range.low, range.high)} benchmark for ${benchmark.displayName} flows.`)
    } else if (benchScore < 0) {
      issues.push(`${METRIC_LABELS[metric]} ${formatMetricValue(metric, value)} is below the ${formatRange(metric, range.low, range.high)} benchmark for ${benchmark.displayName} flows.`)
    }
  }

  return { score, issues, strengths }
}

// --- Copy -------------------------------------------------------------------

const OBJECTION_STAGES = new Set<LifecycleStage>([
  'abandoned_cart',
  'abandoned_checkout',
  'win_back',
  'subscription_churn',
])

export function scoreCopy(flow: Flow, copyAnalysis: CopyAnalysisInput): DimensionScore {
  let score = 0

  score += copyAnalysis.brandVoiceConsistency * 6
  score += copyAnalysis.hasSpecificValueProps ? 4 : 0

  if (OBJECTION_STAGES.has(flow.stage)) {
    score += copyAnalysis.handlesObjections ? 4 : 0
  } else {
    // Objection handling isn't meaningful for this stage — award full credit.
    score += 4
  }

  score += copyAnalysis.subjectLineVariance * 3
  score += copyAnalysis.subjectLineQuality * 3

  return {
    score,
    issues: [...copyAnalysis.issues],
    strengths: [...copyAnalysis.strengths],
  }
}

// --- Segmentation -----------------------------------------------------------

const ENGAGEMENT_FIELD_TOKENS = ['engagement', 'open', 'click']

function countUniqueTemplateVariables(body: string): number {
  const seen = new Set<string>()
  const mustacheRe = /\{\{\s*([^}|\s]+)[^}]*\}\}/g
  const tagRe = /\{%\s*([^%\s]+)[^%]*%\}/g

  let match: RegExpExecArray | null
  while ((match = mustacheRe.exec(body)) !== null) {
    seen.add(match[1])
  }
  while ((match = tagRe.exec(body)) !== null) {
    seen.add(match[1])
  }
  return seen.size
}

export function scoreSegmentation(flow: Flow): DimensionScore {
  const issues: string[] = []
  const strengths: string[] = []
  let score = 0

  // 5 pts: at least one inclusion filter
  const hasInclusion = flow.filters.some(f => f.type === 'inclusion')
  if (hasInclusion) {
    score += 5
    strengths.push('Has at least one inclusion filter beyond the trigger event.')
  } else {
    issues.push('No inclusion filter — flow fires for every contact that hits the trigger.')
  }

  // 5 pts: exclusion for recent purchasers
  const hasPurchaseExclusion = flow.filters.some(
    f => f.type === 'exclusion' && f.field.toLowerCase().includes('purchase'),
  )
  if (hasPurchaseExclusion) {
    score += 5
    strengths.push('Excludes recent purchasers — avoids annoying converted customers.')
  } else {
    issues.push('No exclusion for recent purchasers — you may be emailing people who just bought.')
  }

  // 5 pts: exclusion for unengaged subscribers
  const hasEngagementExclusion = flow.filters.some(f => {
    if (f.type !== 'exclusion') return false
    const field = f.field.toLowerCase()
    return ENGAGEMENT_FIELD_TOKENS.some(token => field.includes(token))
  })
  if (hasEngagementExclusion) {
    score += 5
    strengths.push('Excludes unengaged subscribers — protects sender reputation.')
  } else {
    issues.push('No exclusion for unengaged subscribers — sending to dead addresses hurts deliverability.')
  }

  // 5 pts: personalization beyond first name
  const hasDeepPersonalization = flow.messages.some(m => countUniqueTemplateVariables(m.bodyText) >= 2)
  if (hasDeepPersonalization) {
    score += 5
    strengths.push('Messages use personalization beyond first name.')
  } else {
    issues.push('Messages don\'t personalize beyond first name — low relevance signal.')
  }

  return { score, issues, strengths }
}

// --- Design -----------------------------------------------------------------

export function scoreDesign(flow: Flow): DimensionScore {
  const issues: string[] = []
  const strengths: string[] = []
  let score = 0

  const messages = flow.messages
  const n = messages.length

  if (n === 0) {
    issues.push('Flow has no messages — nothing to grade on design.')
    return { score: 0, issues, strengths }
  }

  // 5 pts: all messages mobile optimized
  const allMobile = messages.every(m => m.isMobileOptimized)
  if (allMobile) {
    score += 5
    strengths.push('All messages are mobile-optimized.')
  } else {
    const bad = messages.filter(m => !m.isMobileOptimized).length
    issues.push(`${bad} of ${n} messages are not mobile-optimized.`)
  }

  // 5 pts: image-to-text ratio per message (0.2-0.6 healthy)
  const inRange = messages.filter(m => m.imageToTextRatio >= 0.2 && m.imageToTextRatio <= 0.6).length
  const ratioScore = (inRange / n) * 5
  score += ratioScore
  if (inRange === n) {
    strengths.push('Image-to-text ratio is balanced across all messages.')
  } else {
    const offenders = messages.filter(m => m.imageToTextRatio < 0.2 || m.imageToTextRatio > 0.6)
    const tooImage = offenders.filter(m => m.imageToTextRatio > 0.6).length
    const tooText = offenders.filter(m => m.imageToTextRatio < 0.2).length
    if (tooImage > 0) issues.push(`${tooImage} message${tooImage === 1 ? '' : 's'} are image-heavy — risks clipping in Gmail and poor deliverability.`)
    if (tooText > 0) issues.push(`${tooText} message${tooText === 1 ? '' : 's'} are text-heavy with few visuals.`)
  }

  // 5 pts: CTA count — 5 pts if avg ≤ 4, linearly to 0 at avg ≥ 8
  const avgCtas = messages.reduce((s, m) => s + m.ctaCount, 0) / n
  let ctaScore: number
  if (avgCtas <= 4) ctaScore = 5
  else if (avgCtas >= 8) ctaScore = 0
  else ctaScore = 5 * (1 - (avgCtas - 4) / 4)
  score += ctaScore
  if (avgCtas <= 4) {
    strengths.push(`Average ${avgCtas.toFixed(1)} CTAs per email — focused ask.`)
  } else {
    issues.push(`Average ${avgCtas.toFixed(1)} CTAs per email — too many competing asks dilutes the click.`)
  }

  // 5 pts: all messages have unsubscribe AND preference links
  const allCompliant = messages.every(m => m.hasUnsubscribeLink && m.hasPreferenceLink)
  if (allCompliant) {
    score += 5
    strengths.push('All messages include unsubscribe and preference-center links.')
  } else {
    const missingUnsub = messages.filter(m => !m.hasUnsubscribeLink).length
    const missingPref = messages.filter(m => !m.hasPreferenceLink).length
    if (missingUnsub > 0) issues.push(`${missingUnsub} of ${n} messages missing an unsubscribe link — compliance risk.`)
    if (missingPref > 0) issues.push(`${missingPref} of ${n} messages missing a preference-center link.`)
  }

  return { score, issues, strengths }
}

// --- Combined ---------------------------------------------------------------

function gradeFor(total: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (total >= 90) return 'A'
  if (total >= 75) return 'B'
  if (total >= 60) return 'C'
  if (total >= 40) return 'D'
  return 'F'
}

export function scoreFlow(
  flow: Flow,
  benchmark: FlowBenchmark,
  copyAnalysis: CopyAnalysisInput,
): FlowScore {
  const structure = scoreStructure(flow)
  const performance = scorePerformance(flow, benchmark)
  const copy = scoreCopy(flow, copyAnalysis)
  const segmentation = scoreSegmentation(flow)
  const design = scoreDesign(flow)

  const totalScore =
    structure.score + performance.score + copy.score + segmentation.score + design.score

  return {
    flowId: flow.id,
    flowName: flow.name,
    stage: flow.stage,
    totalScore,
    grade: gradeFor(totalScore),
    dimensions: {
      structure,
      performance,
      copy,
      segmentation,
      design,
    },
  }
}
