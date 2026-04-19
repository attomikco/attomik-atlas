// Shared Klaviyo client — single source of truth for every Klaviyo API call
// made on the template write path. The audit read client in
// src/lib/klaviyo/klaviyoClient.ts uses the same revision; **bump both files
// together** when Klaviyo rolls forward. Drift between revisions has caused
// production bugs (template schema changed `editor_type` from optional →
// required across revisions; audit stats names changed; filter syntax
// changed). See CLAUDE.md "Klaviyo API revision" rule.

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api'
const KLAVIYO_REVISION = '2026-04-15'

export function klaviyoHeaders(apiKey: string) {
  return {
    'Authorization': `Klaviyo-API-Key ${apiKey}`,
    'Content-Type': 'application/json',
    'revision': KLAVIYO_REVISION,
  }
}

// Thrown when the push fails. `staleIdDetected` tells the caller that the
// PATCH path was attempted against an existing `klaviyo_template_id` and
// came back with a 4xx — the stored id is no longer usable, and the caller
// should clear it from `generated_content.content` so the next push starts
// from a clean slate instead of retrying the same bad id.
export class KlaviyoPushError extends Error {
  readonly staleIdDetected: boolean
  constructor(message: string, staleIdDetected: boolean) {
    super(message)
    this.name = 'KlaviyoPushError'
    this.staleIdDetected = staleIdDetected
  }
}

export async function pushTemplateToKlaviyo(
  apiKey: string,
  name: string,
  html: string,
  existingKlaviyoId?: string | null
): Promise<{ klaviyoId: string; created: boolean; staleIdDetected: boolean }> {
  console.log('[klaviyo] push starting', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length ?? 0,
    name,
    htmlLength: html?.length ?? 0,
    existingKlaviyoId: existingKlaviyoId || null,
  })

  let staleIdDetected = false

  // Attempt 1: if we have an existingKlaviyoId, PATCH to update in place.
  if (existingKlaviyoId) {
    const result = await sendRequest(apiKey, name, html, existingKlaviyoId)
    if (result.status === 'ok') {
      return { klaviyoId: result.klaviyoId, created: false, staleIdDetected: false }
    }
    if (result.status === 'error') {
      // 5xx / network / other non-client failures — don't treat as stale id.
      // The caller sees a generic push failure and keeps the stored id so a
      // retry can re-attempt PATCH when Klaviyo recovers.
      throw new KlaviyoPushError(result.error.message, false)
    }
    // status === 'stale_id' — the PATCH came back with a 4xx (404 deleted,
    // 400 schema mismatch, 401/403 auth against this specific resource, etc.).
    // The stored id is not usable on the current revision. Fall through to a
    // POST create; the calling route will rewrite the stored id on success
    // (or clear it on failure, via staleIdDetected on the thrown error).
    staleIdDetected = true
    console.warn(
      '[klaviyo] PATCH returned 4xx — stored klaviyo_template_id is stale, falling back to POST create',
      { existingKlaviyoId, status: result.httpStatus }
    )
  }

  // Attempt 2 (or first attempt for a brand-new template): POST create.
  const result = await sendRequest(apiKey, name, html, null)
  if (result.status === 'ok') {
    return { klaviyoId: result.klaviyoId, created: true, staleIdDetected }
  }
  if (result.status === 'error') {
    // Propagate staleIdDetected so the route can clear the stored id even
    // though the full push failed — next attempt won't retry the bad id.
    throw new KlaviyoPushError(result.error.message, staleIdDetected)
  }
  // POST never returns 'stale_id' (sendRequest only emits that on PATCH),
  // but TypeScript narrows the union without that knowledge — guard anyway.
  throw new KlaviyoPushError('Klaviyo API: unexpected stale_id on POST create', staleIdDetected)
}

// Single Klaviyo create-or-update request. Returns a discriminated union so
// the caller can distinguish:
//   - 'ok'       → request succeeded, usable klaviyoId returned
//   - 'stale_id' → PATCH path only: any 4xx from Klaviyo. The stored id
//                  won't work on the current revision/account state; the
//                  caller should fall back to POST create and rewrite the
//                  stored id.
//   - 'error'    → 5xx / network / other non-client failures. Do NOT treat
//                  as a stale id — retry logic keeps the stored id in place.
type KlaviyoSendResult =
  | { status: 'ok'; klaviyoId: string }
  | { status: 'stale_id'; httpStatus: number }
  | { status: 'error'; error: Error }

