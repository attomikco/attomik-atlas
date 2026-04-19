import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { computeCoverage } from '../coverage.ts'
import type { AuditContext } from '../fetchAuditData.ts'
import {
  computeRevenueLeftOnTable,
  estimateRevenueLift,
  generateFixes,
} from '../fixes.ts'
import type {
  CoverageReport,
  Flow,
  FlowScore,
  LifecycleStage,
  PrioritizedFix,
} from '../types.ts'

// ----- helpers ------------------------------------------------------------

function flow(id: string, stage: LifecycleStage, overrides: Partial<Flow> = {}): Flow {
  return {
    id,
    name: `${id}-flow`,
    stage,
    isLive: true,
    messages: [],
    filters: [],
    hasExitCondition: false,
    hasBranching: false,
    performance: { sent: 0, openRate: null, clickRate: null, conversionRate: null, revenuePerRecipient: null },
    ...overrides,
  }
}

function flowScore(flowId: string, stage: LifecycleStage, grade: FlowScore['grade'], total: number): FlowScore {
  return {
    flowId,
    flowName: `${flowId}-flow`,
    stage,
    totalScore: total,
    grade,
    dimensions: {
      structure: { score: 0, issues: [], strengths: [] },
      performance: { score: 0, issues: [], strengths: [] },
      copy: { score: 0, issues: [], strengths: [] },
      segmentation: { score: 0, issues: [], strengths: [] },
      design: { score: 0, issues: [], strengths: [] },
    },
  }
}

function context(overrides: Partial<AuditContext> = {}): AuditContext {
  return {
    brandId: 'b',
    fetchedAt: new Date().toISOString(),
    account: { senderEmail: 'a@b.co', senderName: 'Brand', currency: 'USD' },
    flows: [],
    totalSubscribers: 10000,
    warnings: [],
    flowFetchSummary: { totalFlowsReturned: 0, filterApplied: 'test' },
    totalSegments: 0,
    performanceWindowDays: 90,
    ...overrides,
  }
}

// ----- estimateRevenueLift ------------------------------------------------

describe('estimateRevenueLift', () => {
  it('returns null when aov is missing', () => {
    const r = estimateRevenueLift({ stage: 'welcome', totalSubscribers: 10000 })
    assert.equal(r, null)
  })

  it('returns null when aov is zero or negative', () => {
    assert.equal(estimateRevenueLift({ stage: 'welcome', totalSubscribers: 10000, aov: 0 }), null)
    assert.equal(estimateRevenueLift({ stage: 'welcome', totalSubscribers: 10000, aov: -5 }), null)
  })

  it('returns a plausible range for missing welcome (10k subscribers, $50 AOV)', () => {
    const r = estimateRevenueLift({ stage: 'welcome', totalSubscribers: 10000, aov: 50 })
    assert.ok(r)
    // triggers = 10000 × 0.3 = 3000/yr
    // conv 3-5%, aov $50 → range 4500..7500
    assert.ok(r!.low >= 4000 && r!.low <= 5000)
    assert.ok(r!.high >= 7000 && r!.high <= 8000)
    assert.ok(r!.basis.includes('AOV'))
  })

  it('returns null for vip stage (not estimable in this model)', () => {
    const r = estimateRevenueLift({ stage: 'vip', totalSubscribers: 10000, aov: 50 })
    assert.equal(r, null)
  })

  it('returns null for sunset stage (not estimable)', () => {
    const r = estimateRevenueLift({ stage: 'sunset', totalSubscribers: 10000, aov: 50 })
    assert.equal(r, null)
  })

  it('returns null for abandoned_cart when monthlyOrders is missing', () => {
    const r = estimateRevenueLift({ stage: 'abandoned_cart', totalSubscribers: 10000, aov: 50 })
    assert.equal(r, null)
  })

  it('computes abandoned_cart range when monthlyOrders + aov are present', () => {
    // triggers = 500 × 12 × 3 = 18000/yr, conv 4-7%, aov $50 → 36000..63000
    const r = estimateRevenueLift({ stage: 'abandoned_cart', totalSubscribers: 10000, monthlyOrders: 500, aov: 50 })
    assert.ok(r)
    assert.ok(r!.low >= 34000 && r!.low <= 38000)
    assert.ok(r!.high >= 62000 && r!.high <= 64000)
  })

  it('browse_abandonment uses totalSubscribers × 2', () => {
    // triggers = 10000 × 2 = 20000, conv 1-2%, aov $50 → 10000..20000
    const r = estimateRevenueLift({ stage: 'browse_abandonment', totalSubscribers: 10000, aov: 50 })
    assert.ok(r)
    assert.ok(r!.low === 20000 * 0.01 * 50)
    assert.ok(r!.high === 20000 * 0.02 * 50)
  })
})

