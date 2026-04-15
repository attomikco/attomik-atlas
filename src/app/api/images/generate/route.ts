import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { fal } from '@fal-ai/client'

export const runtime = 'nodejs'
export const maxDuration = 60

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseBrandVoice(raw: string | null | undefined): string {
  if (!raw) return ''
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (typeof parsed === 'string') return parsed
    if (Array.isArray(parsed)) return parsed.filter(Boolean).join(', ')
    if (parsed && typeof parsed === 'object') {
      return Object.values(parsed).filter(v => typeof v === 'string').join(', ')
    }
    return String(parsed)
  } catch {
    return String(raw)
  }
}

function extractMoodWords(voice: string, toneKeywords: string[] | null | undefined): string {
  const tones = (toneKeywords || []).filter(Boolean)
  if (tones.length > 0) return tones.slice(0, 4).join(', ')
  const words = voice.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
  const stop = new Set(['with', 'that', 'this', 'from', 'they', 'have', 'your', 'their', 'more', 'than', 'into', 'about', 'brand', 'voice', 'tone'])
  const picked = Array.from(new Set(words.filter(w => !stop.has(w)))).slice(0, 4)
  return picked.join(', ') || 'warm, authentic, editorial'
}

// Map a free-form business_type label to a concrete scene description.
// The scene is what grounds the flux prompt in a specific, recognizable
// environment — without it the model drifts toward generic stock imagery.
function sceneFromBusinessType(businessType: string): string {
  const t = businessType.toLowerCase()
  if (/spirit|alcohol|mezcal|tequila|whisk(e)?y|rum|gin|vodka|liquor|sake|wine/.test(t)) {
    return 'moody bar setting, aged wood surfaces, warm amber lighting'
  }
  if (/coffee|cafe|espresso|roaster/.test(t)) {
    return 'cozy cafe interior, steam, warm morning light'
  }
  if (/skincare|beauty|cosmetic|makeup/.test(t)) {
    return 'clean minimal bathroom, soft diffused light, marble surfaces'
  }
  if (/food|snack|restaurant|sauce|condiment|bakery|grocery/.test(t)) {
    return 'rustic kitchen, natural light, linen textures'
  }
  return 'lifestyle setting, natural light, warm tones'
}

// Convert a hex color to a descriptive palette phrase flux responds well
// to. Buckets by HSL hue + lightness + saturation. Intentionally fuzzy —
// the goal is a mood cue, not a reproducible color match.
function paletteFromHex(hex: string | null | undefined): string {
  if (!hex) return 'warm natural tones'
  const h = hex.replace('#', '')
  if (h.length < 6) return 'warm natural tones'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return 'warm natural tones'
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 510
  const delta = max - min
  const saturation = max === 0 ? 0 : delta / max
  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue *= 60
    if (hue < 0) hue += 360
  }
  if (saturation < 0.12) {
    if (lightness < 0.3) return 'charcoal and ink tones'
    if (lightness > 0.75) return 'soft ivory and cream tones'
    return 'muted neutral greys'
  }
  const mod = lightness < 0.35 ? 'deep' : lightness > 0.7 ? 'soft' : 'rich'
  if (hue < 15 || hue >= 345) return `${mod} crimson and ruby tones`
  if (hue < 40) return `${mod} warm copper and terracotta tones`
  if (hue < 60) return `${mod} golden amber tones`
  if (hue < 85) return `${mod} mustard and olive tones`
  if (hue < 150) return `${mod} forest green tones`
  if (hue < 180) return `${mod} jade and seafoam tones`
  if (hue < 210) return `${mod} teal and aqua tones`
  if (hue < 250) return `${mod} oceanic blue tones`
  if (hue < 285) return `${mod} indigo and violet tones`
  if (hue < 320) return `${mod} magenta and plum tones`
  return `${mod} blush and rose tones`
}

function buildBackgroundPrompt(brand: {
  name: string
  brand_voice: string | null
  primary_color: string | null
  tone_keywords: string[] | null
  notes: string | null
}): string {
  let businessType = 'brand'
  try {
    if (brand.notes) {
      const n = typeof brand.notes === 'string' ? JSON.parse(brand.notes) : brand.notes
      if (n?.business_type) businessType = String(n.business_type)
    }
  } catch {}

  const voice = parseBrandVoice(brand.brand_voice)
  const mood = extractMoodWords(voice, brand.tone_keywords)
  const scene = sceneFromBusinessType(businessType)
  const palette = paletteFromHex(brand.primary_color)

  const prompt = [
    'atmospheric lifestyle background',
    mood,
    scene,
    palette,
    'cinematic lighting, no people, no text, no logos, no products, no objects, bokeh depth of field, editorial photography',
  ].filter(Boolean).join(', ')

  return prompt.split(/\s+/).slice(0, 200).join(' ')
}

