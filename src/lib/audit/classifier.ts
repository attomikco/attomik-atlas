// Deterministic flow classifier: Klaviyo flow → LifecycleStage.
//
// v1 uses keyword + trigger rules only — no Claude. Real-world brands name
// flows in reasonably conventional ways ("Welcome Series", "Abandoned Cart
// v3"), and triggers like `Started Checkout` are unambiguous. If the audit
// starts misclassifying at scale, add a Claude fallback in the orchestrator
// layer, not here — this file must stay pure and deterministic so tests
// remain trivial.

import type { LifecycleStage } from './types.ts'

export type ClassifierInput = {
  name: string
  triggerType: string
  triggerMetricName?: string
}

export type ClassificationResult = {
  stage: LifecycleStage
  confidence: 'high' | 'medium' | 'low'
}

type TriggerRule = {
  match: (metric: string) => boolean
  stage: LifecycleStage
  reason: string
}

type KeywordRule = {
  keywords: string[]
  stage: LifecycleStage
  reason: string
}

const TRIGGER_RULES: TriggerRule[] = [
  {
    match: m => m === 'started checkout',
    stage: 'abandoned_checkout',
    reason: 'Trigger metric "Started Checkout"',
  },
  {
    match: m => m === 'added to cart',
    stage: 'abandoned_cart',
    reason: 'Trigger metric "Added to Cart"',
  },
  {
    match: m => m === 'viewed product',
    stage: 'browse_abandonment',
    reason: 'Trigger metric "Viewed Product"',
  },
  {
    match: m => m === 'placed order' || m === 'ordered product',
    stage: 'post_purchase',
    reason: 'Trigger metric indicates a completed purchase',
  },
  {
    match: m => m === 'subscribed to list' || m === 'subscribed to email',
    stage: 'welcome',
    reason: 'Trigger metric indicates list subscription',
  },
]

// Order matters — more-specific keywords first so "abandoned checkout" is not
// matched by the generic "abandon" in "abandoned cart".
const KEYWORD_RULES: KeywordRule[] = [
  { keywords: ['abandoned checkout', 'checkout abandon'], stage: 'abandoned_checkout', reason: 'Name contains checkout-abandonment language' },
  { keywords: ['abandoned cart', 'cart abandon'], stage: 'abandoned_cart', reason: 'Name contains cart-abandonment language' },
  { keywords: ['browse abandon'], stage: 'browse_abandonment', reason: 'Name contains browse-abandonment language' },
  { keywords: ['win back', 'win-back', 'winback', 're-engagement', 'reengagement'], stage: 'win_back', reason: 'Name suggests win-back flow' },
  // VIP rules sit above post_purchase so a name like "Repeat Buyer Thank You"
  // matches the stronger "repeat buyer" signal before the generic "thank you".
  { keywords: ['vip', 'loyalty', 'top customer', 'repeat buyer'], stage: 'vip', reason: 'Name suggests VIP / loyalty flow' },
  { keywords: ['post purchase', 'post-purchase', 'thank you', 'order confirm'], stage: 'post_purchase', reason: 'Name suggests post-purchase flow' },
  { keywords: ['sunset', 'cleanup', 'unengaged'], stage: 'sunset', reason: 'Name suggests sunset / list-hygiene flow' },
  { keywords: ['subscription cancel', 'churn save', 'pause subscription'], stage: 'subscription_churn', reason: 'Name suggests subscription churn save' },
  { keywords: ['replenishment', 'reorder', 'refill'], stage: 'replenishment', reason: 'Name suggests replenishment reminder' },
  { keywords: ['welcome', 'new subscriber'], stage: 'welcome', reason: 'Name suggests welcome flow' },
]

function findTriggerRule(metric: string | undefined): TriggerRule | null {
  if (!metric) return null
  const needle = metric.trim().toLowerCase()
  return TRIGGER_RULES.find(r => r.match(needle)) || null
}

function findKeywordRule(name: string): KeywordRule | null {
  const needle = name.toLowerCase()
  return KEYWORD_RULES.find(r => r.keywords.some(k => needle.includes(k))) || null
}

export function classifyFlow(input: ClassifierInput): ClassificationResult {
  const triggerRule = findTriggerRule(input.triggerMetricName)
  const keywordRule = findKeywordRule(input.name)

  if (triggerRule) {
    // Trigger always wins. If the name contradicts, drop confidence.
    if (keywordRule && keywordRule.stage !== triggerRule.stage) {
      return { stage: triggerRule.stage, confidence: 'medium' }
    }
    return { stage: triggerRule.stage, confidence: 'high' }
  }

  if (keywordRule) {
    return { stage: keywordRule.stage, confidence: 'medium' }
  }

  return { stage: 'campaign', confidence: 'low' }
}

export type ClassificationReasons = {
  stage: LifecycleStage
  confidence: 'high' | 'medium' | 'low'
  matchedBy: 'trigger' | 'keyword' | 'fallback'
  reason: string
  conflict: boolean
}

export function getClassificationReasons(input: ClassifierInput): ClassificationReasons {
  const triggerRule = findTriggerRule(input.triggerMetricName)
  const keywordRule = findKeywordRule(input.name)

  if (triggerRule) {
    const conflict = !!keywordRule && keywordRule.stage !== triggerRule.stage
    return {
      stage: triggerRule.stage,
      confidence: conflict ? 'medium' : 'high',
      matchedBy: 'trigger',
      reason: triggerRule.reason,
      conflict,
    }
  }

  if (keywordRule) {
    return {
      stage: keywordRule.stage,
      confidence: 'medium',
      matchedBy: 'keyword',
      reason: keywordRule.reason,
      conflict: false,
    }
  }

  return {
    stage: 'campaign',
    confidence: 'low',
    matchedBy: 'fallback',
    reason: 'No trigger or keyword match — defaulting to one-off campaign',
    conflict: false,
  }
}
