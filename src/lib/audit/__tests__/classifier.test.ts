import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { classifyFlow, getClassificationReasons } from '../classifier.ts'

describe('classifyFlow — trigger metric rules', () => {
  it('"Started Checkout" → abandoned_checkout / high', () => {
    const r = classifyFlow({ name: 'Pre-Checkout Series', triggerType: 'metric', triggerMetricName: 'Started Checkout' })
    assert.equal(r.stage, 'abandoned_checkout')
    assert.equal(r.confidence, 'high')
  })

  it('"Added to Cart" → abandoned_cart / high', () => {
    const r = classifyFlow({ name: 'Cart Recovery', triggerType: 'metric', triggerMetricName: 'Added to Cart' })
    assert.equal(r.stage, 'abandoned_cart')
    assert.equal(r.confidence, 'high')
  })

  it('"Viewed Product" → browse_abandonment / high', () => {
    const r = classifyFlow({ name: 'Viewed Browse Recovery', triggerType: 'metric', triggerMetricName: 'Viewed Product' })
    assert.equal(r.stage, 'browse_abandonment')
    assert.equal(r.confidence, 'high')
  })

  it('"Placed Order" → post_purchase / high', () => {
    const r = classifyFlow({ name: 'Order Confirm', triggerType: 'metric', triggerMetricName: 'Placed Order' })
    assert.equal(r.stage, 'post_purchase')
    assert.equal(r.confidence, 'high')
  })

  it('"Ordered Product" → post_purchase / high', () => {
    const r = classifyFlow({ name: 'After Purchase', triggerType: 'metric', triggerMetricName: 'Ordered Product' })
    assert.equal(r.stage, 'post_purchase')
    assert.equal(r.confidence, 'high')
  })

  it('"Subscribed to List" → welcome / high', () => {
    const r = classifyFlow({ name: 'Signup Greeting', triggerType: 'list', triggerMetricName: 'Subscribed to List' })
    assert.equal(r.stage, 'welcome')
    assert.equal(r.confidence, 'high')
  })

  it('trigger metric names are case-insensitive', () => {
    const r = classifyFlow({ name: 'x', triggerType: 'metric', triggerMetricName: 'STARTED CHECKOUT' })
    assert.equal(r.stage, 'abandoned_checkout')
    assert.equal(r.confidence, 'high')
  })
})

describe('classifyFlow — name keyword rules', () => {
  const cases: Array<[string, string]> = [
    ['Welcome Series', 'welcome'],
    ['New Subscriber Greeting', 'welcome'],
    ['Abandoned Cart v3', 'abandoned_cart'],
    ['Cart Abandon Sequence', 'abandoned_cart'],
    ['Abandoned Checkout', 'abandoned_checkout'],
    ['Checkout Abandon Recovery', 'abandoned_checkout'],
    ['Browse Abandon', 'browse_abandonment'],
    ['Post Purchase Thank You', 'post_purchase'],
    ['Post-Purchase Followup', 'post_purchase'],
    ['Order Confirm Series', 'post_purchase'],
    ['Win Back 60d', 'win_back'],
    ['Win-Back', 'win_back'],
    ['Winback Q4', 'win_back'],
    ['Re-engagement Sequence', 'win_back'],
    ['Reengagement Final', 'win_back'],
    ['VIP Loyalty Rewards', 'vip'],
    ['Top Customer Perks', 'vip'],
    ['Repeat Buyer Thank You', 'vip'],
    ['Sunset List Hygiene', 'sunset'],
    ['Unengaged Cleanup', 'sunset'],
    ['Subscription Cancel Save', 'subscription_churn'],
    ['Churn Save Final', 'subscription_churn'],
    ['Pause Subscription Offer', 'subscription_churn'],
    ['Replenishment Reminder', 'replenishment'],
    ['Reorder Coffee', 'replenishment'],
    ['Refill Alert', 'replenishment'],
  ]

  for (const [name, expected] of cases) {
    it(`"${name}" → ${expected} / medium`, () => {
      const r = classifyFlow({ name, triggerType: 'metric' })
      assert.equal(r.stage, expected)
      assert.equal(r.confidence, 'medium')
    })
  }

  it('keyword matching is case-insensitive', () => {
    const r = classifyFlow({ name: 'WELCOME FLOW', triggerType: 'list' })
    assert.equal(r.stage, 'welcome')
    assert.equal(r.confidence, 'medium')
  })
})

describe('classifyFlow — trigger wins over conflicting name', () => {
  it('Started Checkout trigger + "welcome series" name → abandoned_checkout / medium', () => {
    const r = classifyFlow({
      name: 'welcome series',
      triggerType: 'metric',
      triggerMetricName: 'Started Checkout',
    })
    assert.equal(r.stage, 'abandoned_checkout')
    assert.equal(r.confidence, 'medium')
  })

  it('no downgrade when trigger and name agree', () => {
    const r = classifyFlow({
      name: 'Abandoned Cart Recovery',
      triggerType: 'metric',
      triggerMetricName: 'Added to Cart',
    })
    assert.equal(r.stage, 'abandoned_cart')
    assert.equal(r.confidence, 'high')
  })
})

describe('classifyFlow — fallback', () => {
  it('no trigger + no keyword match → campaign / low', () => {
    const r = classifyFlow({ name: 'Holiday Blast Q4 2026', triggerType: 'date_based' })
    assert.equal(r.stage, 'campaign')
    assert.equal(r.confidence, 'low')
  })

  it('unknown trigger metric falls through to keyword path', () => {
    const r = classifyFlow({
      name: 'Replenishment',
      triggerType: 'metric',
      triggerMetricName: 'Custom Metric XYZ',
    })
    assert.equal(r.stage, 'replenishment')
    assert.equal(r.confidence, 'medium')
  })
})

describe('getClassificationReasons', () => {
  it('surfaces the matched trigger rule', () => {
    const r = getClassificationReasons({ name: 'x', triggerType: 'metric', triggerMetricName: 'Started Checkout' })
    assert.equal(r.matchedBy, 'trigger')
    assert.equal(r.stage, 'abandoned_checkout')
    assert.equal(r.conflict, false)
  })

  it('reports conflict when name disagrees with trigger', () => {
    const r = getClassificationReasons({ name: 'Welcome', triggerType: 'metric', triggerMetricName: 'Started Checkout' })
    assert.equal(r.matchedBy, 'trigger')
    assert.equal(r.conflict, true)
    assert.equal(r.confidence, 'medium')
  })

  it('reports keyword match when no trigger fires', () => {
    const r = getClassificationReasons({ name: 'Winback 30d', triggerType: 'metric' })
    assert.equal(r.matchedBy, 'keyword')
    assert.equal(r.stage, 'win_back')
  })

  it('reports fallback for unmatched input', () => {
    const r = getClassificationReasons({ name: 'Newsletter', triggerType: 'list' })
    assert.equal(r.matchedBy, 'fallback')
    assert.equal(r.stage, 'campaign')
  })
})

describe('keyword ordering prevents "abandoned checkout" mis-hitting cart rule', () => {
  it('"abandoned checkout" name → abandoned_checkout, not abandoned_cart', () => {
    const r = classifyFlow({ name: 'Abandoned Checkout v2', triggerType: 'metric' })
    assert.equal(r.stage, 'abandoned_checkout')
  })
})