// ----- generateFixes ------------------------------------------------------

describe('generateFixes', () => {
  it('missing welcome flow → priority 1, canAutoGenerate true', () => {
    const cov: CoverageReport = computeCoverage([])
    const fixes = generateFixes([], [], cov, context({ totalSubscribers: 10000 }), { aov: 50 })
    const welcome = fixes.find(f => f.type === 'missing_flow' && f.stage === 'welcome')
    assert.ok(welcome)
    assert.equal(welcome!.priority, 1)
    assert.equal(welcome!.canAutoGenerate, true)
  })

  it('missing sunset flow → priority 3, canAutoGenerate FALSE', () => {
    const cov: CoverageReport = computeCoverage([])
    const fixes = generateFixes([], [], cov, context(), {})
    const sunset = fixes.find(f => f.type === 'missing_flow' && f.stage === 'sunset')
    assert.ok(sunset)
    assert.equal(sunset!.priority, 3)
    assert.equal(sunset!.canAutoGenerate, false)
  })

  it('missing vip flow → priority 3, canAutoGenerate true', () => {
    const cov: CoverageReport = computeCoverage([])
    const fixes = generateFixes([], [], cov, context(), {})
    const vip = fixes.find(f => f.type === 'missing_flow' && f.stage === 'vip')
    assert.ok(vip)
    assert.equal(vip!.priority, 3)
    assert.equal(vip!.canAutoGenerate, true)
  })

  it('missing browse_abandonment and win_back → priority 2', () => {
    const cov: CoverageReport = computeCoverage([])
    const fixes = generateFixes([], [], cov, context(), {})
    const browse = fixes.find(f => f.type === 'missing_flow' && f.stage === 'browse_abandonment')!
    const winback = fixes.find(f => f.type === 'missing_flow' && f.stage === 'win_back')!
    assert.equal(browse.priority, 2)
    assert.equal(winback.priority, 2)
  })

  it('flow with grade F in critical stage → priority 1 broken_flow', () => {
    const f = flow('f1', 'welcome')
    const s = flowScore('f1', 'welcome', 'F', 30)
    const cov = computeCoverage([f])
    const fixes = generateFixes([f], [s], cov, context())
    const broken = fixes.find(x => x.type === 'broken_flow' && x.relatedFlowId === 'f1')
    assert.ok(broken)
    assert.equal(broken!.priority, 1)
    assert.equal(broken!.effortLevel, 'medium')
  })

  it('flow with grade D in non-critical stage → priority 2 broken_flow with low effort', () => {
    const f = flow('v1', 'vip')
    const s = flowScore('v1', 'vip', 'D', 45)
    const cov = computeCoverage([f])
    const fixes = generateFixes([f], [s], cov, context())
    const broken = fixes.find(x => x.type === 'broken_flow' && x.relatedFlowId === 'v1')
    assert.ok(broken)
    assert.equal(broken!.priority, 2)
    assert.equal(broken!.effortLevel, 'low')
  })

  it('flow with grade C → priority 3 underperforming_flow', () => {
    const f = flow('c1', 'welcome')
    const s = flowScore('c1', 'welcome', 'C', 65)
    const cov = computeCoverage([f])
    const fixes = generateFixes([f], [s], cov, context())
    const under = fixes.find(x => x.type === 'underperforming_flow' && x.relatedFlowId === 'c1')
    assert.ok(under)
    assert.equal(under!.priority, 3)
    assert.equal(under!.effortLevel, 'low')
    assert.equal(under!.canAutoGenerate, true)
  })

  it('flow with grade B does not generate a fix', () => {
    const f = flow('b1', 'welcome')
    const s = flowScore('b1', 'welcome', 'B', 80)
    const cov = computeCoverage([f])
    const fixes = generateFixes([f], [s], cov, context())
    assert.ok(!fixes.some(x => x.relatedFlowId === 'b1'))
  })

  it('sorts by priority ASC then revenue DESC, with nulls last', () => {
    const cov = computeCoverage([])
    const fixes = generateFixes([], [], cov, context({ totalSubscribers: 10000 }), { aov: 50 })
    // Priority 1 fixes come first
    const priorities = fixes.map(f => f.priority)
    const sorted = [...priorities].sort((a, b) => a - b)
    assert.deepEqual(priorities, sorted)

    // Within priority 1, non-null revenue ranges come before null
    const p1 = fixes.filter(f => f.priority === 1)
    let sawNull = false
    for (const fix of p1) {
      if (fix.estimatedRevenueLift == null) sawNull = true
      else assert.equal(sawNull, false, 'non-null revenue fix must come before nulls')
    }
  })

  it('fix IDs are stable and unique', () => {
    const f1 = flow('x1', 'welcome')
    const s1 = flowScore('x1', 'welcome', 'F', 30)
    const cov = computeCoverage([f1])
    const fixes = generateFixes([f1], [s1], cov, context())
    const ids = fixes.map(f => f.id)
    assert.equal(new Set(ids).size, ids.length)
  })
})

