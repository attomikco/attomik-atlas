// Prioritized fix generation + revenue estimates.
//
// Pure functions, no I/O. Given the output of fetchAuditData + scoring +
// coverage, produces a ranked to-do list the UI can render directly. Revenue
// estimates are deliberately conservative (benchmark low..high × honest
// trigger frequency) so the "revenue left on the table" number isn't a sales
// pitch — it's a floor.

import { getBenchmark, getCriticalStages } from './benchmarks.ts'
import type { AuditContext } from './fetchAuditData.ts'
import type {
  CoverageReport,
  EffortLevel,
  Flow,
  FlowScore,
  LifecycleStage,
  PrioritizedFix,
  RevenueRange,
} from './types.ts'

// --- Revenue estimates -----------------------------------------------------

export type RevenueEstimateInput = {
  stage: LifecycleStage
  totalSubscribers: number
  monthlyOrders?: number
  aov?: number
}

const STAGE_DISPLAY: Record<LifecycleStage, string> = {
  welcome: 'Welcome',
  browse_abandonment: 'Browse Abandonment',
  abandoned_cart: 'Abandoned Cart',
  abandoned_checkout: 'Abandoned Checkout',
  post_purchase: 'Post-Purchase',
  win_back: 'Win-Back',
  vip: 'VIP',
  sunset: 'Sunset',
  subscription_churn: 'Subscription Churn Save',
  replenishment: 'Replenishment Reminder',
  campaign: 'Campaign',
}

function triggersPerYear(input: RevenueEstimateInput): number | null {
  const { stage, totalSubscribers, monthlyOrders } = input
  switch (stage) {
    case 'welcome':
      return totalSubscribers * 0.3
    case 'browse_abandonment':
      return totalSubscribers * 2
    case 'win_back':
      return totalSubscribers * 0.4
    case 'abandoned_cart':
      return monthlyOrders != null ? monthlyOrders * 12 * 3 : null
    case 'abandoned_checkout':
      return monthlyOrders != null ? monthlyOrders * 12 * 1.5 : null
    case 'post_purchase':
      return monthlyOrders != null ? monthlyOrders * 12 : null
    default:
      return null
  }
}

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function formatAudience(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

export function estimateRevenueLift(input: RevenueEstimateInput): RevenueRange | null {
  if (input.aov == null || input.aov <= 0) return null

  const triggers = triggersPerYear(input)
  if (triggers == null || triggers <= 0) return null

  const benchmark = getBenchmark(input.stage)
  const convLow = benchmark.conversionRate.low
  const convHigh = benchmark.conversionRate.high

  const low = triggers * convLow * input.aov
  const high = triggers * convHigh * input.aov

  const convPctLow = (convLow * 100).toFixed(1)
  const convPctHigh = (convHigh * 100).toFixed(1)

  return {
    low,
    high,
    basis: `Based on ~${formatAudience(triggers)} eligible triggers/year × ${convPctLow}-${convPctHigh}% benchmark conversion × ${formatCurrency(input.aov)} AOV`,
  }
}

// --- Fix generation --------------------------------------------------------

const AUTOGEN_EXCLUDED_STAGES = new Set<LifecycleStage>(['sunset'])

function effortForBrokenFlow(grade: FlowScore['grade']): EffortLevel {
  if (grade === 'F') return 'medium'
  return 'low'
}

function missingFlowFix(
  stage: LifecycleStage,
  priority: 1 | 2 | 3,
  context: AuditContext,
  monthlyOrders: number | undefined,
  aov: number | undefined,
): PrioritizedFix {
  const canAutoGenerate = !AUTOGEN_EXCLUDED_STAGES.has(stage)
  const displayName = STAGE_DISPLAY[stage]
  return {
    id: `fix_missing_flow_${stage}`,
    priority,
    type: 'missing_flow',
    stage,
    title: `Missing ${displayName.toLowerCase()} flow`,
    description: `No live ${displayName} flow is running. Brands with this flow typically capture material incremental revenue from it.`,
    estimatedRevenueLift: estimateRevenueLift({
      stage,
      totalSubscribers: context.totalSubscribers,
      monthlyOrders,
      aov,
    }),
    effortLevel: 'medium',
    canAutoGenerate,
  }
}

function brokenFlowFix(
  flow: Flow,
  score: FlowScore,
  priority: 1 | 2 | 3,
): PrioritizedFix {
  return {
    id: `fix_broken_flow_${flow.stage}_${flow.id}`,
    priority,
    type: 'broken_flow',
    stage: flow.stage,
    title: `Rebuild underperforming ${STAGE_DISPLAY[flow.stage]} flow: ${flow.name}`,
    description: `This flow scored ${score.totalScore}/100 (grade ${score.grade}). It's live but leaving meaningful conversion and revenue on the table.`,
    estimatedRevenueLift: null,
    effortLevel: effortForBrokenFlow(score.grade),
    canAutoGenerate: true,
    relatedFlowId: flow.id,
  }
}

function underperformingFlowFix(
  flow: Flow,
  score: FlowScore,
): PrioritizedFix {
  return {
    id: `fix_underperforming_flow_${flow.stage}_${flow.id}`,
    priority: 3,
    type: 'underperforming_flow',
    stage: flow.stage,
    title: `Tune ${STAGE_DISPLAY[flow.stage]} flow: ${flow.name}`,
    description: `This flow scored ${score.totalScore}/100 (grade ${score.grade}). A few targeted edits should move it into the B range.`,
    estimatedRevenueLift: null,
    effortLevel: 'low',
    canAutoGenerate: true,
    relatedFlowId: flow.id,
  }
}

const MEDIUM_PRIORITY_MISSING_STAGES: LifecycleStage[] = ['vip', 'sunset', 'replenishment']

function sortFixes(fixes: PrioritizedFix[]): PrioritizedFix[] {
  return [...fixes].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    const aLift = a.estimatedRevenueLift?.low ?? -Infinity
    const bLift = b.estimatedRevenueLift?.low ?? -Infinity
    // nulls last → non-null first
    const aNull = a.estimatedRevenueLift == null
    const bNull = b.estimatedRevenueLift == null
    if (aNull !== bNull) return aNull ? 1 : -1
    return bLift - aLift
  })
}

