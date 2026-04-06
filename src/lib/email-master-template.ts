// Master email template — 20-block Klaviyo email built from the Afterdream reference HTML.
// The raw HTML is embedded verbatim, then brand colors, fonts, URLs, and copy are
// swapped in via String.replace() so layout/spacing/styles stay pixel-identical.

export interface EmailColors {
  primaryBg: string
  primaryText: string
  altPrimaryBg: string
  altPrimaryText: string
  accentColor: string
  neutralBg: string
  neutralText: string
  buttonBg: string
  buttonText: string
  altButtonBg: string
  altButtonText: string
  headlineColor: string
}

export interface MasterEmailConfig {
  emailColors?: EmailColors | null
  announcementText: string
  heroHeadline: string
  heroBody: string
  heroCta: string
  heroCtaUrl: string
  heroImageUrl: string
  products: Array<{ name: string; price: string; imageUrl: string; url: string }>
  ctaBannerHeadline: string
  ctaBannerBody: string
  ctaBannerCta: string
  // How It Works (3 steps)
  step1Title: string
  step1Body: string
  step2Title: string
  step2Body: string
  step3Title: string
  step3Body: string
  // Experience
  experienceHeadline: string
  experienceBody: string
  experienceQuote: string
  experienceCta: string
  // Origin / Founder
  originHeadline: string
  originBody: string
  // Featured Bundle
  bundleHeadline: string
  bundlePrice: string
  bundleBody: string
  bundleCta: string
  // Single Product Feature
  featuredProductLabel: string
  featuredProductName: string
  featuredProductBody: string
  featuredProductCta: string
  // Referral
  referralAmount: string
  referralBody: string
  testimonials: Array<{ quote: string; author: string }>
  reviewCount: string
  socialProofQuote: string
  subscribeHeadline: string
  subscribePerks: string[]
  subscribeCta: string
  promoPercent: string
  promoCode: string
  blogPosts: Array<{ category: string; title: string; excerpt: string; url: string }>
  footerTagline: string
  instagramUrl: string
}

export const DEFAULT_MASTER_CONFIG: MasterEmailConfig = {
  emailColors: null,
  announcementText: 'Free Shipping On Orders Over $50',
  heroHeadline: 'Your Brand Headline Here',
  heroBody: 'A short, compelling description of what makes your brand special.',
  heroCta: 'Shop Now',
  heroCtaUrl: '',
  heroImageUrl: '',
  products: [],
  ctaBannerHeadline: 'Free Shipping on Orders Over $50',
  ctaBannerBody: 'Order today and experience the difference.',
  ctaBannerCta: 'Order Now',
  step1Title: 'Browse',
  step1Body: 'Explore our collection and find what fits.',
  step2Title: 'Order',
  step2Body: 'Checkout in seconds with free shipping.',
  step3Title: 'Enjoy',
  step3Body: 'Experience the difference, delivered to you.',
  experienceHeadline: 'How It Makes You Feel',
  experienceBody: 'Built for those who demand more. Every detail is intentional \u2014 designed to fit seamlessly into your life and elevate the moments that matter.',
  experienceQuote: 'It\u2019s not a product \u2014 it\u2019s a ritual.',
  experienceCta: 'Shop Now',
  originHeadline: 'Crafted with Intention',
  originBody: 'Built by people who care about every detail. Every product reflects our commitment to quality and craft.',
  bundleHeadline: 'Try All Three',
  bundlePrice: '',
  bundleBody: 'One of each. The perfect introduction.',
  bundleCta: 'Shop Bundle',
  featuredProductLabel: 'Featured',
  featuredProductName: '',
  featuredProductBody: 'Our most popular choice. See why customers keep coming back for more.',
  featuredProductCta: 'Shop Now',
  referralAmount: '$10',
  referralBody: 'Share with a friend. They get $10 off their first order, and you get $10 when they buy.',
  testimonials: [
    { quote: 'Finally, a product that actually does what it promises. Genuinely impressed.', author: 'Sasha R.' },
    { quote: 'The quality is incredible and the experience is even better. Highly recommend.', author: 'Jonas L.' },
    { quote: 'Exceeded all my expectations. This is now part of my daily routine.', author: 'Leila A.' },
  ],
  reviewCount: '500+',
  socialProofQuote: 'The best in its category I\u2019ve ever tried.',
  subscribeHeadline: 'Subscribe & Save + Free Shipping',
  subscribePerks: [
    'Save 15% on every subscription',
    'Free shipping on all orders',
    'Free gift with your first order',
    'Pause, swap, or cancel anytime',
  ],
  subscribeCta: 'Start Your Ritual',
  promoPercent: '15%',
  promoCode: 'WELCOME15',
  blogPosts: [
    { category: 'Journal', title: 'Why Our Customers Keep Coming Back', excerpt: 'The story behind our most loyal fans and what keeps them returning.', url: '' },
    { category: 'Journal', title: 'How to Get the Most Out of Our Products', excerpt: 'Tips and tricks from our team to maximize your experience.', url: '' },
    { category: 'Journal', title: 'The Science Behind What We Do', excerpt: 'A deep dive into what makes us different.', url: '' },
  ],
  footerTagline: 'Crafted with care \u2014 made for you.',
  instagramUrl: '',
}

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
  accent: string
  accentText: string
  primaryButtonBg: string
  primaryButtonText: string
  accentButtonBg: string
  accentButtonText: string
}

function buildEmailPalette(brand: BrandData, emailColors?: EmailColors | null): EmailPalette {
  if (emailColors) {
    const darkBg = emailColors.primaryBg
    const darkText = emailColors.primaryText
    const accent = emailColors.accentColor
    const accentText = isDark(accent) ? '#ffffff' : '#000000'
    const altDarkBg = emailColors.altPrimaryBg || darkenHex(darkBg, 20)
    const altDarkText = emailColors.altPrimaryText || darkText
    return {
      darkBg,
      darkText,
      altDarkBg,
      altDarkText,
      lightBg: emailColors.neutralBg,
      lightText: emailColors.neutralText,
      accent,
      accentText,
      primaryButtonBg: emailColors.buttonBg,
      primaryButtonText: emailColors.buttonText,
      accentButtonBg: emailColors.altButtonBg,
      accentButtonText: emailColors.altButtonText,
    }
  }

  // Auto-derive from brand colors
  const primary = brand.primary_color || '#154734'
  const accent = brand.accent_color || '#BFA46D'
  const secondary = brand.secondary_color || '#E9E3D8'

  // Text on primary background — threshold 0.5 so any dark-ish primary gets white text
  const primaryText = getLuminance(primary) < 0.5 ? '#ffffff' : '#000000'
  const accentText = getLuminance(accent) > 0.5 ? '#000000' : '#ffffff'

  // Light background — ALWAYS near-white, never dark. Only use brand.secondary if it's actually light.
  const lightBg = getLuminance(secondary) > 0.7 ? secondary : '#f8f7f4'

  // Dark variant is always darker than primary → always needs white text
  const darkVariant = darkenHex(primary, 20)

  return {
    darkBg: primary,
    darkText: primaryText,
    altDarkBg: darkVariant,
    altDarkText: '#ffffff',
    lightBg,
    lightText: primary,
    accent,
    accentText,
    primaryButtonBg: primary,
    primaryButtonText: primaryText,
    accentButtonBg: accent,
    accentButtonText: accentText,
  }
}

