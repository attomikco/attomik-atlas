// Pure HTTP transport for the Klaviyo REST API.
//
// Knows nothing about audits or domain shapes — all domain reshaping lives in
// the transformer (src/lib/audit/fetchAuditData.ts). Keeping transport pure
// makes it reusable for other Klaviyo surfaces (Klaviyo push from the email
// editor already has its own helpers at src/lib/klaviyo.ts; this lives under
// src/lib/klaviyo/ so the two don't collide).
//
// The API version is pinned via the `revision` header. Bump the
// KLAVIYO_API_VERSION constant in one place when upgrading — don't sprinkle
// version strings across call sites.

import type { KlaviyoListResponse } from './types.ts'

// Keep in lockstep with `KLAVIYO_REVISION` in src/lib/klaviyo.ts — drift
// between the two clients has caused production bugs (template schema
// `editor_type` requirement changed, filter syntax changed). Bump both in
// the same change. See CLAUDE.md "Klaviyo API revision" rule.
export const KLAVIYO_API_VERSION = '2026-04-15'
export const KLAVIYO_BASE_URL = 'https://a.klaviyo.com/api'

export type KlaviyoClientOptions = {
  apiKey: string
  fetchImpl?: typeof fetch
  maxRetries?: number
  baseDelayMs?: number
  /** Injectable wait — tests pass a no-op; production uses setTimeout. */
  waitImpl?: (ms: number) => Promise<void>
}

export class KlaviyoError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'KlaviyoError'
    this.status = status
    this.body = body
  }
}

function defaultWait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const n = Number(header)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 1000)
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'errors' in body) {
    const errs = (body as { errors: unknown }).errors
    if (Array.isArray(errs) && errs.length > 0) {
      const first = errs[0] as { detail?: string; title?: string }
      return first?.detail || first?.title || fallback
    }
  }
  return fallback
}

export class KlaviyoClient {
  private readonly apiKey: string
  private readonly fetchImpl: typeof fetch
  private readonly maxRetries: number
  private readonly baseDelayMs: number
  private readonly wait: (ms: number) => Promise<void>

  constructor(opts: KlaviyoClientOptions) {
    if (!opts.apiKey) throw new Error('KlaviyoClient: apiKey is required')
    this.apiKey = opts.apiKey
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.maxRetries = opts.maxRetries ?? 3
    this.baseDelayMs = opts.baseDelayMs ?? 1000
    this.wait = opts.waitImpl ?? defaultWait
  }

  private buildHeaders(extra?: HeadersInit): HeadersInit {
    return {
      Authorization: `Klaviyo-API-Key ${this.apiKey}`,
      revision: KLAVIYO_API_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(extra || {}),
    }
  }

  private resolveUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const clean = path.startsWith('/') ? path : `/${path}`
    return `${KLAVIYO_BASE_URL}${clean}`
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = this.resolveUrl(path)
    let lastErr: unknown = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.fetchImpl(url, {
          ...init,
          headers: this.buildHeaders(init.headers),
        })

        if (res.ok) {
          return (await res.json()) as T
        }

        if (isRetryableStatus(res.status) && attempt < this.maxRetries) {
          const retryAfterMs = parseRetryAfter(res.headers.get('Retry-After'))
          const backoff = retryAfterMs ?? this.baseDelayMs * Math.pow(2, attempt)
          console.warn(`[klaviyo] ${res.status} on ${path} — retrying in ${backoff}ms (attempt ${attempt + 1}/${this.maxRetries})`)
          await this.wait(backoff)
          continue
        }

        const body = await safeJson(res)
        throw new KlaviyoError(
          extractErrorMessage(body, `Klaviyo ${res.status} on ${path}`),
          res.status,
          body,
        )
      } catch (err) {
        if (err instanceof KlaviyoError) throw err
        lastErr = err
        if (attempt < this.maxRetries) {
          const backoff = this.baseDelayMs * Math.pow(2, attempt)
          console.warn(`[klaviyo] network error on ${path} — retrying in ${backoff}ms (attempt ${attempt + 1}/${this.maxRetries})`)
          await this.wait(backoff)
          continue
        }
        throw err
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error(`Klaviyo request failed: ${path}`)
  }

  async paginate<T>(path: string, hardCap: number = 500): Promise<T[]> {
    const out: T[] = []
    let nextPath: string | null = path

    while (nextPath && out.length < hardCap) {
      const res: KlaviyoListResponse<T> = await this.request<KlaviyoListResponse<T>>(nextPath)
      if (Array.isArray(res.data)) {
        for (const row of res.data) {
          if (out.length >= hardCap) break
          out.push(row)
        }
      }
      nextPath = res.links?.next ?? null
    }

    return out
  }
}
