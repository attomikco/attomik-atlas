import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  KLAVIYO_API_VERSION,
  KlaviyoClient,
  KlaviyoError,
} from '../klaviyoClient.ts'

// ----- fetch mocking helpers ----------------------------------------------

type MockResponse = {
  status: number
  body?: unknown
  headers?: Record<string, string>
}

type Call = { url: string; init?: RequestInit }

function makeFetch(queue: Array<MockResponse | Error>): {
  fetchImpl: typeof fetch
  calls: Call[]
} {
  const calls: Call[] = []
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    calls.push({ url, init })
    const next = queue.shift()
    if (!next) throw new Error(`mock fetch: no response queued for ${url}`)
    if (next instanceof Error) throw next
    const { status, body, headers } = next
    return new Response(body != null ? JSON.stringify(body) : null, {
      status,
      headers: { 'content-type': 'application/json', ...(headers || {}) },
    })
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

function makeClient(queue: Array<MockResponse | Error>, overrides: Partial<ConstructorParameters<typeof KlaviyoClient>[0]> = {}) {
  const { fetchImpl, calls } = makeFetch(queue)
  const waitCalls: number[] = []
  const client = new KlaviyoClient({
    apiKey: 'pk_test',
    fetchImpl,
    maxRetries: 3,
    baseDelayMs: 10,
    waitImpl: async (ms: number) => { waitCalls.push(ms) },
    ...overrides,
  })
  return { client, calls, waitCalls }
}

// ----- headers + URL -------------------------------------------------------

describe('KlaviyoClient — headers and URL resolution', () => {
  it('sets Authorization, revision, and content-type headers', async () => {
    const { client, calls } = makeClient([{ status: 200, body: { ok: true } }])
    await client.request('/accounts')
    const headers = calls[0].init!.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Klaviyo-API-Key pk_test')
    assert.equal(headers.revision, KLAVIYO_API_VERSION)
    assert.equal(headers.Accept, 'application/json')
    assert.equal(headers['Content-Type'], 'application/json')
  })

  it('resolves a relative path against the API base', async () => {
    const { client, calls } = makeClient([{ status: 200, body: { ok: true } }])
    await client.request('/flows')
    assert.equal(calls[0].url, 'https://a.klaviyo.com/api/flows')
  })

  it('leaves absolute URLs untouched (used by paginate links.next)', async () => {
    const { client, calls } = makeClient([{ status: 200, body: { data: [] } }])
    await client.request('https://a.klaviyo.com/api/flows?page[cursor]=xyz')
    assert.equal(calls[0].url, 'https://a.klaviyo.com/api/flows?page[cursor]=xyz')
  })

  it('throws when apiKey is missing', () => {
    assert.throws(() => new KlaviyoClient({ apiKey: '' }))
  })
})

// ----- success -------------------------------------------------------------

describe('KlaviyoClient — successful request', () => {
  it('returns parsed JSON on 200', async () => {
    const { client } = makeClient([{ status: 200, body: { data: [{ id: 'x' }] } }])
    const res = await client.request<{ data: Array<{ id: string }> }>('/flows')
    assert.deepEqual(res, { data: [{ id: 'x' }] })
  })
})

// ----- 429 backoff ---------------------------------------------------------

describe('KlaviyoClient — 429 retry behavior', () => {
  it('retries on 429 with exponential backoff and eventually resolves', async () => {
    const { client, calls, waitCalls } = makeClient([
      { status: 429 },
      { status: 429 },
      { status: 200, body: { ok: true } },
    ])
    const res = await client.request<{ ok: boolean }>('/flows')
    assert.deepEqual(res, { ok: true })
    assert.equal(calls.length, 3)
    // baseDelay=10, 2 retries → 10, 20
    assert.deepEqual(waitCalls, [10, 20])
  })

  it('respects Retry-After header when present', async () => {
    const { client, waitCalls } = makeClient([
      { status: 429, headers: { 'Retry-After': '2' } },
      { status: 200, body: { ok: true } },
    ])
    await client.request('/flows')
    // Retry-After is in seconds — 2 → 2000ms
    assert.deepEqual(waitCalls, [2000])
  })

  it('throws after exhausting retries on 429', async () => {
    const { client, calls } = makeClient([
      { status: 429 },
      { status: 429 },
      { status: 429 },
      { status: 429 }, // this one is the final attempt — throws because no more retries
    ])
    await assert.rejects(() => client.request('/flows'), (err) => {
      assert.ok(err instanceof KlaviyoError)
      assert.equal((err as KlaviyoError).status, 429)
      return true
    })
    assert.equal(calls.length, 4) // 1 initial + 3 retries
  })
})

// ----- 5xx retry -----------------------------------------------------------

describe('KlaviyoClient — 5xx retry', () => {
  it('retries on 503 and resolves', async () => {
    const { client, calls } = makeClient([
      { status: 503 },
      { status: 500 },
      { status: 200, body: { ok: true } },
    ])
    const res = await client.request<{ ok: boolean }>('/flows')
    assert.deepEqual(res, { ok: true })
    assert.equal(calls.length, 3)
  })
})

// ----- 4xx (non-429) -------------------------------------------------------

describe('KlaviyoClient — 4xx (non-429) fails fast', () => {
  it('throws immediately on 404 without retrying', async () => {
    const { client, calls } = makeClient([
      { status: 404, body: { errors: [{ detail: 'Flow not found' }] } },
    ])
    await assert.rejects(() => client.request('/flows/nope'), (err) => {
      assert.ok(err instanceof KlaviyoError)
      assert.equal((err as KlaviyoError).status, 404)
      assert.ok(err instanceof Error && err.message.includes('Flow not found'))
      return true
    })
    assert.equal(calls.length, 1)
  })

  it('throws immediately on 401', async () => {
    const { client, calls } = makeClient([
      { status: 401, body: { errors: [{ title: 'Unauthorized' }] } },
    ])
    await assert.rejects(() => client.request('/accounts'))
    assert.equal(calls.length, 1)
  })
})

// ----- network errors ------------------------------------------------------

describe('KlaviyoClient — network errors', () => {
  it('retries on thrown fetch errors', async () => {
    const { client, calls } = makeClient([
      new Error('ECONNRESET'),
      { status: 200, body: { ok: true } },
    ])
    const res = await client.request<{ ok: boolean }>('/flows')
    assert.deepEqual(res, { ok: true })
    assert.equal(calls.length, 2)
  })

  it('throws after exhausting retries on persistent network errors', async () => {
    const { client } = makeClient([
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
      new Error('ECONNRESET'),
    ])
    await assert.rejects(() => client.request('/flows'))
  })
})

// ----- paginate ------------------------------------------------------------

describe('KlaviyoClient — paginate', () => {
  it('follows links.next and flattens data arrays', async () => {
    const { client } = makeClient([
      { status: 200, body: { data: [{ id: 'a' }, { id: 'b' }], links: { next: 'https://a.klaviyo.com/api/flows?page=2' } } },
      { status: 200, body: { data: [{ id: 'c' }], links: { next: null } } },
    ])
    const out = await client.paginate<{ id: string }>('/flows')
    assert.deepEqual(out.map(x => x.id), ['a', 'b', 'c'])
  })

  it('stops at hardCap', async () => {
    const { client } = makeClient([
      { status: 200, body: { data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], links: { next: 'https://a.klaviyo.com/api/flows?page=2' } } },
      { status: 200, body: { data: [{ id: 'd' }, { id: 'e' }], links: { next: 'https://a.klaviyo.com/api/flows?page=3' } } },
    ])
    const out = await client.paginate<{ id: string }>('/flows', 4)
    assert.equal(out.length, 4)
    assert.deepEqual(out.map(x => x.id), ['a', 'b', 'c', 'd'])
  })

  it('stops when links.next is missing', async () => {
    const { client, calls } = makeClient([
      { status: 200, body: { data: [{ id: 'a' }] } },
    ])
    const out = await client.paginate<{ id: string }>('/flows')
    assert.equal(out.length, 1)
    assert.equal(calls.length, 1)
  })
})