// ─── Per-block color application ───
type BlockKind = 'dark' | 'altDark' | 'light'

// Map block numbers in the AFTERDREAM_HTML template to their section type
const BLOCK_KINDS: Record<number, BlockKind> = {
  1: 'dark',     // simple header
  2: 'dark',     // hero banner — always dark bg for visual impact
  3: 'light',    // product grid
  4: 'dark',     // CTA
  5: 'light',    // how it works
  6: 'light',    // ingredients
  7: 'light',    // experience
  8: 'altDark',  // testimonials
  9: 'dark',     // social proof
  10: 'dark',    // founder / origin
  11: 'altDark', // subscribe & save
  12: 'dark',    // bundle / flavor flight
  13: 'altDark', // single product feature
  14: 'light',   // promo code
  15: 'light',   // referral
  16: 'dark',    // FAQ
  17: 'light',   // blog
  19: 'light',   // lifestyle image
  20: 'dark',    // footer
}

function applyBlockColors(blockHtml: string, kind: BlockKind, p: EmailPalette, darkLogo?: string, lightLogo?: string): string {
  const bgColor = kind === 'dark' ? p.darkBg : kind === 'altDark' ? p.altDarkBg : p.lightBg
  const textColor = kind === 'dark' ? p.darkText : kind === 'altDark' ? p.altDarkText : p.lightText
  const isDarkBlock = kind === 'dark' || kind === 'altDark'
  let h = blockHtml

  // Per-block logo: dark blocks use white logo, light blocks use color logo
  const logoToUse = isDarkBlock ? (darkLogo || lightLogo || '') : (lightLogo || darkLogo || '')
  if (logoToUse) {
    h = h.split('{{LOGO_URL}}').join(logoToUse)
  }

  // 1. Replace background-color values.
  // Every original "section bg" color becomes THIS block's assigned bg.
  h = h.split('background-color:#154734').join(`background-color:${bgColor}`)
  h = h.split('background-color:#76233F').join(`background-color:${bgColor}`)
  h = h.split('background-color:#E9E3D8').join(`background-color:${bgColor}`)

  // Button color logic: contrast-safe per block kind.
  // - In LIGHT blocks: all buttons use brand primary (visible on light bg).
  // - In DARK blocks: all buttons use accent/gold (visible on dark bg).
  const btnBg = isDarkBlock ? p.accentButtonBg : p.primaryButtonBg
  const btnText = isDarkBlock ? p.accentButtonText : p.primaryButtonText

  // PRE-STEP: Fix button text colors FIRST (before generic color replacements below).
  // Button pattern in template: <td style="background:#XXX;border-radius:2px;"><a ... style="...color:#YYY...">
  // Regex captures the specific anchor inside a button td and swaps its color to btnText.
  h = h.replace(
    /(<td style="background:#154734;border-radius:2px;"><a[^>]*?style="[^"]*?)color:#[0-9A-Fa-f]{6}/g,
    `$1color:${btnText}`
  )
  h = h.replace(
    /(<td style="background:#BFA46D;border-radius:2px;"><a[^>]*?style="[^"]*?)color:#[0-9A-Fa-f]{6}/g,
    `$1color:${btnText}`
  )
  h = h.replace(
    /(<td style="background:#76233F;border-radius:2px;"><a[^>]*?style="[^"]*?)color:#[0-9A-Fa-f]{6}/g,
    `$1color:${btnText}`
  )

  // Now replace the button backgrounds themselves.
  h = h.split('background:#154734').join(`background:${btnBg}`)
  h = h.split('background:#76233F').join(`background:${btnBg}`)
  h = h.split('background:#BFA46D').join(`background:${btnBg}`)

  // 2. Replace text colors based on this block's context.
  // (Button text colors are already handled above, so these only hit headings/body.)
  if (isDarkBlock) {
    // On dark bg: all body/heading text becomes textColor (white/black for contrast)
    h = h.split('color:#E9E3D8').join(`color:${textColor}`)
    h = h.split('color:#154734').join(`color:${textColor}`)
  } else {
    // Light block: primary dark text → lightText
    h = h.split('color:#154734').join(`color:${textColor}`)
    // Any stray #E9E3D8 text in a light block (rare) — safest to use textColor
    h = h.split('color:#E9E3D8').join(`color:${textColor}`)
  }

  // Catch hardcoded black headings in dark blocks (some blocks hardcode color:#000000)
  if (isDarkBlock) {
    h = h.replace(/(<h[1-6][^>]*style="[^"]*?)color:#000000/g, `$1color:${textColor}`)
  }
  // Accent text (labels, stars) stays accent
  h = h.split('color:#BFA46D').join(`color:${p.accent}`)
  // Accent-dark link (block 14 promo eyebrow) — remap with accent
  h = h.split('color:#76233F').join(`color:${p.accent}`)

  // 3. Accent color bare (circles, dividers, border:1px solid #BFA46D)
  h = h.split('#BFA46D').join(p.accent)
  // Any remaining bare #154734 (box border etc.) → darkBg
  h = h.split('#154734').join(p.darkBg)
  h = h.split('#76233F').join(p.altDarkBg)
  h = h.split('#E9E3D8').join(bgColor)

  // 4. rgba() — preserve opacity, swap rgb triplet.
  // rgba(21,71,52,X) was primary-tinted: borders/tints on light bg → lightText in light blocks, darkText in dark
  const primaryRgba = isDarkBlock ? hexToRgbStr(p.darkText) : hexToRgbStr(p.lightText)
  h = h.split('rgba(21,71,52,').join(`rgba(${primaryRgba},`)
  // rgba(191,164,109,X) was accent-tinted: dividers → keep as accent tint
  h = h.split('rgba(191,164,109,').join(`rgba(${hexToRgbStr(p.accent)},`)
  // rgba(233,227,216,X) was cream-tinted: borders/bg-tints on dark bg → darkText in dark blocks, lightBg in light
  const creamRgba = isDarkBlock ? hexToRgbStr(p.darkText) : hexToRgbStr(p.lightText)
  h = h.split('rgba(233,227,216,').join(`rgba(${creamRgba},`)

  // 5. In dark blocks, any rgba(0,0,0,X) becomes invisible on red/dark primary.
  // Flip to white with the same opacity so dividers, muted text, and borders stay visible.
  if (isDarkBlock) {
    h = h.replace(/rgba\(0,0,0,(0\.\d+)\)/g, 'rgba(255,255,255,$1)')
  }

  return h
}

