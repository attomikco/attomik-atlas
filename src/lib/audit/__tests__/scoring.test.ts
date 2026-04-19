import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getBenchmark } from '../benchmarks.ts'
import {
  scoreCopy,
  scoreDesign,
  scoreFlow,
  scorePerformance,
  scoreSegmentation,
  scoreStructure,
} from '../scoring.ts'
import type {
  CopyAnalysisInput,
  Flow,
  FlowFilter,
  FlowMessage,
  FlowPerformance,
} from '../types.ts'

// ----- Fixture builders ----------------------------------------------------

function makePerformance(overrides: Partial<FlowPerformance> = {}): FlowPerformance {
  return {
    sent: 10000,
    openRate: 0.5,
    clickRate: 0.08,
    conversionRate: 0.04,
    revenuePerRecipient: 3.0,
    ...overrides,
  }
}

function makeMessage(overrides: Partial<FlowMessage> = {}): FlowMessage {
  return {
    id: 'm1',
    position: 0,
    delayHours: 0,
    subjectLine: 'Welcome',
    previewText: 'Thanks for signing up',
    bodyText: 'Hi {{ first_name }}, welcome to the brand. Your discount: {{ coupon_code }}.',
    hasImages: true,
    imageToTextRatio: 0.4,
    ctaCount: 2,
    isMobileOptimized: true,
    hasUnsubscribeLink: true,
    hasPreferenceLink: true,
    performance: makePerformance(),
    ...overrides,
  }
}

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'f1',
    name: 'Welcome Series',
    stage: 'welcome',
    isLive: true,
    messages: [
      makeMessage({ id: 'm1', position: 0, delayHours: 0 }),
      makeMessage({ id: 'm2', position: 1, delayHours: 72 }),
      makeMessage({ id: 'm3', position: 2, delayHours: 72 }),
    ],
    filters: [
      { type: 'inclusion', field: 'list_membership', description: 'On newsletter list' },
      { type: 'exclusion', field: 'last_purchase_date', description: 'Excluded if purchased in last 30 days' },
      { type: 'exclusion', field: 'engagement_score', description: 'Excluded if unengaged 90+ days' },
    ],
    hasExitCondition: true,
    hasBranching: true,
    performance: makePerformance(),
    ...overrides,
  }
}

function perfectCopy(): CopyAnalysisInput {
  return {
    brandVoiceConsistency: 1,
    hasSpecificValueProps: true,
    handlesObjections: true,
    subjectLineVariance: 1,
    subjectLineQuality: 1,
    issues: [],
    strengths: ['Copy matches brand voice across all messages.'],
  }
}

// ----- Structure -----------------------------------------------------------

describe('scoreStructure', () => {
  it('single-send flow scores 0 on message-count and flags the right issue', () => {
    const flow = makeFlow({ messages: [makeMessage()] })
    const result = scoreStructure(flow)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('single-send')))
    // Max without message-count + single-message penalizes delay window too
    assert.ok(result.score < 15)
  })

  it('3-message welcome with 6-day spread + exit + branching = 20/20', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1', position: 0, delayHours: 0 }),
        makeMessage({ id: 'm2', position: 1, delayHours: 72 }),
        makeMessage({ id: 'm3', position: 2, delayHours: 72 }),
      ],
    })
    const result = scoreStructure(flow)
    assert.equal(result.score, 20)
  })

  it('welcome flow that all fires within 1 hour gets penalized on delays', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1', position: 0, delayHours: 0 }),
        makeMessage({ id: 'm2', position: 1, delayHours: 0.5 }),
        makeMessage({ id: 'm3', position: 2, delayHours: 0.5 }),
      ],
    })
    const result = scoreStructure(flow)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('within 1 hour')))
    // Message count 5 + exit 5 + branching 5 = 15, no delay pts
    assert.equal(result.score, 15)
  })

  it('abandoned cart with a 7-day spread (too long) gets penalized', () => {
    const flow = makeFlow({
      stage: 'abandoned_cart',
      messages: [
        makeMessage({ id: 'm1', position: 0, delayHours: 0 }),
        makeMessage({ id: 'm2', position: 1, delayHours: 96 }),
        makeMessage({ id: 'm3', position: 2, delayHours: 72 }),
      ],
    })
    const result = scoreStructure(flow)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('longer than')))
    assert.equal(result.score, 15)
  })

  it('2-message flow scores 3 on the message-count component', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1', position: 0, delayHours: 0 }),
        makeMessage({ id: 'm2', position: 1, delayHours: 120 }),
      ],
      hasExitCondition: false,
      hasBranching: false,
    })
    // 3 (count) + 5 (delay) + 0 + 0 = 8
    const result = scoreStructure(flow)
    assert.equal(result.score, 8)
  })

  it('flags missing exit condition', () => {
    const flow = makeFlow({ hasExitCondition: false })
    const result = scoreStructure(flow)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('exit condition')))
  })

  it('flags missing branching', () => {
    const flow = makeFlow({ hasBranching: false })
    const result = scoreStructure(flow)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('branching')))
  })
})

