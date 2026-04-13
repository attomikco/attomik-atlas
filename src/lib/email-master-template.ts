// ─────────────────────────────────────────────────────────────
// email-master-template.ts
// Attomik Marketing OS — Email Builder
// Replaces: src/lib/email-master-template.ts
// ─────────────────────────────────────────────────────────────
// Block system: 13 toggleable content blocks + fixed shell
// Shell (always rendered): Announcement Bar, Header, Footer
// Toggleable: 01a, 01b, 01c, 02, 03, 04, 05, 06, 07, 08, 09, 11, 12
// ─────────────────────────────────────────────────────────────

export interface EmailColors {
  primaryBg: string
  primaryText: string
  altPrimaryBg: string
  altPrimaryText: string
  secondaryBg: string
  secondaryText: string
  accentColor: string
  accentText: string
  accentButtonText: string
  neutralBg: string
  neutralText: string
  buttonBg: string
  buttonText: string
  altButtonBg: string
  altButtonText: string
  headlineColor: string
}

export interface MasterEmailConfig {
  // Meta
  subjectLine: string
  previewText: string
  announcementText: string

  // Block enable/disable
  // Valid IDs: '01a' | '01b' | '01c' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '11' | '12'
  // Announcement bar, header, footer always render regardless
  enabledBlocks: string[]

  // Image assignments — storage_path URLs from brand_images table
  imageAssignments: {
    hero?: string     // block 01a
    product?: string  // block 05
  }

  // Block 01b — Hero Text
  heroEyebrow: string
  heroHeadline: string
  heroBody: string

  // Block 01c — CTA Button
  heroCta: string
  heroCtaUrl: string

  // Block 02 — Promo Code
  promoEyebrow: string
  promoDiscount: string
  promoSubtitle: string
  promoCode: string
  promoExpiry: string
  promoCta: string
  promoCtaUrl: string

  // Block 03 — 3-Pillar
  pillarsEyebrow: string
  pillarsHeadline: string
  pillar1Icon: string
  pillar1Label: string
  pillar1Body: string
  pillar2Icon: string
  pillar2Label: string
  pillar2Body: string
  pillar3Icon: string
  pillar3Label: string
  pillar3Body: string

  // Block 04 — Story / Nostalgia
  storyEyebrow: string
  storyHeadline: string
  storyBody: string
  storyQuote: string
  storyQuoteAttribution: string
  storyClosing: string

  // Block 05 — Product Feature
  productBadge: string
  productName: string
  productBody1: string
  productBody2: string
  productCta: string
  productCtaUrl: string

  // Block 06 — How-To
  howToEyebrow: string
  howToHeadline: string
  howToSubheadline: string
  step1Label: string
  step1Body: string
  step2Label: string
  step2Body: string
  step3Label: string
  step3Body: string
  howToNote: string
  howToCta: string
  howToCtaUrl: string

  // Block 07 — Testimonials
  testimonialsEyebrow: string
  testimonialsHeadline: string
  testimonials: Array<{ quote: string; author: string }>

  // Block 08 — You'll Also Love
  youllAlsoLoveEyebrow: string
  youllAlsoLoveHeadline: string
  youllAlsoLoveSubheadline: string
  products: Array<{ name: string; description: string; imageUrl: string; url: string }>

  // Block 09 — Instagram Grid
  igEyebrow: string
  igHeadline: string
  igHandle: string
  igImages: string[]  // exactly 6 URLs
  igUrl: string
  igCta: string

  // Block 11 — Callout Card
  calloutEyebrow: string
  calloutHeadline: string
  calloutBody: string
  calloutCta: string
  calloutCtaUrl: string

  // Block 12 — FAQ
  faqEyebrow: string
  faqHeadline: string
  faqItems: Array<{ question: string; answer: string }>
  faqCta: string
  faqCtaUrl: string

  // Footer
  footerTagline: string
  instagramUrl: string
  privacyPolicyUrl: string
  refundPolicyUrl: string
  termsOfServiceUrl: string

  emailColors?: EmailColors | null
}

export const DEFAULT_MASTER_CONFIG: MasterEmailConfig = {
  subjectLine: '',
  previewText: '',
  announcementText: 'Free Shipping On Orders Over $50',
  enabledBlocks: ['01a', '01b', '01c', '02', '03', '04', '05', '11', '06', '07', '08', '12', '09'],
  imageAssignments: {},

  heroEyebrow: '',
  heroHeadline: '',
  heroBody: '',
  heroCta: 'Shop Now',
  heroCtaUrl: '',

  promoEyebrow: 'Exclusive Offer',
  promoDiscount: '15% Off',
  promoSubtitle: 'Your First Order',
  promoCode: 'SAVE15',
  promoExpiry: 'No expiry · First order only',
  promoCta: 'Claim Your Discount',
  promoCtaUrl: '',

  pillarsEyebrow: '',
  pillarsHeadline: '',
  pillar1Icon: '✦',
  pillar1Label: '',
  pillar1Body: '',
  pillar2Icon: '✦',
  pillar2Label: '',
  pillar2Body: '',
  pillar3Icon: '✦',
  pillar3Label: '',
  pillar3Body: '',

  storyEyebrow: '',
  storyHeadline: '',
  storyBody: '',
  storyQuote: '',
  storyQuoteAttribution: '',
  storyClosing: '',

  productBadge: 'Best Seller',
  productName: '',
  productBody1: '',
  productBody2: '',
  productCta: 'Shop Now',
  productCtaUrl: '',

  howToEyebrow: 'Simple As 1-2-3',
  howToHeadline: 'Ready in Minutes',
  howToSubheadline: '',
  step1Label: '',
  step1Body: '',
  step2Label: '',
  step2Body: '',
  step3Label: '',
  step3Body: '',
  howToNote: '',
  howToCta: 'Shop Now',
  howToCtaUrl: '',

  testimonialsEyebrow: 'What They\'re Saying',
  testimonialsHeadline: 'Real Reviews',
  testimonials: [
    { quote: '', author: '' },
    { quote: '', author: '' },
    { quote: '', author: '' },
  ],

  youllAlsoLoveEyebrow: 'You\'ll Also Love',
  youllAlsoLoveHeadline: 'More From Our Collection',
  youllAlsoLoveSubheadline: '',
  products: [],

  igEyebrow: 'Follow Along',
  igHeadline: 'Join Us on Instagram',
  igHandle: '',
  igImages: ['', '', '', '', '', ''],
  igUrl: '',
  igCta: 'Follow Us on Instagram',

  calloutEyebrow: '',
  calloutHeadline: '',
  calloutBody: '',
  calloutCta: 'Shop Now',
  calloutCtaUrl: '',

  faqEyebrow: 'Good to Know',
  faqHeadline: 'Your Questions, Answered',
  faqItems: [
    { question: '', answer: '' },
    { question: '', answer: '' },
  ],
  faqCta: 'Still Have Questions?',
  faqCtaUrl: '',

  footerTagline: '',
  instagramUrl: '',
  privacyPolicyUrl: '',
  refundPolicyUrl: '',
  termsOfServiceUrl: '',
  emailColors: null,
}

