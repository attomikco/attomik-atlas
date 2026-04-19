// Minimal typing of Klaviyo API responses. We only model fields the audit
// transformer actually reads — the full schema is enormous and rapidly
// evolving, so narrower typing keeps drift cheap. Widen as needed when new
// endpoints are added.

export type KlaviyoFlow = {
  id: string
  attributes: {
    name: string
    status: string
    archived: boolean
    created: string
    updated: string
    trigger_type: string
  }
  relationships?: {
    'flow-actions'?: { data: Array<{ id: string; type: string }> }
  }
}

export type KlaviyoFlowAction = {
  id: string
  attributes: {
    action_type: string
    status: string
    settings: Record<string, unknown>
  }
}

export type KlaviyoFlowMessage = {
  id: string
  attributes: {
    name: string
    channel: string
    content: {
      subject: string
      preview_text: string | null
      from_email: string
      from_label: string
      // Body HTML isn't always at the same path across Klaviyo endpoints;
      // some endpoints tuck it under `body` (string) and some under
      // `render_options`. We accept either shape and let the transformer
      // coalesce.
      body?: string
    }
    render_options?: { shorten_links?: boolean }
  }
}

export type KlaviyoMetricAggregate = {
  attributes: {
    data: Array<{
      dimensions: string[]
      measurements: Record<string, number>
    }>
  }
}

export type KlaviyoListResponse<T> = {
  data: T[]
  links?: {
    next?: string | null
  }
}

export type KlaviyoSingleResponse<T> = {
  data: T
}

export type KlaviyoAccount = {
  id: string
  attributes: {
    contact_information: {
      default_sender_email: string
      default_sender_name: string
    }
    preferred_currency: string
    timezone: string
  }
}

export type KlaviyoSegment = {
  id: string
  attributes: {
    name: string
    created: string
    updated: string
    profile_count?: number
  }
}
