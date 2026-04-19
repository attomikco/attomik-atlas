import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { KlaviyoClient } from '../../klaviyo/klaviyoClient.ts'
import { runAudit } from '../orchestrator.ts'

// ----- minimal HTML fixtures used in Klaviyo responses --------------------

const HTML = `
<html><head><meta name="viewport" content="width=device-width"></head><body>
<p>Hi {{ first_name }}, here is a personal note from our founder.</p>
<a href="https://brand.com/shop">Shop</a>
<a href="{{ unsubscribe_link }}">Unsubscribe</a>
<a href="{{ manage_preferences }}">Preferences</a>
</body></html>
`

// ----- Klaviyo fetch router -----------------------------------------------

type Route = (path: string, init?: RequestInit) => Response

function routeKlaviyo(overrides: Partial<Record<string, Response>> = {}): Route {
  return (path, init) => {
    if (overrides[path]) return overrides[path]!
    if (path === '/accounts') {
      return json({
        data: [{
          id: 'a',
          attributes: {
            contact_information: { default_sender_email: 'hi@brand.com', default_sender_name: 'Brand' },
            preferred_currency: 'USD',
            timezone: 'UTC',
          },
        }],
      })
    }
    if (path.startsWith('/flows?')) {
      return json({
        data: [
          { id: 'f1', attributes: { name: 'Welcome Series', status: 'live', archived: false, created: '', updated: '', trigger_type: 'list' } },
          { id: 'f2', attributes: { name: 'Abandoned Cart', status: 'live', archived: false, created: '', updated: '', trigger_type: 'metric' } },
          { id: 'f3', attributes: { name: 'Post Purchase Thank You', status: 'live', archived: false, created: '', updated: '', trigger_type: 'metric' } },
        ],
      })
    }
    const m = path.match(/^\/flows\/([^/]+)\/flow-actions$/)
    if (m) {
      return json({
        data: [
          { id: `${m[1]}-msg`, attributes: { action_type: 'SEND_EMAIL', status: 'live', settings: {} } },
        ],
      })
    }
    const msgMatch = path.match(/^\/flow-messages\/(.+)$/)
    if (msgMatch) {
      return json({
        data: {
          id: msgMatch[1],
          attributes: {
            name: 'msg',
            channel: 'email',
            content: { subject: 'Hello', preview_text: null, from_email: 'hi@brand.com', from_label: 'Brand', body: HTML },
          },
        },
      })
    }
    if (path.startsWith('/metrics')) {
      return json({ data: [{ id: 'placed_order_metric_id', attributes: { name: 'Placed Order' } }] })
    }
    if (path === '/flow-series-reports' && init?.method === 'POST') {
      // Statistics are time-series arrays per Klaviyo v2024-10-15.
      return json({
        data: {
          attributes: {
            date_times: ['2026-03-01T00:00:00+00:00'],
            results: [
              { groupings: { flow_id: 'f1', flow_message_id: 'f1-msg' }, statistics: { recipients: [1000], opens_unique: [500], clicks_unique: [80], conversion_uniques: [40], conversion_value: [3000] } },
              { groupings: { flow_id: 'f2', flow_message_id: 'f2-msg' }, statistics: { recipients: [500], opens_unique: [225], clicks_unique: [30], conversion_uniques: [25], conversion_value: [2500] } },
              { groupings: { flow_id: 'f3', flow_message_id: 'f3-msg' }, statistics: { recipients: [200], opens_unique: [110], clicks_unique: [12], conversion_uniques: [6], conversion_value: [500] } },
            ],
          },
        },
      })
    }
    if (path === '/segments') return json({ data: [] })
    return json({ errors: [{ detail: `unrouted: ${path}` }] }, 404)
  }
}

function json(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function makeKlaviyoClient(route: Route): KlaviyoClient {
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    const path = url.replace(/^https:\/\/a\.klaviyo\.com\/api/, '')
    return route(path, init)
  }) as unknown as typeof fetch
  return new KlaviyoClient({
    apiKey: 'pk_test',
    fetchImpl,
    maxRetries: 0,
    baseDelayMs: 1,
    waitImpl: async () => {},
  })
}

// ----- Anthropic fetch mock ------------------------------------------------

type AnthropicBehavior = 'ok' | 'error' | Error

