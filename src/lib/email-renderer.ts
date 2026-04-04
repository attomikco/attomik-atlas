// Renders a full email HTML from AI-generated content + brand data.
// Uses the same block-based approach as email-preview.ts but with real campaign content.

import { type EmailConfig, DEFAULT_EMAIL_CONFIG } from './email-preview'

export interface EmailContent {
  subject: string
  previewText: string
  bannerText: string
  heroHeadline: string
  heroSubheadline: string
  heroCta: string
  heroCtaUrl: string
  ctaEyebrow: string
  ctaHeadline: string
  ctaBody: string
  ctaButton: string
  promoCode: string | null
  promoDiscount: string | null
  testimonials: Array<{ quote: string; author: string }>
  experienceHeadline: string
  experienceBody: string
  faqItems: Array<{ question: string; answer: string }>
}

export interface BrandEmailData {
  name: string
  website: string
  logoUrl: string
  primaryColor: string
  accentColor: string
  bgColor: string
  headingFont: string
  headingTransform?: string
  products: Array<{ name: string; price: string; image: string; url: string }>
  lifestyleImages?: string[]
}

function isLight(hex: string): boolean {
  const c = (hex || '').replace('#', '')
  if (c.length < 6) return false
  return (parseInt(c.slice(0, 2), 16) * 299 + parseInt(c.slice(2, 4), 16) * 587 + parseInt(c.slice(4, 6), 16) * 114) / 1000 > 128
}

