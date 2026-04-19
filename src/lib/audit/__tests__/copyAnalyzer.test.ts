import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  CopyAnalysisError,
  CopyAnalysisTruncationError,
  analyzeCopy,
  extractJsonObject,
} from '../copyAnalyzer.ts'
import type { BrandVoiceContext, Flow } from '../types.ts'

// ----- fixtures -----------------------------------------------------------

function makeFlow(): Flow {
  return {
    id: 'f1',
    name: 'Welcome Series',
    stage: 'welcome',
    isLive: true,
    hasExitCondition: true,
    hasBranching: true,
    filters: [],
    performance: { sent: 0, openRate: null, clickRate: null, conversionRate: null, revenuePerRecipient: null },
    messages: [
      {
        id: 'm1',
        position: 0,
        delayHours: 0,
        subjectLine: 'Welcome — here is your 10% off',
        previewText: 'Thanks for signing up',
        bodyText: 'Hi there, welcome to our brand. We make hand-roasted coffee.',
        hasImages: true,
        imageToTextRatio: 0.3,
        ctaCount: 2,
        isMobileOptimized: true,
        hasUnsubscribeLink: true,
        hasPreferenceLink: true,
        performance: { sent: 0, openRate: null, clickRate: null, conversionRate: null, revenuePerRecipient: null },
      },
      {
        id: 'm2',
        position: 1,
        delayHours: 48,
        subjectLine: 'Our most-loved roast',
        previewText: 'Hand-roasted in small batches',
        bodyText: 'Did you know? Our single-origin roast has won 3 industry awards.',
        hasImages: true,
        imageToTextRatio: 0.3,
        ctaCount: 2,
        isMobileOptimized: true,
        hasUnsubscribeLink: true,
        hasPreferenceLink: true,
        performance: { sent: 0, openRate: null, clickRate: null, conversionRate: null, revenuePerRecipient: null },
      },
    ],
  }
}

const BRAND_VOICE: BrandVoiceContext = {
  voiceDescription: 'Warm, honest, craft-focused. No marketing jargon.',
  toneAttributes: ['warm', 'honest', 'craft'],
  forbiddenPhrases: ['shop now', "don't miss out"],
}

function validPayload() {
  return {
    brandVoiceConsistency: 0.85,
    hasSpecificValueProps: true,
    handlesObjections: true,
    subjectLineVariance: 0.7,
    subjectLineQuality: 0.8,
    issues: ['Second message could lead with the award for more punch.'],
    strengths: ['Voice is consistent across both messages.', 'Subject lines reference specific product attributes.'],
  }
}

// analyzeCopy uses assistant-prefill: we send `{` as the assistant's first
// token so Claude continues the JSON. The server-side response then contains
// only what comes AFTER that opening brace. These helpers simulate that.

function continuationOf(obj: unknown): string {
  const full = JSON.stringify(obj)
  return full.startsWith('{') ? full.slice(1) : full
}

function anthropicResponse(text: string, stopReason: string = 'end_turn') {
  return {
    id: 'msg_1',
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
    usage: { input_tokens: 1, output_tokens: 1 },
  }
}

