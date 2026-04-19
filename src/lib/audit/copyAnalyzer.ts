// Claude-powered copy analyzer — one call per flow.
//
// This is the ONLY Claude caller inside the audit system. scoring.ts,
// coverage.ts, fixes.ts, classifier.ts, and the Klaviyo fetcher are all pure.
// The orchestrator fans out to this file in parallel via Promise.allSettled,
// so a single flow's copy analysis failing must throw a distinct error class
// — not a silent fallback — so the caller can flip it into a warning.
//
// We use raw fetch (not @anthropic-ai/sdk) for consistency with how
// klaviyoClient.ts is built, and to keep the audit system free of heavy
// runtime deps. Bump ANTHROPIC_API_VERSION + DEFAULT_MODEL here, not at call
// sites.

import type { BrandVoiceContext, CopyAnalysisInput, Flow } from './types.ts'

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_API_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

export type CopyAnalyzerOptions = {
  flow: Flow
  brandVoice: BrandVoiceContext
  anthropicApiKey: string
  model?: string
  fetchImpl?: typeof fetch
}

export class CopyAnalysisError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'CopyAnalysisError'
    this.cause = cause
  }
}

// Thrown specifically when Claude truncated mid-response (stop_reason =
// 'max_tokens'). Distinct from CopyAnalysisError so the orchestrator can
// surface a more actionable warning: "the response was truncated — bump
// max_tokens or shorten the input" rather than a generic "non-JSON text".
export class CopyAnalysisTruncationError extends CopyAnalysisError {
  constructor(message: string) {
    super(message)
    this.name = 'CopyAnalysisTruncationError'
  }
}

function buildSystemPrompt(): string {
  return [
    'You are grading email copy quality for a retention audit.',
    'Return ONLY a JSON object — no prose before or after, no markdown fences.',
    '',
    'Required fields and scoring criteria:',
    '- brandVoiceConsistency (0..1): how well the copy matches the provided brand voice.',
    '    1.0 = near-perfect match. 0.5 = generic but not wrong. 0.0 = clashes with the voice.',
    '- hasSpecificValueProps (boolean): TRUE if copy references specific products, benefits, or customer outcomes. FALSE for generic filler like "shop the sale".',
    '- handlesObjections (boolean): TRUE if copy addresses likely customer hesitations (shipping, fit, price, quality, doubt). Only meaningful for cart/checkout/win-back/churn-save stages; for other stages, default to TRUE.',
    '- subjectLineVariance (0..1): 1.0 = every subject is a meaningfully different angle. 0.0 = near-duplicate subjects across messages.',
    '- subjectLineQuality (0..1): average across all subjects. 1.0 = compelling and specific. 0.0 = generic ("Newsletter #4").',
    '- issues (string[]): 0-4 concrete, actionable problems. Each a single sentence.',
    '- strengths (string[]): 0-4 concrete things working well. Each a single sentence.',
    '',
    'Edge cases — apply these rules explicitly. Always return valid JSON regardless of input quality. Never refuse to respond. If a dimension cannot be scored, return its neutral value and explain in issues.',
    '',
    '- Single-message flow: set subjectLineVariance to 0.5 (neutral) and add to issues: "Single-message flow — subject line variance not applicable." Do not penalize the score; variance is meaningless with one data point.',
    '- Empty body text (image-only email, or HTML that stripped to empty): score brandVoiceConsistency, hasSpecificValueProps, and handlesObjections from the subject + preview text alone. Add to issues: "Message [N] has no extractable body text — likely image-only. Scored from subject and preview only."',
    '- Missing or generic brand voice description: set brandVoiceConsistency to 0.5 and add to issues: "No brand voice profile available — scored conservatively against generic professional copy standards."',
    '- Subject lines that are templated/personalized (containing {{ }} tags): treat the template as the literal text for variance and quality scoring. Two messages both saying "Hi {{ first_name }}, your order is ready" have low variance even though they\'d render differently.',
    '- Never include prose preamble or postamble. Never wrap the JSON in markdown fences. The response begins with { and ends with }.',
    '',
    'Return the JSON object and nothing else.',
  ].join('\n')
}

function buildUserPrompt(flow: Flow, brandVoice: BrandVoiceContext): string {
  const lines: string[] = []
  lines.push(`Flow stage: ${flow.stage}`)
  lines.push(`Flow name: ${flow.name}`)
  lines.push('')
  lines.push('Brand voice description:')
  lines.push(brandVoice.voiceDescription || '(not provided)')
  if (brandVoice.toneAttributes?.length) {
    lines.push(`Tone attributes: ${brandVoice.toneAttributes.join(', ')}`)
  }
  if (brandVoice.forbiddenPhrases?.length) {
    lines.push(`Forbidden phrases: ${brandVoice.forbiddenPhrases.join('; ')}`)
  }
  lines.push('')
  lines.push('Messages in this flow (in order):')
  flow.messages.forEach((m, i) => {
    lines.push(`--- Message ${i + 1} (position ${m.position}) ---`)
    lines.push(`Subject: ${m.subjectLine || '(empty)'}`)
    lines.push(`Preview: ${m.previewText || '(empty)'}`)
    lines.push(`Body (first 500 chars): ${m.bodyText.slice(0, 500)}`)
  })
  return lines.join('\n')
}