export function renderEmail(
  content: EmailContent,
  brand: BrandEmailData,
  campaignType: string,
  blocksOverride?: Record<string, boolean>
): string {
  const { primaryColor, accentColor, bgColor, headingFont } = brand
  const hTransform = brand.headingTransform && brand.headingTransform !== 'none' ? `text-transform:${brand.headingTransform};` : ''
  const textOnPrimary = isLight(primaryColor) ? '#000' : '#fff'
  const lifestyleImgs = brand.lifestyleImages || []

  // Determine which blocks to render
  const activeBlocks = blocksOverride || DEFAULT_EMAIL_CONFIG.blocks
  const blocks: string[] = []

  // Google Fonts
  const systemFonts = ['arial', 'helvetica', 'verdana', 'georgia', 'times new roman', 'courier new']
  const fontName = headingFont.split(',')[0].trim()
  const needsGoogleFont = fontName && !systemFonts.includes(fontName.toLowerCase())
  const fontLink = needsGoogleFont
    ? `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;600;700;800;900&display=swap" rel="stylesheet">`
    : ''

  // Banner
  blocks.push(`
    <tr><td style="background:${primaryColor};padding:10px 20px;text-align:center;font-size:12px;font-weight:600;color:${textOnPrimary};letter-spacing:0.06em;text-transform:uppercase">
      ${content.bannerText || `${brand.name} — Shop Now`}
    </td></tr>`)

  // Hero
  if (activeBlocks.hero !== false) {
    const heroBg = lifestyleImgs[0]
      ? `background:linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url(${lifestyleImgs[0]});background-size:cover;background-position:center`
      : `background:${primaryColor}`
    const heroText = lifestyleImgs[0] ? '#fff' : textOnPrimary
    blocks.push(`
      <tr><td style="${heroBg};padding:56px 32px;text-align:center">
        ${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="height:32px;margin-bottom:24px;display:inline-block" />` : `<div style="font-family:${headingFont};font-size:20px;font-weight:900;color:${heroText};margin-bottom:24px;${hTransform}">${brand.name}</div>`}
        <div style="font-family:${headingFont};font-size:36px;font-weight:900;color:${heroText};line-height:1.1;margin-bottom:14px;${hTransform}">${content.heroHeadline}</div>
        <div style="font-size:16px;color:${heroText};opacity:0.8;margin-bottom:28px;max-width:420px;margin-left:auto;margin-right:auto;line-height:1.6">${content.heroSubheadline}</div>
        <a href="${content.heroCtaUrl || brand.website}" style="display:inline-block;background:${accentColor};color:${isLight(accentColor) ? '#000' : '#fff'};font-family:${headingFont};font-weight:800;font-size:14px;padding:14px 36px;border-radius:999px;text-decoration:none">${content.heroCta}</a>
      </td></tr>`)
  }

  // Products
  if (activeBlocks.products !== false && brand.products.length > 0) {
    const productCells = brand.products.slice(0, 3).map(p => `
      <td style="width:33%;padding:8px;text-align:center;vertical-align:top">
        <a href="${p.url || brand.website}" style="text-decoration:none;color:inherit">
          ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;border-radius:8px;margin-bottom:10px" />` : `<div style="width:100%;height:140px;background:#e0e0e0;border-radius:8px;margin-bottom:10px"></div>`}
          <div style="font-family:${headingFont};font-size:14px;font-weight:700;color:#000;margin-bottom:2px">${p.name}</div>
          ${p.price ? `<div style="font-size:13px;color:#888">${p.price.startsWith('$') ? p.price : '$' + p.price}</div>` : ''}
        </a>
      </td>`).join('')
    blocks.push(`
      <tr><td style="padding:36px 32px">
        <div style="font-family:${headingFont};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#999;margin-bottom:20px;text-align:center">Featured Products</div>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>${productCells}</tr></table>
      </td></tr>`)
  }

  // CTA Banner
  if (activeBlocks.cta !== false) {
    blocks.push(`
      <tr><td style="padding:0 32px 32px">
        <div style="background:${primaryColor};border-radius:12px;padding:36px;text-align:center">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${textOnPrimary};opacity:0.5;margin-bottom:10px">${content.ctaEyebrow}</div>
          <div style="font-family:${headingFont};font-size:24px;font-weight:900;color:${textOnPrimary};margin-bottom:10px;${hTransform}">${content.ctaHeadline}</div>
          <div style="font-size:15px;color:${textOnPrimary};opacity:0.7;margin-bottom:24px">${content.ctaBody}</div>
          <a href="${brand.website}" style="display:inline-block;background:${accentColor};color:${isLight(accentColor) ? '#000' : '#fff'};font-weight:800;font-size:14px;padding:14px 32px;border-radius:999px;text-decoration:none">${content.ctaButton}</a>
        </div>
      </td></tr>`)
  }

  // Testimonials
  if (activeBlocks.testimonials !== false && content.testimonials?.length > 0) {
    const testimonialCells = content.testimonials.slice(0, 2).map(t => `
      <td style="width:50%;padding:8px;vertical-align:top">
        <div style="background:#f9f9f9;border-radius:10px;padding:22px">
          <div style="font-size:18px;color:${accentColor};margin-bottom:10px">★★★★★</div>
          <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;font-style:italic">"${t.quote}"</div>
          <div style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.06em">${t.author}</div>
        </div>
      </td>`).join('')
    blocks.push(`
      <tr><td style="padding:36px 32px">
        <div style="font-family:${headingFont};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#999;margin-bottom:20px;text-align:center">What Customers Say</div>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>${testimonialCells}</tr></table>
      </td></tr>`)
  }

  // Promo
  if (activeBlocks.promo !== false && content.promoCode) {
    blocks.push(`
      <tr><td style="padding:0 32px 32px">
        <div style="border:2px dashed ${accentColor};border-radius:12px;padding:28px;text-align:center">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#999;margin-bottom:10px">Your Exclusive Code</div>
          <div style="font-family:monospace;font-size:32px;font-weight:900;color:${primaryColor};letter-spacing:0.08em;margin-bottom:8px">${content.promoCode}</div>
          <div style="font-size:14px;color:#888">${content.promoDiscount ? `${content.promoDiscount} off your order` : 'Use at checkout'}</div>
        </div>
      </td></tr>`)
  }

  // Experience
  if (activeBlocks.experience !== false) {
    const expImg = lifestyleImgs[1] || lifestyleImgs[0]
    blocks.push(`
      <tr><td style="padding:36px 32px;text-align:center">
        ${expImg ? `<img src="${expImg}" alt="Lifestyle" style="width:100%;border-radius:12px;margin-bottom:24px;display:block" />` : ''}
        <div style="font-family:${headingFont};font-size:24px;font-weight:900;color:${primaryColor};margin-bottom:14px;${hTransform}">${content.experienceHeadline}</div>
        <div style="font-size:15px;color:#666;line-height:1.7;max-width:460px;margin:0 auto">${content.experienceBody}</div>
      </td></tr>`)
  }

  // FAQ
  if (activeBlocks.faq !== false && content.faqItems?.length > 0) {
    const faqRows = content.faqItems.slice(0, 4).map(f => `
      <div style="border-bottom:1px solid #eee;padding:16px 0">
        <div style="font-family:${headingFont};font-size:15px;font-weight:700;color:#000;margin-bottom:6px">${f.question}</div>
        <div style="font-size:14px;color:#666;line-height:1.6">${f.answer}</div>
      </div>`).join('')
    blocks.push(`
      <tr><td style="padding:36px 32px">
        <div style="font-family:${headingFont};font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#999;margin-bottom:20px;text-align:center">Frequently Asked</div>
        ${faqRows}
      </td></tr>`)
  }

  // Footer
  blocks.push(`
    <tr><td style="padding:36px 32px;text-align:center;border-top:1px solid #eee">
      ${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="height:20px;margin-bottom:12px;display:inline-block;opacity:0.4" />` : `<div style="font-size:12px;font-weight:700;color:#ccc;margin-bottom:12px">${brand.name}</div>`}
      <div style="font-size:11px;color:#bbb;margin-bottom:8px">${brand.website}</div>
      <a href="#" style="font-size:11px;color:#bbb;text-decoration:underline">Unsubscribe</a>
    </td></tr>`)

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${fontLink}</head>
<body style="margin:0;padding:0;background:${bgColor};font-family:Arial,sans-serif">
<center><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff">
${blocks.join('\n')}
</table></center></body></html>`
}
