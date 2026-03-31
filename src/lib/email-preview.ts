// Generates a static HTML email preview from config + brand data.
// No AI calls — this is a deterministic template for the live preview.

export interface EmailConfig {
  blocks: {
    hero: boolean
    products: boolean
    cta: boolean
    testimonials: boolean
    promo: boolean
    experience: boolean
    faq: boolean
    blog: boolean
    referral: boolean
    subscribeBar: boolean
  }
  primaryColor: string
  accentColor: string
  bgColor: string
  headingFont: string
  testimonials: Array<{ quote: string; author: string }>
  faq: Array<{ question: string; answer: string }>
  footerAddress: string
  unsubscribeText: string
}

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  blocks: {
    hero: true,
    products: true,
    cta: true,
    testimonials: false,
    promo: false,
    experience: false,
    faq: false,
    blog: false,
    referral: false,
    subscribeBar: false,
  },
  primaryColor: '#000000',
  accentColor: '#00ff97',
  bgColor: '#f5f5f5',
  headingFont: 'Arial, sans-serif',
  testimonials: [],
  faq: [],
  footerAddress: '',
  unsubscribeText: 'Unsubscribe',
}

interface BrandPreviewData {
  name: string
  website: string
  logoUrl: string
  products: Array<{ name: string; price: string; image: string }>
}

