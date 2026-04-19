import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  DTC_BENCHMARKS_2026,
  getBenchmark,
  getCriticalStages,
  getMetricBenchmark,
  getRequiredStages,
  scoreAgainstBenchmark,
} from '../benchmarks.ts'

describe('getBenchmark', () => {
  it('returns the correct stage data', () => {
    const welcome = getBenchmark('welcome')
    assert.equal(welcome.stage, 'welcome')
    assert.equal(welcome.displayName, 'Welcome')
    assert.equal(welcome.isCritical, true)
    assert.deepEqual(welcome.openRate, { low: 0.45, high: 0.55 })
    assert.deepEqual(welcome.revenuePerRecipient, { low: 2.5, high: 4.0 })
  })

  it('returns a benchmark for every lifecycle stage', () => {
    const stages = Object.keys(DTC_BENCHMARKS_2026)
    assert.equal(stages.length, 11)
    for (const stage of stages) {
      assert.equal(
        getBenchmark(stage as keyof typeof DTC_BENCHMARKS_2026).stage,
        stage,
      )
    }
  })
})

describe('getMetricBenchmark', () => {
  it('returns the open rate range', () => {
    assert.deepEqual(
      getMetricBenchmark('abandoned_checkout', 'openRate'),
      { low: 0.5, high: 0.6 },
    )
  })

  it('returns the click rate range', () => {
    assert.deepEqual(
      getMetricBenchmark('welcome', 'clickRate'),
      { low: 0.06, high: 0.1 },
    )
  })

  it('returns the conversion rate range', () => {
    assert.deepEqual(
      getMetricBenchmark('abandoned_cart', 'conversionRate'),
      { low: 0.04, high: 0.07 },
    )
  })

  it('returns the revenue per recipient range', () => {
    assert.deepEqual(
      getMetricBenchmark('abandoned_checkout', 'revenuePerRecipient'),
      { low: 15, high: 25 },
    )
  })
})

describe('scoreAgainstBenchmark', () => {
  it('returns 1 when actual equals the high end', () => {
    assert.equal(scoreAgainstBenchmark(0.55, 'welcome', 'openRate'), 1)
  })

  it('returns 1 when actual exceeds the high end', () => {
    assert.equal(scoreAgainstBenchmark(0.80, 'welcome', 'openRate'), 1)
  })

  it('returns 0 when actual equals the low end', () => {
    assert.equal(scoreAgainstBenchmark(0.45, 'welcome', 'openRate'), 0)
  })

  it('returns a negative number when actual is below the low end', () => {
    const score = scoreAgainstBenchmark(0.30, 'welcome', 'openRate')
    assert.ok(score < 0)
    assert.ok(score >= -1)
  })

  it('caps the negative score at -1 when actual is far below the low end', () => {
    assert.equal(scoreAgainstBenchmark(0, 'welcome', 'openRate'), -1)
  })

  it('returns ~0.5 when actual is midway between low and high', () => {
    const mid = (0.45 + 0.55) / 2
    const score = scoreAgainstBenchmark(mid, 'welcome', 'openRate')
    assert.ok(Math.abs(score - 0.5) < 0.0001)
  })

  it('interpolates linearly between low and high', () => {
    const quarter = 0.45 + (0.55 - 0.45) * 0.25
    const score = scoreAgainstBenchmark(quarter, 'welcome', 'openRate')
    assert.ok(Math.abs(score - 0.25) < 0.0001)
  })
})

describe('getCriticalStages', () => {
  it('returns exactly the four critical stages', () => {
    const critical = getCriticalStages()
    assert.equal(critical.length, 4)
    assert.deepEqual(
      [...critical].sort(),
      ['abandoned_cart', 'abandoned_checkout', 'post_purchase', 'welcome'],
    )
  })
})

describe('getRequiredStages', () => {
  it('includes every critical stage', () => {
    const required = getRequiredStages()
    for (const stage of getCriticalStages()) {
      assert.ok(required.includes(stage))
    }
  })

  it('includes browse_abandonment, win_back, and subscription_churn', () => {
    const required = getRequiredStages()
    assert.ok(required.includes('browse_abandonment'))
    assert.ok(required.includes('win_back'))
    assert.ok(required.includes('subscription_churn'))
  })

  it('does not include non-critical, non-high-priority stages', () => {
    const required = getRequiredStages()
    assert.ok(!required.includes('vip'))
    assert.ok(!required.includes('sunset'))
    assert.ok(!required.includes('replenishment'))
    assert.ok(!required.includes('campaign'))
  })
})
