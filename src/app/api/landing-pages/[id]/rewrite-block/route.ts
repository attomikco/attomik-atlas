// Per-block AI rewrite endpoint.
//
// Flow:
//   1. Auth + resolve landing_pages row (RLS scoped to brand_members).
//   2. Load brand. Load campaign if landing_pages.campaign_id is set.
//   3. Build system prompt via buildBrandSystemPrompt(brand) — same helper
//      email + ad-copy use. Do NOT roll a local prompt builder here. Append
//      campaign context paragraph when campaign is known.
//   4. Build user prompt: block type + variant + current data + user
//      instruction + tone + length + schema (derived from the block type's
//      contentFields).
//   5. Call Claude (claude-sonnet-4-20250514 per CLAUDE.md rule).
//   6. Parse JSON. On parse failure, retry once with a cleanup prompt.
//   7. Validate the shape against the block's contentFields. Missing keys
//      error 502; extra keys are silently dropped.
//   8. Return { data }. Client applies via actions.updateData which
//      autosave persists.
//
// Model is explicit — never let landing-page-generator.ts's divergent
// prompt style leak in (that file gets deleted in Phase 1b cleanup).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'
import type { BlockType } from '@/components/landing-page/types'
import { BLOCK_REGISTRY, type ContentField } from '@/components/landing-page/blocks/registry'

const MODEL = 'claude-sonnet-4-20250514'
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Keys the registry accepts per block. Missing keys after validation →
// error; extra keys → dropped (we only keep the whitelisted set).
function allowedKeys(fields: ContentField[]): string[] {
  return fields.map(f => f.key)
}

// Tone / length enums → prose instructions. Named to match the AiTab UI.
const TONE_MAP: Record<string, string> = {
  'brand-default':       'Match the brand\u2019s established voice as captured in the system prompt.',
  'bold-direct':         'Use short, declarative sentences. No hedging. Active voice. Strong verbs.',
  'warm-conversational': 'Write as if speaking to a friend. Second person. Contractions. Warmth without sugar.',
  'editorial':           'Longer-form, essayistic sentences. Measured tone. Confident expertise.',
  'playful':             'Light humor, unexpected turns of phrase, but not try-hard. Lean into whimsy where it fits.',
}

const LENGTH_MAP: Record<string, string> = {
  'shorter':  'Roughly 30% shorter than the current content.',
  'similar':  'Keep length similar to the current content.',
  'longer':   'Roughly 30% longer than the current content, adding detail without padding.',
}

function buildSchemaDescription(fields: ContentField[]): string {
  const lines: string[] = []
  for (const f of fields) {
    if (f.readOnly) continue  // footer.cols etc. — skip from AI rewrite scope
    if (f.type === 'array') {
      const shape = (f.itemShape ?? []).map(s => `"${s.key}": "${s.type}"`).join(', ')
      lines.push(`"${f.key}": array of objects with shape { ${shape} }`)
    } else {
      lines.push(`"${f.key}": string (${f.type})`)
    }
  }
  return lines.join('\n')
}

function buildUserPrompt({
  blockType, variant, currentData, prompt, tone, length, brandName, campaignContext,
}: {
  blockType: BlockType
  variant: string
  currentData: Record<string, unknown>
  prompt: string
  tone: string
  length: string
  brandName: string
  campaignContext: string
}): string {
  const cfg = BLOCK_REGISTRY[blockType]
  if (!cfg) throw new Error(`Unknown block type: ${blockType}`)
  const schema = buildSchemaDescription(cfg.contentFields)
  const toneInstruction = TONE_MAP[tone] ?? TONE_MAP['brand-default']
  const lengthInstruction = LENGTH_MAP[length] ?? LENGTH_MAP['similar']

  return `You are rewriting a single content block on a landing page for ${brandName}.

BLOCK
- Type: ${blockType}
- Variant: ${variant}
- Current content (JSON):
${JSON.stringify(currentData, null, 2)}

USER INSTRUCTION
${prompt}

TONE
${toneInstruction}

LENGTH
${lengthInstruction}
${campaignContext}
OUTPUT — respond ONLY with valid JSON, no other text, no markdown fences. The JSON must match this schema exactly:

{
${schema}
}

Every key in the schema must be present. Do not invent new keys. Write copy that only ${brandName} could have written.`
}

