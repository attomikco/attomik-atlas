// Retention-audit orchestrator.
//
// The only file in src/lib/audit/ that does I/O — it stitches together the
// Klaviyo fetcher, parallel copy analysis, and the pure scoring / coverage /
// fixes modules into a single AuditReport. Copy-analysis failures degrade
// gracefully: we fall back to a neutral CopyAnalysisInput and record a
// warning rather than aborting the whole audit.

import { getBenchmark } from './benchmarks.ts'
import {
  CopyAnalysisError,
  CopyAnalysisTruncationError,
  analyzeCopy,
} from './copyAnalyzer.ts'
import { computeCoverage } from './coverage.ts'
import { fetchAuditData } from './fetchAuditData.ts'
import type { AuditContext } from './fetchAuditData.ts'
import { computeRevenueLeftOnTable, generateFixes } from './fixes.ts'
import { scoreFlow } from './scoring.ts'
import type {
  AuditReport,
  AuditWarning,
  BrandVoiceContext,
  CopyAnalysisInput,
  Flow,
  FlowScore,
} from './types.ts'
import type { KlaviyoClient } from '../klaviyo/klaviyoClient.ts'

export type { BrandVoiceContext } from './types.ts'

export type RunAuditOptions = {
  brandId: string
  klaviyoClient: KlaviyoClient
  brandVoice: BrandVoiceContext
  anthropicApiKey: string
  performanceWindowDays?: number
  monthlyOrders?: number
  aov?: number
  fetchImpl?: typeof fetch
}

const NEUTRAL_COPY: CopyAnalysisInput = {
  brandVoiceConsistency: 0.5,
  hasSpecificValueProps: true,
  handlesObjections: true,
  subjectLineVariance: 0.5,
  subjectLineQuality: 0.5,
  issues: [],
  strengths: [],
}

function gradeFor(total: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (total >= 90) return 'A'
  if (total >= 75) return 'B'
  if (total >= 60) return 'C'
  if (total >= 40) return 'D'
  return 'F'
}

function overallFlowAverage(scores: FlowScore[], flows: Flow[]): number {
  if (scores.length === 0) return 0
  const totalSent = flows.reduce((s, f) => s + (f.performance.sent || 0), 0)
  if (totalSent === 0) {
    // Simple average fallback
    return scores.reduce((s, x) => s + x.totalScore, 0) / scores.length
  }
  const byFlow = new Map(flows.map(f => [f.id, f]))
  let accum = 0
  let weight = 0
  for (const s of scores) {
    const sent = byFlow.get(s.flowId)?.performance.sent ?? 0
    if (sent > 0) {
      accum += s.totalScore * sent
      weight += sent
    }
  }
  if (weight === 0) {
    return scores.reduce((s, x) => s + x.totalScore, 0) / scores.length
  }
  return accum / weight
}

export async function runAudit(opts: RunAuditOptions): Promise<AuditReport> {
  // 1. Klaviyo data — fetch layer returns its own warnings (performance
  //    failure, skipped flows, etc.). We inherit them so every signal the
  //    pipeline observed lands in the final report.
  const context: AuditContext = await fetchAuditData({
    client: opts.klaviyoClient,
    brandId: opts.brandId,
    performanceWindowDays: opts.performanceWindowDays,
  })
  const warnings: AuditWarning[] = [...context.warnings]

  // 2. Parallel copy analysis, one per flow. allSettled so one failure doesn't
  //    abort the batch.
  const copyResults = await Promise.allSettled(
    context.flows.map(flow =>
      analyzeCopy({
        flow,
        brandVoice: opts.brandVoice,
        anthropicApiKey: opts.anthropicApiKey,
        fetchImpl: opts.fetchImpl,
      }),
    ),
  )

  // 3. Score each flow, folding in the copy result (or neutral fallback + warning).
  const flowScores: FlowScore[] = context.flows.map((flow, i) => {
    const result = copyResults[i]
    let copy: CopyAnalysisInput
    if (result.status === 'fulfilled') {
      copy = result.value
    } else {
      copy = NEUTRAL_COPY
      const reason = result.reason
      const detail = reason instanceof CopyAnalysisError ? reason.message : String(reason)
      const code = reason instanceof CopyAnalysisTruncationError
        ? 'COPY_ANALYSIS_TRUNCATED'
        : 'COPY_ANALYSIS_FAILED'
      warnings.push({
        code,
        message: `Copy analysis unavailable for this flow: ${detail}`,
        affectedFlowIds: [flow.id],
      })
    }
    const benchmark = getBenchmark(flow.stage)
    return scoreFlow(flow, benchmark, copy)
  })

  // 4. Coverage
  const coverage = computeCoverage(context.flows)

  // 5. Overall score: weighted flow average × 0.7 + coverage × 0.3
  const flowAverage = overallFlowAverage(flowScores, context.flows)
  const overallScoreRaw = flowAverage * 0.7 + coverage.coverageScore * 0.3
  const overallScore = Math.round(overallScoreRaw)

  // 6. Fixes + revenue-left-on-the-table
  const prioritizedFixes = generateFixes(context.flows, flowScores, coverage, context, {
    monthlyOrders: opts.monthlyOrders,
    aov: opts.aov,
  })
  const revenueLeft = computeRevenueLeftOnTable(prioritizedFixes)

  // 7. Flag "no performance data" only when the perf fetch actually succeeded
  //    and genuinely returned zero sends. If PERFORMANCE_FETCH_FAILED is
  //    already present, that warning already explains the missing data —
  //    emitting both is redundant noise.
  const perfFetchFailed = warnings.some(w => w.code === 'PERFORMANCE_FETCH_FAILED' || w.code === 'NO_CONVERSION_METRIC')
  if (
    !perfFetchFailed
    && context.flows.length > 0
    && context.flows.every(f => (f.performance.sent || 0) === 0)
  ) {
    warnings.push({
      code: 'NO_PERFORMANCE_DATA',
      message: `No flow sends in the last ${context.performanceWindowDays} days. The brand may not have sent emails recently, or all flows are below Klaviyo's reporting threshold. Performance scoring used neutral fallbacks.`,
    })
  }

  return {
    brandId: opts.brandId,
    generatedAt: new Date().toISOString(),
    overallScore,
    overallGrade: gradeFor(overallScore),
    coverage,
    flowScores,
    prioritizedFixes,
    revenueLeftOnTable: {
      annual: { low: revenueLeft.low, high: revenueLeft.high },
      methodology: revenueLeft.methodology,
    },
    warnings,
    flowFetchSummary: context.flowFetchSummary,
    context: {
      totalFlows: context.flows.length,
      totalSubscribers: context.totalSubscribers,
      performanceWindowDays: context.performanceWindowDays,
      senderEmail: context.account.senderEmail,
    },
  }
}
