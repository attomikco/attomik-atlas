// 2026 DTC email benchmarks — compiled 2026-04-18 from public Klaviyo, Omnisend,
// and Shopify Plus industry reports plus internal Attomik client averages.
// Rates are stored as decimals (0.45 = 45%). Revenue per recipient is in USD.
// Review and refresh annually — benchmark drift is real and stale targets will
// make the audit over- or under-grade brands.

import type {
  BenchmarkRange,
  FlowBenchmark,
  FlowMetric,
  LifecycleStage,
} from '@/lib/audit/types'

export const DTC_BENCHMARKS_2026: Record<LifecycleStage, FlowBenchmark> = {
  welcome: {
    stage: 'welcome',
    displayName: 'Welcome',
    isCritical: true,
    isHighPriority: false,
    openRate: { low: 0.45, high: 0.55 },
    clickRate: { low: 0.06, high: 0.10 },
    conversionRate: { low: 0.03, high: 0.05 },
    revenuePerRecipient: { low: 2.50, high: 4.00 },
  },
  browse_abandonment: {
    stage: 'browse_abandonment',
    displayName: 'Browse Abandonment',
    isCritical: false,
    isHighPriority: true,
    openRate: { low: 0.35, high: 0.45 },
    clickRate: { low: 0.03, high: 0.05 },
    conversionRate: { low: 0.01, high: 0.02 },
    revenuePerRecipient: { low: 0.80, high: 1.50 },
  },
  abandoned_cart: {
    stage: 'abandoned_cart',
    displayName: 'Abandoned Cart',
    isCritical: true,
    isHighPriority: false,
    openRate: { low: 0.40, high: 0.50 },
    clickRate: { low: 0.05, high: 0.08 },
    conversionRate: { low: 0.04, high: 0.07 },
    revenuePerRecipient: { low: 5.00, high: 10.00 },
  },
  abandoned_checkout: {
    stage: 'abandoned_checkout',
    displayName: 'Abandoned Checkout',
    isCritical: true,
    isHighPriority: false,
    openRate: { low: 0.50, high: 0.60 },
    clickRate: { low: 0.08, high: 0.12 },
    conversionRate: { low: 0.08, high: 0.15 },
    revenuePerRecipient: { low: 15.00, high: 25.00 },
  },
  post_purchase: {
    stage: 'post_purchase',
    displayName: 'Post-Purchase',
    isCritical: true,
    isHighPriority: false,
    openRate: { low: 0.50, high: 0.65 },
    clickRate: { low: 0.04, high: 0.08 },
    conversionRate: { low: 0.02, high: 0.04 },
    revenuePerRecipient: { low: 1.50, high: 3.00 },
  },
  win_back: {
    stage: 'win_back',
    displayName: 'Win-Back',
    isCritical: false,
    isHighPriority: true,
    openRate: { low: 0.25, high: 0.35 },
    clickRate: { low: 0.02, high: 0.04 },
    conversionRate: { low: 0.01, high: 0.02 },
    revenuePerRecipient: { low: 0.50, high: 1.50 },
  },
  vip: {
    stage: 'vip',
    displayName: 'VIP',
    isCritical: false,
    isHighPriority: false,
    openRate: { low: 0.50, high: 0.60 },
    clickRate: { low: 0.08, high: 0.12 },
    conversionRate: { low: 0.05, high: 0.08 },
    revenuePerRecipient: { low: 4.00, high: 8.00 },
  },
  sunset: {
    stage: 'sunset',
    displayName: 'Sunset',
    isCritical: false,
    isHighPriority: false,
    openRate: { low: 0.15, high: 0.25 },
    clickRate: { low: 0.01, high: 0.02 },
    conversionRate: { low: 0.005, high: 0.01 },
    revenuePerRecipient: { low: 0.10, high: 0.30 },
  },
  subscription_churn: {
    stage: 'subscription_churn',
    displayName: 'Subscription Churn Save',
    isCritical: false,
    isHighPriority: true,
    openRate: { low: 0.40, high: 0.50 },
    clickRate: { low: 0.05, high: 0.08 },
    conversionRate: { low: 0.03, high: 0.06 },
    revenuePerRecipient: { low: 3.00, high: 6.00 },
  },
  replenishment: {
    stage: 'replenishment',
    displayName: 'Replenishment Reminder',
    isCritical: false,
    isHighPriority: false,
    openRate: { low: 0.45, high: 0.55 },
    clickRate: { low: 0.06, high: 0.10 },
    conversionRate: { low: 0.04, high: 0.08 },
    revenuePerRecipient: { low: 4.00, high: 8.00 },
  },
  campaign: {
    stage: 'campaign',
    displayName: 'Campaign (one-off)',
    isCritical: false,
    isHighPriority: false,
    openRate: { low: 0.30, high: 0.40 },
    clickRate: { low: 0.015, high: 0.03 },
    conversionRate: { low: 0.005, high: 0.015 },
    revenuePerRecipient: { low: 0.10, high: 0.30 },
  },
}

export function getBenchmark(stage: LifecycleStage): FlowBenchmark {
  return DTC_BENCHMARKS_2026[stage]
}

export function getMetricBenchmark(stage: LifecycleStage, metric: FlowMetric): BenchmarkRange {
  return DTC_BENCHMARKS_2026[stage][metric]
}

export function scoreAgainstBenchmark(
  actualValue: number,
  stage: LifecycleStage,
  metric: FlowMetric,
): number {
  const { low, high } = getMetricBenchmark(stage, metric)
  if (actualValue >= high) return 1
  if (actualValue <= low) {
    if (low === 0) return 0
    const normalized = (actualValue - low) / low
    return Math.max(-1, Math.min(0, normalized))
  }
  return (actualValue - low) / (high - low)
}

export function getCriticalStages(): LifecycleStage[] {
  return (Object.values(DTC_BENCHMARKS_2026) as FlowBenchmark[])
    .filter(b => b.isCritical)
    .map(b => b.stage)
}

export function getRequiredStages(): LifecycleStage[] {
  return (Object.values(DTC_BENCHMARKS_2026) as FlowBenchmark[])
    .filter(b => b.isCritical || b.isHighPriority)
    .map(b => b.stage)
}