async function callClaude(system: string, user: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await handle(req, params)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Rewrite failed'
    console.error('[rewrite-block] threw:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handle(req: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { blockId, blockType, variant, currentData, prompt, tone, length } = body as {
    blockId?: string
    blockType?: BlockType
    variant?: string
    currentData?: Record<string, unknown>
    prompt?: string
    tone?: string
    length?: string
  }

  if (!blockId || !blockType || !currentData || !prompt) {
    return NextResponse.json(
      { error: 'blockId, blockType, currentData, prompt required' },
      { status: 400 },
    )
  }
  if (!BLOCK_REGISTRY[blockType]) {
    return NextResponse.json({ error: `Unknown blockType: ${blockType}` }, { status: 400 })
  }

  // RLS on landing_pages gates this implicitly — a user not in
  // brand_members for the brand will get no row back and we 404.
  const { data: page } = await supabase
    .from('landing_pages')
    .select('id, brand_id, campaign_id')
    .eq('id', id)
    .single()
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: brand } = await supabase
    .from('brands').select('*')
    .eq('id', page.brand_id).single()
  if (!brand) return NextResponse.json({ error: 'Brand missing' }, { status: 404 })

  let campaignContext = ''
  if (page.campaign_id) {
    const { data: campaign } = await supabase
      .from('campaigns').select('*')
      .eq('id', page.campaign_id).single()
    if (campaign) {
      const parts: string[] = []
      if (campaign.goal) parts.push(`Goal: ${campaign.goal}`)
      if (campaign.offer) parts.push(`Offer: ${campaign.offer}`)
      if (campaign.angle) parts.push(`Angle: ${campaign.angle}`)
      if (campaign.key_message) parts.push(`Key message: ${campaign.key_message}`)
      if (parts.length) campaignContext = `\nCAMPAIGN CONTEXT\n${parts.join('\n')}\n`
    }
  }

  const systemPrompt = buildBrandSystemPrompt(brand)
  const userPrompt = buildUserPrompt({
    blockType, variant: variant ?? 'default', currentData,
    prompt, tone: tone ?? 'brand-default', length: length ?? 'similar',
    brandName: brand.name, campaignContext,
  })

  let raw: string
  try {
    raw = await callClaude(systemPrompt, userPrompt)
  } catch (e) {
    console.error('[rewrite-block] Claude call failed:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'AI call failed' }, { status: 502 })
  }

  // Parse + retry on malformed JSON. One retry only — if Claude can't
  // follow the JSON contract twice, surface the error.
  let parsed: Record<string, unknown> | null = null
  try { parsed = JSON.parse(raw) }
  catch { parsed = null }

  if (!parsed) {
    try {
      const retry = await callClaude(
        systemPrompt,
        `${userPrompt}\n\nYour previous response was not valid JSON. Return ONLY the JSON object, no commentary, no code fences.`,
      )
      parsed = JSON.parse(retry) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'AI response was not valid JSON' }, { status: 502 })
    }
  }

  // Validate against schema. Missing keys → error. Extra keys → drop.
  const cfg = BLOCK_REGISTRY[blockType]
  const keys = allowedKeys(cfg.contentFields.filter(f => !f.readOnly))
  const cleaned: Record<string, unknown> = {}
  const missing: string[] = []
  for (const k of keys) {
    if (k in parsed) cleaned[k] = parsed[k]
    else missing.push(k)
  }
  if (missing.length) {
    return NextResponse.json(
      { error: `AI response missing required keys: ${missing.join(', ')}` },
      { status: 502 },
    )
  }

  // Preserve any readOnly keys (e.g. footer.cols) from the original data —
  // the rewrite doesn't touch them.
  const readOnlyKeys = cfg.contentFields.filter(f => f.readOnly).map(f => f.key)
  for (const k of readOnlyKeys) {
    if (k in currentData) cleaned[k] = currentData[k]
  }

  return NextResponse.json({ data: cleaned })
}