function applyPerBlockColors(html: string, palette: EmailPalette, darkLogo?: string, lightLogo?: string): string {
  // Split template into segments at each "<!--[BLOCK N" marker.
  // First segment is the head/body opener (no block), subsequent segments each start with a block marker.
  const segments = html.split(/(?=<!--\[BLOCK )/)
  return segments.map(seg => {
    const m = seg.match(/^<!--\[BLOCK (\d+)/)
    if (!m) return seg
    const blockNum = parseInt(m[1], 10)
    const kind = BLOCK_KINDS[blockNum] || 'light'
    return applyBlockColors(seg, kind, palette, darkLogo, lightLogo)
  }).join('')
}

// Derive the default emailColors object from a brand — used to seed the UI picker
export function deriveEmailColorsFromBrand(brand: BrandData): EmailColors {
  const primary = brand.primary_color || '#154734'
  const accent = brand.accent_color || '#BFA46D'
  const secondary = brand.secondary_color || '#E9E3D8'
  const primaryText = isDark(primary) ? '#ffffff' : '#000000'
  const neutralBg = getLuminance(secondary) > 0.7 ? secondary : '#f8f7f4'
  return {
    primaryBg: primary,
    primaryText,
    altPrimaryBg: darkenHex(primary, 20),
    altPrimaryText: '#ffffff',
    accentColor: accent,
    neutralBg,
    neutralText: isDark(primary) ? primary : '#111111',
    buttonBg: primary,
    buttonText: primaryText,
    altButtonBg: accent,
    altButtonText: isDark(accent) ? '#ffffff' : '#000000',
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
  font_heading?: { family?: string; weight?: string | number; transform?: string } | null
  font_body?: { family?: string; weight?: string | number } | null
  font_primary?: string | null
  products?: any[] | null
}

// Replace all occurrences of a string (case-sensitive, literal match)
function replaceAll(str: string, from: string, to: string): string {
  return str.split(from).join(to)
}

// Raw Afterdream HTML — verbatim from afterdream-klaviyo-blocks.html
const AFTERDREAM_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#E9E3D8;">

<!--[BLOCK 1: SIMPLE HEADER]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#154734;"><tr><td align="center" style="padding:32px 20px;">
<a href="https://drinkafterdream.com"><img src="{{LOGO_URL}}" alt="{{BRAND_NAME}}" width="180" style="display:block;width:180px;"></a>
</td></tr></table>

<!--[BLOCK 2: HERO BANNER]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:11px 20px;background-color:#BFA46D;"><p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;color:#154734;letter-spacing:2px;text-transform:uppercase;font-weight:700;text-align:center;">{{ANNOUNCEMENT_TEXT}}</p></td></tr>
<tr><td style="padding:0;"><img src="{{HERO_IMAGE_URL}}" alt="" width="600" style="display:block;width:100%;"></td></tr>
<tr><td align="center" style="padding:40px 44px 0;background-color:#E9E3D8;"><h1 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:40px;font-weight:400;color:#154734;line-height:1.3;text-align:center;">{{HERO_HEADLINE}}</h1></td></tr>
<tr><td align="center" style="padding:22px 0;background-color:#E9E3D8;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:24px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:24px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td align="center" style="padding:0 44px;background-color:#E9E3D8;"><p style="margin:0;font-family:Georgia,serif;font-size:20px;color:rgba(21,71,52,0.65);line-height:1.75;text-align:center;">{{HERO_BODY}}</p></td></tr>
<tr><td align="center" style="padding:36px 40px 52px;background-color:#E9E3D8;"><table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background-color:#154734;border-radius:2px;"><a href="{{HERO_CTA_URL}}" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">{{HERO_CTA}}</a></td></tr></table></td></tr>
</table></td></tr></table>

<!--[BLOCK 3: PRODUCT GRID]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center" style="padding:52px 24px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">The Collection</p></td></tr>
<tr><td align="center"><h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#154734;text-align:center;">Shop {{BRAND_NAME}}</h2></td></tr>
<tr><td align="center" style="padding:22px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td style="padding:0 0 16px 0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.04);border:1px solid rgba(21,71,52,0.08);border-radius:6px;"><tr>
<td width="180" valign="top" style="padding:0;"><div style="width:180px;height:180px;border-radius:6px 0 0 6px;overflow:hidden;background:#f5f0e8;"><a href="{{PRODUCT_1_URL}}"><img src="{{PRODUCT_1_IMG}}" alt="{{PRODUCT_1_NAME}}" width="180" style="display:block;width:180px;height:180px;object-fit:cover;"></a></div></td>
<td valign="middle" style="padding:20px 24px;">
<p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 4px;font-family:Fraunces,Georgia,serif;font-size:24px;color:#154734;">{{PRODUCT_1_NAME}}</p>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;color:rgba(21,71,52,0.45);">{{PRODUCT_1_PRICE}}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#154734;border-radius:2px;"><a href="{{PRODUCT_1_URL}}" style="display:inline-block;padding:14px 28px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">Add to Cart</a></td></tr></table>
</td></tr></table></td></tr>
<tr><td style="padding:0 0 16px 0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.04);border:1px solid rgba(21,71,52,0.08);border-radius:6px;"><tr>
<td width="180" valign="top" style="padding:0;"><div style="width:180px;height:180px;border-radius:6px 0 0 6px;overflow:hidden;background:#f5f0e8;"><a href="{{PRODUCT_2_URL}}"><img src="{{PRODUCT_2_IMG}}" alt="{{PRODUCT_2_NAME}}" width="180" style="display:block;width:180px;height:180px;object-fit:cover;"></a></div></td>
<td valign="middle" style="padding:20px 24px;">
<p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 4px;font-family:Fraunces,Georgia,serif;font-size:24px;color:#154734;">{{PRODUCT_2_NAME}}</p>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;color:rgba(21,71,52,0.45);">{{PRODUCT_2_PRICE}}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#154734;border-radius:2px;"><a href="{{PRODUCT_2_URL}}" style="display:inline-block;padding:14px 28px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">Add to Cart</a></td></tr></table>
</td></tr></table></td></tr>
<tr><td style="padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.04);border:1px solid rgba(21,71,52,0.08);border-radius:6px;"><tr>
<td width="180" valign="top" style="padding:0;"><div style="width:180px;height:180px;border-radius:6px 0 0 6px;overflow:hidden;background:#f5f0e8;"><a href="{{PRODUCT_3_URL}}"><img src="{{PRODUCT_3_IMG}}" alt="{{PRODUCT_3_NAME}}" width="180" style="display:block;width:180px;height:180px;object-fit:cover;"></a></div></td>
<td valign="middle" style="padding:20px 24px;">
<p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 4px;font-family:Fraunces,Georgia,serif;font-size:24px;color:#154734;">{{PRODUCT_3_NAME}}</p>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;color:rgba(21,71,52,0.45);">{{PRODUCT_3_PRICE}}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#154734;border-radius:2px;"><a href="{{PRODUCT_3_URL}}" style="display:inline-block;padding:14px 28px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">Add to Cart</a></td></tr></table>
</td></tr></table></td></tr>
</table></td></tr></table>

<!--[BLOCK 4: CTA]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#154734;"><tr><td align="center" style="padding:60px 40px;">
<table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;"><tr><td align="center">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">Limited Time</p>
<h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#E9E3D8;line-height:1.3;text-align:center;">{{CTA_HEADLINE}}</h2>
<table cellpadding="0" cellspacing="0" border="0" style="margin:22px auto;"><tr><td style="width:24px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:24px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table>
<p style="margin:0 0 28px;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.55);line-height:1.7;text-align:center;">{{CTA_BODY}}</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#BFA46D;border-radius:2px;"><a href="https://drinkafterdream.com/collections/our-products" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#154734;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">{{CTA_BUTTON}}</a></td></tr></table>
</td></tr></table></td></tr></table>

<!--[BLOCK 5: HOW IT WORKS]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center" style="padding:56px 34px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">Simple As 1-2-3</p></td></tr>
<tr><td align="center"><h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#154734;text-align:center;">How It Works</h2></td></tr>
<tr><td align="center" style="padding:22px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="33%" align="center" valign="top" style="padding:0 10px;">
<div style="width:52px;height:52px;border-radius:50%;background:#154734;color:#BFA46D;font-family:Fraunces,Georgia,serif;font-size:24px;line-height:52px;text-align:center;margin:0 auto 16px;">1</div>
<p style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;font-weight:500;text-align:center;">{{STEP_1_TITLE}}</p>
<p style="margin:0;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.5);line-height:1.6;text-align:center;">{{STEP_1_BODY}}</p>
</td>
<td width="33%" align="center" valign="top" style="padding:0 10px;">
<div style="width:52px;height:52px;border-radius:50%;background:#154734;color:#BFA46D;font-family:Fraunces,Georgia,serif;font-size:24px;line-height:52px;text-align:center;margin:0 auto 16px;">2</div>
<p style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;font-weight:500;text-align:center;">{{STEP_2_TITLE}}</p>
<p style="margin:0;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.5);line-height:1.6;text-align:center;">{{STEP_2_BODY}}</p>
</td>
<td width="33%" align="center" valign="top" style="padding:0 10px;">
<div style="width:52px;height:52px;border-radius:50%;background:#154734;color:#BFA46D;font-family:Fraunces,Georgia,serif;font-size:24px;line-height:52px;text-align:center;margin:0 auto 16px;">3</div>
<p style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;font-weight:500;text-align:center;">{{STEP_3_TITLE}}</p>
<p style="margin:0;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.5);line-height:1.6;text-align:center;">{{STEP_3_BODY}}</p>
</td>
</tr></table></td></tr>
</table></td></tr></table>

<!--[BLOCK 6: INGREDIENTS]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center" style="padding:56px 28px;">
<table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">What's Inside</p></td></tr>
<tr><td align="center"><h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#154734;text-align:center;">Why {{BRAND_NAME}}</h2></td></tr>
<tr><td align="center" style="padding:22px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" valign="top" style="padding:0 6px 12px 0;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.05);border:1px solid rgba(21,71,52,0.08);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:#BFA46D;margin:0 auto 12px;"></div><p style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;font-weight:500;text-align:center;">Premium Quality</p><p style="margin:0;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.5);line-height:1.6;text-align:center;">Made with the best materials and craftsmanship.</p></td></tr></table></td>
<td width="50%" valign="top" style="padding:0 0 12px 6px;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.05);border:1px solid rgba(21,71,52,0.08);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:#BFA46D;margin:0 auto 12px;"></div><p style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;font-weight:500;text-align:center;">Fast Shipping</p><p style="margin:0;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.5);line-height:1.6;text-align:center;">Free on orders over $50, delivered quickly.</p></td></tr></table></td>
</tr><tr>
<td width="50%" valign="top" style="padding:0 6px 0 0;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.05);border:1px solid rgba(21,71,52,0.08);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:#BFA46D;margin:0 auto 12px;"></div><p style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;font-weight:500;text-align:center;">Guaranteed</p><p style="margin:0;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.5);line-height:1.6;text-align:center;">30-day money-back guarantee on every order.</p></td></tr></table></td>
<td width="50%" valign="top" style="padding:0 0 0 6px;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.05);border:1px solid rgba(21,71,52,0.08);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:#BFA46D;margin:0 auto 12px;"></div><p style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;font-weight:500;text-align:center;">Loved by Many</p><p style="margin:0;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.5);line-height:1.6;text-align:center;">Thousands of five-star reviews and counting.</p></td></tr></table></td>
</tr></table></td></tr>
</table></td></tr></table>