// ----- Performance ---------------------------------------------------------

describe('scorePerformance', () => {
  it('flow performing at benchmark high end across all metrics = 20/20', () => {
    const b = getBenchmark('welcome')
    const flow = makeFlow({
      performance: {
        sent: 10000,
        openRate: b.openRate.high,
        clickRate: b.clickRate.high,
        conversionRate: b.conversionRate.high,
        revenuePerRecipient: b.revenuePerRecipient.high,
      },
    })
    const result = scorePerformance(flow, b)
    assert.equal(result.score, 20)
  })

  it('flow with all null metrics = 10/20 with 4 "no data" issues', () => {
    const b = getBenchmark('welcome')
    const flow = makeFlow({
      performance: {
        sent: 0,
        openRate: null,
        clickRate: null,
        conversionRate: null,
        revenuePerRecipient: null,
      },
    })
    const result = scorePerformance(flow, b)
    assert.equal(result.score, 10)
    const noDataIssues = result.issues.filter(i => i.toLowerCase().includes('no ') && i.toLowerCase().includes('data available'))
    assert.equal(noDataIssues.length, 4)
  })

  it('open rate well below benchmark produces an issue with the actual % and range', () => {
    const b = getBenchmark('welcome')
    const flow = makeFlow({
      performance: {
        sent: 10000,
        openRate: 0.20,
        clickRate: 0.08,
        conversionRate: 0.04,
        revenuePerRecipient: 3.0,
      },
    })
    const result = scorePerformance(flow, b)
    const issue = result.issues.find(i => i.toLowerCase().startsWith('open rate'))
    assert.ok(issue, 'expected an open-rate issue')
    assert.ok(issue!.includes('20.0%'))
    assert.ok(issue!.includes('45-55%'))
  })

  it('mid-range metric values land at 3 pts each', () => {
    const b = getBenchmark('welcome')
    const flow = makeFlow({
      performance: {
        sent: 10000,
        openRate: 0.47,
        clickRate: 0.065,
        conversionRate: 0.035,
        revenuePerRecipient: 2.75,
      },
    })
    const result = scorePerformance(flow, b)
    // Each metric is just above low (score 0..0.5) → 3 pts each
    assert.ok(result.score >= 12 && result.score <= 16)
  })
})

// ----- Copy ----------------------------------------------------------------

describe('scoreCopy', () => {
  it('perfect copy analysis input = 20/20 on welcome', () => {
    const flow = makeFlow({ stage: 'welcome' })
    const result = scoreCopy(flow, perfectCopy())
    assert.equal(result.score, 20)
  })

  it('welcome + handlesObjections:false still awards full 4 pts', () => {
    const flow = makeFlow({ stage: 'welcome' })
    const copy = { ...perfectCopy(), handlesObjections: false }
    const result = scoreCopy(flow, copy)
    assert.equal(result.score, 20)
  })

  it('abandoned_cart + handlesObjections:false costs exactly 4 pts', () => {
    const flow = makeFlow({ stage: 'abandoned_cart' })
    const copy = { ...perfectCopy(), handlesObjections: false }
    const result = scoreCopy(flow, copy)
    assert.equal(result.score, 16)
  })

  it('zero brand voice consistency costs 6 pts', () => {
    const flow = makeFlow({ stage: 'welcome' })
    const copy = { ...perfectCopy(), brandVoiceConsistency: 0 }
    const result = scoreCopy(flow, copy)
    assert.equal(result.score, 14)
  })

  it('passes through issues and strengths from copyAnalysis', () => {
    const flow = makeFlow()
    const copy: CopyAnalysisInput = {
      brandVoiceConsistency: 0.5,
      hasSpecificValueProps: false,
      handlesObjections: true,
      subjectLineVariance: 0.5,
      subjectLineQuality: 0.5,
      issues: ['Generic copy — could be any brand.'],
      strengths: ['Subject lines are concise.'],
    }
    const result = scoreCopy(flow, copy)
    assert.deepEqual(result.issues, ['Generic copy — could be any brand.'])
    assert.deepEqual(result.strengths, ['Subject lines are concise.'])
  })

  it('subscription_churn + handlesObjections:true counts toward score', () => {
    const flowWith = makeFlow({ stage: 'subscription_churn' })
    const flowWithout = makeFlow({ stage: 'subscription_churn' })
    const withObj = scoreCopy(flowWith, perfectCopy())
    const withoutObj = scoreCopy(flowWithout, { ...perfectCopy(), handlesObjections: false })
    assert.equal(withObj.score - withoutObj.score, 4)
  })
})

