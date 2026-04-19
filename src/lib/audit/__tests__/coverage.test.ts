import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getCriticalStages, getRequiredStages } from '../benchmarks.ts'
import { computeCoverage } from '../coverage.ts'
import type { Flow, LifecycleStage } from '../types.ts'

function flow(stage: LifecycleStage): Flow {
  return {
    id: stage,
    name: stage,
    stage,
    isLive: true,
    messages: [],
    filters: [],
    hasExitCondition: false,
    hasBranching: false,
    performance: { sent: 0, openRate: null, clickRate: null, conversionRate: null, revenuePerRecipient: null },
  }
}

describe('computeCoverage', () => {
  it('all required stages present → coverageScore 100', () => {
    const flows = getRequiredStages().map(flow)
    const cov = computeCoverage(flows)
    assert.equal(cov.coverageScore, 100)
    assert.equal(cov.missingCritical.length, 0)
    assert.equal(cov.missingHighPriority.length, 0)
  })

  it('all required stages missing → coverageScore 0', () => {
    const cov = computeCoverage([])
    assert.equal(cov.coverageScore, 0)
    assert.deepEqual([...cov.missingCritical].sort(), [...getCriticalStages()].sort())
    assert.deepEqual([...cov.missingHighPriority].sort(), [...getRequiredStages()].sort())
  })

  it('mixed coverage computes correct present/missing/score', () => {
    const flows = [flow('welcome'), flow('abandoned_cart')]
    const cov = computeCoverage(flows)
    assert.ok(cov.present.includes('welcome'))
    assert.ok(cov.present.includes('abandoned_cart'))
    assert.ok(cov.missing.includes('abandoned_checkout'))
    assert.ok(cov.missing.includes('post_purchase'))
    assert.ok(cov.coverageScore > 0 && cov.coverageScore < 100)
  })

  it('campaign stages are excluded from coverage logic', () => {
    const flows = [flow('campaign'), flow('campaign'), flow('welcome')]
    const cov = computeCoverage(flows)
    assert.ok(!cov.present.includes('campaign' as LifecycleStage))
    assert.ok(!cov.missing.includes('campaign' as LifecycleStage))
    assert.deepEqual(cov.present, ['welcome'])
  })

  it('duplicate stages are deduped in present', () => {
    const flows = [flow('welcome'), flow('welcome'), flow('welcome')]
    const cov = computeCoverage(flows)
    assert.deepEqual(cov.present, ['welcome'])
  })

  it('only welcome present → missingCritical contains the other 3 critical stages', () => {
    const cov = computeCoverage([flow('welcome')])
    assert.equal(cov.missingCritical.length, 3)
    assert.ok(cov.missingCritical.includes('abandoned_cart'))
    assert.ok(cov.missingCritical.includes('abandoned_checkout'))
    assert.ok(cov.missingCritical.includes('post_purchase'))
  })

  it('coverageScore is an integer', () => {
    const cov = computeCoverage([flow('welcome'), flow('abandoned_cart')])
    assert.equal(Number.isInteger(cov.coverageScore), true)
  })
})