export type FixGeneratorExtras = {
  monthlyOrders?: number
  aov?: number
}

export function generateFixes(
  flows: Flow[],
  flowScores: FlowScore[],
  coverage: CoverageReport,
  context: AuditContext,
  extras: FixGeneratorExtras = {},
): PrioritizedFix[] {
  const { monthlyOrders, aov } = extras
  const fixes: PrioritizedFix[] = []
  const scoresByFlow = new Map(flowScores.map(s => [s.flowId, s]))

  // 1. Missing critical stages
  for (const stage of coverage.missingCritical) {
    fixes.push(missingFlowFix(stage, 1, context, monthlyOrders, aov))
  }

  // 2. Missing high-priority (non-critical) stages
  const highPriorityOnly = coverage.missingHighPriority.filter(
    s => !coverage.missingCritical.includes(s),
  )
  for (const stage of highPriorityOnly) {
    fixes.push(missingFlowFix(stage, 2, context, monthlyOrders, aov))
  }

  // 3. Missing medium stages — only ones the spec mentions (vip/sunset/replenishment)
  for (const stage of MEDIUM_PRIORITY_MISSING_STAGES) {
    if (coverage.missing.includes(stage)) {
      fixes.push(missingFlowFix(stage, 3, context, monthlyOrders, aov))
    }
  }

  // 4. Broken / underperforming flows
  const criticalSet = new Set<LifecycleStage>(getCriticalStages())
  for (const flow of flows) {
    const score = scoresByFlow.get(flow.id)
    if (!score) continue

    if (score.grade === 'D' || score.grade === 'F') {
      const priority = criticalSet.has(flow.stage) ? 1 : 2
      fixes.push(brokenFlowFix(flow, score, priority))
    } else if (score.grade === 'C') {
      fixes.push(underperformingFlowFix(flow, score))
    }
  }

  return sortFixes(fixes)
}

// --- Revenue left on the table --------------------------------------------

export function computeRevenueLeftOnTable(
  fixes: PrioritizedFix[],
): { low: number; high: number; methodology: string } {
  let low = 0
  let high = 0
  let counted = 0

  for (const fix of fixes) {
    if (fix.priority === 3) continue
    if (!fix.estimatedRevenueLift) continue
    low += fix.estimatedRevenueLift.low
    high += fix.estimatedRevenueLift.high
    counted += 1
  }

  const methodology = [
    `Summed the annual revenue ranges from ${counted} priority-1 and priority-2 fixes with estimable lift.`,
    `Priority-3 fixes (tuning passes, medium-urgency missing flows) are excluded to keep the estimate conservative.`,
    `Each range is benchmark low-to-high conversion × estimated eligible triggers/year × AOV.`,
  ].join(' ')

  return { low, high, methodology }
}
