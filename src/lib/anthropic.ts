import Anthropic from '@anthropic-ai/sdk'
import { Brand, BrandAsset } from '@/types'
import { createClient } from '@supabase/supabase-js'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Downloads a brand guideline PDF from Storage and returns base64
export async function getBrandGuidelineBase64(asset: BrandAsset): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('brand-assets')
      .download(asset.storage_path)
    if (error || !data) return null
    const buffer = await data.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  } catch {
    return null
  }
}

// Builds the system prompt for any brand
export function buildBrandSystemPrompt(brand: Brand): string {
  const tones = brand.tone_keywords?.join(', ') || 'professional'
  const avoid = brand.avoid_words?.length
    ? `Never use these words or phrases: ${brand.avoid_words.join(', ')}.`
    : ''

  return `You are a senior marketing strategist and copywriter at Attomik, a brand-building agency that specializes in DTC brands.

You are currently working on content for ${brand.name}${brand.industry ? ` (${brand.industry})` : ''}.

BRAND CONTEXT:
- Website: ${brand.website || 'N/A'}
- Target audience: ${brand.target_audience || 'Not specified'}
- Tone keywords: ${tones}
- Brand voice: ${brand.brand_voice || 'Not specified'}
${avoid}

Always write content that feels native to this brand. Never write generic copy. Every output should feel like it could only come from ${brand.name}.`
}

// Streams a generation — call this from API routes
export async function streamGeneration({
  brand,
  guidelineAsset,
  userPrompt,
}: {
  brand: Brand
  guidelineAsset: BrandAsset | null
  userPrompt: string
}) {
  const systemPrompt = buildBrandSystemPrompt(brand)
  const messages: Anthropic.MessageParam[] = []

  if (guidelineAsset) {
    const base64 = await getBrandGuidelineBase64(guidelineAsset)
    if (base64) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: `These are the brand guidelines for ${brand.name}. Keep them in mind for everything you generate.` },
        ],
      })
      messages.push({ role: 'assistant', content: `Understood. I've reviewed the brand guidelines for ${brand.name} and will apply them to all content.` })
    }
  }

  messages.push({ role: 'user', content: userPrompt })

  return anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages,
  })
}