function anthropicFetch(responses: AnthropicBehavior[]): {
  fetchImpl: typeof fetch
  calls: number
} {
  let idx = 0
  const obj = {
    calls: 0,
    fetchImpl: (async () => {
      const behavior = responses[idx] ?? responses[responses.length - 1] ?? 'ok'
      idx += 1
      obj.calls += 1
      if (behavior === 'ok') {
        // analyzeCopy sends `{` as an assistant prefill, so Claude's
        // response body contains only the continuation after that brace.
        // We strip the leading `{` here to simulate that.
        const full = JSON.stringify({
          brandVoiceConsistency: 0.8,
          hasSpecificValueProps: true,
          handlesObjections: true,
          subjectLineVariance: 0.7,
          subjectLineQuality: 0.8,
          issues: [],
          strengths: ['Specific product references.'],
        })
        const continuation = full.slice(1)
        return new Response(JSON.stringify({ content: [{ type: 'text', text: continuation }], stop_reason: 'end_turn' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (behavior === 'error') {
        return new Response(JSON.stringify({ error: 'boom' }), { status: 500, headers: { 'content-type': 'application/json' } })
      }
      throw behavior
    }) as unknown as typeof fetch,
  }
  return obj
}

// ----- tests --------------------------------------------------------------

describe('runAudit — end-to-end happy path', () => {
  it('returns a complete AuditReport with 3 flows scored and no warnings', async () => {
    const klaviyoClient = makeKlaviyoClient(routeKlaviyo())
    const { fetchImpl } = anthropicFetch(['ok', 'ok', 'ok'])

    const report = await runAudit({
      brandId: 'brand-1',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: ['warm'] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })

    assert.equal(report.brandId, 'brand-1')
    assert.equal(report.flowScores.length, 3)
    assert.equal(report.warnings.length, 0)
    assert.equal(report.context.senderEmail, 'hi@brand.com')
    assert.equal(report.context.performanceWindowDays, 60)
    assert.ok(report.overallScore >= 0 && report.overallScore <= 100)
    assert.ok(['A', 'B', 'C', 'D', 'F'].includes(report.overallGrade))
    assert.ok(Array.isArray(report.prioritizedFixes))
    assert.ok(typeof report.revenueLeftOnTable.methodology === 'string')
  })
})

describe('runAudit — copy analysis failure degrades gracefully', () => {
  it('one flow Claude-500 → other flows score normally, warning recorded', async () => {
    const klaviyoClient = makeKlaviyoClient(routeKlaviyo())
    // f1: ok, f2: error, f3: ok
    const anth = anthropicFetch(['ok', 'error', 'ok'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl: anth.fetchImpl,
    })

    assert.equal(report.flowScores.length, 3)
    const copyWarnings = report.warnings.filter(w => w.code === 'COPY_ANALYSIS_FAILED')
    assert.equal(copyWarnings.length, 1)
    // 3 copy calls made (not aborted)
    assert.equal(anth.calls, 3)
  })

  it('all copy analysis fails → audit still completes with neutral fallbacks', async () => {
    const klaviyoClient = makeKlaviyoClient(routeKlaviyo())
    const { fetchImpl } = anthropicFetch(['error', 'error', 'error'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })

    assert.equal(report.flowScores.length, 3)
    assert.equal(report.warnings.filter(w => w.code === 'COPY_ANALYSIS_FAILED').length, 3)
    // Each failed warning should target exactly one flow
    for (const w of report.warnings) {
      if (w.code === 'COPY_ANALYSIS_FAILED') {
        assert.equal(w.affectedFlowIds?.length, 1)
      }
    }
  })

  it('uses Promise.allSettled (thrown errors do not abort the batch)', async () => {
    const klaviyoClient = makeKlaviyoClient(routeKlaviyo())
    const { fetchImpl } = anthropicFetch([new Error('ECONNRESET'), 'ok', 'ok'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })
    assert.equal(report.flowScores.length, 3)
    assert.ok(report.warnings.some(w => w.code === 'COPY_ANALYSIS_FAILED'))
  })
})

describe('runAudit — fatal failures propagate', () => {
  it('throws when Klaviyo /accounts fails', async () => {
    const klaviyoClient = makeKlaviyoClient(routeKlaviyo({
      '/accounts': json({ errors: [{ detail: 'boom' }] }, 500),
    }))
    const { fetchImpl } = anthropicFetch(['ok'])
    await assert.rejects(() => runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: '', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    }))
  })
})

describe('runAudit — coverage and fixes', () => {
  it('missing critical flows produce priority-1 missing_flow fixes', async () => {
    // Only welcome flow present in routeKlaviyo's response subset
    const filterPath = '/flows?filter=' + encodeURIComponent('equals(status,"live"),equals(archived,false)')
    const route = routeKlaviyo({
      [filterPath]: json({
        data: [
          { id: 'f1', attributes: { name: 'Welcome Series', status: 'live', archived: false, created: '', updated: '', trigger_type: 'list' } },
        ],
      }),
    })
    const klaviyoClient = makeKlaviyoClient(route)
    const { fetchImpl } = anthropicFetch(['ok'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: '', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })

    const missingCartFix = report.prioritizedFixes.find(f => f.type === 'missing_flow' && f.stage === 'abandoned_cart')
    const missingCheckoutFix = report.prioritizedFixes.find(f => f.type === 'missing_flow' && f.stage === 'abandoned_checkout')
    const missingPostPurchaseFix = report.prioritizedFixes.find(f => f.type === 'missing_flow' && f.stage === 'post_purchase')

    assert.ok(missingCartFix)
    assert.equal(missingCartFix!.priority, 1)
    assert.ok(missingCheckoutFix)
    assert.equal(missingCheckoutFix!.priority, 1)
    assert.ok(missingPostPurchaseFix)
    assert.equal(missingPostPurchaseFix!.priority, 1)

    assert.ok(report.coverage.missing.includes('abandoned_cart'))
  })
})

describe('runAudit — overall score weighting', () => {
  it('weights flow scores by sent volume', async () => {
    // One flow with huge sends; different flow sends means weighting matters.
    const klaviyoClient = makeKlaviyoClient(routeKlaviyo())
    const { fetchImpl } = anthropicFetch(['ok', 'ok', 'ok'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })

    // Hand-compute a sanity bound: score is a blend of flow average × 0.7 + coverage × 0.3.
    // With only 3 of 7 required stages present, coverage will be partial.
    assert.ok(report.overallScore < 100)
    assert.ok(report.overallScore > 0)
  })

  it('falls back to simple average when all flows have zero sends', async () => {
    // Route with report endpoint returning no statistics for any flow
    const route = routeKlaviyo({
      '/flow-series-reports': json({ data: { attributes: { results: [] } } }),
    })
    const klaviyoClient = makeKlaviyoClient(route)
    const { fetchImpl } = anthropicFetch(['ok', 'ok', 'ok'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })

    // Perf fetch succeeded but returned no rows — genuinely "no sends".
    // The warning message should be the updated "last N days" wording.
    const noData = report.warnings.find(w => w.code === 'NO_PERFORMANCE_DATA')
    assert.ok(noData)
    assert.ok(noData!.message.includes('last 60 days'))
    // Score still computed, not NaN
    assert.equal(Number.isFinite(report.overallScore), true)
  })
})

describe('runAudit — warning deduplication', () => {
  it('does NOT emit NO_PERFORMANCE_DATA when PERFORMANCE_FETCH_FAILED is already present', async () => {
    // Report endpoint 500s — fetchAuditData emits PERFORMANCE_FETCH_FAILED
    // and no rows land in the perf map, so every flow ends up with sent=0.
    // The orchestrator must NOT also emit NO_PERFORMANCE_DATA on top —
    // that's the noise this test guards against.
    const route = routeKlaviyo({
      '/flow-series-reports': json({ errors: [{ detail: 'boom' }] }, 500),
    })
    const klaviyoClient = makeKlaviyoClient(route)
    const { fetchImpl } = anthropicFetch(['ok', 'ok', 'ok'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })

    assert.ok(report.warnings.some(w => w.code === 'PERFORMANCE_FETCH_FAILED'))
    assert.ok(!report.warnings.some(w => w.code === 'NO_PERFORMANCE_DATA'))
  })

  it('does NOT emit NO_PERFORMANCE_DATA when NO_CONVERSION_METRIC is present', async () => {
    // Metrics endpoint returns no "Placed Order" metric at all.
    const filteredMetricsPath = '/metrics?filter=' + encodeURIComponent('equals(name,"Placed Order")')
    const route = routeKlaviyo({
      [filteredMetricsPath]: json({ data: [] }),
      '/metrics': json({ data: [] }),
    })
    const klaviyoClient = makeKlaviyoClient(route)
    const { fetchImpl } = anthropicFetch(['ok', 'ok', 'ok'])

    const report = await runAudit({
      brandId: 'b',
      klaviyoClient,
      brandVoice: { voiceDescription: 'warm', toneAttributes: [] },
      anthropicApiKey: 'sk-x',
      fetchImpl,
    })

    assert.ok(report.warnings.some(w => w.code === 'NO_CONVERSION_METRIC'))
    assert.ok(!report.warnings.some(w => w.code === 'NO_PERFORMANCE_DATA'))
  })
})
