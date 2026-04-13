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
  const update = !!existingKlaviyoId
  const url = update
    ? `${KLAVIYO_API_BASE}/templates/${existingKlaviyoId}/`
    : `${KLAVIYO_API_BASE}/templates/`
  const method = update ? 'PATCH' : 'POST'

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
      throw new Error('Klaviyo rejected the API key. Check the key in Brand Hub → Integrations.')
    }
    throw new Error(`Klaviyo API error (${res.status}): ${errText || res.statusText}`)
  }

  const result = await res.json().catch(() => null) as { data?: { id?: string } } | null
  const returnedId = result?.data?.id
  const klaviyoId = returnedId || existingKlaviyoId || ''
  if (!klaviyoId) {
    throw new Error('Klaviyo API did not return a template id')
  }

  return { klaviyoId, created: !update }
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