export function buildPreviewHtml(config: EmailConfig, brand: BrandPreviewData): string {
  const { primaryColor, accentColor, bgColor, headingFont } = config
  const textOnPrimary = isLight(primaryColor) ? '#000' : '#fff'
  const blocks: string[] = []

  // Hero
  if (config.blocks.hero) {
    blocks.push(`
      <tr><td style="background:${primaryColor};padding:48px 32px;text-align:center">
        ${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="height:28px;margin-bottom:20px;display:inline-block" />` : `<div style="font-family:${headingFont};font-size:20px;font-weight:900;color:${textOnPrimary};margin-bottom:20px">${brand.name}</div>`}
        <div style="font-family:${headingFont};font-size:32px;font-weight:900;color:${textOnPrimary};line-height:1.1;margin-bottom:12px">Your Campaign<br>Headline Here</div>
        <div style="font-size:15px;color:${textOnPrimary};opacity:0.7;margin-bottom:24px;max-width:400px;margin-left:auto;margin-right:auto;line-height:1.5">Your hero subheadline goes here. This is where the campaign message will appear.</div>
        <a href="${brand.website}" style="display:inline-block;background:${accentColor};color:${isLight(accentColor) ? '#000' : '#fff'};font-family:${headingFont};font-weight:800;font-size:14px;padding:14px 32px;border-radius:999px;text-decoration:none">Shop Now</a>
      </td></tr>`)
  }

  // Products
  if (config.blocks.products && brand.products.length > 0) {
    const productCells = brand.products.slice(0, 3).map(p => `
      <td style="width:33%;padding:8px;text-align:center;vertical-align:top">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;border-radius:8px;margin-bottom:8px" />` : `<div style="width:100%;height:120px;background:#e0e0e0;border-radius:8px;margin-bottom:8px"></div>`}
        <div style="font-family:${headingFont};font-size:13px;font-weight:700;color:#000;margin-bottom:2px">${p.name}</div>
        ${p.price ? `<div style="font-size:12px;color:#888">${p.price}</div>` : ''}
      </td>`).join('')
    blocks.push(`
      <tr><td style="padding:32px">
        <div style="font-family:${headingFont};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:16px;text-align:center">Featured Products</div>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>${productCells}</tr></table>
      </td></tr>`)
  }

  // CTA Banner
  if (config.blocks.cta) {
    blocks.push(`
      <tr><td style="padding:0 32px">
        <div style="background:${primaryColor};border-radius:12px;padding:32px;text-align:center">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${textOnPrimary};opacity:0.5;margin-bottom:8px">Limited Time</div>
          <div style="font-family:${headingFont};font-size:22px;font-weight:900;color:${textOnPrimary};margin-bottom:8px">Your CTA headline goes here</div>
          <div style="font-size:14px;color:${textOnPrimary};opacity:0.7;margin-bottom:20px">Supporting copy for your call to action.</div>
          <a href="${brand.website}" style="display:inline-block;background:${accentColor};color:${isLight(accentColor) ? '#000' : '#fff'};font-weight:800;font-size:13px;padding:12px 28px;border-radius:999px;text-decoration:none">Get Started</a>
        </div>
      </td></tr>`)
  }

  // Testimonials
  if (config.blocks.testimonials) {
    const testimonials = config.testimonials.length > 0
      ? config.testimonials
      : [{ quote: 'Add testimonials in the template editor.', author: 'Customer Name' }]
    const testimonialCells = testimonials.slice(0, 2).map(t => `
      <td style="width:50%;padding:8px;vertical-align:top">
        <div style="background:#f9f9f9;border-radius:10px;padding:20px">
          <div style="font-size:18px;color:${primaryColor};margin-bottom:8px">★★★★★</div>
          <div style="font-size:13px;color:#444;line-height:1.6;margin-bottom:10px;font-style:italic">"${t.quote}"</div>
          <div style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.06em">${t.author}</div>
        </div>
      </td>`).join('')
    blocks.push(`
      <tr><td style="padding:32px">
        <div style="font-family:${headingFont};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:16px;text-align:center">What Customers Say</div>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>${testimonialCells}</tr></table>
      </td></tr>`)
  }

  // Promo
  if (config.blocks.promo) {
    blocks.push(`
      <tr><td style="padding:0 32px 32px">
        <div style="border:2px dashed ${accentColor};border-radius:12px;padding:24px;text-align:center">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:8px">Your Exclusive Code</div>
          <div style="font-family:monospace;font-size:28px;font-weight:900;color:${primaryColor};letter-spacing:0.08em;margin-bottom:8px">SAVE20</div>
          <div style="font-size:13px;color:#888">Use at checkout for 20% off your order</div>
        </div>
      </td></tr>`)
  }

  // Experience
  if (config.blocks.experience) {
    blocks.push(`
      <tr><td style="padding:32px;text-align:center">
        <div style="font-family:${headingFont};font-size:22px;font-weight:900;color:${primaryColor};margin-bottom:12px">How It Makes You Feel</div>
        <div style="font-size:14px;color:#666;line-height:1.7;max-width:440px;margin:0 auto">This section describes the product experience. It will be customized for each campaign you generate.</div>
      </td></tr>`)
  }

  // FAQ
  if (config.blocks.faq) {
    const faqs = config.faq.length > 0
      ? config.faq
      : [{ question: 'Add your FAQs in the template editor.', answer: 'Answers will appear here.' }]
    const faqRows = faqs.slice(0, 4).map(f => `
      <div style="border-bottom:1px solid #eee;padding:14px 0">
        <div style="font-size:14px;font-weight:700;color:#000;margin-bottom:4px">${f.question}</div>
        <div style="font-size:13px;color:#666;line-height:1.5">${f.answer}</div>
      </div>`).join('')
    blocks.push(`
      <tr><td style="padding:32px">
        <div style="font-family:${headingFont};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:16px;text-align:center">Frequently Asked</div>
        ${faqRows}
      </td></tr>`)
  }

  // Subscribe bar
  if (config.blocks.subscribeBar) {
    blocks.push(`
      <tr><td style="padding:0 32px 32px">
        <div style="background:#f9f9f9;border-radius:12px;padding:24px;text-align:center">
          <div style="font-family:${headingFont};font-size:16px;font-weight:800;color:#000;margin-bottom:8px">Stay in the loop</div>
          <div style="font-size:13px;color:#888;margin-bottom:14px">Get early access to drops and exclusive offers.</div>
          <div style="display:inline-block;background:#eee;border-radius:8px;padding:10px 20px;font-size:13px;color:#999">your@email.com &nbsp;&nbsp; Subscribe →</div>
        </div>
      </td></tr>`)
  }

  // Referral
  if (config.blocks.referral) {
    blocks.push(`
      <tr><td style="padding:0 32px 32px">
        <div style="background:${primaryColor};border-radius:12px;padding:24px;text-align:center">
          <div style="font-family:${headingFont};font-size:16px;font-weight:800;color:${textOnPrimary};margin-bottom:8px">Share the love</div>
          <div style="font-size:13px;color:${textOnPrimary};opacity:0.7;margin-bottom:14px">Give $10, get $10 when you refer a friend.</div>
          <a href="${brand.website}" style="display:inline-block;background:${accentColor};color:${isLight(accentColor) ? '#000' : '#fff'};font-weight:700;font-size:13px;padding:10px 24px;border-radius:999px;text-decoration:none">Share Your Link</a>
        </div>
      </td></tr>`)
  }

  // Blog
  if (config.blocks.blog) {
    blocks.push(`
      <tr><td style="padding:32px;text-align:center">
        <div style="font-family:${headingFont};font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-bottom:16px">From the Journal</div>
        <div style="font-family:${headingFont};font-size:18px;font-weight:800;color:#000;margin-bottom:8px">Your Latest Blog Post Title</div>
        <div style="font-size:13px;color:#666;line-height:1.6;max-width:400px;margin:0 auto 14px">A brief excerpt of the blog post will appear here when the email is generated for a campaign.</div>
        <a href="${brand.website}" style="font-size:13px;font-weight:700;color:${primaryColor};text-decoration:underline">Read more →</a>
      </td></tr>`)
  }

  // Footer
  const footer = `
    <tr><td style="padding:32px;text-align:center;border-top:1px solid #eee">
      <div style="font-size:11px;color:#bbb;margin-bottom:8px">${brand.name} · ${config.footerAddress || brand.website}</div>
      <a href="#" style="font-size:11px;color:#bbb;text-decoration:underline">${config.unsubscribeText || 'Unsubscribe'}</a>
    </td></tr>`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bgColor};font-family:Arial,sans-serif">
<center><table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff">
${blocks.join('\n')}
${footer}
</table></center></body></html>`
}

function isLight(hex: string): boolean {
  const c = (hex || '').replace('#', '')
  if (c.length < 6) return false
  return (parseInt(c.slice(0, 2), 16) * 299 + parseInt(c.slice(2, 4), 16) * 587 + parseInt(c.slice(4, 6), 16) * 114) / 1000 > 128
}
