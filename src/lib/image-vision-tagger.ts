import Anthropic from '@anthropic-ai/sdk'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { VisionTags, VisionSceneType } from '@/types'

// Intentional deviation from CLAUDE.md's pinned claude-sonnet-4-20250514.
// Sonnet 4.6 has materially better vision and the pinned model is being
// deprecated on 2026-06-15. Scope is vision-tagger-only — do not migrate
// other call sites off the pinned model via this constant.
const MODEL = 'claude-sonnet-4-6'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_SCENE_TYPES: ReadonlySet<VisionSceneType> = new Set([
  'lifestyle', 'product', 'texture', 'logo', 'other',
])

const VALID_ANGLES: ReadonlySet<string> = new Set([
  'sensory', 'mission', 'craft', 'origin', 'occasion', 'identity', 'objection', 'contrast',
])

const SYSTEM_PROMPT = `You tag product and brand imagery for a marketing tool. You return JSON only — no prose, no code fences.`

const USER_PROMPT = `Analyze this image and return STRICT JSON with these fields. Do not wrap in markdown. Do not add commentary.

{
  "has_people": boolean,                           // any visible person (face, body, hand)
  "scene_type": "lifestyle" | "product" | "texture" | "logo" | "other",
                                                    // lifestyle = real-world scene / editorial / UGC / people using the product
                                                    // product   = isolated product on plain/white background
                                                    // texture   = pattern, abstract, background with no subject
                                                    // logo      = brand mark, wordmark, emblem, icon
                                                    // other     = fits none of the above cleanly
  "mood": string[],                                // up to 4 single-word tags (e.g. "warm", "celebratory", "minimal", "intimate")
  "composition_quality": 1 | 2 | 3 | 4 | 5,        // 1 = thumbnail/cropped/artefacted, 5 = campaign-grade editorial
  "suitable_for": string[],                        // pick any subset of the angles below this image could honestly support
  "description": string                            // one sentence, under 200 chars, literal description of what is visible
}

angles to choose from for suitable_for:
- sensory    — what the product feels, tastes, sounds, looks, smells like
- mission    — why the brand exists; values-driven visual
- craft      — process, hands-at-work, ingredients, equipment
- origin     — place of origin, heritage, founding story visual
- occasion   — a specific moment/context (a dinner party, a morning, a weekend)
- identity   — who you become when you use it; portrait/character visual
- objection  — image that overturns an assumption about the category
- contrast   — image that rejects a category norm

Return JSON only.`

function coerceVisionTags(raw: unknown): VisionTags {
  if (!raw || typeof raw !== 'object') throw new Error('not an object')
  const r = raw as Record<string, unknown>

  const scene_type = typeof r.scene_type === 'string' && VALID_SCENE_TYPES.has(r.scene_type as VisionSceneType)
    ? (r.scene_type as VisionSceneType)
    : 'other'

  const composition_quality = typeof r.composition_quality === 'number' && r.composition_quality >= 1 && r.composition_quality <= 5
    ? (Math.round(r.composition_quality) as 1 | 2 | 3 | 4 | 5)
    : 3

  const mood = Array.isArray(r.mood)
    ? r.mood.filter((m): m is string => typeof m === 'string').slice(0, 4)
    : []

  const suitable_for = Array.isArray(r.suitable_for)
    ? r.suitable_for.filter((a): a is string => typeof a === 'string' && VALID_ANGLES.has(a.toLowerCase())).map(a => a.toLowerCase())
    : []

  const description = typeof r.description === 'string' ? r.description.slice(0, 200) : ''

  return {
    has_people: !!r.has_people,
    scene_type,
    mood,
    composition_quality,
    suitable_for,
    description,
    tagged_at: new Date().toISOString(),
  }
}

export async function tagImage(imageUrl: string): Promise<VisionTags> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        // @ts-expect-error — the SDK's Message typings lag the URL image source;
        // the wire format and runtime both accept { type: 'url', url } today.
        { type: 'image', source: { type: 'url', url: imageUrl } },
        { type: 'text', text: USER_PROMPT },
      ],
    }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  return coerceVisionTags(parsed)
}

const BUCKET = 'brand-images'

function buildPublicUrl(storagePath: string): string {
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}

// Fetch every brand_images row for the brand that hasn't been tagged yet,
// call the vision API in batches of 5, and write the result back to
// vision_tags. Per-row failures log and continue — the function never throws.
//
// Safe to call from a fire-and-forget context: the whole function is wrapped
// in a top-level try/catch so any unexpected error still resolves the promise
// cleanly, preventing an unhandled rejection from killing the host process.
export async function tagBrandImages(brandId: string): Promise<void> {
  try {
    const { data: rows, error } = await supabaseAdmin
      .from('brand_images')
      .select('id, storage_path')
      .eq('brand_id', brandId)
      .is('vision_tags', null)

    if (error) {
      console.error(`[vision-tagger] fetch failed brand=${brandId}: ${error.message}`)
      return
    }
    if (!rows || rows.length === 0) {
      console.log(`[vision-tagger] nothing to tag brand=${brandId}`)
      return
    }

    console.log(`[vision-tagger] tagging ${rows.length} images brand=${brandId}`)

    const BATCH = 5
    let tagged = 0
    let failed = 0

    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH)
      const results = await Promise.allSettled(
        slice.map(async (row) => {
          const url = buildPublicUrl(row.storage_path)
          const tags = await tagImage(url)
          const { error: updateErr } = await supabaseAdmin
            .from('brand_images')
            .update({ vision_tags: tags })
            .eq('id', row.id)
          if (updateErr) throw new Error(`update failed: ${updateErr.message}`)
          return row.id
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') tagged++
        else {
          failed++
          console.warn(`[vision-tagger] row failed brand=${brandId}: ${r.reason instanceof Error ? r.reason.message : r.reason}`)
        }
      }
    }

    console.log(`[vision-tagger] done brand=${brandId}  tagged=${tagged} failed=${failed}`)
  } catch (e) {
    console.error(`[vision-tagger] fatal brand=${brandId}:`, e instanceof Error ? e.message : e)
  }
}