function makeFetch(res: unknown, status: number = 200): { fetchImpl: typeof fetch; calls: Array<{ url: string; init?: RequestInit }> } {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    calls.push({ url, init })
    return new Response(typeof res === 'string' ? res : JSON.stringify(res), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

// ----- extractJsonObject unit tests ---------------------------------------

describe('extractJsonObject', () => {
  it('returns clean JSON as-is', () => {
    const obj = { a: 1, b: 'x' }
    const s = JSON.stringify(obj)
    assert.equal(extractJsonObject(s), s)
  })

  it('strips ```json fences', () => {
    const inner = '{"a":1}'
    assert.equal(extractJsonObject('```json\n' + inner + '\n```'), inner)
  })

  it('strips plain ``` fences with no language hint', () => {
    const inner = '{"a":1}'
    assert.equal(extractJsonObject('```\n' + inner + '\n```'), inner)
  })

  it('strips a prose preamble before the JSON', () => {
    const out = extractJsonObject('Here is the JSON you requested:\n{"a":1,"b":2}')
    assert.equal(out, '{"a":1,"b":2}')
  })

  it('strips a prose postamble after the JSON', () => {
    const out = extractJsonObject('{"a":1,"b":2}\n\nLet me know if you need anything else.')
    assert.equal(out, '{"a":1,"b":2}')
  })

  it('strips both preamble and postamble', () => {
    const out = extractJsonObject('Sure! {"a":1} — hope that helps')
    assert.equal(out, '{"a":1}')
  })

  it('returns the full text when there is no JSON to extract', () => {
    assert.equal(extractJsonObject('no json here'), 'no json here')
  })

  it('prefers fenced content when both fences and braces are present', () => {
    const out = extractJsonObject('Preamble ```json\n{"a":1}\n``` postamble {"b":2}')
    assert.equal(out, '{"a":1}')
  })
})

// ----- analyzeCopy happy path ---------------------------------------------

describe('analyzeCopy — happy path', () => {
  it('returns parsed CopyAnalysisInput when Claude continues a prefilled JSON', async () => {
    const { fetchImpl } = makeFetch(anthropicResponse(continuationOf(validPayload())))
    const result = await analyzeCopy({
      flow: makeFlow(),
      brandVoice: BRAND_VOICE,
      anthropicApiKey: 'sk-test',
      fetchImpl,
    })
    assert.equal(result.brandVoiceConsistency, 0.85)
    assert.equal(result.hasSpecificValueProps, true)
    assert.equal(result.strengths.length, 2)
  })

  it('tolerates a trailing prose postamble from Claude', async () => {
    // Claude occasionally appends a courtesy line after the closing brace.
    // With prefill, the full reconstructed text is `{<continuation>\n\nHope
    // that helps!` — the extractor's first-brace/last-brace pass slices out
    // exactly the JSON object before the prose.
    const text = continuationOf(validPayload()) + '\n\nHope that helps!'
    const { fetchImpl } = makeFetch(anthropicResponse(text))
    const result = await analyzeCopy({
      flow: makeFlow(),
      brandVoice: BRAND_VOICE,
      anthropicApiKey: 'sk-test',
      fetchImpl,
    })
    assert.equal(result.brandVoiceConsistency, 0.85)
  })
})

// ----- analyzeCopy failure modes ------------------------------------------

describe('analyzeCopy — failure modes', () => {
  it('throws CopyAnalysisError on malformed JSON', async () => {
    // `this is not json` — prefixed with `{` stays malformed and the extractor
    // has no `}` to anchor against, so JSON.parse fails.
    const { fetchImpl } = makeFetch(anthropicResponse(' this is not json'))
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => {
        assert.ok(err instanceof CopyAnalysisError)
        return true
      },
    )
  })

  it('throws CopyAnalysisError when a required field is missing', async () => {
    const payload = validPayload() as Record<string, unknown>
    delete payload.brandVoiceConsistency
    const { fetchImpl } = makeFetch(anthropicResponse(continuationOf(payload)))
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => {
        assert.ok(err instanceof CopyAnalysisError)
        assert.ok((err as Error).message.includes('brandVoiceConsistency'))
        return true
      },
    )
  })

  it('throws CopyAnalysisError when a field has the wrong type', async () => {
    const bad = { ...validPayload(), hasSpecificValueProps: 'yes' as unknown as boolean }
    const { fetchImpl } = makeFetch(anthropicResponse(continuationOf(bad)))
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => {
        assert.ok(err instanceof CopyAnalysisError)
        return true
      },
    )
  })

  it('throws CopyAnalysisError on scalar outside 0..1', async () => {
    const bad = { ...validPayload(), brandVoiceConsistency: 1.5 }
    const { fetchImpl } = makeFetch(anthropicResponse(continuationOf(bad)))
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => err instanceof CopyAnalysisError,
    )
  })

  it('throws CopyAnalysisError on network failure', async () => {
    const fetchImpl = (async () => { throw new Error('ECONNRESET') }) as unknown as typeof fetch
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => {
        assert.ok(err instanceof CopyAnalysisError)
        assert.ok((err as CopyAnalysisError).cause != null)
        return true
      },
    )
  })

  it('throws CopyAnalysisError on non-OK Anthropic response', async () => {
    const { fetchImpl } = makeFetch({ error: { type: 'overloaded' } }, 529)
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => err instanceof CopyAnalysisError,
    )
  })

  it('throws CopyAnalysisError when response has no content[0].text', async () => {
    const { fetchImpl } = makeFetch({ content: [] })
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => err instanceof CopyAnalysisError,
    )
  })

  it('throws CopyAnalysisTruncationError when stop_reason is max_tokens', async () => {
    // Any text is fine — we should throw before attempting to parse.
    const { fetchImpl } = makeFetch(anthropicResponse(continuationOf(validPayload()), 'max_tokens'))
    await assert.rejects(
      () => analyzeCopy({ flow: makeFlow(), brandVoice: BRAND_VOICE, anthropicApiKey: 'sk-test', fetchImpl }),
      (err) => {
        assert.ok(err instanceof CopyAnalysisTruncationError)
        // Truncation error is a subclass of CopyAnalysisError — verify the
        // `instanceof CopyAnalysisError` guard in the orchestrator still works.
        assert.ok(err instanceof CopyAnalysisError)
        return true
      },
    )
  })
})

