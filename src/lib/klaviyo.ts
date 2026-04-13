// Shared Klaviyo client — single source of truth for every Klaviyo API call.
// API revision is pinned here; update in one place when Klaviyo rolls forward.

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api'
const KLAVIYO_REVISION = '2024-02-15'

export function klaviyoHeaders(apiKey: string) {
  return {
    'Authorization': `Klaviyo-API-Key ${apiKey}`,
    'Content-Type': 'application/json',
    'revision': KLAVIYO_REVISION,
  }
}

export async function pushTemplateToKlaviyo(
  apiKey: string,
  name: string,
  html: string,
  existingKlaviyoId?: string | null
): Promise<{ klaviyoId: string; created: boolean }> {
  console.log('[klaviyo] push starting', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length ?? 0,
    name,
    htmlLength: html?.length ?? 0,
    existingKlaviyoId: existingKlaviyoId || null,
  })

  // Attempt 1: if we have an existingKlaviyoId, PATCH to update in place.
  if (existingKlaviyoId) {
    const result = await sendRequest(apiKey, name, html, existingKlaviyoId)
    if (result.status === 'ok') {
      return { klaviyoId: result.klaviyoId, created: false }
    }
    if (result.status === 'error') {
      throw result.error
    }
    // status === 'not_found' — the cached id points at a Klaviyo template
    // that no longer exists (deleted manually in the Klaviyo UI, wiped test
    // data, etc.). Fall through to a POST create so the next push lands
    // cleanly and the caller persists the fresh id.
    console.warn(
      '[klaviyo] PATCH 404 — stored klaviyo_template_id is stale, falling back to POST create',
      { existingKlaviyoId }
    )
  }

  // Attempt 2 (or first attempt for a brand-new template): POST create.
  const result = await sendRequest(apiKey, name, html, null)
  if (result.status === 'ok') {
    return { klaviyoId: result.klaviyoId, created: true }
  }
  if (result.status === 'error') {
    throw result.error
  }
  // POST never returns 'not_found' (sendRequest only emits that on PATCH),
  // but TypeScript narrows the union without that knowledge — guard anyway.
  throw new Error('Klaviyo API: unexpected not_found on POST create')
}

// Single Klaviyo create-or-update request. Returns a discriminated union so
// the caller can branch on a 404 from PATCH without losing the original error
// for other failure modes.
type KlaviyoSendResult =
  | { status: 'ok'; klaviyoId: string }
  | { status: 'not_found' }
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

  // Klaviyo API note: earlier this session their schema demanded an
  // `editor_type: 'CODE'` field; later in the same session the same revision
  // (2024-02-15) started rejecting it as "not a valid field for the resource
  // 'template'". The field is omitted now. If they flip again, the error
  // body in [klaviyo] API error logs will tell us exactly which way.
  const body = {
    data: {
      type: 'template',
      ...(update ? { id: existingKlaviyoId } : {}),
      attributes: {
        name,
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

  if (res.status === 404 && update) {
    // Don't log as an error — the caller will fall through to POST create.
    return { status: 'not_found' }
  }

  if (!res.ok) {
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