// ----- computeRevenueLeftOnTable -----------------------------------------

describe('computeRevenueLeftOnTable', () => {
  it('sums priority 1+2 fixes and ignores priority 3', () => {
    const fixes: PrioritizedFix[] = [
      { id: 'a', priority: 1, type: 'missing_flow', stage: 'welcome', title: '', description: '', estimatedRevenueLift: { low: 5000, high: 8000, basis: '' }, effortLevel: 'medium', canAutoGenerate: true },
      { id: 'b', priority: 2, type: 'missing_flow', stage: 'win_back', title: '', description: '', estimatedRevenueLift: { low: 2000, high: 4000, basis: '' }, effortLevel: 'medium', canAutoGenerate: true },
      { id: 'c', priority: 3, type: 'missing_flow', stage: 'vip', title: '', description: '', estimatedRevenueLift: { low: 1000, high: 2000, basis: '' }, effortLevel: 'medium', canAutoGenerate: true },
    ]
    const r = computeRevenueLeftOnTable(fixes)
    assert.equal(r.low, 7000)
    assert.equal(r.high, 12000)
    assert.ok(r.methodology.length > 0)
  })

  it('treats null revenue fixes as zero contribution', () => {
    const fixes: PrioritizedFix[] = [
      { id: 'a', priority: 1, type: 'broken_flow', stage: 'welcome', title: '', description: '', estimatedRevenueLift: null, effortLevel: 'medium', canAutoGenerate: true },
      { id: 'b', priority: 2, type: 'missing_flow', stage: 'win_back', title: '', description: '', estimatedRevenueLift: { low: 1000, high: 2000, basis: '' }, effortLevel: 'medium', canAutoGenerate: true },
    ]
    const r = computeRevenueLeftOnTable(fixes)
    assert.equal(r.low, 1000)
    assert.equal(r.high, 2000)
  })

  it('returns zeros with methodology when no qualifying fixes exist', () => {
    const r = computeRevenueLeftOnTable([])
    assert.equal(r.low, 0)
    assert.equal(r.high, 0)
    assert.ok(r.methodology.length > 0)
  })
})
