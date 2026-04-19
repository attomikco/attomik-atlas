// Lifecycle coverage computation — pure, no I/O.
//
// Answers: "which lifecycle stages does this brand have flows for, and which
// of the required ones are missing?" The 'campaign' stage is a catch-all for
// one-off sends and is excluded from coverage logic — it wouldn't make sense
// to mark a brand as having "campaign coverage" since every brand has
// campaigns.

import { getCriticalStages, getRequiredStages } from './benchmarks.ts'
import type { CoverageReport, Flow, LifecycleStage } from './types.ts'

const ALL_LIFECYCLE_STAGES: LifecycleStage[] = [
  'welcome',
  'browse_abandonment',
  'abandoned_cart',
  'abandoned_checkout',
  'post_purchase',
  'win_back',
  'vip',
  'sunset',
  'subscription_churn',
  'replenishment',
]

export function computeCoverage(flows: Flow[]): CoverageReport {
  const present = Array.from(
    new Set(flows.map(f => f.stage).filter(s => s !== 'campaign')),
  ) as LifecycleStage[]

  const missing = ALL_LIFECYCLE_STAGES.filter(s => !present.includes(s))

  const critical = getCriticalStages()
  const required = getRequiredStages()

  const missingCritical = missing.filter(s => critical.includes(s))
  const missingHighPriority = missing.filter(s => required.includes(s))

  const coverageScore =
    required.length === 0
      ? 100
      : Math.round(((required.length - missingHighPriority.length) / required.length) * 100)

  return {
    present,
    missing,
    missingCritical,
    missingHighPriority,
    coverageScore,
  }
}
