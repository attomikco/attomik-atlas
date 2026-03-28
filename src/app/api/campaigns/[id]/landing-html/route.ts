import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, brand:brands(*)')
    .eq('id', id)
    .single()

  if (!campaign) return new NextResponse('Not found', { status: 404 })

  const { data: content } = await supabase
    .from('generated_content')
    .select('*')
    .eq('campaign_id', id)
    .eq('type', 'landing_brief')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!content) return new NextResponse('No landing brief', { status: 404 })

  let brief: any
  try { brief = JSON.parse(content.content) }
  catch { return new NextResponse('Invalid brief', { status: 500 }) }

  const brand = campaign.brand
  const primary = brand.primary_color || '#000000'
  const accent = brand.accent_color || brand.secondary_color || '#00ff97'
  const font = brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'system-ui'

  // Fetch first brand image
  const { data: images } = await supabase
    .from('brand_images')
    .select('storage_path')
    .eq('brand_id', brand.id)
    .limit(1)

  const imageUrl = images?.[0]
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-images/${images[0].storage_path}`
    : ''

  // Read template
  const templatePath = join(process.cwd(), 'src/lib/landing-template.html')
  let html = readFileSync(templatePath, 'utf-8')

  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700;800;900&display=swap`

  // Inject brand styles
  html = html.replace(
    '</head>',
    `<link rel="stylesheet" href="${fontUrl}">
    <style>
      :root {
        --primary: ${primary};
        --accent: ${accent};
        --font-brand: '${font}', system-ui, sans-serif;
      }
      body, .heading { font-family: var(--font-brand) !important; }
      .btn-primary { background: ${primary} !important; }
      .btn-primary:hover { background: ${accent} !important; }
      .hero { background: ${primary} !important; }
      .final-cta { background: ${primary} !important; }
      .section-label { color: ${accent} !important; }
      .floating-cta a { background: ${primary} !important; }
      .hero-badge { background: ${accent}22 !important; color: ${accent} !important; border-color: ${accent}44 !important; }
    </style>
    </head>`
  )

  // Title + meta
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${brand.name} | ${brief.hero?.headline || 'Landing Page'}</title>`)
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${brief.hero?.subheadline || ''}"`)
  html = html.replace(/<meta name="author" content="[^"]*"/, `<meta name="author" content="${brand.name}"`)

  // Hero content
  if (brief.hero) {
    html = html.replace(
      /(<h1 class="hero-headline[^"]*"[^>]*>)[\s\S]*?(<\/h1>)/,
      `$1${brief.hero.headline}$2`
    )
    html = html.replace(
      /(<p class="hero-sub[^"]*"[^>]*>)[^<]*/,
      `$1${brief.hero.subheadline}`
    )
  }

  // Hero image
  if (imageUrl) {
    html = html.replace(
      /(<img[^>]*class="[^"]*hero-img[^"]*"[^>]*src=")[^"]*(")/,
      `$1${imageUrl}$2`
    )
  }

  // Problem section
  if (brief.problem) {
    // Find first section-headline after problem marker or first one
    const problemPattern = /(<section[^>]*id="[^"]*problem[^"]*"[^>]*>[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[^<]*([\s\S]*?<p[^>]*class="[^"]*section-sub[^"]*"[^>]*>)[^<]*/
    if (problemPattern.test(html)) {
      html = html.replace(problemPattern, `$1${brief.problem.headline}$2${brief.problem.body}`)
    }
  }

  // Social proof
  if (brief.social_proof) {
    html = html.replace(/(<span class="[^"]*stat-number[^"]*">)[^<]*/, `$1${brief.social_proof.stat}`)
    html = html.replace(/(<blockquote[^>]*>)[^<]*/, `$1"${brief.social_proof.testimonial}"`)
  }

  // Final CTA
  if (brief.final_cta) {
    // Replace the last section-headline in final-cta
    const finalCtaMatch = html.match(/<section class="final-cta">[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>[^<]*<\/h2>/)
    if (finalCtaMatch) {
      const original = finalCtaMatch[0]
      const replaced = original.replace(/(<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[^<]*/, `$1${brief.final_cta.headline}`)
      html = html.replace(original, replaced)
    }
  }

  // CTA button text replacements
  if (brief.hero?.cta_text) {
    html = html.replace(/>Try Afterdream[^<]*/g, `>${brief.hero.cta_text}`)
    html = html.replace(/>Get the Discovery Set[^<]*/g, `>${brief.final_cta?.cta_text || brief.hero.cta_text}`)
  }

  // Clean Afterdream-specific references
  html = html.replace(/Afterdream/g, brand.name)
  html = html.replace(/drinkafterdream\.com/g, brand.website?.replace(/^https?:\/\//, '') || '#')
  html = html.replace(/pixel_id: '[^']*'/g, `pixel_id: ''`)

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  })
}
