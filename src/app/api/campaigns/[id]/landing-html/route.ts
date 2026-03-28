import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

function isLight(hex: string) {
  const c = hex.replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function mix(hex: string, white: number) {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const lr = Math.round(r + (255 - r) * white)
  const lg = Math.round(g + (255 - g) * white)
  const lb = Math.round(b + (255 - b) * white)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns').select('*, brand:brands(*)')
    .eq('id', id).single()
  if (!campaign) return new NextResponse('Not found', { status: 404 })

  const { data: contentRow } = await supabase
    .from('generated_content').select('*')
    .eq('campaign_id', id).eq('type', 'landing_brief')
    .order('created_at', { ascending: false }).limit(1).single()
  if (!contentRow) return new NextResponse('No brief', { status: 404 })

  let brief: any
  try { brief = JSON.parse(contentRow.content) }
  catch { return new NextResponse('Invalid brief', { status: 500 }) }

  const brand = campaign.brand

  // ── Fetch ALL brand images
  const { data: allImages } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at')

  const getUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-images/${path}`

  const products = (allImages || []).filter(i => i.tag === 'product')
  const lifestyle = (allImages || []).filter(i => i.tag === 'lifestyle' || i.tag === 'background')
  const all = allImages || []

  function pickLandscape(fallback?: string) {
    const candidates = [...lifestyle, ...products, ...all]
    const landscape = candidates.find(i => i.width && i.height && i.width > i.height * 1.2)
    return landscape ? getUrl(landscape.storage_path) : (candidates[0] ? getUrl(candidates[0].storage_path) : fallback || '')
  }

  function pickPortrait(fallback?: string) {
    const candidates = [...products, ...all]
    const portrait = candidates.find(i => i.width && i.height && i.height >= i.width)
    return portrait ? getUrl(portrait.storage_path) : (candidates[0] ? getUrl(candidates[0].storage_path) : fallback || '')
  }

  function pickByIndex(n: number) {
    const img = all[n % Math.max(all.length, 1)]
    return img ? getUrl(img.storage_path) : ''
  }

  const heroImg = pickPortrait()
  const lifestyleImg = pickLandscape()
  const img1 = pickByIndex(0)

  // ── Colors
  const primary = brand.primary_color || '#000000'
  const secondary = brand.secondary_color || primary
  const accent = brand.accent_color || secondary
  const primaryIsLight = isLight(primary)
  const textOnDark = primaryIsLight ? '#000000' : '#ffffff'
  const textOnDarkSec = primaryIsLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)'
  const bgBase = mix(primary, 0.93)
  const bgAlt = mix(primary, 0.88)
  const bgCard = mix(primary, 0.96)

  // ── Font
  const fontFamily = brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'system-ui'
  const fontWeight = brand.font_heading?.weight || '700'
  const fontTransform = brand.font_heading?.transform || 'none'
  const fontUrl = fontFamily !== 'system-ui'
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800;900&display=swap`
    : null

  // ── Build sections HTML
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

  const photoStripHtml = all.slice(0, 6).map(img =>
    `<img src="${getUrl(img.storage_path)}" alt="${brand.name}" loading="lazy">`
  ).join('')

  const proofHtml = (brief.benefits || []).slice(0, 4).map((b: any) => `
    <div class="proof-item">
      <svg viewBox="0 0 24 24" stroke-linecap="round" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      ${b.headline}
    </div>
  `).join('')

  // ── Read + inject template
  const tplPath = join(process.cwd(), 'src/lib/landing-template.html')
  let html = readFileSync(tplPath, 'utf-8')

  // 1. Brand theme CSS override
  const themeCSS = `
${fontUrl ? `<link rel="stylesheet" href="${fontUrl}">` : ''}
<style id="brand-override">
:root {
  --bg: ${bgBase};
  --bg-alt: ${bgAlt};
  --bg-card: ${bgCard};
  --bg-dark: ${primary};
  --bg-dark-alt: ${secondary};
  --text: ${primary};
  --text-secondary: ${primary};
  --text-tertiary: ${primary}99;
  --text-on-dark: ${textOnDark};
  --text-on-dark-secondary: ${textOnDarkSec};
  --text-on-dark-tertiary: ${textOnDark}88;
  --primary: ${secondary};
  --primary-light: ${mix(secondary, 0.15)};
  --primary-dim: ${secondary}22;
  --accent: ${accent};
  --accent-light: ${mix(accent, 0.15)};
  --accent-dim: ${accent}22;
  --border: ${primary}15;
  --border-strong: ${primary}28;
  --border-on-dark: ${textOnDark}15;
}
body, p, span, li { font-family: '${fontFamily}', 'DM Sans', system-ui, sans-serif !important; }
.heading { font-family: '${fontFamily}', system-ui, sans-serif !important; font-weight: ${fontWeight} !important; text-transform: ${fontTransform} !important; }
</style>`
  html = html.replace('</head>', `${themeCSS}\n</head>`)

  // 2. Title + meta
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${brand.name} | ${brief.hero.headline}</title>`)
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${brief.hero.subheadline}"`)

  // 3. Logo
  const logoHtml = brand.logo_url
    ? `<img src="${brand.logo_url}" alt="${brand.name}" class="hero-logo" style="max-height:44px;width:auto;">`
    : `<span style="font-family:'${fontFamily}',sans-serif;font-weight:900;font-size:20px;color:${textOnDark};letter-spacing:-0.02em;text-transform:${fontTransform}">${brand.name}</span>`
  html = html.replace(/<img[^>]*class="hero-logo"[^>]*>/, logoHtml)

  // 4. Hero copy
  html = html.replace(/(<h1[^>]*class="[^"]*hero-headline[^"]*"[^>]*>)[\s\S]*?(<\/h1>)/, `$1${brief.hero.headline}$2`)
  html = html.replace(/(<p[^>]*class="[^"]*hero-sub[^"]*"[^>]*>)[^<]*/, `$1${brief.hero.subheadline}`)

  // 5. Hero CTA button
  html = html.replace(/(<a[^>]*class="[^"]*btn-primary[^"]*"[^>]*>)[^<]*(<svg)/, `$1${brief.hero.cta_text} $2`)

  // 6. Hero product image
  if (heroImg) {
    html = html.replace(
      /(<div[^>]*class="[^"]*hero-image[^"]*"[^>]*>\s*)<img[^>]*src="[^"]*"/,
      `$1<img src="${heroImg}" style="max-width:100%;border-radius:16px;"`
    )
  }

  // 7. Lifestyle section
  if (brief.problem) {
    html = html.replace(
      /(<section[^>]*class="[^"]*lifestyle[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/,
      `$1${brief.problem.headline}$2`
    )
    html = html.replace(
      /(<section[^>]*class="[^"]*lifestyle[^"]*"[\s\S]*?<p>)[^<]*/,
      `$1${brief.problem.body}`
    )
  }
  if (lifestyleImg) {
    html = html.replace(
      /(<div[^>]*class="[^"]*lifestyle-img[^"]*"[^>]*>\s*)<img[^>]*src="[^"]*"/,
      `$1<img src="${lifestyleImg}"`
    )
  }

  // 8. Solution section
  if (brief.solution) {
    html = html.replace(
      /(<section[^>]*class="[^"]*ingredients[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/,
      `$1${brief.solution.headline}$2`
    )
  }

  // 9. Benefits grid
  if (benefitsHtml) {
    html = html.replace(/(<div[^>]*class="[^"]*benefits-grid[^"]*"[^>]*>)[\s\S]*?(<\/div>)/, `$1${benefitsHtml}$2`)
  }

  // 10. Social proof
  if (brief.social_proof) {
    html = html.replace(/(<span[^>]*class="[^"]*stat-number[^"]*"[^>]*>)[^<]*/g, `$1${brief.social_proof.stat}`)
    html = html.replace(/(<blockquote[^>]*>\s*<p>)[^<]*/, `$1"${brief.social_proof.testimonial}"`)
    html = html.replace(/(<cite[^>]*>)[^<]*/, `$1— ${brief.social_proof.attribution}`)
  }

  // 11. Proof strip
  if (proofHtml) {
    html = html.replace(/(<div[^>]*class="[^"]*proof-strip[^"]*"[^>]*>)[\s\S]*?(<\/div>)/, `$1${proofHtml}$2`)
  }

  // 12. Photo strip
  if (photoStripHtml) {
    html = html.replace(/(<div[^>]*class="[^"]*photo-strip[^"]*"[^>]*>)[\s\S]*?(<\/div>)/, `$1${photoStripHtml}$2`)
  }

  // 13. Product showcase
  const product = brand.products?.[0]
  if (product) {
    const productShowcase = `
      <div class="flavor-card fade-in" style="max-width:360px;margin:0 auto;">
        ${img1 ? `<img src="${img1}" alt="${product.name}" class="flavor-img" loading="lazy">` : ''}
        <h3 class="flavor-name heading">${product.name}</h3>
        <p class="flavor-desc">${product.description || brief.solution?.body || ''}</p>
        ${product.price_range ? `<p class="flavor-price">From <strong>$${product.price_range}</strong></p>` : ''}
        <a href="${brand.website || '#'}" class="btn-flavor">${brief.hero.cta_text}</a>
      </div>`
    html = html.replace(
      /(<div[^>]*class="[^"]*flavor-grid[^"]*"[^>]*>)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/,
      `$1${productShowcase}$2`
    )
  }

  // 14. FAQ
  if (faqHtml) {
    html = html.replace(/(<div[^>]*class="[^"]*faq-list[^"]*"[^>]*>)[\s\S]*?(<\/div>\s*<\/section>)/, `$1${faqHtml}$2`)
  }

  // 15. Final CTA
  if (brief.final_cta) {
    html = html.replace(
      /(<section[^>]*class="[^"]*final-cta[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/,
      `$1${brief.final_cta.headline}$2`
    )
    html = html.replace(/>Get the Discovery Set</g, `>${brief.final_cta.cta_text}<`)
    html = html.replace(/>Try Afterdream[^<]*</g, `>${brief.hero.cta_text} →<`)
  }

  // 16. Global brand name + URL
  html = html.replace(/Afterdream/g, brand.name)
  html = html.replace(/drinkafterdream\.com/g, brand.website?.replace(/https?:\/\//, '') || brand.name.toLowerCase().replace(/\s+/g, '-') + '.com')
  html = html.replace(/© \d+ [^<]*/g, `© ${new Date().getFullYear()} ${brand.name}. All Rights Reserved.`)

  // 17. Remove tracking IDs
  html = html.replace(/G-[A-Z0-9]{8,}/g, '').replace(/pixel_id:\s*'[^']*'/g, "pixel_id: ''").replace(/'1199920381791227'/g, "''")

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  })
}