async function sendRequest(
  apiKey: string,
  name: string,
  html: string,
  existingKlaviyoId: string | null
): Promise<KlaviyoSendResult> {
  const update = !!existingKlaviyoId
  const url = update
    ? `${KLAVIYO_API_BASE}/templates/${existingKlaviyoId}/`
    : `${KLAVIYO_API_BASE}/templates/`
  const method = update ? 'PATCH' : 'POST'

  // `editor_type: 'CODE'` is REQUIRED as of revision 2026-04-15 for custom
  // HTML templates. This field has churned across revisions (optional on
  // 2024-02-15, absent on some in-between drafts, required again on
  // 2026-04-15). If a future revision bump flips it, the Klaviyo API error
  // body will say exactly which way — bump KLAVIYO_REVISION at the top of
  // this file + klaviyoClient.ts together, then re-test.
  const body = {
    data: {
      type: 'template',
      ...(update ? { id: existingKlaviyoId } : {}),
      attributes: {
        name,
        editor_type: 'CODE',
        html,
        text: `${name}\n\nView this email in your browser.`,
      },
    },
  }

  const res = await fetch(url, {
    method,
    headers: klaviyoHeaders(apiKey),
    body: JSON.stringify(body),
  })

  if (res.ok) {
    // Fall through to parse success body below.
  } else if (update && res.status >= 400 && res.status < 500) {
    // PATCH path, 4xx response. Treat as stale id: the stored id is not
    // usable against the current revision / Klaviyo account state (deleted,
    // schema-locked, ACL-gated, etc.). The caller will fall back to POST
    // create and rewrite the stored id. Log the body so we don't lose the
    // original error message if the POST fallback later also fails.
    const errText = await res.text().catch(() => '')
    console.warn('[klaviyo] PATCH 4xx — marking stored id as stale:', {
      status: res.status,
      url,
      body: errText,
    })
    return { status: 'stale_id', httpStatus: res.status }
  } else {
    // Non-ok and not eligible for stale-id fallback (POST failures + 5xx on
    // PATCH). Return as error; caller propagates to user.
    const errText = await res.text().catch(() => '')
    console.error('[klaviyo] API error:', {
      status: res.status,
      statusText: res.statusText,
      method,
      url,
      body: errText,
    })
    if (res.status === 401 || res.status === 403) {
      return {
        status: 'error',
        error: new Error('Klaviyo rejected the API key. Check the key in Brand Hub → Integrations.'),
      }
    }
    return {
      status: 'error',
      error: new Error(`Klaviyo API error (${res.status}): ${errText || res.statusText}`),
    }
  }

  const result = await res.json().catch(() => null) as { data?: { id?: string } } | null
  const returnedId = result?.data?.id
  const klaviyoId = returnedId || existingKlaviyoId || ''
  if (!klaviyoId) {
    return { status: 'error', error: new Error('Klaviyo API did not return a template id') }
  }
  return { status: 'ok', klaviyoId }
}

// Delete a template from Klaviyo by id. Treats 404 as success (already gone)
// so local deletes aren't blocked by a stale klaviyo_template_id pointing at
// something the user deleted directly in the Klaviyo UI.
export async function deleteTemplateFromKlaviyo(
  apiKey: string,
  klaviyoId: string
): Promise<{ deleted: boolean; alreadyGone: boolean }> {
  const url = `${KLAVIYO_API_BASE}/templates/${klaviyoId}/`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: klaviyoHeaders(apiKey),
  })

  if (res.status === 404) {
    return { deleted: true, alreadyGone: true }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('[klaviyo] delete error:', {
      status: res.status,
      statusText: res.statusText,
      url,
      body: errText,
    })
    if (res.status === 401 || res.status === 403) {
      throw new Error('Klaviyo rejected the API key. Check the key in Brand Hub → Integrations.')
    }
    throw new Error(`Klaviyo API error (${res.status}): ${errText || res.statusText}`)
  }

  return { deleted: true, alreadyGone: false }
}
