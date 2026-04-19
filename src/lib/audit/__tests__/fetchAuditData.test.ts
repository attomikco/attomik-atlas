import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { KlaviyoClient } from '../../klaviyo/klaviyoClient.ts'
import {
  buildTimeframe,
  computeImageToTextRatio,
  countAnchorTags,
  countImageTags,
  detectMobileOptimized,
  detectPreferenceLink,
  detectUnsubscribeLink,
  fetchAuditData,
  normalizeDelayToHours,
  selectInterval,
  stripHtmlToText,
} from '../fetchAuditData.ts'

// ----- fixture builders ----------------------------------------------------

type Route = (path: string, init?: RequestInit) => Promise<Response> | Response

function routerFetch(route: Route): typeof fetch {
  return (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    const path = url.replace(/^https:\/\/a\.klaviyo\.com\/api/, '')
    const res = await route(path, init)
    return res
  }) as unknown as typeof fetch
}

function json(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function makeClient(route: Route): KlaviyoClient {
  return new KlaviyoClient({
    apiKey: 'pk_test',
    fetchImpl: routerFetch(route),
    maxRetries: 0,
    baseDelayMs: 1,
    waitImpl: async () => {},
  })
}

const WELCOME_HTML = `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width">
</head><body>
<h1>Welcome</h1>
<p>Hi {{ first_name }}, welcome to the brand. Here's a discount for {{ coupon_code }}.</p>
<img src="hero.jpg" alt="hero">
<img src="product.jpg" alt="product">
<a href="https://brand.com/shop">Shop now</a>
<a href="{{ unsubscribe_link }}">Unsubscribe</a>
<a href="{{ manage_preferences }}">Preferences</a>
</body></html>
`

const CART_HTML = `
<html><head>
<style>@media (max-width: 600px) { .col { width: 100%; } }</style>
</head><body>
<p>Your cart is waiting.</p>
<img src="cart.jpg" alt="cart">
<a href="https://brand.com/checkout">Check out</a>
<a href="https://brand.com/unsubscribe?id=123">Unsubscribe</a>
<a href="https://brand.com/preferences">Update preferences</a>
</body></html>
`

function accountResponse() {
  return {
    data: [{
      id: 'acc1',
      attributes: {
        contact_information: { default_sender_email: 'hi@brand.com', default_sender_name: 'Brand' },
        preferred_currency: 'USD',
        timezone: 'America/New_York',
      },
    }],
  }
}

function flowsResponse() {
  return {
    data: [
      {
        id: 'f1',
        attributes: { name: 'Welcome Series', status: 'live', archived: false, created: '', updated: '', trigger_type: 'list' },
      },
      {
        id: 'f2',
        attributes: { name: 'Abandoned Cart', status: 'live', archived: false, created: '', updated: '', trigger_type: 'metric' },
      },
    ],
  }
}

function flowActions(flowId: string) {
  if (flowId === 'f1') {
    return {
      data: [
        { id: 'a1', attributes: { action_type: 'SEND_EMAIL', status: 'live', settings: {} } },
        { id: 'd1', attributes: { action_type: 'TIME_DELAY', status: 'live', settings: { unit: 'days', value: 2 } } },
        { id: 'a2', attributes: { action_type: 'SEND_EMAIL', status: 'live', settings: {} } },
        { id: 'd2', attributes: { action_type: 'TIME_DELAY', status: 'live', settings: { unit: 'hours', value: 48 } } },
        { id: 'a3', attributes: { action_type: 'SEND_EMAIL', status: 'live', settings: {} } },
      ],
    }
  }
  if (flowId === 'f2') {
    return {
      data: [
        { id: 'b1', attributes: { action_type: 'SEND_EMAIL', status: 'live', settings: {} } },
        { id: 'dd1', attributes: { action_type: 'TIME_DELAY', status: 'live', settings: { unit: 'hours', value: 4 } } },
        { id: 'split1', attributes: { action_type: 'CONDITIONAL_SPLIT', status: 'live', settings: { condition: 'placed_order_in_last_24h' } } },
        { id: 'b2', attributes: { action_type: 'SEND_EMAIL', status: 'live', settings: {} } },
      ],
    }
  }
  return { data: [] }
}

function flowMessage(id: string) {
  const map: Record<string, { subject: string; body: string }> = {
    a1: { subject: 'Welcome to the brand', body: WELCOME_HTML },
    a2: { subject: 'Your 10% discount inside', body: WELCOME_HTML },
    a3: { subject: 'Last chance', body: WELCOME_HTML },
    b1: { subject: 'You left something behind', body: CART_HTML },
    b2: { subject: 'Still thinking about it?', body: CART_HTML },
  }
  const hit = map[id] || { subject: 'Unknown', body: '' }
  return {
    data: {
      id,
      attributes: {
        name: hit.subject,
        channel: 'email',
        content: {
          subject: hit.subject,
          preview_text: null,
          from_email: 'hi@brand.com',
          from_label: 'Brand',
          body: hit.body,
        },
      },
    },
  }
}

// Klaviyo returns flow-series statistics as time-series arrays aligned to
// data.attributes.date_times. For test purposes a single-element array is
// enough — the transformer sums all elements before deriving rates.
function reportResponse() {
  return {
    data: {
      attributes: {
        date_times: ['2026-03-01T00:00:00+00:00'],
        results: [
          // m1: recipients 1000, opens 500 (50%), clicks 80 (8%), conv 40 (4%), revenue $3000 ($3/recipient)
          { groupings: { flow_id: 'f1', flow_message_id: 'a1' }, statistics: { recipients: [1000], opens_unique: [500], clicks_unique: [80], conversion_uniques: [40], conversion_value: [3000] } },
          // m2: 900, 432 (48%), 63 (7%), 27 (3%), 2400
          { groupings: { flow_id: 'f1', flow_message_id: 'a2' }, statistics: { recipients: [900], opens_unique: [432], clicks_unique: [63], conversion_uniques: [27], conversion_value: [2400] } },
          // m3: 800, 320 (40%), 40 (5%), 20 (2.5%), 1500
          { groupings: { flow_id: 'f1', flow_message_id: 'a3' }, statistics: { recipients: [800], opens_unique: [320], clicks_unique: [40], conversion_uniques: [20], conversion_value: [1500] } },
          // b1: 500, 225 (45%), 30 (6%), 25 (5%), 3500
          { groupings: { flow_id: 'f2', flow_message_id: 'b1' }, statistics: { recipients: [500], opens_unique: [225], clicks_unique: [30], conversion_uniques: [25], conversion_value: [3500] } },
          // b2 intentionally omitted → message ends up with null performance
        ],
      },
    },
  }
}

function metricsResponse() {
  return {
    data: [
      { id: 'placed_order_metric_id', attributes: { name: 'Placed Order' } },
    ],
  }
}

function makeDefaultRouter(overrides: Partial<Record<string, Response>> = {}): Route {
  return async (path, init) => {
    if (overrides[path]) return overrides[path]!
    if (path === '/accounts') return json(accountResponse())
    if (path.startsWith('/flows?')) return json(flowsResponse())
    if (path.startsWith('/metrics')) return json(metricsResponse())
    const actionsMatch = path.match(/^\/flows\/([^/]+)\/flow-actions$/)
    if (actionsMatch) return json(flowActions(actionsMatch[1]))
    const msgMatch = path.match(/^\/flow-messages\/(.+)$/)
    if (msgMatch) return json(flowMessage(msgMatch[1]))
    if (path === '/flow-series-reports' && init?.method === 'POST') return json(reportResponse())
    if (path === '/segments') return json({ data: [{ id: 's1', attributes: { name: 'All', created: '', updated: '' } }] })
    return json({ errors: [{ detail: `unrouted: ${path}` }] }, 404)
  }
}

// ----- HTML helpers --------------------------------------------------------

describe('HTML heuristics', () => {
  it('stripHtmlToText removes tags, scripts, styles, and collapses whitespace', () => {
    const html = '<p>Hi <b>there</b></p>\n\n<script>alert(1)</script>\n<style>.x{}</style>\n<p>bye</p>'
    const text = stripHtmlToText(html)
    assert.equal(text, 'Hi there bye')
  })

  it('countImageTags counts <img> occurrences case-insensitively', () => {
    assert.equal(countImageTags('<IMG src="x"><img src="y">'), 2)
    assert.equal(countImageTags('<p>no images</p>'), 0)
  })

  it('countAnchorTags counts <a> occurrences', () => {
    assert.equal(countAnchorTags('<a href="x">a</a><A href="y">b</A>'), 2)
  })

  it('computeImageToTextRatio is bounded 0..1', () => {
    const allImages = '<img><img><img><img><img>'
    const allText = '<p>' + 'word '.repeat(500) + '</p>'
    assert.ok(computeImageToTextRatio(allImages) <= 1)
    assert.ok(computeImageToTextRatio(allImages) > 0.5)
    assert.ok(computeImageToTextRatio(allText) < 0.1)
    assert.equal(computeImageToTextRatio(''), 0)
  })

  it('detectMobileOptimized fires on viewport meta', () => {
    assert.equal(detectMobileOptimized('<meta name="viewport" content="width=device-width">'), true)
  })

  it('detectMobileOptimized fires on @media max-width', () => {
    assert.equal(detectMobileOptimized('<style>@media (max-width: 600px) {}</style>'), true)
  })

  it('detectMobileOptimized returns false for plain HTML', () => {
    assert.equal(detectMobileOptimized('<p>Hello</p>'), false)
  })

  it('detectUnsubscribeLink finds href and liquid patterns', () => {
    assert.equal(detectUnsubscribeLink('<a href="https://x.com/unsubscribe">u</a>'), true)
    assert.equal(detectUnsubscribeLink('<a href="{{ unsubscribe_link }}">u</a>'), true)
    assert.equal(detectUnsubscribeLink('<a href="/shop">s</a>'), false)
  })

  it('detectPreferenceLink finds href and liquid patterns', () => {
    assert.equal(detectPreferenceLink('<a href="/preferences">p</a>'), true)
    assert.equal(detectPreferenceLink('<a href="{{ manage_preferences }}">p</a>'), true)
    assert.equal(detectPreferenceLink('<a href="/shop">s</a>'), false)
  })

  it('normalizeDelayToHours handles multiple units', () => {
    assert.equal(normalizeDelayToHours({ unit: 'hours', value: 4 }), 4)
    assert.equal(normalizeDelayToHours({ unit: 'days', value: 2 }), 48)
    assert.equal(normalizeDelayToHours({ unit: 'minutes', value: 30 }), 0.5)
    assert.equal(normalizeDelayToHours({ unit: 'weeks', value: 1 }), 168)
    assert.equal(normalizeDelayToHours({ value: 0 }), 0)
  })
})

// ----- fetchAuditData happy path ------------------------------------------

describe('fetchAuditData — happy path', () => {
  it('returns AuditContext with classified flows, populated performance, and HTML-derived fields', async () => {
    const client = makeClient(makeDefaultRouter())
    const ctx = await fetchAuditData({ client, brandId: 'brand-1' })

    assert.equal(ctx.brandId, 'brand-1')
    assert.equal(ctx.account.senderEmail, 'hi@brand.com')
    assert.equal(ctx.account.currency, 'USD')
    assert.equal(ctx.flows.length, 2)
    assert.equal(ctx.performanceWindowDays, 60)
    assert.equal(ctx.totalSegments, 1)

    const welcome = ctx.flows.find(f => f.id === 'f1')!
    assert.equal(welcome.stage, 'welcome')
    assert.equal(welcome.messages.length, 3)
    // First message has no preceding TIME_DELAY
    assert.equal(welcome.messages[0].delayHours, 0)
    // Second message follows a 2-day delay = 48h
    assert.equal(welcome.messages[1].delayHours, 48)
    // Third follows 48h
    assert.equal(welcome.messages[2].delayHours, 48)
    // Performance aggregated across messages (weighted by sends)
    assert.ok(welcome.performance.sent === 2700)
    assert.ok(welcome.performance.openRate! > 0.4)
    assert.ok(welcome.performance.revenuePerRecipient! > 0)
    // HTML-derived fields
    const m0 = welcome.messages[0]
    assert.equal(m0.hasImages, true)
    assert.equal(m0.isMobileOptimized, true)
    assert.equal(m0.hasUnsubscribeLink, true)
    assert.equal(m0.hasPreferenceLink, true)
    assert.ok(m0.ctaCount >= 3)

    const cart = ctx.flows.find(f => f.id === 'f2')!
    assert.equal(cart.stage, 'abandoned_cart')
    assert.equal(cart.hasBranching, true)
    assert.equal(cart.hasExitCondition, true)
    // b2 had no perf row — its individual performance is null
    const b2 = cart.messages.find(m => m.id === 'b2')!
    assert.equal(b2.performance.openRate, null)
    assert.equal(b2.performance.sent, 0)
  })
})

// ----- null performance when report fails ----------------------------------

describe('fetchAuditData — performance report failure', () => {
  it('returns flows with null performance when the report endpoint fails', async () => {
    const route = makeDefaultRouter({
      '/flow-series-reports': json({ errors: [{ detail: 'boom' }] }, 500),
    })
    const client = makeClient(route)
    const ctx = await fetchAuditData({ client, brandId: 'b' })

    assert.equal(ctx.flows.length, 2)
    for (const f of ctx.flows) {
      assert.equal(f.performance.sent, 0)
      assert.equal(f.performance.openRate, null)
      for (const m of f.messages) {
        assert.equal(m.performance.openRate, null)
        assert.equal(m.performance.clickRate, null)
      }
    }
  })
})

// ----- per-flow failure skips, doesn't abort ------------------------------

describe('fetchAuditData — per-flow failure', () => {
  it('skips a flow whose actions 404 and returns the others', async () => {
    const route = makeDefaultRouter({
      '/flows/f1/flow-actions': json({ errors: [{ detail: 'not found' }] }, 404),
    })
    const client = makeClient(route)
    const ctx = await fetchAuditData({ client, brandId: 'b' })
    assert.equal(ctx.flows.length, 1)
    assert.equal(ctx.flows[0].id, 'f2')
  })
})

// ----- account fetch failure aborts ---------------------------------------

describe('fetchAuditData — account fetch failure', () => {
  it('throws when /accounts fails', async () => {
    const route = makeDefaultRouter({
      '/accounts': json({ errors: [{ detail: 'no account' }] }, 500),
    })
    const client = makeClient(route)
    await assert.rejects(() => fetchAuditData({ client, brandId: 'b' }))
  })

  it('throws when /accounts returns an empty data array', async () => {
    const route = makeDefaultRouter({
      '/accounts': json({ data: [] }),
    })
    const client = makeClient(route)
    await assert.rejects(() => fetchAuditData({ client, brandId: 'b' }))
  })
})

// ----- selectInterval -----------------------------------------------------

describe('selectInterval', () => {
  it('returns daily for windows up to 60 days', () => {
    assert.equal(selectInterval(1), 'daily')
    assert.equal(selectInterval(30), 'daily')
    assert.equal(selectInterval(60), 'daily')
  })

  it('returns weekly for windows between 61 and 365 days', () => {
    assert.equal(selectInterval(61), 'weekly')
    assert.equal(selectInterval(180), 'weekly')
    assert.equal(selectInterval(365), 'weekly')
  })

  it('returns monthly for windows over 365 days', () => {
    assert.equal(selectInterval(366), 'monthly')
    assert.equal(selectInterval(720), 'monthly')
  })
})

// ----- buildTimeframe -----------------------------------------------------

describe('buildTimeframe', () => {
  it('returns last_30_days key for exactly 30', () => {
    assert.deepEqual(buildTimeframe(30), { key: 'last_30_days' })
  })

  it('returns last_60_days key for exactly 60', () => {
    assert.deepEqual(buildTimeframe(60), { key: 'last_60_days' })
  })

  it('returns a custom { start, end } for non-preset windows', () => {
    const tf = buildTimeframe(7) as { start: string; end: string }
    assert.ok('start' in tf && 'end' in tf)
    assert.ok(typeof tf.start === 'string' && tf.start.includes('T'))
    assert.ok(typeof tf.end === 'string' && tf.end.includes('T'))
  })

  it('custom window spans approximately the requested number of days', () => {
    const tf = buildTimeframe(90) as { start: string; end: string }
    const startMs = new Date(tf.start).getTime()
    const endMs = new Date(tf.end).getTime()
    const days = (endMs - startMs) / (1000 * 60 * 60 * 24)
    assert.ok(days > 89.9 && days < 90.1)
  })

  it('returns a custom window for 90 days (NOT the old last_90_days preset)', () => {
    const tf = buildTimeframe(90)
    assert.ok(!('key' in tf))
  })
})
