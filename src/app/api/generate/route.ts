import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamGeneration } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { brandId, tool, tone, platform, subtype, brief } = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single() as { data: any }
  if (!brand) return new Response('Brand not found', { status: 404 })

  const { data: assets } = await supabase.from('brand_assets')
    .select('*').eq('brand_id', brandId).eq('type', 'guidelines').limit(1)
  const guidelineAsset = assets?.[0] ?? null

  const toolLabel: Record<string, string> = {
    ad_copy: 'ad copy', social: 'social media captions', email: 'email campaign',
    seo: 'SEO content', dtc_brief: 'DTC strategy brief',
  }
  const userPrompt = [
    `Create ${platform ? platform + ' ' : ''}${subtype ? subtype + ' ' : ''}${toolLabel[tool] || tool} for ${brand.name}.`,
    `Tone: ${tone}.`,
    brief,
    tool === 'ad_copy' || tool === 'social'
      ? 'Write 3 distinct variations, numbered. Make each feel different in approach.'
      : '',
    tool === 'email'
      ? 'Structure: Subject line, Preview text, Headline, Body (2-3 paragraphs), CTA button text.'
      : '',
    tool === 'dtc_brief'
      ? 'Structure: Situation (2-3 lines), 3 strategic priorities with rationale, Key channels, 30-day quick win.'
      : '',
  ].filter(Boolean).join('\n')

  const stream = await streamGeneration({ brand, guidelineAsset, userPrompt })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { text: event.delta.text } })}\n\n`))
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
}