// ─────────────────────────────────────────────────────────────
// Color utilities — unchanged from original
// ─────────────────────────────────────────────────────────────

function darkenHex(hex: string, percent: number): string {
  const num = parseInt((hex || '#000000').replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent))
  const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function lightenHex(hex: string, percent: number): string {
  const num = parseInt((hex || '#000000').replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent))
  const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = (hex || '#000000').replace('#', '')
  return {
    r: parseInt(c.slice(0, 2), 16) || 0,
    g: parseInt(c.slice(2, 4), 16) || 0,
    b: parseInt(c.slice(4, 6), 16) || 0,
  }
}

function hexToRgbStr(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  return `${r},${g},${b}`
}

function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function isDark(hex: string): boolean {
  return getLuminance(hex) < 0.5
}

interface EmailPalette {
  darkBg: string
  darkText: string
  altDarkBg: string
  altDarkText: string
  lightBg: string
  lightText: string
  secondaryBg: string
  secondaryText: string
  accent: string
  accentText: string
  primaryButtonBg: string
  primaryButtonText: string
  accentButtonBg: string
  accentButtonText: string
}

function buildEmailPalette(brand: BrandData, emailColors?: EmailColors | null): EmailPalette {
  const primary = brand.primary_color || '#154734'
  const accent = brand.accent_color || '#BFA46D'
  const secondary = brand.secondary_color || '#E9E3D8'

  const primaryText = brand.text_on_dark || (getLuminance(primary) < 0.5 ? '#ffffff' : '#000000')
  const accentText = brand.text_on_accent || (getLuminance(accent) > 0.5 ? '#000000' : '#ffffff')
  const lightBg = brand.bg_base || '#ffffff'

  const luminance = getLuminance(primary)
  let altDarkBg: string
  if (luminance < 0.15) {
    altDarkBg = lightenHex(primary, 15)
  } else if (luminance < 0.35) {
    altDarkBg = darkenHex(primary, 10)
  } else {
    altDarkBg = darkenHex(primary, 20)
  }

  const secondaryText = brand.text_on_base || (getLuminance(secondary) > 0.5 ? '#000000' : '#ffffff')
  const derived: EmailPalette = {
    darkBg: primary,
    darkText: primaryText,
    altDarkBg,
    altDarkText: '#ffffff',
    lightBg,
    lightText: '#111111',
    secondaryBg: secondary,
    secondaryText,
    accent,
    accentText,
    primaryButtonBg: primary,
    primaryButtonText: primaryText,
    accentButtonBg: accent,
    accentButtonText: accentText,
  }

  if (emailColors) {
    const p = emailColors.primaryBg || derived.darkBg
    const pt = emailColors.primaryText || derived.darkText
    const a = emailColors.accentColor || derived.accent
    // Priority for text-on-accent: explicit emailColors override > computed
    // contrast on user-set accent > derived from brand.text_on_accent.
    const accentFallback = emailColors.accentColor
      ? (isDark(a) ? '#ffffff' : '#000000')
      : derived.accentText
    const at = emailColors.accentText || accentFallback
    const abt = emailColors.accentButtonText || accentFallback
    const altP = emailColors.altPrimaryBg || derived.altDarkBg
    const altPt = emailColors.altPrimaryText || derived.altDarkText
    return {
      darkBg: p,
      darkText: pt,
      altDarkBg: altP,
      altDarkText: altPt,
      lightBg: emailColors.neutralBg || derived.lightBg,
      lightText: emailColors.neutralText || derived.lightText,
      secondaryBg: emailColors.secondaryBg || derived.secondaryBg,
      secondaryText: emailColors.secondaryText || derived.secondaryText,
      accent: a,
      accentText: at,
      primaryButtonBg: emailColors.buttonBg || p,
      primaryButtonText: emailColors.buttonText || pt,
      accentButtonBg: a,
      accentButtonText: abt,
    }
  }

  return derived
}