<!--[BLOCK 7: EXPERIENCE]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;">
<tr><td align="center" style="padding:0;"><img src="{{LIFESTYLE_IMG_1}}" alt="" width="600" style="display:block;width:100%;max-width:600px;"></td></tr>
<tr><td align="center" style="padding:40px 44px 56px;">
<p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">The Experience</p>
<h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#154734;line-height:1.3;text-align:center;">{{EXPERIENCE_HEADLINE}}</h2>
<table cellpadding="0" cellspacing="0" border="0" style="margin:22px auto;"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;color:rgba(21,71,52,0.6);line-height:1.75;text-align:center;">{{EXPERIENCE_BODY}}</p>
<p style="margin:0 0 28px;font-family:Georgia,serif;font-size:22px;font-style:italic;color:rgba(21,71,52,0.7);text-align:center;">{{EXPERIENCE_QUOTE}}</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#154734;border-radius:2px;"><a href="https://drinkafterdream.com/collections/our-products" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">{{EXPERIENCE_CTA}}</a></td></tr></table>
</td></tr></table>

<!--[BLOCK 8: TESTIMONIALS]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#76233F;"><tr><td align="center" style="padding:56px 34px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">What They're Saying</p></td></tr>
<tr><td align="center"><h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#E9E3D8;text-align:center;">Real Experiences</h2></td></tr>
<tr><td align="center" style="padding:22px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td style="padding:22px 24px;background:rgba(233,227,216,0.08);border:1px solid rgba(233,227,216,0.1);border-radius:6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top"><p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p><p style="margin:0 0 8px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#E9E3D8;line-height:1.6;">"{{TESTIMONIAL_1_QUOTE}}"</p><p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;color:rgba(233,227,216,0.4);letter-spacing:1px;">{{TESTIMONIAL_1_AUTHOR}}</p></td></tr></table></td></tr>
<tr><td style="height:14px;"></td></tr>
<tr><td style="padding:22px 24px;background:rgba(233,227,216,0.08);border:1px solid rgba(233,227,216,0.1);border-radius:6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top"><p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p><p style="margin:0 0 8px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#E9E3D8;line-height:1.6;">"{{TESTIMONIAL_2_QUOTE}}"</p><p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;color:rgba(233,227,216,0.4);letter-spacing:1px;">{{TESTIMONIAL_2_AUTHOR}}</p></td></tr></table></td></tr>
<tr><td style="height:14px;"></td></tr>
<tr><td style="padding:22px 24px;background:rgba(233,227,216,0.08);border:1px solid rgba(233,227,216,0.1);border-radius:6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top"><p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p><p style="margin:0 0 8px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:#E9E3D8;line-height:1.6;">"{{TESTIMONIAL_3_QUOTE}}"</p><p style="margin:0;font-family:system-ui,sans-serif;font-size:12px;color:rgba(233,227,216,0.4);letter-spacing:1px;">{{TESTIMONIAL_3_AUTHOR}}</p></td></tr></table></td></tr>
</table></td></tr></table>

<!--[BLOCK 9: SOCIAL PROOF]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#154734;"><tr><td align="center" style="padding:44px 34px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;"><tr><td align="center">
<p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;text-align:center;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<h2 style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:48px;font-weight:400;color:#E9E3D8;text-align:center;">{{REVIEW_COUNT}}</h2>
<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.55);text-align:center;">Five-Star Reviews</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin:18px auto;"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table>
<p style="margin:0;font-family:Georgia,serif;font-size:20px;font-style:italic;color:rgba(233,227,216,0.4);text-align:center;">"{{SOCIAL_PROOF_QUOTE}}"</p>
</td></tr></table></td></tr></table>