async function downloadImage(url: string): Promise<Buffer> {
  console.log('[images/generate] downloading image from:', url)
  const res = await fetch(url)
  console.log('[images/generate] download response status:', res.status, 'ok:', res.ok, 'content-type:', res.headers.get('content-type'))
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`)
  const ab = await res.arrayBuffer()
  const buf = Buffer.from(ab)
  console.log('[images/generate] downloaded image size (bytes):', buf.length)
  return buf
}

export async function POST(req: NextRequest) {
  console.log('[images/generate] POST request received')

  const apiKey = process.env.FAL_API_KEY
  console.log('[images/generate] FAL_API_KEY present:', !!apiKey)
  if (!apiKey) {
    console.error('[images/generate] missing FAL_API_KEY env var')
    return NextResponse.json({ error: 'FAL_API_KEY not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[images/generate] auth user:', user?.id ?? null)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { brandId?: string }
  try {
    body = await req.json()
    console.log('[images/generate] request body:', body)
  } catch (e) {
    console.error('[images/generate] JSON parse error:', e)
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const brandId = body.brandId
  if (!brandId) {
    console.error('[images/generate] missing brandId in body')
    return NextResponse.json({ error: 'brandId required' }, { status: 400 })
  }

  console.log('[images/generate] fetching brand:', brandId)
  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('id, name, brand_voice, primary_color, tone_keywords, notes')
    .eq('id', brandId)
    .single()

  if (brandErr || !brand) {
    console.error('[images/generate] brand fetch error:', brandErr, 'brand:', brand)
    return NextResponse.json({ error: 'Brand not found', details: brandErr?.message }, { status: 404 })
  }
  console.log('[images/generate] brand fetched:', {
    id: brand.id,
    name: brand.name,
    primary_color: brand.primary_color,
    tone_keywords: brand.tone_keywords,
    brand_voice_length: brand.brand_voice?.length ?? 0,
    has_notes: !!brand.notes,
  })
  console.log('[images/generate] generating background scene for:', brand.name)

  const prompt = buildBackgroundPrompt(brand)
  console.log('[images/generate] built prompt:', prompt)
  console.log('[images/generate] prompt length:', prompt.length)

  fal.config({ credentials: apiKey })

  let buf: Buffer
  try {
    const input = {
      prompt,
      image_size: 'landscape_4_3' as const,
      num_images: 1,
      num_inference_steps: 35,
    }
    console.log('[images/generate] calling fal-ai/flux/dev with input:', input)
    const out = await fal.subscribe('fal-ai/flux/dev', { input })
    console.log('[images/generate] fal raw response:', JSON.stringify(out, null, 2))
    const wrapped = out as { data?: { images?: Array<{ url: string }> } } & { images?: Array<{ url: string }> }
    const normalized = (wrapped?.data ?? wrapped) as { images?: Array<{ url: string }> }
    console.log('[images/generate] fal normalized result:', JSON.stringify(normalized, null, 2))
    const resultUrl = normalized?.images?.[0]?.url
    if (!resultUrl) {
      console.error('[images/generate] fal returned no image URL; full result was:', normalized)
      return NextResponse.json({ error: 'fal.ai returned no image' }, { status: 500 })
    }
    buf = await downloadImage(resultUrl)
  } catch (e) {
    console.error('[images/generate] pipeline error — full error object:', e)
    if (e instanceof Error) {
      console.error('[images/generate] pipeline error name:', e.name, 'message:', e.message, 'stack:', e.stack)
    }
    const msg = e instanceof Error ? e.message : 'image pipeline failed'
    return NextResponse.json({ error: 'Image generation failed', details: msg }, { status: 500 })
  }

  const fileName = `${Date.now()}.jpg`
  const storagePath = `generated/${brandId}/${fileName}`
  console.log('[images/generate] uploading to storage:', { bucket: 'brand-images', storagePath, bytes: buf.length })
  const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
    .from('brand-images')
    .upload(storagePath, buf, { contentType: 'image/jpeg', upsert: true })

  if (uploadErr) {
    console.error('[images/generate] upload error — full error object:', uploadErr)
    return NextResponse.json({ error: 'Upload failed', details: uploadErr.message }, { status: 500 })
  }
  console.log('[images/generate] upload success:', uploadData)

  const { data: pub } = supabaseAdmin.storage.from('brand-images').getPublicUrl(storagePath)
  const publicUrl = pub?.publicUrl
  console.log('[images/generate] resolved public URL:', publicUrl)
  if (!publicUrl) {
    console.error('[images/generate] failed to resolve public URL for storagePath:', storagePath)
    return NextResponse.json({ error: 'Failed to resolve public URL' }, { status: 500 })
  }

  console.log('[images/generate] inserting brand_images row for brand:', brandId)
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('brand_images')
    .insert({
      brand_id: brandId,
      file_name: fileName,
      storage_path: storagePath,
      mime_type: 'image/jpeg',
      tag: 'generated',
      source: 'fal-background',
      alt_text: prompt.slice(0, 200),
    })
    .select()
    .single()

  if (insertErr || !inserted) {
    console.error('[images/generate] db insert error — full error object:', insertErr, 'inserted:', inserted)
    return NextResponse.json({ error: 'Failed to save image row', details: insertErr?.message }, { status: 500 })
  }
  console.log('[images/generate] brand_images row inserted:', inserted)

  console.log('[images/generate] SUCCESS — returning image:', { id: inserted.id, url: publicUrl })
  return NextResponse.json({
    success: true,
    image: { id: inserted.id, url: publicUrl, storage_path: storagePath },
  })
}