export function deriveEmailColorsFromBrand(brand: BrandData): EmailColors {
  const primary = brand.primary_color || '#154734'
  const accent = brand.accent_color || '#BFA46D'
  const secondary = brand.secondary_color || '#E9E3D8'
  const primaryText = isDark(primary) ? '#ffffff' : '#000000'
  const secondaryText = brand.text_on_base || (isDark(secondary) ? '#ffffff' : '#000000')
  const accentText = brand.text_on_accent || (isDark(accent) ? '#ffffff' : '#000000')
  const neutralBg = brand.bg_base || '#ffffff'
  const lum = getLuminance(primary)
  const altPrimaryBg = lum < 0.15 ? lightenHex(primary, 15) : lum < 0.35 ? darkenHex(primary, 10) : darkenHex(primary, 20)
  return {
    primaryBg: primary,
    primaryText,
    altPrimaryBg,
    altPrimaryText: '#ffffff',
    secondaryBg: secondary,
    secondaryText,
    accentColor: accent,
    accentText,
    accentButtonText: accentText,
    neutralBg,
    neutralText: '#111111',
    buttonBg: primary,
    buttonText: primaryText,
    altButtonBg: accent,
    altButtonText: accentText,
    headlineColor: isDark(primary) ? primary : '#111111',
  }
}

interface BrandData {
  name: string
  website: string | null
  logo_url: string | null
  logo_url_light?: string | null
  primary_color: string | null
  accent_color: string | null
  secondary_color?: string | null
  bg_base?: string | null
  text_on_dark?: string | null
  text_on_base?: string | null
  text_on_accent?: string | null
  font_heading?: { family?: string; weight?: string | number; transform?: string } | null
  font_body?: { family?: string; weight?: string | number } | null
  font_primary?: string | null
  products?: any[] | null
}

// ─────────────────────────────────────────────────────────────
// buildMasterEmail — main export
// ─────────────────────────────────────────────────────────────