<!--[BLOCK 10: FOUNDER / ORIGIN]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#154734;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr>
<td width="50%" valign="top" style="padding:0;background-image:url('{{LIFESTYLE_IMG_2}}');background-size:cover;background-position:center;background-color:#BFA46D;"><div style="min-height:280px;"></div></td>
<td width="50%" valign="middle" style="padding:44px 32px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;">Our Story</p>
<h3 style="margin:0 0 14px;font-family:Fraunces,Georgia,serif;font-size:26px;font-weight:400;color:#E9E3D8;line-height:1.3;">{{ORIGIN_HEADLINE}}</h3>
<p style="margin:0 0 22px;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.55);line-height:1.7;">{{ORIGIN_BODY}}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="border:1px solid #BFA46D;border-radius:2px;"><a href="https://drinkafterdream.com/pages/origin" style="display:inline-block;padding:16px 32px;font-family:system-ui,sans-serif;font-size:14px;font-weight:500;color:#BFA46D;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">Our Story &#8594;</a></td></tr></table>
</td></tr></table></td></tr></table>

<!--[BLOCK 11: SUBSCRIBE & SAVE]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#76233F;">
<tr><td align="center" style="padding:40px 40px 56px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">Never Run Out</p>
<h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#E9E3D8;line-height:1.3;text-align:center;">{{SUBSCRIBE_HEADLINE}}</h2>
<table cellpadding="0" cellspacing="0" border="0" style="margin:22px auto;"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table>
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:20px;font-style:italic;color:rgba(233,227,216,0.45);text-align:center;">A new ritual for your life \u2014 consistent, convenient, and rewarding.</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;" align="center">
<tr><td style="padding:5px 0;font-family:Georgia,serif;font-size:20px;color:#E9E3D8;text-align:center;"><span style="color:#BFA46D;">&#10003;</span> {{PERK_1}}</td></tr>
<tr><td style="padding:5px 0;font-family:Georgia,serif;font-size:20px;color:#E9E3D8;text-align:center;"><span style="color:#BFA46D;">&#10003;</span> {{PERK_2}}</td></tr>
<tr><td style="padding:5px 0;font-family:Georgia,serif;font-size:20px;color:#E9E3D8;text-align:center;"><span style="color:#BFA46D;">&#10003;</span> {{PERK_3}}</td></tr>
<tr><td style="padding:5px 0;font-family:Georgia,serif;font-size:20px;color:#E9E3D8;text-align:center;"><span style="color:#BFA46D;">&#10003;</span> {{PERK_4}}</td></tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#BFA46D;border-radius:2px;"><a href="https://drinkafterdream.com/pages/the-subscription" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#154734;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">{{SUBSCRIBE_CTA}}</a></td></tr></table>
</td></tr></table>

<!--[BLOCK 12: BUNDLE]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#154734;"><tr><td align="center" style="padding:56px 34px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">Best Seller</p></td></tr>
<tr><td align="center"><h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#E9E3D8;text-align:center;">Our Bundle</h2></td></tr>
<tr><td align="center" style="padding:20px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="33%" align="center" style="padding:0 4px;"><img src="{{PRODUCT_1_IMG}}" alt="" width="140" style="display:block;width:100%;max-width:140px;border-radius:6px;background:#f5f0e8;"></td>
<td width="33%" align="center" style="padding:0 4px;"><img src="{{PRODUCT_2_IMG}}" alt="" width="140" style="display:block;width:100%;max-width:140px;border-radius:6px;background:#f5f0e8;"></td>
<td width="33%" align="center" style="padding:0 4px;"><img src="{{PRODUCT_3_IMG}}" alt="" width="140" style="display:block;width:100%;max-width:140px;border-radius:6px;background:#f5f0e8;"></td>
</tr></table></td></tr>
<tr><td align="center" style="padding:24px 20px 0;">
<p style="margin:0 0 4px;font-family:Fraunces,Georgia,serif;font-size:28px;color:#E9E3D8;text-align:center;">{{BUNDLE_HEADLINE}}{{BUNDLE_PRICE_LINE}}</p>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.45);text-align:center;">{{BUNDLE_BODY}}</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#BFA46D;border-radius:2px;"><a href="https://drinkafterdream.com/products/flavor-flight" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#154734;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">{{BUNDLE_CTA}}</a></td></tr></table>
</td></tr>
</table></td></tr></table>

<!--[BLOCK 13: SINGLE PRODUCT FEATURE]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#76233F;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr>
<td width="50%" valign="middle" style="padding:48px 32px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;">{{FEATURED_LABEL}}</p>
<h2 style="margin:0 0 14px;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#E9E3D8;line-height:1.3;">{{FEATURED_NAME}}</h2>
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.55);line-height:1.7;">{{FEATURED_BODY}}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#BFA46D;border-radius:2px;"><a href="{{PRODUCT_1_URL}}" style="display:inline-block;padding:18px 40px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#154734;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">{{FEATURED_CTA}}</a></td></tr></table>
</td>
<td width="50%" valign="top" style="padding:0;background-color:#BFA46D;"><img src="{{PRODUCT_1_IMG}}" alt="" width="300" style="display:block;width:100%;"></td>
</tr></table></td></tr></table>

<!--[BLOCK 14: PROMO CODE]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center" style="padding:52px 34px;">
<table width="460" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;width:100%;border:1px solid rgba(21,71,52,0.1);border-radius:6px;background:#ffffff;">
<tr><td align="center" style="padding:44px 36px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;color:#76233F;letter-spacing:3px;text-transform:uppercase;font-weight:500;text-align:center;">Exclusive Offer</p>
<h1 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:72px;font-weight:400;color:#154734;line-height:1;text-align:center;">{{PROMO_PERCENT}}</h1>
<p style="margin:2px 0 0;font-family:Fraunces,Georgia,serif;font-size:22px;color:#154734;letter-spacing:1px;text-align:center;">Off Your First Order</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin:22px auto;"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;" align="center"><tr><td style="padding:12px 30px;border:1.5px dashed rgba(21,71,52,0.2);border-radius:4px;background:rgba(21,71,52,0.03);"><p style="margin:0;font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:#154734;letter-spacing:5px;text-align:center;">{{PROMO_CODE}}</p></td></tr></table>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:18px;color:rgba(21,71,52,0.4);text-align:center;">Apply at checkout &#183; First-time customers only</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#76233F;border-radius:2px;"><a href="https://drinkafterdream.com/collections/our-products" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">Redeem Now</a></td></tr></table>
</td></tr></table></td></tr></table>

<!--[BLOCK 15: REFERRAL]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center" style="padding:56px 34px;">
<table width="460" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;width:100%;border:1px solid rgba(21,71,52,0.1);border-radius:6px;background:#ffffff;">
<tr><td align="center" style="padding:44px 36px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">Share The Love</p>
<h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#154734;line-height:1.3;text-align:center;">Give {{REFERRAL_AMOUNT}}, Get {{REFERRAL_AMOUNT}}</h2>
<table cellpadding="0" cellspacing="0" border="0" style="margin:22px auto;"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table>
<p style="margin:0 0 24px;font-family:Georgia,serif;font-size:20px;color:rgba(21,71,52,0.55);line-height:1.7;text-align:center;">{{REFERRAL_BODY}}</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#154734;border-radius:2px;"><a href="https://drinkafterdream.com" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">Refer A Friend</a></td></tr></table>
</td></tr></table></td></tr></table>

