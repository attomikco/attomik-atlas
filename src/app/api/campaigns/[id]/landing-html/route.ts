import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { bucketBrandImages, getBusinessType, getContentImages } from '@/lib/brand-images'
import type { BrandImage } from '@/types'

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

  // Accept brief from URL param (base64 JSON) for live preview, otherwise load from DB
  const briefParam = req.nextUrl.searchParams.get('brief')
  let brief: any = null
  if (briefParam) {
    try {
      const decoded = Buffer.from(
        briefParam.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
      ).toString('utf-8')
      brief = JSON.parse(decodeURIComponent(escape(decoded)))
    } catch (e) {
      console.error('Failed to decode brief param:', e)
      // Fall through to DB brief
    }
  }
  if (!brief) {
    const { data: contentRow } = await supabase
      .from('generated_content').select('*')
      .eq('campaign_id', id).eq('type', 'landing_brief')
      .order('created_at', { ascending: false }).limit(1).single()
    if (!contentRow) return new NextResponse('No brief', { status: 404 })
    try { brief = JSON.parse(contentRow.content) }
    catch { return new NextResponse('Invalid brief', { status: 500 }) }
  }

  const brand = campaign.brand

  // ── Images
  const { data: allImagesRaw } = await supabase
    .from('brand_images').select('*')
    .eq('brand_id', brand.id).order('created_at')

  const getUrl = (path: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/brand-images/${path}`

  // Single source of truth — same bucketing/ranking the email + Brand Hub use,
  // so the landing page never grabs logos, press badges, or the random first
  // row from the raw table.
  const rawImages = (allImagesRaw || []) as BrandImage[]
  const { productImages: productBucket, lifestyleImages: lifestyleBucket } =
    bucketBrandImages(rawImages, getBusinessType(brand))
  const content = getContentImages(rawImages)

  const isLandscape = (i: BrandImage) => !!(i.width && i.height && i.width > i.height * 1.2)
  const isPortrait  = (i: BrandImage) => !!(i.width && i.height && i.height >= i.width)

  // Running set of URLs already used, so hero/lifestyle/product-feature never
  // land on the same image when there are alternatives available.
  const used = new Set<string>()
  function pickFrom(pools: BrandImage[][], predicate?: (i: BrandImage) => boolean): string {
    // 1. Walk pools in order, taking the first image matching the predicate
    //    that we haven't used yet.
    for (const pool of pools) {
      for (const img of pool) {
        const url = getUrl(img.storage_path)
        if (used.has(url)) continue
        if (predicate && !predicate(img)) continue
        used.add(url)
        return url
      }
    }
    // 2. Relax the predicate — any unused image from the pools.
    if (predicate) {
      for (const pool of pools) {
        for (const img of pool) {
          const url = getUrl(img.storage_path)
          if (used.has(url)) continue
          used.add(url)
          return url
        }
      }
    }
    // 3. Final fallback — reuse the first available (may repeat).
    for (const pool of pools) {
      const first = pool[0]
      if (first) return getUrl(first.storage_path)
    }
    return ''
  }

  // Main hero (section 9) — portrait preferred, from products (for Shopify) then lifestyle.
  const heroImg = pickFrom([productBucket, lifestyleBucket, content], isPortrait)
  // Lifestyle / product-feature hero — landscape preferred, MUST differ from heroImg.
  const lifestyleImg = pickFrom([lifestyleBucket, productBucket, content], isLandscape)
  // Per-product card fallback (used when brand.products[0] has no image).
  const img1 = pickFrom([productBucket, lifestyleBucket, content])
  const product = brand.products?.[0]

  // ── Colors (allow query param overrides from preview)
  const searchParams = req.nextUrl.searchParams
  const primary = searchParams.get('primary') || brand.primary_color || '#000000'
  const secondary = searchParams.get('secondary') || brand.secondary_color || primary
  const accent = searchParams.get('accent') || brand.accent_color || secondary
  const primaryIsLight = isLight(primary)
  const textOnDark = primaryIsLight ? '#000000' : '#ffffff'
  const textOnDarkSec = primaryIsLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)'
  const bgBase = mix(primary, 0.93)
  const bgAlt = mix(primary, 0.88)
  const bgCard = mix(primary, 0.96)

  // ── Font (allow query param override from preview)
  const fontFamily = searchParams.get('font') || brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'system-ui'
  const fontWeight = brand.font_heading?.weight || '700'
  const fontTransform = searchParams.get('transform') || brand.font_heading?.transform || 'none'
  const fontUrl = fontFamily !== 'system-ui'
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800;900&display=swap`
    : null

  // ── Build HTML fragments
  const benefitsHtml = (brief.benefits || []).slice(0, 4).map((b: any) => `
    <div class="benefit-item fade-in">
      <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div><h3 class="benefit-title heading">${b.headline}</h3><p class="benefit-desc">${b.body}</p></div>
    </div>
  `).join('')

  const faqHtml = (brief.faq || []).map((f: any) => `
    <div class="faq-item fade-in">
      <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">
        ${f.question}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="faq-answer"><p>${f.answer}</p></div>
    </div>
  `).join('')

  const photoStripHtml = content.slice(0, 6).map(img =>
    `<img src="${getUrl(img.storage_path)}" alt="${brand.name}" loading="lazy">`
  ).join('')

  // ── Read template
  const tplPath = join(process.cwd(), 'src/lib/landing-template.html')
  let html = readFileSync(tplPath, 'utf-8')

  // ══════════════════════════════════════════════════════════
  // 1. BRAND THEME CSS
  // ══════════════════════════════════════════════════════════
  const themeCSS = `
${fontUrl ? `<link rel="stylesheet" href="${fontUrl}">` : ''}
<style id="brand-override">
:root {
  --bg: ${bgBase}; --bg-alt: ${bgAlt}; --bg-card: ${bgCard};
  --bg-dark: ${primary}; --bg-dark-alt: ${secondary};
  --text: ${primary}; --text-secondary: ${primary}; --text-tertiary: ${primary}99;
  --text-on-dark: ${textOnDark}; --text-on-dark-secondary: ${textOnDarkSec}; --text-on-dark-tertiary: ${textOnDark}88;
  --primary: ${secondary}; --primary-light: ${mix(secondary, 0.15)}; --primary-dim: ${secondary}22;
  --accent: ${accent}; --accent-light: ${mix(accent, 0.15)}; --accent-dim: ${accent}22;
  --border: ${primary}15; --border-strong: ${primary}28; --border-on-dark: ${textOnDark}15;
}
body, p, span, li { font-family: '${fontFamily}', 'DM Sans', system-ui, sans-serif !important; }
.heading { font-family: '${fontFamily}', system-ui, sans-serif !important; font-weight: ${fontWeight} !important; text-transform: ${fontTransform} !important; }
</style>`
  html = html.replace('</head>', `${themeCSS}\n</head>`)

  // ══════════════════════════════════════════════════════════
  // 2. TITLE + META
  // ══════════════════════════════════════════════════════════
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${brand.name} | ${brief.hero.headline}</title>`)
  html = html.replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${brief.hero.subheadline}"`)

  // ══════════════════════════════════════════════════════════
  // 3. ANNOUNCEMENT BAR
  // ══════════════════════════════════════════════════════════
  const announcementText = product?.price_range
    ? `Free Shipping On Orders Over $50 · ${brand.name} — From $${product.price_range}`
    : `Free Shipping On Orders · ${brief.hero.cta_text}`
  html = html.replace(/(<div[^>]*class="announcement"[^>]*>)[^<]*/, `$1${announcementText}`)

  // ══════════════════════════════════════════════════════════
  // 4. LOGO
  // ══════════════════════════════════════════════════════════
  const notesData = (() => { try { return brand.notes ? JSON.parse(brand.notes) : null } catch { return null } })()
  const logoLight = notesData?.logo_url_light
  const logoToUse = logoLight || brand.logo_url
  const logoHtml = logoToUse
    ? `<img src="${logoToUse}" alt="${brand.name}" class="hero-logo" style="max-height:44px;width:auto;">`
    : `<span style="font-family:'${fontFamily}',sans-serif;font-weight:900;font-size:20px;color:${textOnDark};letter-spacing:-0.02em;text-transform:${fontTransform}">${brand.name}</span>`
  html = html.replace(/<img[^>]*class="hero-logo"[^>]*>/, logoHtml)

  // ══════════════════════════════════════════════════════════
  // 5. HERO BADGE
  // ══════════════════════════════════════════════════════════
  html = html.replace(/(<span[^>]*class="badge-text"[^>]*>)[^<]*/, `$1${brief.social_proof.stat} — ${brand.name}`)

  // ══════════════════════════════════════════════════════════
  // 6. HERO COPY
  // ══════════════════════════════════════════════════════════
  html = html.replace(/(<h1[^>]*class="[^"]*hero-headline[^"]*"[^>]*>)[\s\S]*?(<\/h1>)/, `$1${brief.hero.headline}$2`)
  html = html.replace(/(<p[^>]*class="[^"]*hero-sub[^"]*"[^>]*>)[^<]*/, `$1${brief.hero.subheadline}`)

  // ══════════════════════════════════════════════════════════
  // 7. HERO CTA BUTTON
  // ══════════════════════════════════════════════════════════
  html = html.replace(/(<a[^>]*class="[^"]*btn-primary[^"]*"[^>]*>)[^<]*(<svg)/, `$1${brief.hero.cta_text} $2`)

  // ══════════════════════════════════════════════════════════
  // 8. HERO MICRO TRUST ICONS
  // ══════════════════════════════════════════════════════════
  const microBenefits = (brief.benefits || []).slice(0, 3)
  const microHtml = microBenefits.map((b: any) => `
    <span><svg viewBox="0 0 24 24" stroke-linecap="round" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> ${b.headline}</span>
  `).join('')
  html = html.replace(/(<div[^>]*class="hero-micro"[^>]*>)[\s\S]*?(<\/div>)/, `$1${microHtml}$2`)

  // ══════════════════════════════════════════════════════════
  // 9. HERO PRODUCT IMAGE
  // ══════════════════════════════════════════════════════════
  if (heroImg) {
    html = html.replace(
      /(<div[^>]*class="[^"]*hero-image[^"]*"[^>]*>\s*)<img[^>]*src="[^"]*"/,
      `$1<img src="${heroImg}" style="max-width:100%;border-radius:16px;"`
    )
  }

  // ══════════════════════════════════════════════════════════
  // 10. PROOF STRIP
  // ══════════════════════════════════════════════════════════
  const proofHtml = (brief.benefits || []).slice(0, 4).map((b: any) => `
    <div class="proof-item"><svg viewBox="0 0 24 24" stroke-linecap="round" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> ${b.headline}</div>
  `).join('')
  html = html.replace(/(<div[^>]*class="[^"]*proof-strip[^"]*"[^>]*>)[\s\S]*?(<\/div>)/, `$1${proofHtml}$2`)

  // ══════════════════════════════════════════════════════════
  // 11. LIFESTYLE / PROBLEM SECTION
  // ══════════════════════════════════════════════════════════
  if (brief.problem) {
    html = html.replace(
      /(<section[^>]*class="[^"]*lifestyle[^"]*"[\s\S]*?<p[^>]*class="section-label"[^>]*>)[^<]*/,
      `$1${brief.problem.headline.split(' ').slice(0, 4).join(' ')}`
    )
    html = html.replace(
      /(<section[^>]*class="[^"]*lifestyle[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/,
      `$1${brief.problem.headline}$2`
    )
    html = html.replace(
      /(<section[^>]*class="[^"]*lifestyle[^"]*"[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>\s*<p>)[^<]*/,
      `$1${brief.problem.body}`
    )
    html = html.replace(/(<a[^>]*class="btn-outline"[^>]*>)[^<]*/, `$1${brief.hero.cta_text}`)
  }
  if (lifestyleImg) {
    html = html.replace(
      /(<div[^>]*class="[^"]*lifestyle-img[^"]*"[^>]*>\s*)<img[^>]*src="[^"]*"/,
      `$1<img src="${lifestyleImg}"`
    )
  }

  // ══════════════════════════════════════════════════════════
  // 12. INGREDIENTS → SOLUTION SECTION
  // ══════════════════════════════════════════════════════════
  if (brief.solution) {
    html = html.replace(
      /(<section[^>]*class="[^"]*ingredients[^"]*"[\s\S]*?<p[^>]*class="section-label"[^>]*>)[^<]*/,
      `$1What Makes It Work`
    )
    html = html.replace(
      /(<section[^>]*class="[^"]*ingredients[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/,
      `$1${brief.solution.headline}$2`
    )
    html = html.replace(
      /(<section[^>]*class="[^"]*ingredients[^"]*"[\s\S]*?<p[^>]*class="section-sub"[^>]*>)[^<]*/,
      `$1${brief.solution.body}`
    )
  }
  const ingredientCardsHtml = (brief.benefits || []).slice(0, 3).map((b: any, i: number) => {
    const img = content[i] ? getUrl(content[i].storage_path) : ''
    return `
      <div class="ingredient-card">
        ${img ? `<img src="${img}" alt="${b.headline}" loading="lazy">` : `<div style="height:120px;background:var(--accent-dim);border-radius:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;font-size:32px;">✦</div>`}
        <h4 class="heading">${b.headline}</h4>
        <p>${b.body}</p>
      </div>
    `
  }).join('')
  html = html.replace(
    /(<div[^>]*class="ingredients-grid[^"]*"[^>]*>)[\s\S]*?(<\/div>\s*<\/section>)/,
    `$1${ingredientCardsHtml}$2`
  )

  // ══════════════════════════════════════════════════════════
  // 13. BENEFITS GRID
  // ══════════════════════════════════════════════════════════
  if (benefitsHtml) {
    html = html.replace(/(<div[^>]*class="[^"]*benefits-grid[^"]*"[^>]*>)[\s\S]*?(<\/div>)/, `$1${benefitsHtml}$2`)
  }

  // ══════════════════════════════════════════════════════════
  // 14. PHOTO STRIP
  // ══════════════════════════════════════════════════════════
  if (photoStripHtml) {
    html = html.replace(/(<div[^>]*class="[^"]*photo-strip[^"]*"[^>]*>)[\s\S]*?(<\/div>)/, `$1${photoStripHtml}$2`)
  }

  // ══════════════════════════════════════════════════════════
  // 15. FOUNDER / BRAND STORY
  // ══════════════════════════════════════════════════════════
  const brandStory = brand.mission || brand.brand_voice?.slice(0, 200) || brief.solution?.body || ''
  html = html.replace(
    /(<section[^>]*class="[^"]*founder[^"]*"[\s\S]*?<p[^>]*class="section-label"[^>]*>)[^<]*/,
    `$1The ${brand.name} Story`
  )
  html = html.replace(
    /(<section[^>]*class="[^"]*founder[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/,
    `$1The Vision Behind ${brand.name}$2`
  )
  html = html.replace(
    /(<section[^>]*class="[^"]*founder[^"]*"[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>\s*<p>)[^<]*/,
    `$1${brandStory}`
  )
  if (lifestyleImg) {
    html = html.replace(
      /(<div[^>]*class="[^"]*founder-img[^"]*"[^>]*>\s*)<img[^>]*src="[^"]*"/,
      `$1<img src="${lifestyleImg}"`
    )
  }

  // ══════════════════════════════════════════════════════════
  // 16. SOCIAL PROOF STAT
  // ══════════════════════════════════════════════════════════
  if (brief.social_proof) {
    html = html.replace(/(<span[^>]*class="[^"]*stat-number[^"]*"[^>]*>)[^<]*/g, `$1${brief.social_proof.stat}`)
    html = html.replace(/(<blockquote[^>]*>\s*<p>)[^<]*/, `$1"${brief.social_proof.testimonial}"`)
    html = html.replace(/(<cite[^>]*>)[^<]*/, `$1— ${brief.social_proof.attribution}`)
  }

  // ══════════════════════════════════════════════════════════
  // 17. TESTIMONIALS / REVIEWS
  // ══════════════════════════════════════════════════════════
  const reviewCards = [
    { text: brief.social_proof?.testimonial || '', author: brief.social_proof?.attribution || 'Verified Customer' },
    { text: `${brief.hero.subheadline} — exactly what I was looking for.`, author: 'Verified Customer' },
    { text: (brief.solution?.body || '').slice(0, 120) + '...', author: 'Verified Customer' },
  ].map(r => `
    <div class="review-card fade-in">
      <div class="review-stars">★★★★★</div>
      <p class="review-text">"${r.text}"</p>
      <p class="review-author">${r.author}</p>
      <p class="review-verified"><svg viewBox="0 0 24 24" stroke-linecap="round" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Verified Purchase</p>
    </div>
  `).join('')
  html = html.replace(
    /(<section[^>]*class="[^"]*testimonials[^"]*"[\s\S]*?<p[^>]*class="section-label"[^>]*>)[^<]*/,
    `$1What Customers Are Saying`
  )
  html = html.replace(
    /(<div[^>]*class="review-grid"[^>]*>)[\s\S]*?(<\/div>\s*<\/section>)/,
    `$1${reviewCards}$2`
  )

  // ══════════════════════════════════════════════════════════
  // 18. HOW IT WORKS
  // ══════════════════════════════════════════════════════════
  const hiwSteps = [
    { num: '1', title: 'Discover', desc: brief.hero.subheadline.slice(0, 80) },
    { num: '2', title: 'Experience', desc: (brief.solution?.body || '').slice(0, 80) },
    { num: '3', title: 'Love It', desc: brief.final_cta?.body?.slice(0, 80) || brief.hero.cta_text },
  ]
  const hiwHtml = hiwSteps.map(s => `
    <div class="hiw-step"><div class="step-num heading">${s.num}</div><h4 class="heading">${s.title}</h4><p>${s.desc}</p></div>
  `).join('')
  html = html.replace(
    /(<div[^>]*class="hiw-steps[^"]*"[^>]*>)[\s\S]*?(<\/div>\s*<\/section>)/,
    `$1${hiwHtml}$2`
  )

  // ══════════════════════════════════════════════════════════
  // 19. PRESS → BENEFIT BAR
  // ══════════════════════════════════════════════════════════
  const pressBenefitBar = (brief.benefits || []).slice(0, 5).map((b: any) => `
    <span style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-secondary);padding:0 24px;border-right:1px solid var(--border);">${b.headline}</span>
  `).join('')
  html = html.replace(
    /(<section[^>]*class="[^"]*press[^"]*"[^>]*>)[\s\S]*?(<\/section>)/,
    `$1<div style="max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0;">${pressBenefitBar}</div>$2`
  )

  // ══════════════════════════════════════════════════════════
  // 20. PRODUCT SHOWCASE
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // 21. FAQ
  // ══════════════════════════════════════════════════════════
  if (faqHtml) {
    html = html.replace(/(<div[^>]*class="[^"]*faq-list[^"]*"[^>]*>)[\s\S]*?(<\/div>\s*<\/section>)/, `$1${faqHtml}$2`)
  }

  // ══════════════════════════════════════════════════════════
  // 22. FINAL CTA
  // ══════════════════════════════════════════════════════════
  if (brief.final_cta) {
    html = html.replace(
      /(<section[^>]*class="[^"]*final-cta[^"]*"[\s\S]*?<h2[^>]*class="[^"]*section-headline[^"]*"[^>]*>)[\s\S]*?(<\/h2>)/,
      `$1${brief.final_cta.headline}$2`
    )
  }
  const productName = product?.name || brand.name
  const productPrice = product?.price_range ? `$${product.price_range}` : ''
  html = html.replace(
    /(<div[^>]*class="final-offer"[^>]*>)[\s\S]*?(<\/div>)/,
    `$1<p class="final-offer-text heading">${productName}${productPrice ? ` — ${productPrice}` : ''}</p><p class="final-offer-sub">${brief.final_cta?.body || brief.hero.subheadline}</p>$2`
  )

  // ══════════════════════════════════════════════════════════
  // 23. GUARANTEE BADGES
  // ══════════════════════════════════════════════════════════
  const guaranteeHtml = (brief.benefits || []).slice(0, 3).map((b: any) => `
    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> ${b.headline}</span>
  `).join('')
  html = html.replace(/(<div[^>]*class="guarantee"[^>]*>)[\s\S]*?(<\/div>)/, `$1${guaranteeHtml}$2`)

  // ══════════════════════════════════════════════════════════
  // 24. FLOATING CTA + ALL CTA BUTTONS
  // ══════════════════════════════════════════════════════════
  html = html.replace(/>Try Afterdream[^<]*</g, `>${brief.hero.cta_text} →<`)
  html = html.replace(/>Get the Discovery Set[^<]*/g, `>${brief.final_cta?.cta_text || brief.hero.cta_text}`)

  // ══════════════════════════════════════════════════════════
  // 25. FOOTER + GLOBAL REPLACEMENTS
  // ══════════════════════════════════════════════════════════
  html = html.replace(/© \d+ [^<]*/, `© ${new Date().getFullYear()} ${brand.name}. All Rights Reserved.`)
  // Replace "Afterdream" in src/href URLs with URL-encoded name (spaces → %20)
  const urlSafeName = encodeURIComponent(brand.name).replace(/%20/g, '%20')
  html = html.replace(/((?:src|href)="[^"]*?)Afterdream/g, `$1${urlSafeName}`)
  // Then replace remaining "Afterdream" in text/alt (safe with spaces)
  html = html.replace(/Afterdream/g, brand.name)
  html = html.replace(/drinkafterdream\.com/g, brand.website?.replace(/https?:\/\//, '') || brand.name.toLowerCase().replace(/\s+/g, '-') + '.com')

  // ══════════════════════════════════════════════════════════
  // 26. REMOVE TRACKING IDS
  // ══════════════════════════════════════════════════════════
  html = html.replace(/G-[A-Z0-9]{8,}/g, '').replace(/pixel_id:\s*'[^']*'/g, "pixel_id: ''").replace(/'1199920381791227'/g, "''")

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  })
}