export function buildMasterEmail(
  brand: BrandData,
  config: MasterEmailConfig,
  productImages: string[] = [],
  lifestyleImages: string[] = []
): string {
  const palette = buildEmailPalette(brand, config.emailColors)
  const hf = `'${brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'Inter'}',Helvetica,Arial,sans-serif`
  const hw = brand.font_heading?.weight || 900
  const ht = (brand.font_heading?.transform || 'uppercase') as string
  const site = brand.website || '#'
  // Logo resolution — prefer the light (white) variant for dark backgrounds.
  // When only the color logo_url exists, apply a brightness(0) invert(1) CSS
  // filter so it renders as white on the dark header/footer bars. When neither
  // exists, fall back to the brand name in the heading font (see headerLogoHtml
  // / footerLogoHtml below).
  const logoLight = (typeof brand.logo_url_light === 'string' && brand.logo_url_light) || ''
  const logoColor = (typeof brand.logo_url === 'string' && brand.logo_url) || ''
  const logo = logoLight || logoColor
  const needsLogoFilter = !logoLight && !!logoColor
  const logoFilterStyle = needsLogoFilter ? 'filter:brightness(0) invert(1);-webkit-filter:brightness(0) invert(1);' : ''
  const headerLogoHtml = logo
    ? `<img src="${logo}" alt="${brand.name}" height="40" style="display:block;height:40px;width:auto;max-width:240px;border:0;margin:0 auto;${logoFilterStyle}">`
    : `<span style="font-family:${hf};font-size:24px;font-weight:${hw};color:${palette.darkText};letter-spacing:1px;text-transform:${ht};">${brand.name}</span>`
  const footerLogoHtml = logo
    ? `<img src="${logo}" alt="${brand.name}" height="40" style="display:block;height:40px;width:auto;max-width:240px;border:0;margin:0 auto;${logoFilterStyle}">`
    : `<span style="font-family:${hf};font-size:17px;font-weight:${hw};color:${palette.darkText};letter-spacing:1px;text-transform:${ht};">${brand.name}</span>`
  const year = new Date().getFullYear()

  // Shorthand: is this block enabled?
  const on = (id: string) => config.enabledBlocks.includes(id)

  // Image resolution — explicit assignment first, then positional fallback.
  // Hero and product must never land on the same image, so product prefers
  // the next-best lifestyle slot and only reuses hero's choice as a last resort.
  const heroImg = config.imageAssignments?.hero || lifestyleImages[0] || productImages[0] || ''
  const productImg =
    config.imageAssignments?.product ||
    lifestyleImages.find(img => img && img !== heroImg) ||
    productImages.find(img => img && img !== heroImg) ||
    productImages[0] ||
    lifestyleImages[0] ||
    ''

  // Instagram images — prefer saved igImages, then the lifestyle + product
  // pool as a safety net so freshly-built emails never render placehold.co
  // tiles when the brand image library has content. The placeholder is the
  // last-resort for brands with zero scraped images.
  const ig = config.igImages || []
  const igPool = [...lifestyleImages, ...productImages]
  const igImg = (i: number) =>
    ig[i] || igPool[i] || `https://placehold.co/400x400/E5E7EB/9CA3AF?text=IG+${i + 1}`

  // Products for block 08. Single source of truth: brand.products JSONB (the
  // Brand Hub product list). Same items, same images, same order as Brand Hub.
  // We intentionally do NOT use config.products (AI-generated, often hallucinated
  // names) or positional productImages[] (shopify-tagged brand_images pool). The
  // Brand Hub IS the canonical product catalog for the brand.
  //
  // Fallback chain for each product's image:
  //   1. bp.image from brand.products[i] (Supabase URL or original scrape)
  //   2. productImages[i] positional (shopify-tagged pool, last-resort only)
  //   3. '' (card renders without image — but allProducts.length guard prevents render)
  const allProducts = (brand.products || []).slice(0, 9).map((bp: any, i: number) => ({
    name: bp.name || bp.title || `Product ${i + 1}`,
    description: bp.description || '',
    imageUrl: bp.image || productImages[i] || '',
    url: bp.url || site,
  }))

  // Testimonials
  const t = config.testimonials || []
  const t0 = t[0] || { quote: '', author: '' }
  const t1 = t[1] || { quote: '', author: '' }
  const t2 = t[2] || { quote: '', author: '' }
  const avatarColors = [palette.secondaryBg, palette.accent, palette.darkBg]
  const avatarTextColors = [palette.secondaryText, palette.accentText, palette.darkText]

  // FAQ
  const faqItems = config.faqItems || []

  // Google Fonts
  const fontFamily = brand.font_heading?.family || 'Inter'
  const bodyFamily = brand.font_body?.family || fontFamily
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700;900&family=${encodeURIComponent(bodyFamily)}:wght@400;600&display=swap`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${config.subjectLine || brand.name}</title>
<link href="${googleFontsUrl}" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${palette.lightBg};">

${config.previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${config.previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

<!-- ANNOUNCEMENT BAR -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.secondaryBg};">
<tr><td align="center" style="padding:12px 16px;">
  <p style="margin:0;font-family:${hf};font-size:16px;font-weight:700;color:${palette.secondaryText};text-transform:${ht};text-align:center;">${config.announcementText}</p>
</td></tr></table>

<!-- HEADER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.darkBg};">
<tr><td align="center" style="padding:28px 20px;">
  <a href="${site}" style="display:block;text-decoration:none;">
    ${headerLogoHtml}
  </a>
</td></tr></table>

${on('01a') ? `
<!-- BLOCK 01a: HERO IMAGE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
  <tr><td style="padding:0;line-height:0;font-size:0;">
    <div style="width:100%;height:400px;background-image:url('${heroImg}');background-size:cover;background-position:center center;background-repeat:no-repeat;" role="img" aria-label="${brand.name}"></div>
  </td></tr>
</table>` : ''}

${on('01b') ? `
<!-- BLOCK 01b: HERO TEXT -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
  <tr><td align="center" style="padding:48px 24px 0;">
    <p style="margin:0;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.heroEyebrow}</p>
  </td></tr>
  <tr><td align="center" style="padding:12px 24px 0;">
    <h1 style="margin:0;font-family:${hf};font-size:39px;font-weight:${hw};color:${palette.lightText};line-height:1.1;text-align:center;text-transform:${ht};letter-spacing:1px;">${config.heroHeadline}</h1>
  </td></tr>
  <tr><td align="center" style="padding:20px 24px 48px;">
    <p style="margin:0 auto;font-family:${hf};font-size:17px;font-weight:400;color:${palette.lightText};line-height:1.8;text-align:center;max-width:500px;">${config.heroBody}</p>
  </td></tr>
</table>` : ''}

${on('01c') ? `
<!-- BLOCK 01c: CTA BUTTON -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
  <tr><td align="center" style="padding:0 24px 48px;">
    <table cellpadding="0" cellspacing="0" border="0" align="center">
    <tr><td style="background-color:${palette.primaryButtonBg};border-radius:2px;font-family:${hf};">
      <a href="${config.heroCtaUrl || site}" style="display:inline-block;padding:16px 44px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.primaryButtonText};text-decoration:none;text-transform:${ht};">${config.heroCta}</a>
    </td></tr></table>
  </td></tr>
</table>` : ''}

${on('02') ? `
<!-- BLOCK 02: PROMO CODE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
<tr><td align="center" style="padding:48px 24px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:460px;border:1.5px dashed rgba(${hexToRgbStr(palette.darkBg)},0.35);border-radius:6px;background:#ffffff;">
  <tr><td align="center" style="padding:36px 28px;">
    <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.promoEyebrow}</p>
    <h2 style="margin:0 0 4px;font-family:${hf};font-size:70px;font-weight:${hw};color:${palette.lightText};line-height:1;text-align:center;text-transform:${ht};">${config.promoDiscount}</h2>
    <p style="margin:0 0 20px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.lightText};text-align:center;text-transform:${ht};">${config.promoSubtitle}</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px;" align="center">
    <tr><td style="padding:12px 28px;border:1.5px dashed rgba(${hexToRgbStr(palette.darkBg)},0.25);border-radius:4px;background:rgba(${hexToRgbStr(palette.darkBg)},0.04);">
      <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:700;color:${palette.lightText};letter-spacing:5px;text-align:center;">${config.promoCode}</p>
    </td></tr></table>
    <p style="margin:0 0 24px;font-family:${hf};font-size:16px;font-weight:400;color:rgba(${hexToRgbStr(palette.lightText)},0.7);text-align:center;">Apply at checkout &middot; ${config.promoExpiry}</p>
    <table cellpadding="0" cellspacing="0" border="0" align="center">
    <tr><td style="background-color:${palette.primaryButtonBg};border-radius:2px;font-family:${hf};">
      <a href="${config.promoCtaUrl || site}" style="display:inline-block;padding:15px 40px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.primaryButtonText};text-decoration:none;text-transform:${ht};">${config.promoCta}</a>
    </td></tr></table>
  </td></tr></table>