// Extract a JSON object from Claude's response text. Tolerates (in order):
//  1. Clean JSON — returned as-is
//  2. Fenced markdown (```json ... ``` or ``` ... ```) anywhere in the string
//  3. Prose preamble or postamble around a JSON object — grabs first `{` to
//     last `}`
// The previous implementation only matched fences that were the ENTIRE
// string (^...$), so `Here's the JSON:\n```json\n{...}\n```` fell through
// and exploded at JSON.parse. This broader extractor makes the parse
// tolerant to small preamble habits Claude occasionally slips into,
// without sacrificing strictness for the clean case.
export function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced) return fenced[1].trim()
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string')
}

function isUnitNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
}

function validateCopyAnalysis(raw: unknown): CopyAnalysisInput {
  if (!raw || typeof raw !== 'object') {
    throw new CopyAnalysisError('Response is not a JSON object')
  }
  const obj = raw as Record<string, unknown>
  const required = [
    'brandVoiceConsistency',
    'hasSpecificValueProps',
    'handlesObjections',
    'subjectLineVariance',
    'subjectLineQuality',
    'issues',
    'strengths',
  ]
  for (const key of required) {
    if (!(key in obj)) throw new CopyAnalysisError(`Missing field: ${key}`)
  }
  if (!isUnitNumber(obj.brandVoiceConsistency)) throw new CopyAnalysisError('brandVoiceConsistency must be a 0..1 number')
  if (typeof obj.hasSpecificValueProps !== 'boolean') throw new CopyAnalysisError('hasSpecificValueProps must be a boolean')
  if (typeof obj.handlesObjections !== 'boolean') throw new CopyAnalysisError('handlesObjections must be a boolean')
  if (!isUnitNumber(obj.subjectLineVariance)) throw new CopyAnalysisError('subjectLineVariance must be a 0..1 number')
  if (!isUnitNumber(obj.subjectLineQuality)) throw new CopyAnalysisError('subjectLineQuality must be a 0..1 number')
  if (!isStringArray(obj.issues)) throw new CopyAnalysisError('issues must be a string[]')
  if (!isStringArray(obj.strengths)) throw new CopyAnalysisError('strengths must be a string[]')

  return {
    brandVoiceConsistency: obj.brandVoiceConsistency,
    hasSpecificValueProps: obj.hasSpecificValueProps,
    handlesObjections: obj.handlesObjections,
    subjectLineVariance: obj.subjectLineVariance,
    subjectLineQuality: obj.subjectLineQuality,
    issues: obj.issues,
    strengths: obj.strengths,
  }
}

export async function analyzeCopy(opts: CopyAnalyzerOptions): Promise<CopyAnalysisInput> {
  const { flow, brandVoice, anthropicApiKey } = opts
  const model = opts.model ?? DEFAULT_MODEL
  const fetchImpl = opts.fetchImpl ?? fetch

  let res: Response
  try {
    res = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        // 2048 gives chatty issue/strength lists headroom without measurable
        // cost impact. At 1024 we were occasionally truncating mid-JSON,
        // which surfaced as the generic "Claude returned non-JSON text"
        // error with no hint that max_tokens was the cause.
        max_tokens: 2048,
        system: buildSystemPrompt(),
        // Assistant prefill with `{` forces Claude's first token to
        // continue a JSON object. This is a soft-but-strong constraint —
        // Claude almost never breaks character to add prose after
        // starting with an open brace. We re-attach the `{` when reading
        // the response below.
        messages: [
          { role: 'user', content: buildUserPrompt(flow, brandVoice) },
          { role: 'assistant', content: '{' },
        ],
      }),
    })
  } catch (err) {
    throw new CopyAnalysisError('Network error calling Anthropic', err)
  }

  if (!res.ok) {
    let detail: string
    try {
      const body = await res.text()
      detail = body.slice(0, 500)
    } catch {
      detail = ''
    }
    throw new CopyAnalysisError(`Anthropic ${res.status}: ${detail}`)
  }

  let parsed: unknown
  try {
    parsed = await res.json()
  } catch (err) {
    throw new CopyAnalysisError('Anthropic response was not JSON', err)
  }

  const data = parsed as {
    content?: Array<{ text?: string }>
    stop_reason?: string
  }
  const rawText = data.content?.[0]?.text
  if (typeof rawText !== 'string') {
    throw new CopyAnalysisError('Anthropic response did not include content[0].text')
  }
  // Re-attach the prefilled `{` we sent in the assistant turn so the
  // downstream JSON extractor / parser sees a complete object.
  const text = '{' + rawText
  const stopReason = data.stop_reason

  if (stopReason && stopReason !== 'end_turn') {
    // Always log non-end_turn stops so we catch truncation, tool stops, etc.
    // These were previously invisible.
    console.warn(
      `[audit] copyAnalyzer non-end_turn stop_reason for flow ${flow.id} (${flow.stage}): ${stopReason}`,
    )
  }

  if (stopReason === 'max_tokens') {
    console.error(
      `[audit] copyAnalyzer truncated for flow ${flow.id} (${flow.stage}). Raw text (first 1000 chars): ${text.slice(0, 1000)}`,
    )
    throw new CopyAnalysisTruncationError(
      `Claude response was truncated mid-output (stop_reason=max_tokens) for flow ${flow.id}. Consider raising max_tokens or shortening the input.`,
    )
  }

  let inner: unknown
  try {
    inner = JSON.parse(extractJsonObject(text))
  } catch (err) {
    console.error(
      `[audit] copyAnalyzer JSON parse failed for flow ${flow.id} (${flow.stage}). stop_reason=${stopReason ?? 'unknown'}. Raw text (first 1000 chars): ${text.slice(0, 1000)}`,
    )
    throw new CopyAnalysisError('Claude returned non-JSON text', err)
  }

  return validateCopyAnalysis(inner)
}