<!--[BLOCK 16: FAQ]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#154734;"><tr><td align="center" style="padding:56px 34px;">
<table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">Good To Know</p></td></tr>
<tr><td align="center"><h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#E9E3D8;text-align:center;">Your Questions, Answered</h2></td></tr>
<tr><td align="center" style="padding:22px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(233,227,216,0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:400;color:#E9E3D8;text-align:center;">How does shipping work?</h4><p style="margin:0;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.5);line-height:1.7;text-align:center;">Free shipping on orders over $50. Most orders ship within 1-2 business days.</p></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(233,227,216,0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:400;color:#E9E3D8;text-align:center;">What's your return policy?</h4><p style="margin:0;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.5);line-height:1.7;text-align:center;">30-day money-back guarantee, no questions asked.</p></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(233,227,216,0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:400;color:#E9E3D8;text-align:center;">How is this different?</h4><p style="margin:0;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.5);line-height:1.7;text-align:center;">We use premium materials and obsessive attention to detail.</p></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(233,227,216,0.1);border-bottom:1px solid rgba(233,227,216,0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:400;color:#E9E3D8;text-align:center;">Do you ship internationally?</h4><p style="margin:0;font-family:Georgia,serif;font-size:20px;color:rgba(233,227,216,0.5);line-height:1.7;text-align:center;">Contact us for international shipping options.</p></td></tr>
<tr><td align="center" style="padding-top:28px;"><table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="border:1px solid #BFA46D;border-radius:2px;"><a href="https://drinkafterdream.com/pages/faqs" style="display:inline-block;padding:16px 32px;font-family:system-ui,sans-serif;font-size:14px;font-weight:500;color:#BFA46D;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">View All FAQs &#8594;</a></td></tr></table></td></tr>
</table></td></tr></table>

<!--[BLOCK 17: BLOG / JOURNAL]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center" style="padding:56px 28px;">
<table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:system-ui,sans-serif;font-size:14px;color:#BFA46D;letter-spacing:3px;text-transform:uppercase;text-align:center;">The Journal</p></td></tr>
<tr><td align="center"><h2 style="margin:0;font-family:Fraunces,Georgia,serif;font-size:32px;font-weight:400;color:#154734;text-align:center;">Latest From Our Blog</h2></td></tr>
<tr><td align="center" style="padding:22px 0;"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td><td style="padding:0 8px;"><div style="width:6px;height:6px;border-radius:50%;background:#BFA46D;"></div></td><td style="width:20px;height:1px;background:rgba(191,164,109,0.4);"></td></tr></table></td></tr>
<tr><td style="padding:0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.05);border:1px solid rgba(21,71,52,0.08);border-radius:6px;"><tr><td style="padding:24px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:12px;color:#BFA46D;letter-spacing:2px;text-transform:uppercase;text-align:left;">{{BLOG_1_CATEGORY}}</p>
<h3 style="margin:0 0 10px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:400;color:#154734;line-height:1.3;text-align:left;">{{BLOG_1_TITLE}}</h3>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:19px;color:rgba(21,71,52,0.55);line-height:1.7;text-align:left;">{{BLOG_1_EXCERPT}}</p>
<a href="{{BLOG_1_URL}}" style="font-family:system-ui,sans-serif;font-size:15px;font-weight:500;color:#154734;text-decoration:none;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid rgba(21,71,52,0.3);padding-bottom:2px;">Read More &#8594;</a>
</td></tr></table></td></tr>
<tr><td style="padding:0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.05);border:1px solid rgba(21,71,52,0.08);border-radius:6px;"><tr><td style="padding:24px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:12px;color:#BFA46D;letter-spacing:2px;text-transform:uppercase;text-align:left;">{{BLOG_2_CATEGORY}}</p>
<h3 style="margin:0 0 10px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:400;color:#154734;line-height:1.3;text-align:left;">{{BLOG_2_TITLE}}</h3>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:19px;color:rgba(21,71,52,0.55);line-height:1.7;text-align:left;">{{BLOG_2_EXCERPT}}</p>
<a href="{{BLOG_2_URL}}" style="font-family:system-ui,sans-serif;font-size:15px;font-weight:500;color:#154734;text-decoration:none;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid rgba(21,71,52,0.3);padding-bottom:2px;">Read More &#8594;</a>
</td></tr></table></td></tr>
<tr><td style="padding:0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(21,71,52,0.05);border:1px solid rgba(21,71,52,0.08);border-radius:6px;"><tr><td style="padding:24px;">
<p style="margin:0 0 8px;font-family:system-ui,sans-serif;font-size:12px;color:#BFA46D;letter-spacing:2px;text-transform:uppercase;text-align:left;">{{BLOG_3_CATEGORY}}</p>
<h3 style="margin:0 0 10px;font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:400;color:#154734;line-height:1.3;text-align:left;">{{BLOG_3_TITLE}}</h3>
<p style="margin:0 0 16px;font-family:Georgia,serif;font-size:19px;color:rgba(21,71,52,0.55);line-height:1.7;text-align:left;">{{BLOG_3_EXCERPT}}</p>
<a href="{{BLOG_3_URL}}" style="font-family:system-ui,sans-serif;font-size:15px;font-weight:500;color:#154734;text-decoration:none;letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid rgba(21,71,52,0.3);padding-bottom:2px;">Read More &#8594;</a>
</td></tr></table></td></tr>
<tr><td align="center" style="padding-top:28px;"><table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#154734;border-radius:2px;"><a href="https://drinkafterdream.com/blogs/afterdream-journal" style="display:inline-block;padding:18px 44px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#E9E3D8;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">View All Articles</a></td></tr></table></td></tr>
</table></td></tr></table>

<!--[BLOCK 19: LIFESTYLE IMAGE BREAK]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9E3D8;"><tr><td align="center" style="padding:0;">
<a href="https://drinkafterdream.com/collections/our-products"><img src="{{LIFESTYLE_IMG_1}}" alt="" width="600" style="display:block;width:100%;max-width:600px;"></a>
</td></tr></table>

<!--[BLOCK 20: FOOTER]-->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#154734;"><tr><td align="center" style="padding:48px 34px 24px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;">
<tr><td align="center" style="padding-bottom:16px;"><a href="https://drinkafterdream.com"><img src="{{LOGO_URL}}" alt="{{BRAND_NAME}}" width="120" style="display:block;width:120px;"></a></td></tr>
<tr><td align="center" style="padding-bottom:22px;"><p style="margin:0;font-family:Georgia,serif;font-size:15px;font-style:italic;color:rgba(233,227,216,0.4);text-align:center;">{{FOOTER_TAGLINE}}</p></td></tr>
<tr><td align="center" style="padding-bottom:22px;text-align:center;"><a href="{{INSTAGRAM_URL}}" style="font-family:system-ui,sans-serif;font-size:13px;color:#BFA46D;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">Instagram</a></td></tr>
<tr><td align="center" style="padding-bottom:22px;text-align:center;"><a href="https://drinkafterdream.com/collections/our-products" style="font-family:system-ui,sans-serif;font-size:13px;color:rgba(233,227,216,0.35);text-decoration:none;padding:0 8px;">Shop</a><a href="https://drinkafterdream.com/pages/origin" style="font-family:system-ui,sans-serif;font-size:13px;color:rgba(233,227,216,0.35);text-decoration:none;padding:0 8px;">About</a><a href="https://drinkafterdream.com/pages/faqs" style="font-family:system-ui,sans-serif;font-size:13px;color:rgba(233,227,216,0.35);text-decoration:none;padding:0 8px;">FAQs</a><a href="https://drinkafterdream.com/pages/contact" style="font-family:system-ui,sans-serif;font-size:13px;color:rgba(233,227,216,0.35);text-decoration:none;padding:0 8px;">Contact</a></td></tr>
<tr><td style="padding-bottom:16px;"><div style="height:1px;background:rgba(233,227,216,0.08);"></div></td></tr>
<tr><td align="center"><p style="margin:0;font-family:system-ui,sans-serif;font-size:11px;color:rgba(233,227,216,0.12);text-align:center;">{{COPYRIGHT}} &#183; <a href="https://drinkafterdream.com/policies/privacy-policy" style="color:rgba(233,227,216,0.25);text-decoration:underline;">Privacy</a></p></td></tr>
</table></td></tr></table>

</body>
</html>`

export function buildMasterEmail(brand: BrandData, config: MasterEmailConfig, productImages: string[] = [], lifestyleImages: string[] = []): string {
  const palette = buildEmailPalette(brand, config.emailColors)

  const headingFamily = (brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'Fraunces')
  const headingWeight = String(brand.font_heading?.weight || 400)
  const headingTransform = brand.font_heading?.transform || 'none'
  const bodyFamily = (brand.font_body?.family || brand.font_primary?.split('|')[0] || 'system-ui')

  const site = brand.website || '#'
  const logoUrl = brand.logo_url || 'https://via.placeholder.com/180x40/E9E3D8/154734?text=' + encodeURIComponent(brand.name)
  // White logo for dark sections, color logo for light sections. Fall back to whichever exists.
  const darkLogo = brand.logo_url_light || brand.logo_url || logoUrl
  const lightLogo = brand.logo_url || logoUrl

  // Resolve products
  const cfgProducts = config.products && config.products.length > 0 ? config.products : []
  const brandProducts = brand.products || []
  const getProduct = (i: number) => {
    const cp = cfgProducts[i]
    if (cp && (cp.name || cp.imageUrl)) return cp
    const bp = brandProducts[i]
    if (bp) {
      return {
        name: bp.name || bp.title || `Product ${i + 1}`,
        price: bp.price_range || bp.price || '$0.00',
        imageUrl: bp.image || productImages[i] || '',
        url: site,
      }
    }
    return {
      name: `Product ${i + 1}`,
      price: '$0.00',
      imageUrl: productImages[i] || '',
      url: site,
    }
  }
  const p1 = getProduct(0)
  const p2 = getProduct(1)
  const p3 = getProduct(2)

  const lifestyle1 = lifestyleImages[0] || config.heroImageUrl || 'https://via.placeholder.com/600x400/BFA46D/154734?text=Lifestyle'
  const lifestyle2 = lifestyleImages[1] || lifestyleImages[0] || 'https://via.placeholder.com/300x300/BFA46D/154734?text=Story'

  let html = AFTERDREAM_HTML

  // ─── Per-block color application ───
  // Parse the template by block markers and apply context-specific colors to each.
  // Light blocks (product grid, how it works, blog, etc.) stay light — never turn dark.
  // Dark blocks (header, CTA, footer) use brand primary. Alt-dark blocks use a darker variant.
  html = applyPerBlockColors(html, palette, darkLogo, lightLogo)

  // Body-level background (outside any block) — use the light neutral
  html = replaceAll(html, 'background-color:#E9E3D8;"', `background-color:${palette.lightBg};"`)

  // ─── Heading weight + transform injection ───
  // Match heading element inline styles that use the Fraunces font and swap in brand weight.
  // Captures: $1 = middle style chunk (e.g. "font-size:40px"), $2 = original weight number
  html = html.replace(
    /font-family:Fraunces,Georgia,serif;([^;"]*);font-weight:(\d+)/g,
    (_match, middle) => `font-family:Fraunces,Georgia,serif;${middle};font-weight:${headingWeight};text-transform:${headingTransform}`
  )

  // ─── Font family substitutions ───
  console.log('Email fonts:', { font_heading: brand.font_heading, font_body: brand.font_body, font_primary: brand.font_primary, resolvedHeading: headingFamily, resolvedBody: bodyFamily })

  // IMPORTANT: Run Fraunces replacement FIRST — its string contains "Georgia,serif"
  // so the Georgia replacement would otherwise clobber it.
  html = html.replace(/font-family:Fraunces,Georgia,serif/g, `font-family:${headingFamily},Georgia,serif`)
  // Body paragraphs (original Georgia,serif) → brand body font
  html = html.replace(/font-family:Georgia,serif/g, `font-family:${bodyFamily},Georgia,serif`)
  // UI / labels / buttons (original system-ui) → brand body font
  html = html.replace(/font-family:system-ui,sans-serif/g, `font-family:${bodyFamily},sans-serif`)

  // Inject Google Fonts link in <head> so custom fonts actually load
  const googleFontsLink = `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFamily)}:wght@400;500;700;900&family=${encodeURIComponent(bodyFamily)}:wght@400;600;700&display=swap" rel="stylesheet">`
  html = html.replace('</head>', `${googleFontsLink}</head>`)

  // ─── URL substitutions (all Afterdream links) ───
  html = replaceAll(html, 'https://drinkafterdream.com/policies/privacy-policy', `${site}/policies/privacy-policy`)
  html = replaceAll(html, 'https://drinkafterdream.com/pages/the-subscription', `${site}/pages/subscribe`)
  html = replaceAll(html, 'https://drinkafterdream.com/blogs/afterdream-journal', `${site}/blogs`)
  html = replaceAll(html, 'https://drinkafterdream.com/products/flavor-flight', `${site}/products`)
  html = replaceAll(html, 'https://drinkafterdream.com/collections/our-products', `${site}/collections/all`)
  html = replaceAll(html, 'https://drinkafterdream.com/pages/origin', `${site}/pages/about`)
  html = replaceAll(html, 'https://drinkafterdream.com/pages/faqs', `${site}/pages/faq`)
  html = replaceAll(html, 'https://drinkafterdream.com/pages/contact', `${site}/pages/contact`)
  html = replaceAll(html, 'https://drinkafterdream.com', site)

  // ─── Content placeholder substitutions ───
  html = replaceAll(html, '{{LOGO_URL}}', logoUrl)
  html = replaceAll(html, '{{BRAND_NAME}}', brand.name)
  html = replaceAll(html, '{{ANNOUNCEMENT_TEXT}}', config.announcementText)
  html = replaceAll(html, '{{HERO_HEADLINE}}', config.heroHeadline)
  html = replaceAll(html, '{{HERO_BODY}}', config.heroBody)
  html = replaceAll(html, '{{HERO_CTA}}', config.heroCta)
  html = replaceAll(html, '{{HERO_CTA_URL}}', config.heroCtaUrl || site)
  html = replaceAll(html, '{{HERO_IMAGE_URL}}', config.heroImageUrl || lifestyle1)
  html = replaceAll(html, '{{LIFESTYLE_IMG_1}}', lifestyle1)
  html = replaceAll(html, '{{LIFESTYLE_IMG_2}}', lifestyle2)

  html = replaceAll(html, '{{PRODUCT_1_NAME}}', p1.name)
  html = replaceAll(html, '{{PRODUCT_1_PRICE}}', p1.price.startsWith('$') ? p1.price : p1.price ? '$' + p1.price : '$0.00')
  html = replaceAll(html, '{{PRODUCT_1_IMG}}', p1.imageUrl || 'https://via.placeholder.com/180x180/f5f0e8/154734?text=Product')
  html = replaceAll(html, '{{PRODUCT_1_URL}}', p1.url || site)

  html = replaceAll(html, '{{PRODUCT_2_NAME}}', p2.name)
  html = replaceAll(html, '{{PRODUCT_2_PRICE}}', p2.price.startsWith('$') ? p2.price : p2.price ? '$' + p2.price : '$0.00')
  html = replaceAll(html, '{{PRODUCT_2_IMG}}', p2.imageUrl || 'https://via.placeholder.com/180x180/f5f0e8/154734?text=Product')
  html = replaceAll(html, '{{PRODUCT_2_URL}}', p2.url || site)

  html = replaceAll(html, '{{PRODUCT_3_NAME}}', p3.name)
  html = replaceAll(html, '{{PRODUCT_3_PRICE}}', p3.price.startsWith('$') ? p3.price : p3.price ? '$' + p3.price : '$0.00')
  html = replaceAll(html, '{{PRODUCT_3_IMG}}', p3.imageUrl || 'https://via.placeholder.com/180x180/f5f0e8/154734?text=Product')
  html = replaceAll(html, '{{PRODUCT_3_URL}}', p3.url || site)

  html = replaceAll(html, '{{CTA_HEADLINE}}', config.ctaBannerHeadline)
  html = replaceAll(html, '{{CTA_BODY}}', config.ctaBannerBody)
  html = replaceAll(html, '{{CTA_BUTTON}}', config.ctaBannerCta)

  // How It Works
  html = replaceAll(html, '{{STEP_1_TITLE}}', config.step1Title)
  html = replaceAll(html, '{{STEP_1_BODY}}', config.step1Body)
  html = replaceAll(html, '{{STEP_2_TITLE}}', config.step2Title)
  html = replaceAll(html, '{{STEP_2_BODY}}', config.step2Body)
  html = replaceAll(html, '{{STEP_3_TITLE}}', config.step3Title)
  html = replaceAll(html, '{{STEP_3_BODY}}', config.step3Body)

  // Experience
  html = replaceAll(html, '{{EXPERIENCE_HEADLINE}}', config.experienceHeadline)
  html = replaceAll(html, '{{EXPERIENCE_BODY}}', config.experienceBody)
  html = replaceAll(html, '{{EXPERIENCE_QUOTE}}', config.experienceQuote)
  html = replaceAll(html, '{{EXPERIENCE_CTA}}', config.experienceCta)

  // Origin
  html = replaceAll(html, '{{ORIGIN_HEADLINE}}', config.originHeadline)
  html = replaceAll(html, '{{ORIGIN_BODY}}', config.originBody)

  // Bundle
  html = replaceAll(html, '{{BUNDLE_HEADLINE}}', config.bundleHeadline)
  html = replaceAll(html, '{{BUNDLE_PRICE_LINE}}', config.bundlePrice ? ` \u2014 ${config.bundlePrice.startsWith('$') ? config.bundlePrice : '$' + config.bundlePrice}` : '')
  html = replaceAll(html, '{{BUNDLE_BODY}}', config.bundleBody)
  html = replaceAll(html, '{{BUNDLE_CTA}}', config.bundleCta)

  // Featured product
  html = replaceAll(html, '{{FEATURED_LABEL}}', config.featuredProductLabel)
  html = replaceAll(html, '{{FEATURED_NAME}}', config.featuredProductName || p1.name)
  html = replaceAll(html, '{{FEATURED_BODY}}', config.featuredProductBody)
  html = replaceAll(html, '{{FEATURED_CTA}}', config.featuredProductCta)

  // Referral
  html = replaceAll(html, '{{REFERRAL_AMOUNT}}', config.referralAmount)
  html = replaceAll(html, '{{REFERRAL_BODY}}', config.referralBody)

  const t = config.testimonials
  html = replaceAll(html, '{{TESTIMONIAL_1_QUOTE}}', t[0]?.quote || '')
  html = replaceAll(html, '{{TESTIMONIAL_1_AUTHOR}}', t[0]?.author || '')
  html = replaceAll(html, '{{TESTIMONIAL_2_QUOTE}}', t[1]?.quote || '')
  html = replaceAll(html, '{{TESTIMONIAL_2_AUTHOR}}', t[1]?.author || '')
  html = replaceAll(html, '{{TESTIMONIAL_3_QUOTE}}', t[2]?.quote || '')
  html = replaceAll(html, '{{TESTIMONIAL_3_AUTHOR}}', t[2]?.author || '')

  html = replaceAll(html, '{{REVIEW_COUNT}}', config.reviewCount)
  html = replaceAll(html, '{{SOCIAL_PROOF_QUOTE}}', config.socialProofQuote)
  html = replaceAll(html, '{{SUBSCRIBE_HEADLINE}}', config.subscribeHeadline)
  html = replaceAll(html, '{{SUBSCRIBE_CTA}}', config.subscribeCta)
  html = replaceAll(html, '{{PERK_1}}', config.subscribePerks[0] || '')
  html = replaceAll(html, '{{PERK_2}}', config.subscribePerks[1] || '')
  html = replaceAll(html, '{{PERK_3}}', config.subscribePerks[2] || '')
  html = replaceAll(html, '{{PERK_4}}', config.subscribePerks[3] || '')
  html = replaceAll(html, '{{PROMO_PERCENT}}', config.promoPercent)
  html = replaceAll(html, '{{PROMO_CODE}}', config.promoCode)

  const b = config.blogPosts
  html = replaceAll(html, '{{BLOG_1_CATEGORY}}', b[0]?.category || 'Journal')
  html = replaceAll(html, '{{BLOG_1_TITLE}}', b[0]?.title || '')
  html = replaceAll(html, '{{BLOG_1_EXCERPT}}', b[0]?.excerpt || '')
  html = replaceAll(html, '{{BLOG_1_URL}}', b[0]?.url || site)
  html = replaceAll(html, '{{BLOG_2_CATEGORY}}', b[1]?.category || 'Journal')
  html = replaceAll(html, '{{BLOG_2_TITLE}}', b[1]?.title || '')
  html = replaceAll(html, '{{BLOG_2_EXCERPT}}', b[1]?.excerpt || '')
  html = replaceAll(html, '{{BLOG_2_URL}}', b[1]?.url || site)
  html = replaceAll(html, '{{BLOG_3_CATEGORY}}', b[2]?.category || 'Journal')
  html = replaceAll(html, '{{BLOG_3_TITLE}}', b[2]?.title || '')
  html = replaceAll(html, '{{BLOG_3_EXCERPT}}', b[2]?.excerpt || '')
  html = replaceAll(html, '{{BLOG_3_URL}}', b[2]?.url || site)

  html = replaceAll(html, '{{FOOTER_TAGLINE}}', config.footerTagline)
  html = replaceAll(html, '{{INSTAGRAM_URL}}', config.instagramUrl || '#')
  html = replaceAll(html, '{{COPYRIGHT}}', `&#169; ${new Date().getFullYear()} ${brand.name}`)

  return html
}