</td></tr></table>` : ''}

${on('03') ? `
<!-- BLOCK 03: 3-PILLAR -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.darkBg};">
<tr><td align="center" style="padding:48px 24px;">
  <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkText};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.pillarsEyebrow}</p>
  <h2 style="margin:0 0 40px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.darkText};text-align:center;text-transform:${ht};">${config.pillarsHeadline}</h2>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
  <tr><td align="center">
    <div style="width:56px;height:56px;border-radius:50%;background:${palette.secondaryBg};color:${palette.secondaryText};font-size:29px;line-height:56px;text-align:center;margin:0 auto 16px;">${config.pillar1Icon}</div>
    <p style="margin:0 0 8px;font-family:${hf};font-size:22px;font-weight:900;color:${palette.darkText};text-align:center;text-transform:${ht};letter-spacing:1px;">${config.pillar1Label}</p>
    <p style="margin:0 auto;font-family:${hf};font-size:17px;font-weight:400;color:${palette.darkText};line-height:1.75;text-align:center;max-width:420px;">${config.pillar1Body}</p>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
  <tr><td align="center">
    <div style="width:56px;height:56px;border-radius:50%;background:${palette.accent};color:${palette.accentText};font-size:29px;line-height:56px;text-align:center;margin:0 auto 16px;">${config.pillar2Icon}</div>
    <p style="margin:0 0 8px;font-family:${hf};font-size:22px;font-weight:900;color:${palette.darkText};text-align:center;text-transform:${ht};letter-spacing:1px;">${config.pillar2Label}</p>
    <p style="margin:0 auto;font-family:${hf};font-size:17px;font-weight:400;color:${palette.darkText};line-height:1.75;text-align:center;max-width:420px;">${config.pillar2Body}</p>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td align="center">
    <div style="width:56px;height:56px;border-radius:50%;background:${palette.secondaryBg};color:${palette.secondaryText};font-size:29px;line-height:56px;text-align:center;margin:0 auto 16px;">${config.pillar3Icon}</div>
    <p style="margin:0 0 8px;font-family:${hf};font-size:22px;font-weight:900;color:${palette.darkText};text-align:center;text-transform:${ht};letter-spacing:1px;">${config.pillar3Label}</p>
    <p style="margin:0 auto;font-family:${hf};font-size:17px;font-weight:400;color:${palette.darkText};line-height:1.75;text-align:center;max-width:420px;">${config.pillar3Body}</p>
  </td></tr></table>
</td></tr></table>` : ''}

${on('04') ? `
<!-- BLOCK 04: STORY / NOSTALGIA -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
<tr><td align="center" style="padding:48px 24px;">
  <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.storyEyebrow}</p>
  <h2 style="margin:0 0 20px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.lightText};line-height:1.2;text-align:center;text-transform:${ht};">${config.storyHeadline}</h2>
  <p style="margin:0 auto 36px;font-family:${hf};font-size:19px;font-weight:400;color:${palette.lightText};line-height:1.8;text-align:center;max-width:500px;">${config.storyBody}</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;margin:0 auto 36px;background:${palette.secondaryBg};border-radius:6px;">
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 10px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.accent};letter-spacing:1px;text-align:center;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
    <p style="margin:0 0 14px;font-family:${hf};font-size:19px;font-weight:400;font-style:italic;color:${palette.secondaryText};line-height:1.7;text-align:center;">&#8220;${config.storyQuote}&#8221;</p>
    <p style="margin:0;font-family:${hf};font-size:12px;font-weight:700;color:${palette.secondaryText};text-transform:${ht};text-align:center;">${(config.storyQuoteAttribution || '').replace(/—/g, '&mdash;')} &middot; &#10003; Verified</p>
  </td></tr></table>
  <p style="margin:0 auto;font-family:${hf};font-size:19px;font-weight:400;color:${palette.lightText};line-height:1.8;text-align:center;max-width:500px;">${config.storyClosing}</p>
</td></tr></table>` : ''}

${on('05') ? `
<!-- BLOCK 05: PRODUCT FEATURE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.darkBg};">
  <tr><td style="padding:0;line-height:0;font-size:0;">
    <div style="width:100%;height:320px;background-image:url('${productImg}');background-size:cover;background-position:center center;background-repeat:no-repeat;" role="img" aria-label="${config.productName || brand.name}"></div>
  </td></tr>
  <tr><td align="center" style="padding:48px 24px;">
    <p style="margin:0 0 10px;text-align:center;">
      <span style="display:inline-block;background:rgba(${hexToRgbStr(palette.darkText)},0.15);border-radius:20px;padding:6px 18px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkText};letter-spacing:3px;text-transform:${ht};">${config.productBadge}</span>
    </p>
    <h2 style="margin:0 0 12px;font-family:${hf};font-size:33px;font-weight:${hw};color:${palette.darkText};line-height:1.15;text-transform:${ht};text-align:center;">${config.productName}</h2>
    <p style="margin:0 0 8px;font-family:${hf};font-size:15px;font-weight:700;color:${palette.accent};letter-spacing:1px;text-align:center;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
    <p style="margin:0 auto 12px;font-family:${hf};font-size:17px;font-weight:400;color:${palette.darkText};line-height:1.8;text-align:center;max-width:480px;">${config.productBody1}</p>
    <p style="margin:0 auto 28px;font-family:${hf};font-size:17px;font-weight:400;color:${palette.darkText};line-height:1.8;text-align:center;max-width:480px;">${config.productBody2}</p>
    <table cellpadding="0" cellspacing="0" border="0" align="center">
    <tr><td style="background-color:${palette.secondaryBg};border-radius:2px;font-family:${hf};">
      <a href="${config.productCtaUrl || site}" style="display:inline-block;padding:16px 44px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.secondaryText};text-decoration:none;text-transform:${ht};">${config.productCta}</a>
    </td></tr></table>
  </td></tr>