// ----- request shape ------------------------------------------------------

describe('analyzeCopy — request shape', () => {
  it('uses the correct URL, headers, and body structure', async () => {
    const { fetchImpl, calls } = makeFetch(anthropicResponse(continuationOf(validPayload())))
    await analyzeCopy({
      flow: makeFlow(),
      brandVoice: BRAND_VOICE,
      anthropicApiKey: 'sk-test',
      fetchImpl,
    })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages')
    const headers = calls[0].init!.headers as Record<string, string>
    assert.equal(headers['x-api-key'], 'sk-test')
    assert.equal(headers['anthropic-version'], '2023-06-01')
    assert.equal(headers['content-type'], 'application/json')

    const body = JSON.parse(calls[0].init!.body as string)
    assert.equal(typeof body.model, 'string')
    assert.equal(body.max_tokens, 2048)
    assert.equal(typeof body.system, 'string')
    // Two messages: user prompt + assistant prefill
    assert.equal(body.messages.length, 2)
    assert.equal(body.messages[0].role, 'user')
    assert.equal(body.messages[1].role, 'assistant')
    assert.equal(body.messages[1].content, '{')
  })

  it('includes flow messages and brand voice in the user prompt', async () => {
    const { fetchImpl, calls } = makeFetch(anthropicResponse(continuationOf(validPayload())))
    await analyzeCopy({
      flow: makeFlow(),
      brandVoice: BRAND_VOICE,
      anthropicApiKey: 'sk-test',
      fetchImpl,
    })
    const body = JSON.parse(calls[0].init!.body as string)
    const userContent = body.messages[0].content as string
    assert.ok(userContent.includes('Welcome Series'))
    assert.ok(userContent.includes('Welcome — here is your 10% off'))
    assert.ok(userContent.includes('Warm, honest, craft-focused'))
    assert.ok(userContent.includes('warm, honest, craft'))
  })

  it('honors a model override', async () => {
    const { fetchImpl, calls } = makeFetch(anthropicResponse(continuationOf(validPayload())))
    await analyzeCopy({
      flow: makeFlow(),
      brandVoice: BRAND_VOICE,
      anthropicApiKey: 'sk-test',
      model: 'claude-opus-4-20260101',
      fetchImpl,
    })
    const body = JSON.parse(calls[0].init!.body as string)
    assert.equal(body.model, 'claude-opus-4-20260101')
  })
})
