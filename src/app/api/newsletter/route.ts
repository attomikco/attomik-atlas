import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { buildBrandSystemPrompt } from '@/lib/anthropic'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { brandId, emailType, subject, previewText, brief, sections, tone } = await req.json()

  const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  // Try to load the brand's HTML template
  const { data: templateAssets } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('brand_id', brandId)
    .eq('type', 'html_template')
    .limit(1)

  let templateHtml: string | null = null

  if (templateAssets && templateAssets.length > 0) {
    const { data, error } = await supabaseAdmin.storage
      .from('brand-assets')
      .download(templateAssets[0].storage_path)

    if (!error && data) {
      templateHtml = await data.text()
    }
  }

  const systemPrompt = buildBrandSystemPrompt(brand)
  const effectiveTone = tone || brand.tone_keywords?.join(', ') || 'on-brand'

  let userPrompt: string

  if (templateHtml) {
    // Mode 1: We have a template — inject content into it
    userPrompt = `You are writing content for a Klaviyo email campaign for ${brand.name}.

EMAIL BRIEF:
- Type: ${emailType}
- Tone: ${effectiveTone}
${subject ? `- Subject line: ${subject}` : ''}
${previewText ? `- Preview text: ${previewText}` : ''}
- Brief: ${brief}
${sections ? `- Sections to include: ${sections}` : ''}

Here is the master HTML email template for ${brand.name}:

\`\`\`html
${templateHtml}
\`\`\`

Your job: Replace all placeholder content in this template with real, on-brand copy for this campaign.
- Keep ALL HTML structure, inline styles, table layouts, and formatting exactly as-is
- Only replace text content and image alt text
- Replace placeholder headlines, body copy, CTAs, footer text with real campaign content
- Do not change any colors, fonts, spacing, or structural HTML
- If the template has Klaviyo merge tags like {{ first_name }} or {% if %}, keep them exactly as written
- Make the copy sharp, compelling, and unmistakably ${brand.name}

${!subject ? 'Also suggest a subject line and preview text at the start.' : ''}

Respond with JSON only:
{
  ${!subject ? '"subject": "...",\n  "preview_text": "...",' : ''}
  "html": "...complete HTML..."
}`
  } else {
    // Mode 2: No template — generate clean Klaviyo-compatible HTML from scratch
    userPrompt = `You are writing a Klaviyo email campaign for ${brand.name}.

EMAIL BRIEF:
- Type: ${emailType}
- Tone: ${effectiveTone}
${subject ? `- Subject line: ${subject}` : ''}
${previewText ? `- Preview text: ${previewText}` : ''}
- Brief: ${brief}
${sections ? `- Sections: ${sections}` : ''}

Brand colors: primary ${brand.primary_color || '#000000'}, background #f2f2f2

Write a complete, production-ready HTML email using these rules:
- Outer wrapper: background #f2f2f2
- Email card: max-width 600px, centered, background #ffffff, border-radius 16px, border 1px solid #e0e0e0
- Green accent bar at top: background ${brand.primary_color || brand.accent_color || '#00ff97'}, height 5px
- Heading: font-size 24px, font-weight 800, letter-spacing -0.03em, color #000
- Body text: font-size 14px, color #666, line-height 1.6
- CTA button: background #000, color #ffffff (or brand primary), font-weight 700, padding 15px 32px, border-radius 8px
- Footer: font-size 12px, color #999
- Use table-based layout for Klaviyo compatibility
- Include an unsubscribe link placeholder: <a href="{{ unsubscribe_url }}">Unsubscribe</a>
- All styles must be inline (no <style> tags — Klaviyo strips them)

${!subject ? 'Suggest a subject line and preview text.' : ''}

Make the copy sharp, compelling, and on-brand for ${brand.name}.

Respond with JSON only:
{
  ${!subject ? '"subject": "...",\n  "preview_text": "...",' : ''}
  "html": "...complete inline-styled HTML email..."
}`
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const clean = text.replace(/```json\n?|```\n?/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return NextResponse.json({
      html: parsed.html,
      subject: parsed.subject || subject || '',
      preview_text: parsed.preview_text || previewText || '',
    })
  } catch {
    // If JSON parsing fails, try to extract HTML directly
    const htmlMatch = clean.match(/<html[\s\S]*<\/html>/i) || clean.match(/<table[\s\S]*<\/table>/i)
    if (htmlMatch) {
      return NextResponse.json({ html: htmlMatch[0], subject: subject || '', preview_text: previewText || '' })
    }
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 })
  }
}
