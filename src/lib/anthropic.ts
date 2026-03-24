import Anthropic from '@anthropic-ai/sdk'
import { Brand, BrandAsset, BrandVoiceExample } from '@/types'
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
export function buildBrandSystemPrompt(brand: Brand, voiceExamples?: BrandVoiceExample[]): string {
  const tones = brand.tone_keywords?.join(', ') || 'professional'
  const avoid = brand.avoid_words?.length
    ? `Never use these words or phrases: ${brand.avoid_words.join(', ')}.`
    : ''

  const missionBlock = brand.mission ? `- Mission: ${brand.mission}` : ''
  const visionBlock = brand.vision ? `- Vision: ${brand.vision}` : ''
  const valuesBlock = brand.values?.length ? `- Values: ${brand.values.join(', ')}` : ''

  const competitorsBlock = brand.competitors?.length
    ? `\nCOMPETITORS (differentiate from these):\n${brand.competitors.map(c => `- ${c.name}${c.website ? ` (${c.website})` : ''}${c.notes ? `: ${c.notes}` : ''}`).join('\n')}`
    : ''

  const productsBlock = brand.products?.length
    ? `\nPRODUCTS & SERVICES:\n${brand.products.map(p => `- ${p.name}${p.price_range ? ` [${p.price_range}]` : ''}${p.description ? `: ${p.description}` : ''}`).join('\n')}`
    : ''

  const personasBlock = brand.customer_personas?.length
    ? `\nCUSTOMER PERSONAS:\n${brand.customer_personas.map(p => {
        const parts = [`- ${p.name}`]
        if (p.age_range) parts[0] += ` (${p.age_range})`
        parts[0] += `: ${p.description}`
        if (p.pain_points?.length) parts.push(`  Pain points: ${p.pain_points.join(', ')}`)
        if (p.channels?.length) parts.push(`  Channels: ${p.channels.join(', ')}`)
        return parts.join('\n')
      }).join('\n')}`
    : ''

  const goodExamples = voiceExamples?.filter(e => e.category === 'good') || []
  const badExamples = voiceExamples?.filter(e => e.category === 'bad') || []

  const voiceExamplesBlock = goodExamples.length
    ? `\nVOICE EXAMPLES (emulate this style):\n${goodExamples.map(e => `"${e.content}"${e.label ? ` — ${e.label}` : ''}${e.notes ? ` (${e.notes})` : ''}`).join('\n')}`
    : ''

  const antiExamplesBlock = badExamples.length
    ? `\nANTI-EXAMPLES (do NOT write like this):\n${badExamples.map(e => `"${e.content}"${e.notes ? ` — reason: ${e.notes}` : ''}`).join('\n')}`
    : ''

  return `You are a senior marketing strategist and copywriter at Attomik, a brand-building agency that specializes in DTC brands.

You are currently working on content for ${brand.name}${brand.industry ? ` (${brand.industry})` : ''}.

BRAND CONTEXT:
- Website: ${brand.website || 'N/A'}
${[missionBlock, visionBlock, valuesBlock].filter(Boolean).join('\n')}
- Target audience: ${brand.target_audience || 'Not specified'}
- Tone keywords: ${tones}
- Brand voice: ${brand.brand_voice || 'Not specified'}
${avoid}
${competitorsBlock}${productsBlock}${personasBlock}${voiceExamplesBlock}${antiExamplesBlock}

Always write content that feels native to this brand. Never write generic copy. Every output should feel like it could only come from ${brand.name}.`
}

// Streams a generation — call this from API routes
export async function streamGeneration({
  brand,
  guidelineAsset,
  voiceExamples,
  userPrompt,
}: {
  brand: Brand
  guidelineAsset: BrandAsset | null
  voiceExamples?: BrandVoiceExample[]
  userPrompt: string
}) {
  const systemPrompt = buildBrandSystemPrompt(brand, voiceExamples)
  const messages: Anthropic.MessageParam[] = []

  if (guidelineAsset) {
    // Prefer parsed text over base64 PDF (cheaper, faster)
    if (guidelineAsset.parsed_text) {
      messages.push({
        role: 'user',
        content: `Here are the brand guidelines for ${brand.name}. Keep them in mind for everything you generate:\n\n${guidelineAsset.parsed_text}`,
      })
    } else {
      const base64 = await getBrandGuidelineBase64(guidelineAsset)
      if (base64) {
        messages.push({
          role: 'user',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            { type: 'text', text: `These are the brand guidelines for ${brand.name}. Keep them in mind for everything you generate.` },
          ] as any,
        })
      }
    }
    messages.push({ role: 'assistant', content: `Understood. I've reviewed the brand guidelines for ${brand.name} and will apply them to all content.` })
  }

  messages.push({ role: 'user', content: userPrompt })

  return anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages,
  })
}