</table>` : ''}

${on('11') ? `
<!-- BLOCK 11: CALLOUT CARD -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
<tr><td align="center" style="padding:48px 24px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:500px;background-color:${palette.darkBg};border-radius:6px;">
  <tr><td align="center" style="padding:36px 28px;">
    ${config.calloutEyebrow ? `<p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkText};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.calloutEyebrow}</p>` : ''}
    <h2 style="margin:0 0 16px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.darkText};line-height:1.2;text-align:center;text-transform:${ht};">${config.calloutHeadline}</h2>
    <p style="margin:0 0 24px;font-family:${hf};font-size:17px;font-weight:400;color:${palette.darkText};line-height:1.7;text-align:center;">${config.calloutBody}</p>
    <table cellpadding="0" cellspacing="0" border="0" align="center">
    <tr><td style="background-color:${palette.secondaryBg};border-radius:2px;font-family:${hf};">
      <a href="${config.calloutCtaUrl || site}" style="display:inline-block;padding:15px 40px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.secondaryText};text-decoration:none;text-transform:${ht};">${config.calloutCta}</a>
    </td></tr></table>
  </td></tr></table>
</td></tr></table>` : ''}

${on('06') ? `
<!-- BLOCK 06: HOW-TO -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
<tr><td align="center" style="padding:48px 24px;">
  <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.howToEyebrow}</p>
  <h2 style="margin:0 0 8px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.lightText};text-align:center;text-transform:${ht};">${config.howToHeadline}</h2>
  <p style="margin:0 auto 36px;font-family:${hf};font-size:15px;font-weight:700;color:${palette.darkBg};text-transform:${ht};text-align:center;">${config.howToSubheadline}</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr><td align="center">
    <div style="width:56px;height:56px;border-radius:50%;background:${palette.darkBg};color:${palette.darkText};font-family:${hf};font-size:29px;font-weight:900;line-height:56px;text-align:center;margin:0 auto 14px;">1</div>
    <p style="margin:0 0 6px;font-family:${hf};font-size:16px;font-weight:900;color:${palette.lightText};text-align:center;text-transform:${ht};letter-spacing:1px;">${config.step1Label}</p>
    <p style="margin:0 auto;font-family:${hf};font-size:16px;font-weight:400;color:rgba(${hexToRgbStr(palette.lightText)},0.7);line-height:1.75;text-align:center;max-width:420px;">${config.step1Body}</p>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr><td align="center">
    <div style="width:56px;height:56px;border-radius:50%;background:${palette.accent};color:${palette.accentText};font-family:${hf};font-size:29px;font-weight:900;line-height:56px;text-align:center;margin:0 auto 14px;">2</div>
    <p style="margin:0 0 6px;font-family:${hf};font-size:16px;font-weight:900;color:${palette.lightText};text-align:center;text-transform:${ht};letter-spacing:1px;">${config.step2Label}</p>
    <p style="margin:0 auto;font-family:${hf};font-size:16px;font-weight:400;color:rgba(${hexToRgbStr(palette.lightText)},0.7);line-height:1.75;text-align:center;max-width:420px;">${config.step2Body}</p>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
  <tr><td align="center">
    <div style="width:56px;height:56px;border-radius:50%;background:${palette.secondaryBg};color:${palette.secondaryText};font-family:${hf};font-size:29px;font-weight:900;line-height:56px;text-align:center;margin:0 auto 14px;">3</div>
    <p style="margin:0 0 6px;font-family:${hf};font-size:16px;font-weight:900;color:${palette.lightText};text-align:center;text-transform:${ht};letter-spacing:1px;">${config.step3Label}</p>
    <p style="margin:0 auto;font-family:${hf};font-size:16px;font-weight:400;color:rgba(${hexToRgbStr(palette.lightText)},0.7);line-height:1.75;text-align:center;max-width:420px;">${config.step3Body}</p>
  </td></tr></table>
  ${config.howToNote ? `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;margin:0 auto 32px;background:rgba(${hexToRgbStr(palette.darkBg)},0.08);border-radius:6px;">
  <tr><td style="padding:16px 24px;">
    <p style="margin:0;font-family:${hf};font-size:16px;font-weight:700;color:${palette.lightText};text-align:center;">${config.howToNote}</p>
  </td></tr></table>` : ''}
  <table cellpadding="0" cellspacing="0" border="0" align="center">
  <tr><td style="background-color:${palette.primaryButtonBg};border-radius:2px;font-family:${hf};">
    <a href="${config.howToCtaUrl || site}" style="display:inline-block;padding:16px 44px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.primaryButtonText};text-decoration:none;text-transform:${ht};">${config.howToCta}</a>
  </td></tr></table>