// ----- Segmentation --------------------------------------------------------

describe('scoreSegmentation', () => {
  it('flow with no filters scores 0 on all filter dimensions', () => {
    const flow = makeFlow({
      filters: [],
      messages: [makeMessage({ bodyText: 'Hi, come back.' })],
    })
    const result = scoreSegmentation(flow)
    assert.equal(result.score, 0)
  })

  it('flow with purchase exclusion filter scores those 5 pts', () => {
    const filters: FlowFilter[] = [
      { type: 'exclusion', field: 'last_purchase_date', description: 'no purchase in 30d' },
    ]
    const flow = makeFlow({
      filters,
      messages: [makeMessage({ bodyText: 'Plain copy.' })],
    })
    const result = scoreSegmentation(flow)
    // Only purchase exclusion → 5
    assert.equal(result.score, 5)
  })

  it('engagement exclusion via "open" token counts', () => {
    const filters: FlowFilter[] = [
      { type: 'exclusion', field: 'last_open_date', description: 'no open in 90d' },
    ]
    const flow = makeFlow({
      filters,
      messages: [makeMessage({ bodyText: 'Plain copy.' })],
    })
    const result = scoreSegmentation(flow)
    assert.equal(result.score, 5)
  })

  it('personalization heuristic detects 2+ template vars', () => {
    const flow = makeFlow({
      filters: [],
      messages: [
        makeMessage({ bodyText: 'Hi {{ first_name }}, your code is {{ coupon_code }}.' }),
      ],
    })
    const result = scoreSegmentation(flow)
    assert.equal(result.score, 5)
  })

  it('personalization heuristic does NOT fire with only first name', () => {
    const flow = makeFlow({
      filters: [],
      messages: [
        makeMessage({ bodyText: 'Hi {{ first_name }}, welcome.' }),
      ],
    })
    const result = scoreSegmentation(flow)
    assert.equal(result.score, 0)
  })

  it('personalization heuristic counts liquid tags too', () => {
    const flow = makeFlow({
      filters: [],
      messages: [
        makeMessage({ bodyText: '{% if customer %}Hi {{ first_name }}{% endif %}' }),
      ],
    })
    const result = scoreSegmentation(flow)
    assert.equal(result.score, 5)
  })

  it('default fixture scores full 20/20', () => {
    const flow = makeFlow()
    const result = scoreSegmentation(flow)
    assert.equal(result.score, 20)
  })
})

// ----- Design --------------------------------------------------------------

describe('scoreDesign', () => {
  it('all-image flow (ratio 0.95) scored down on ratio dimension', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1', imageToTextRatio: 0.95 }),
        makeMessage({ id: 'm2', imageToTextRatio: 0.95 }),
        makeMessage({ id: 'm3', imageToTextRatio: 0.95 }),
      ],
    })
    const result = scoreDesign(flow)
    // mobile 5 + ratio 0 + cta 5 + compliance 5 = 15
    assert.equal(result.score, 15)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('image-heavy')))
  })

  it('flow averaging 6 CTAs per email gets partial credit on that dimension', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1', ctaCount: 6 }),
        makeMessage({ id: 'm2', ctaCount: 6 }),
        makeMessage({ id: 'm3', ctaCount: 6 }),
      ],
    })
    const result = scoreDesign(flow)
    // mobile 5 + ratio 5 + cta 2.5 + compliance 5 = 17.5
    assert.equal(result.score, 17.5)
  })

  it('flow averaging 8+ CTAs per email gets 0 on that dimension', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1', ctaCount: 8 }),
        makeMessage({ id: 'm2', ctaCount: 10 }),
      ],
    })
    const result = scoreDesign(flow)
    assert.equal(result.score, 15)
  })

  it('missing unsubscribe on any message zeros out that 5-pt slot', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1' }),
        makeMessage({ id: 'm2', hasUnsubscribeLink: false }),
        makeMessage({ id: 'm3' }),
      ],
    })
    const result = scoreDesign(flow)
    // mobile 5 + ratio 5 + cta 5 + compliance 0 = 15
    assert.equal(result.score, 15)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('unsubscribe')))
  })

  it('missing preference link also kills the compliance slot', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1' }),
        makeMessage({ id: 'm2', hasPreferenceLink: false }),
      ],
    })
    const result = scoreDesign(flow)
    assert.equal(result.score, 15)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('preference')))
  })

  it('a single non-mobile-optimized message kills the mobile slot', () => {
    const flow = makeFlow({
      messages: [
        makeMessage({ id: 'm1' }),
        makeMessage({ id: 'm2', isMobileOptimized: false }),
        makeMessage({ id: 'm3' }),
      ],
    })
    const result = scoreDesign(flow)
    assert.equal(result.score, 15)
    assert.ok(result.issues.some(i => i.toLowerCase().includes('mobile')))
  })

  it('default fixture scores 20/20 on design', () => {
    const flow = makeFlow()
    const result = scoreDesign(flow)
    assert.equal(result.score, 20)
  })

  it('empty-messages flow returns 0 with a helpful issue', () => {
    const flow = makeFlow({ messages: [] })
    const result = scoreDesign(flow)
    assert.equal(result.score, 0)
    assert.ok(result.issues.length >= 1)
  })
})

