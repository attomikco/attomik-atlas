import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

function isLight(hex: string) {
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function lighten(hex: string, amount = 0.9): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

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

  // Colors
  const primary = brand.primary_color || '#000000'
  const secondary = brand.secondary_color || primary
  const accent = brand.accent_color || secondary
  const textOnPrimary = isLight(primary) ? '#000000' : '#ffffff'
  const textOnPrimarySecondary = isLight(primary) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'

  // Font
  const fontFamily = brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'system-ui'
  const fontTransform = brand.font_heading?.transform || 'none'
  const fontWeight = brand.font_heading?.weight || '700'
  const googleFontUrl = fontFamily && fontFamily !== 'system-ui'
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800;900&display=swap`
    : null

  // Images
  const { data: images } = await supabase
    .from('brand_images')
    .select('storage_path, tag')
    .eq('brand_id', brand.id)
    .order('created_at')
    .limit(6)

  const getUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-images/${path}`

  const productImgs = images?.filter(i => i.tag === 'product').map(i => getUrl(i.storage_path)) || []
  const lifestyleImgs = images?.filter(i => i.tag === 'lifestyle' || i.tag === 'background').map(i => getUrl(i.storage_path)) || []
  const heroImg = productImgs[0] || lifestyleImgs[0] || ''
  const lifestyleImg = lifestyleImgs[0] || productImgs[1] || heroImg

  // Benefits HTML
  const benefitsHtml = (brief.benefits || []).slice(0, 4).map((b: any) => `
    <div class="benefit-item fade-in">
      <div class="benefit-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <h3 class="benefit-title heading">${b.headline}</h3>
        <p class="benefit-desc">${b.body}</p>
      </div>
    </div>
  `).join('')

  // FAQ HTML
  const faqHtml = (brief.faq || []).map((f: any) => `
    <div class="faq-item fade-in">
      <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">
        ${f.question}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="faq-answer"><p>${f.answer}</p></div>
    </div>
  `).join('')

  // Read template
  const templatePath = join(process.cwd(), 'src/lib/landing-template.html')
  let html = readFileSync(templatePath, 'utf-8')

  // Inject brand theme via :root override
  const brandStyles = `
<style id="brand-theme">
  ${googleFontUrl ? `@import url('${googleFontUrl}');` : ''}
  :root {
    --bg:              ${lighten(primary, 0.92)};
    --bg-alt:          ${lighten(primary, 0.88)};
    --bg-card:         ${lighten(primary, 0.95)};
    --bg-dark:         ${primary};
    --bg-dark-alt:     ${secondary};
    --text:            ${primary};
    --text-secondary:  ${primary};
    --text-tertiary:   ${primary}88;
    --text-on-dark:    ${textOnPrimary};
    --text-on-dark-secondary: ${textOnPrimarySecondary};
    --text-on-dark-tertiary:  ${textOnPrimary}88;
    --primary:         ${secondary};
    --primary-light:   ${accent};
    --primary-dim:     ${secondary}22;
    --accent:          ${accent};
    --accent-light:    ${accent};
    --accent-dim:      ${accent}22;
    --border:          ${primary}18;
    --border-strong:   ${primary}30;
    --border-on-dark:  ${textOnPrimary}18;
  }
  body { font-family: '${fontFamily}', 'DM Sans', system-ui, sans-serif !important; }
  .heading { font-family: '${fontFamily}', serif !important; font-weight: ${fontWeight} !important; text-transform: ${fontTransform} !important; }
</style>`

  html = html.replace('</head>', `${brandStyles}\n</head>`)

  // Title + meta
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${brand.name} | ${brief.hero?.headline || 'Landing Page'}</title>`)
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${brief.hero?.subheadline || ''}"`)

  // Logo
  if (brand.logo_url) {
    html = html.replace(/<img[^>]*class="hero-logo"[^>]*>/, `<img src="${brand.logo_url}" alt="${brand.name}" class="hero-logo">`)
  } else {
    html = html.replace(/<img[^>]*class="hero-logo"[^>]*>/, `<span style="font-family:'${fontFamily}',sans-serif;font-weight:900;font-size:22px;color:${textOnPrimary};letter-spacing:-0.02em;text-transform:${fontTransform}">${brand.name}</span>`)
  }

  // Hero
  html = html.replace(/(<h1[^>]*class="[^"]*hero-headline[^"]*"[^>]*>)[\s\S]*?(<\/h1>)/, `$1${brief.hero?.headline || ''}$2`)
  html = html.replace(/(<p[^>]*class="[^"]*hero-sub[^"]*"[^>]*>)[^<]*/, `$1${brief.hero?.subheadline || ''}`)

  // Hero CTA
  html = html.replace(/(<a[^>]*class="[^"]*btn-primary[^"]*"[^>]*>)\s*[\s\S]*?(<svg)/, `$1\n      ${brief.hero?.cta_text || 'Shop Now'}\n      $2`)

  // Hero image
  if (heroImg) {
    html = html.replace(/(<img[^>]*class="[^"]*hero-product[^"]*"[^>]*src=")[^"]*(")/,`$1${heroImg}$2`)
    html = html.replace(/url\('https:\/\/drinkafterdream\.com[^']*'\)/g, `url('${heroImg}')`)
  }

  // Social proof
  if (brief.social_proof) {
    html = html.replace(/(<span[^>]*class="[^"]*stat-number[^"]*"[^>]*>)[^<]*/g, `$1${brief.social_proof.stat}`)
    html = html.replace(/(<blockquote[^>]*>)\s*<p>[^<]*/, `$1<p>"${brief.social_proof.testimonial}"`)
    html = html.replace(/(<cite[^>]*>)[^<]*/, `$1${brief.social_proof.attribution}`)
  }

  // Final CTA
  if (brief.final_cta) {
    html = html.replace(/(<section[^>]*class="[^"]*final-cta[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/, `$1${brief.final_cta.headline}$2`)
  }

  // Lifestyle image
  if (lifestyleImg) {
    html = html.replace(/(<img[^>]*class="[^"]*lifestyle-img[^"]*"[^>]*src=")[^"]*(")/,`$1${lifestyleImg}$2`)
  }

  // Brand name throughout
  html = html.replace(/Afterdream/g, brand.name)
  html = html.replace(/drinkafterdream\.com/g, brand.website?.replace(/^https?:\/\//, '') || '#')
  html = html.replace(/© \d+ [^<]*/, `© ${new Date().getFullYear()} ${brand.name}`)

  // Floating CTA
  html = html.replace(/>Try [^<]*<\/a>/g, `>${brief.hero?.cta_text || 'Shop Now'} →</a>`)
  html = html.replace(/>Get the Discovery Set[^<]*/g, `>${brief.final_cta?.cta_text || brief.hero?.cta_text || 'Shop Now'}`)

  // Remove tracking IDs
  html = html.replace(/G-[A-Z0-9]{8,}/g, '').replace(/pixel_id:\s*'[^']*'/g, "pixel_id: ''").replace(/1199920381791227/g, '')

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  })
}