</td></tr></table>` : ''}

${on('07') ? `
<!-- BLOCK 07: TESTIMONIALS -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.darkBg};">
<tr><td align="center" style="padding:48px 24px;">
  <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkText};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.testimonialsEyebrow}</p>
  <h2 style="margin:0 0 28px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.darkText};text-align:center;text-transform:${ht};">${config.testimonialsHeadline}</h2>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkText)},0.15);border:1px solid rgba(${hexToRgbStr(palette.darkText)},0.25);border-radius:6px;margin-bottom:12px;">
  <tr><td style="padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="44" valign="top" style="padding-right:14px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${avatarColors[0]};text-align:center;line-height:36px;font-family:${hf};font-size:16px;font-weight:700;color:${avatarTextColors[0]};">${(t0.author || 'A')[0].toUpperCase()}</div>
      </td>
      <td valign="top">
        <p style="margin:0 0 6px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.accent};">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
        <p style="margin:0 0 10px;font-family:${hf};font-size:17px;font-weight:400;font-style:italic;color:${palette.darkText};line-height:1.7;">&#8220;${t0.quote}&#8221;</p>
        <p style="margin:0;font-family:${hf};font-size:12px;font-weight:700;color:${palette.darkText};letter-spacing:1px;text-transform:${ht};">${t0.author} &middot; &#10003; Verified</p>
      </td>
    </tr></table>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkText)},0.15);border:1px solid rgba(${hexToRgbStr(palette.darkText)},0.25);border-radius:6px;margin-bottom:12px;">
  <tr><td style="padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="44" valign="top" style="padding-right:14px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${avatarColors[1]};text-align:center;line-height:36px;font-family:${hf};font-size:16px;font-weight:700;color:${avatarTextColors[1]};">${(t1.author || 'A')[0].toUpperCase()}</div>
      </td>
      <td valign="top">
        <p style="margin:0 0 6px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.accent};">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
        <p style="margin:0 0 10px;font-family:${hf};font-size:17px;font-weight:400;font-style:italic;color:${palette.darkText};line-height:1.7;">&#8220;${t1.quote}&#8221;</p>
        <p style="margin:0;font-family:${hf};font-size:12px;font-weight:700;color:${palette.darkText};letter-spacing:1px;text-transform:${ht};">${t1.author} &middot; &#10003; Verified</p>
      </td>
    </tr></table>
  </td></tr></table>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkText)},0.15);border:1px solid rgba(${hexToRgbStr(palette.darkText)},0.25);border-radius:6px;">
  <tr><td style="padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="44" valign="top" style="padding-right:14px;">
        <div style="width:36px;height:36px;border-radius:50%;background:${palette.darkText};text-align:center;line-height:36px;font-family:${hf};font-size:16px;font-weight:700;color:${palette.lightText};">${(t2.author || 'A')[0].toUpperCase()}</div>
      </td>
      <td valign="top">
        <p style="margin:0 0 6px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.accent};">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
        <p style="margin:0 0 10px;font-family:${hf};font-size:17px;font-weight:400;font-style:italic;color:${palette.darkText};line-height:1.7;">&#8220;${t2.quote}&#8221;</p>
        <p style="margin:0;font-family:${hf};font-size:12px;font-weight:700;color:${palette.darkText};letter-spacing:1px;text-transform:${ht};">${t2.author} &middot; &#10003; Verified</p>
      </td>
    </tr></table>
  </td></tr></table>
</td></tr></table>` : ''}

${(on('08') && allProducts.length > 0) ? `
<!-- BLOCK 08: YOU'LL ALSO LOVE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
<tr><td align="center" style="padding:48px 24px;">
  <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.youllAlsoLoveEyebrow}</p>
  <h2 style="margin:0 0 12px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.lightText};text-align:center;text-transform:${ht};">${config.youllAlsoLoveHeadline}</h2>
  ${config.youllAlsoLoveSubheadline ? `<p style="margin:0 auto 32px;font-family:${hf};font-size:16px;font-weight:400;color:rgba(${hexToRgbStr(palette.lightText)},0.7);line-height:1.7;text-align:center;max-width:480px;">${config.youllAlsoLoveSubheadline}</p>` : '<p style="margin:0 0 32px;"></p>'}
  ${allProducts.map((p: any) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);border-radius:6px;margin-bottom:12px;">
  <tr>
    <td width="140" style="padding:0;width:140px;min-width:140px;">
      <a href="${p.url || site}" style="display:block;">
        <div style="width:140px;height:140px;background-image:url('${p.imageUrl}');background-size:cover;background-position:center;border-radius:6px 0 0 6px;"></div>
      </a>
    </td>
    <td valign="middle" style="padding:16px 18px;">
      <p style="margin:0 0 6px;font-family:${hf};font-size:15px;font-weight:900;color:${palette.lightText};text-transform:${ht};">${p.name}</p>
      <p style="margin:0 0 14px;font-family:${hf};font-size:15px;font-weight:400;color:rgba(${hexToRgbStr(palette.lightText)},0.7);line-height:1.6;">${p.description}</p>
      <a href="${p.url || site}" style="font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};text-decoration:none;letter-spacing:2px;text-transform:${ht};">Shop Now &#8594;</a>
    </td>
  </tr></table>`).join('')}
</td></tr></table>` : ''}

${on('12') ? `
<!-- BLOCK 12: FAQ -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
<tr><td align="center" style="padding:48px 24px;">
  <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.faqEyebrow}</p>
  <h2 style="margin:0 0 32px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.lightText};text-align:center;text-transform:${ht};">${config.faqHeadline}</h2>
  ${faqItems.map((item: any) => `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;margin:0 auto;border-top:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);">
  <tr><td style="padding:20px 0;">
    <p style="margin:0 0 8px;font-family:${hf};font-size:16px;font-weight:700;color:${palette.lightText};text-align:left;text-transform:${ht};letter-spacing:0.5px;">${item.question}</p>
    <p style="margin:0;font-family:${hf};font-size:16px;font-weight:400;color:rgba(${hexToRgbStr(palette.lightText)},0.7);line-height:1.7;text-align:left;">${item.answer}</p>
  </td></tr></table>`).join('')}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;margin:0 auto;border-top:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);border-bottom:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);height:1px;"><tr><td></td></tr></table>
  ${config.faqCta ? `
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:32px;">
  <tr><td style="background-color:${palette.primaryButtonBg};border-radius:2px;font-family:${hf};">
    <a href="${config.faqCtaUrl || site}" style="display:inline-block;padding:15px 40px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.primaryButtonText};text-decoration:none;text-transform:${ht};">${config.faqCta}</a>
  </td></tr></table>` : ''}
</td></tr></table>` : ''}