// ----- scoreFlow integration -----------------------------------------------

describe('scoreFlow', () => {
  it('excellent flow returns totalScore >= 90 and grade A', () => {
    const flow = makeFlow()
    const result = scoreFlow(flow, getBenchmark('welcome'), perfectCopy())
    assert.ok(result.totalScore >= 90, `expected >=90, got ${result.totalScore}`)
    assert.equal(result.grade, 'A')
    assert.equal(result.flowId, flow.id)
    assert.equal(result.flowName, flow.name)
    assert.equal(result.stage, 'welcome')
  })

  it('deliberately mediocre flow lands in the C/D band', () => {
    const mediocre = makeFlow({
      stage: 'abandoned_cart',
      messages: [
        makeMessage({
          id: 'm1',
          position: 0,
          delayHours: 0,
          ctaCount: 5,
          imageToTextRatio: 0.7,
          bodyText: 'Hi {{ first_name }}, your cart is waiting — {{ cart_url }}.',
        }),
        makeMessage({
          id: 'm2',
          position: 1,
          delayHours: 24,
          ctaCount: 5,
          imageToTextRatio: 0.7,
          bodyText: 'Hi {{ first_name }}, still thinking it over?',
        }),
        makeMessage({
          id: 'm3',
          position: 2,
          delayHours: 24,
          ctaCount: 5,
          imageToTextRatio: 0.7,
          bodyText: 'Hi {{ first_name }}, last chance.',
        }),
      ],
      filters: [
        { type: 'inclusion', field: 'trigger', description: 'cart started' },
        { type: 'exclusion', field: 'last_purchase_date', description: 'no purchase in 7d' },
      ],
      hasExitCondition: true,
      hasBranching: false,
      performance: {
        sent: 5000,
        openRate: 0.35,
        clickRate: 0.03,
        conversionRate: 0.02,
        revenuePerRecipient: 2.0,
      },
    })
    const copy: CopyAnalysisInput = {
      brandVoiceConsistency: 0.5,
      hasSpecificValueProps: false,
      handlesObjections: false,
      subjectLineVariance: 0.4,
      subjectLineQuality: 0.5,
      issues: ['Generic value props.'],
      strengths: [],
    }
    const result = scoreFlow(mediocre, getBenchmark('abandoned_cart'), copy)
    assert.ok(result.totalScore >= 40 && result.totalScore < 75, `expected 40..75, got ${result.totalScore}`)
    assert.ok(['C', 'D'].includes(result.grade), `expected C/D, got ${result.grade}`)
  })

  it('totalScore equals the sum of dimension scores', () => {
    const flow = makeFlow()
    const result = scoreFlow(flow, getBenchmark('welcome'), perfectCopy())
    const sum =
      result.dimensions.structure.score +
      result.dimensions.performance.score +
      result.dimensions.copy.score +
      result.dimensions.segmentation.score +
      result.dimensions.design.score
    assert.equal(result.totalScore, sum)
  })

  it('F grade for a truly broken flow', () => {
    const broken = makeFlow({
      stage: 'abandoned_cart',
      messages: [
        makeMessage({
          id: 'm1',
          ctaCount: 10,
          imageToTextRatio: 0.95,
          isMobileOptimized: false,
          hasUnsubscribeLink: false,
          hasPreferenceLink: false,
          bodyText: 'Come back.',
        }),
      ],
      filters: [],
      hasExitCondition: false,
      hasBranching: false,
      performance: {
        sent: 100,
        openRate: 0.05,
        clickRate: 0.002,
        conversionRate: 0.001,
        revenuePerRecipient: 0.05,
      },
    })
    const copy: CopyAnalysisInput = {
      brandVoiceConsistency: 0,
      hasSpecificValueProps: false,
      handlesObjections: false,
      subjectLineVariance: 0,
      subjectLineQuality: 0,
      issues: ['Generic filler copy.'],
      strengths: [],
    }
    const result = scoreFlow(broken, getBenchmark('abandoned_cart'), copy)
    assert.ok(result.totalScore < 40, `expected <40, got ${result.totalScore}`)
    assert.equal(result.grade, 'F')
  })
})