${on('09') ? `
<!-- BLOCK 09: INSTAGRAM GRID -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.lightBg};">
<tr><td align="center" style="padding:48px 24px 0;">
  <p style="margin:0 0 8px;font-family:${hf};font-size:14px;font-weight:700;color:${palette.darkBg};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.igEyebrow}</p>
  <h2 style="margin:0 0 6px;font-family:${hf};font-size:30px;font-weight:${hw};color:${palette.lightText};text-align:center;text-transform:${ht};">${config.igHeadline}</h2>
  <p style="margin:0 0 28px;font-family:${hf};font-size:15px;font-weight:700;color:${palette.lightText};text-align:center;">${config.igHandle}</p>
</td></tr>
<tr><td align="center" style="padding:0 24px 32px;">
  <table cellpadding="0" cellspacing="0" border="0" align="center">
  <tr><td style="background-color:${palette.primaryButtonBg};border-radius:2px;font-family:${hf};">
    <a href="${config.igUrl || '#'}" style="display:inline-block;padding:16px 44px;font-family:${hf};font-size:17px;font-weight:700;color:${palette.primaryButtonText};text-decoration:none;text-transform:${ht};">${config.igCta}</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:0 24px 3px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="33%" style="padding:0 2px 0 0;"><a href="${config.igUrl || '#'}" style="display:block;"><div style="height:200px;background-image:url('${igImg(0)}');background-size:cover;background-position:center;"></div></a></td>
    <td width="33%" style="padding:0 2px;"><a href="${config.igUrl || '#'}" style="display:block;"><div style="height:200px;background-image:url('${igImg(1)}');background-size:cover;background-position:center;"></div></a></td>
    <td width="33%" style="padding:0 0 0 2px;"><a href="${config.igUrl || '#'}" style="display:block;"><div style="height:200px;background-image:url('${igImg(2)}');background-size:cover;background-position:center;"></div></a></td>
  </tr></table>
</td></tr>
<tr><td style="padding:3px 24px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="33%" style="padding:0 2px 0 0;"><a href="${config.igUrl || '#'}" style="display:block;"><div style="height:200px;background-image:url('${igImg(3)}');background-size:cover;background-position:center;"></div></a></td>
    <td width="33%" style="padding:0 2px;"><a href="${config.igUrl || '#'}" style="display:block;"><div style="height:200px;background-image:url('${igImg(4)}');background-size:cover;background-position:center;"></div></a></td>
    <td width="33%" style="padding:0 0 0 2px;"><a href="${config.igUrl || '#'}" style="display:block;"><div style="height:200px;background-image:url('${igImg(5)}');background-size:cover;background-position:center;"></div></a></td>
  </tr></table>
</td></tr>
<tr><td style="padding:0 24px 48px;">&nbsp;</td></tr>
</table>` : ''}

<!-- FOOTER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${palette.darkBg};">
<tr><td align="center" style="padding:44px 24px 20px;">
  <a href="${site}" style="display:block;margin-bottom:18px;text-decoration:none;">
    ${footerLogoHtml}
  </a>
  ${config.footerTagline ? `<p style="margin:0 0 22px;font-family:${hf};font-size:13px;font-weight:700;color:${palette.darkText};letter-spacing:2px;text-transform:${ht};text-align:center;">${config.footerTagline}</p>` : ''}
  ${config.instagramUrl ? `<p style="margin:0 0 20px;text-align:center;"><a href="${config.instagramUrl}" style="font-family:${hf};font-size:12px;font-weight:700;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">Instagram</a></p>` : ''}
  <p style="margin:0;text-align:center;">
    <a href="${site}/collections/all" style="font-family:${hf};font-size:13px;font-weight:600;color:${palette.darkText};text-decoration:none;padding:0 8px;">Shop</a>
    <a href="${site}/pages/about" style="font-family:${hf};font-size:13px;font-weight:600;color:${palette.darkText};text-decoration:none;padding:0 8px;">About</a>
    <a href="${site}/pages/faq" style="font-family:${hf};font-size:13px;font-weight:600;color:${palette.darkText};text-decoration:none;padding:0 8px;">FAQs</a>
    <a href="${site}/pages/contact" style="font-family:${hf};font-size:13px;font-weight:600;color:${palette.darkText};text-decoration:none;padding:0 8px;">Contact</a>
  </p>
</td></tr>
<tr><td style="padding:20px 24px 0;background-color:${palette.darkBg};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:1px;background:rgba(${hexToRgbStr(palette.darkText)},0.15);font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:20px 24px;background-color:${palette.darkBg};">
  <p style="margin:0;text-align:center;">
    <a href="${config.privacyPolicyUrl || `${site}/policies/privacy-policy`}" style="font-family:${hf};font-size:12px;font-weight:600;color:${palette.darkText};text-decoration:none;padding:0 6px;">Privacy Policy</a>
    <a href="${config.refundPolicyUrl || `${site}/policies/refund-policy`}" style="font-family:${hf};font-size:12px;font-weight:600;color:${palette.darkText};text-decoration:none;padding:0 6px;">Refund Policy</a>
    <a href="${config.termsOfServiceUrl || `${site}/policies/terms-of-service`}" style="font-family:${hf};font-size:12px;font-weight:600;color:${palette.darkText};text-decoration:none;padding:0 6px;">Terms of Service</a>
  </p>
</td></tr>
<tr><td align="center" style="padding:0 24px 16px;background-color:${palette.darkBg};">
  <p style="margin:0;font-family:${hf};font-size:12px;font-weight:400;color:${palette.darkText};text-align:center;">&#169; ${year} ${brand.name}</p>
</td></tr>
<tr><td style="padding:8px;background-color:${palette.darkBg};font-size:1px;line-height:1px;">&nbsp;</td></tr>
</table>

</body>
</html>`
}
