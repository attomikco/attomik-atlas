// Master email template — 18-block Klaviyo email built from the Jolene reference HTML.
// All brand colors, fonts, URLs, and copy are injected via JS template literals.

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
  // Product grid
  productsEyebrow: string
  productsHeadline: string
  products: Array<{ name: string; price: string; imageUrl: string; url: string }>
  ctaBannerHeadline: string
  ctaBannerBody: string
  ctaBannerCta: string
  // How It Works (3 steps)
  stepsEyebrow: string
  stepsHeadline: string
  step1Title: string
  step1Body: string
  step2Title: string
  step2Body: string
  step3Title: string
  step3Body: string
  // Ingredients / Why Us
  ingredientsEyebrow: string
  ingredientsHeadline: string
  ingredientCards: Array<{ icon: string; title: string; body: string }>
  // FAQ
  faqItems: Array<{ question: string; answer: string }>
  // Experience
  experienceEyebrow: string
  experienceHeadline: string
  experienceBody: string
  experienceQuote: string
  experienceCta: string
  // Testimonials
  testimonialsEyebrow: string
  testimonialsHeadline: string
  // Origin / Founder
  originEyebrow: string
  originHeadline: string
  originBody: string
  originCta: string
  // Subscribe
  subscribeEyebrow: string
  subscribeHeadline: string
  subscribePerks: string[]
  subscribeCta: string
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
  // Promo
  promoEyebrow: string
  promoPercent: string
  promoCode: string
  // Referral
  referralAmount: string
  referralBody: string
  referralHeadline: string
  subscribeTagline: string
  productButtonText: string
  // Social proof
  testimonials: Array<{ quote: string; author: string }>
  reviewCount: string
  socialProofQuote: string
  // FAQ
  faqEyebrow: string
  faqHeadline: string
  // Blog
  blogEyebrow: string
  blogHeadline: string
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
  productsEyebrow: 'The Collection',
  productsHeadline: 'Shop Our Products',
  products: [],
  ctaBannerHeadline: 'Free Shipping on Orders Over $50',
  ctaBannerBody: 'Order today and experience the difference.',
  ctaBannerCta: 'Order Now',
  stepsEyebrow: 'How It Works',
  stepsHeadline: 'Simple As 1-2-3',
  step1Title: 'Browse',
  step1Body: 'Explore our collection and find what fits.',
  step2Title: 'Order',
  step2Body: 'Checkout in seconds with free shipping.',
  step3Title: 'Enjoy',
  step3Body: 'Experience the difference, delivered to you.',
  ingredientsEyebrow: 'What Sets Us Apart',
  ingredientsHeadline: 'Why Choose Us',
  ingredientCards: [
    { icon: '\u2726', title: 'Premium Quality', body: 'Made with care and craftsmanship.' },
    { icon: '\u21E2', title: 'Fast Shipping', body: 'Free shipping, delivered quickly.' },
    { icon: '\u2713', title: 'Guaranteed', body: '30-day money-back guarantee.' },
    { icon: '\u2665', title: 'Loved by Many', body: 'Thousands of happy customers.' },
  ],
  faqItems: [
    { question: 'What is your return policy?', answer: '30-day money-back guarantee, no questions asked.' },
    { question: 'How is this different?', answer: 'We use premium materials and obsessive attention to detail.' },
  ],
  experienceEyebrow: 'The Experience',
  experienceHeadline: 'How It Makes You Feel',
  experienceBody: 'Built for those who demand more. Every detail is intentional.',
  experienceQuote: 'It\u2019s not a product \u2014 it\u2019s a ritual.',
  experienceCta: 'Shop Now',
  testimonialsEyebrow: 'What They\u2019re Saying',
  testimonialsHeadline: 'Real Reviews',
  originEyebrow: 'Our Story',
  originHeadline: 'Crafted with Intention',
  originBody: 'Built by people who care about every detail.',
  originCta: 'Our Story',
  subscribeEyebrow: 'Never Run Out',
  subscribeHeadline: 'Subscribe & Save',
  subscribePerks: [
    'Save 15% on every subscription',
    'Free shipping on all orders',
    'Free gift with your first order',
    'Pause, swap, or cancel anytime',
  ],
  subscribeCta: 'Start Subscribing',
  bundleHeadline: 'Try All Three',
  bundlePrice: '',
  bundleBody: 'One of each. The perfect introduction.',
  bundleCta: 'Shop Bundle',
  featuredProductLabel: 'Featured',
  featuredProductName: '',
  featuredProductBody: 'Our most popular choice. See why customers keep coming back.',
  featuredProductCta: 'Shop Now',
  promoEyebrow: 'Exclusive Offer',
  promoPercent: '15%',
  promoCode: 'WELCOME15',
  referralAmount: '$10',
  referralBody: 'Share with a friend. They get $10 off, and you get $10 when they buy.',
  referralHeadline: 'Give $10, Get $10',
  subscribeTagline: 'Your daily ritual, on autopilot.',
  productButtonText: 'Add to Cart',
  testimonials: [
    { quote: 'Finally, a product that actually does what it promises. Genuinely impressed.', author: 'Sasha R.' },
    { quote: 'The quality is incredible and the experience is even better. Highly recommend.', author: 'Jonas L.' },
    { quote: 'Exceeded all my expectations. This is now part of my daily routine.', author: 'Leila A.' },
  ],
  reviewCount: '500+',
  socialProofQuote: 'The best in its category I\u2019ve ever tried.',
  faqEyebrow: 'Good to Know',
  faqHeadline: 'Your Questions, Answered',
  blogEyebrow: 'The Journal',
  blogHeadline: 'From Our Blog',
  blogPosts: [
    { category: 'Journal', title: 'Why Our Customers Keep Coming Back', excerpt: 'The story behind our most loyal fans.', url: '' },
    { category: 'Journal', title: 'How to Get the Most Out of Our Products', excerpt: 'Tips from our team.', url: '' },
  ],
  footerTagline: 'Crafted with care.',
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
  // Start from brand colors, allow emailColors overrides (master template customization)
  const primary = brand.primary_color || '#154734'
  const accent = brand.accent_color || '#BFA46D'
  const secondary = brand.secondary_color || '#E9E3D8'

  // Text on colors — use brand overrides if set, otherwise auto-derive from luminance
  const primaryText = brand.text_on_dark || (getLuminance(primary) < 0.5 ? '#ffffff' : '#000000')
  const accentText = brand.text_on_accent || (getLuminance(accent) > 0.5 ? '#000000' : '#ffffff')

  // Light background — use explicit bg_base if set, otherwise derive from secondary
  const lightBg = brand.bg_base || (getLuminance(secondary) > 0.7 ? secondary : '#f8f7f4')

  // Dark variant — smart adjust based on how dark the primary already is
  const luminance = getLuminance(primary)
  let darkVariant: string
  if (luminance < 0.15) {
    // Primary is already very dark — lighten slightly instead of darkening
    darkVariant = lightenHex(primary, 15)
  } else if (luminance < 0.35) {
    // Dark but not too dark — darken just a little
    darkVariant = darkenHex(primary, 10)
  } else {
    // Medium/light primary — darken normally
    darkVariant = darkenHex(primary, 20)
  }

  const secondaryText = brand.text_on_base || (getLuminance(secondary) > 0.5 ? '#000000' : '#ffffff')
  const derived: EmailPalette = {
    darkBg: primary,
    darkText: primaryText,
    altDarkBg: darkVariant,
    altDarkText: '#ffffff',
    lightBg,
    lightText: primary,
    secondaryBg: secondary,
    secondaryText,
    accent,
    accentText,
    primaryButtonBg: primary,
    primaryButtonText: primaryText,
    accentButtonBg: accent,
    accentButtonText: accentText,
  }

  // Apply master template color overrides if saved
  console.log('[buildEmailPalette] emailColors:', emailColors ? `primaryBg=${emailColors.primaryBg}` : 'null')
  if (emailColors) {
    const p = emailColors.primaryBg || derived.darkBg
    const pt = emailColors.primaryText || derived.darkText
    const a = emailColors.accentColor || derived.accent
    const at = isDark(a) ? '#ffffff' : '#000000'
    return {
      darkBg: p, darkText: pt,
      altDarkBg: p, altDarkText: pt,
      lightBg: emailColors.neutralBg || derived.lightBg,
      lightText: emailColors.neutralText || derived.lightText,
      secondaryBg: derived.secondaryBg, secondaryText: derived.secondaryText,
      accent: a, accentText: at,
      primaryButtonBg: emailColors.buttonBg || p,
      primaryButtonText: emailColors.buttonText || pt,
      accentButtonBg: a, accentButtonText: at,
    }
  }

  return derived
}

// Derive the default emailColors object from a brand — used to seed the UI picker
export function deriveEmailColorsFromBrand(brand: BrandData): EmailColors {
  const primary = brand.primary_color || '#154734'
  const accent = brand.accent_color || '#BFA46D'
  const secondary = brand.secondary_color || '#E9E3D8'
  const primaryText = isDark(primary) ? '#ffffff' : '#000000'
  const neutralBg = getLuminance(secondary) > 0.7 ? secondary : '#f8f7f4'
  const lum = getLuminance(primary)
  const altPrimaryBg = lum < 0.15 ? lightenHex(primary, 15) : lum < 0.35 ? darkenHex(primary, 10) : darkenHex(primary, 20)
  return {
    primaryBg: primary,
    primaryText,
    altPrimaryBg,
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
  bg_base?: string | null
  text_on_dark?: string | null
  text_on_base?: string | null
  text_on_accent?: string | null
  font_heading?: { family?: string; weight?: string | number; transform?: string } | null
  font_body?: { family?: string; weight?: string | number } | null
  font_primary?: string | null
  products?: any[] | null
}

// Replace all occurrences of a string (case-sensitive, literal match)
function replaceAll(str: string, from: string, to: string): string {
  return str.split(from).join(to)
}

export function buildMasterEmail(brand: BrandData, config: MasterEmailConfig, productImages: string[] = [], lifestyleImages: string[] = []): string {
  const palette = buildEmailPalette(brand, config.emailColors)
  console.log('[buildMasterEmail] palette.darkBg:', palette.darkBg, 'palette.accent:', palette.accent, 'palette.lightBg:', palette.lightBg)
  const hf = `${brand.font_heading?.family || brand.font_primary?.split('|')[0] || 'Helvetica'},Arial,sans-serif`
  const hw = brand.font_heading?.weight || 700
  const ht = brand.font_heading?.transform || 'uppercase'
  const bf = `${brand.font_body?.family || 'Georgia'},serif`
  const site = brand.website || '#'
  const darkLogo = brand.logo_url_light || brand.logo_url || ''
  const lightLogo = brand.logo_url || ''
  // Hero gets the first lifestyle image (usually the OG image scraped during onboarding)
  const heroImg = lifestyleImages[0] || productImages[0] || ''
  // Spread remaining images across other sections — avoid repeating the hero image
  const experienceImg = lifestyleImages[1] || lifestyleImages[2] || productImages[0] || heroImg
  const originImg = lifestyleImages[2] || lifestyleImages[3] || productImages[1] || lifestyleImages[1] || heroImg
  const lifestyleBreakImg = lifestyleImages[3] || lifestyleImages[1] || productImages[0] || heroImg

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

  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.font_heading?.family || 'Helvetica')}:wght@400;700;900&family=${encodeURIComponent(brand.font_body?.family || 'Georgia')}:wght@400;600&display=swap`

  const ic = config.ingredientCards
  const ic0 = ic[0] || { icon: '\u2726', title: 'Premium Quality', body: 'Made with care and craftsmanship.' }
  const ic1 = ic[1] || { icon: '\u21E2', title: 'Fast Shipping', body: 'Free shipping, delivered quickly.' }
  const ic2 = ic[2] || { icon: '\u2713', title: 'Guaranteed', body: '30-day money-back guarantee.' }
  const ic3 = ic[3] || { icon: '\u2665', title: 'Loved by Many', body: 'Thousands of happy customers.' }

  const fq = config.faqItems
  const fq0 = fq[0] || { question: 'What is your return policy?', answer: '30-day money-back guarantee, no questions asked.' }
  const fq1 = fq[1] || { question: 'How is this different?', answer: 'We use premium materials and obsessive attention to detail.' }

  const t = config.testimonials
  const t0 = t[0] || { quote: '', author: '' }
  const t1 = t[1] || { quote: '', author: '' }
  const t2 = t[2] || { quote: '', author: '' }

  const b = config.blogPosts
  const b0 = b[0] || { category: 'Journal', title: '', excerpt: '', url: site }
  const b1 = b[1] || { category: 'Journal', title: '', excerpt: '', url: site }

  const sp = config.subscribePerks

  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email</title>
<link href="${googleFontsUrl}" rel="stylesheet">
<style>
@media only screen and (max-width: 480px) {
  .product-card-row td { display: block !important; width: 100% !important; }
  .product-card-img { height: 220px !important; min-height: 220px !important; border-radius: 6px 6px 0 0 !important; }
  .product-card-body { padding: 20px !important; }
  .origin-row td { display: block !important; width: 100% !important; }
  .origin-img { min-height: 200px !important; border-radius: 6px 6px 0 0 !important; }
  .feature-row td { display: block !important; width: 100% !important; }
  .feature-img { min-height: 240px !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background-color:${palette.lightBg};">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td>

<!-- BLOCK 1: ANNOUNCEMENT BAR -->
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:11px 20px;background-color:${palette.secondaryBg};"><p style="margin:0;font-family:${hf};font-size:12px;color:${palette.secondaryText};letter-spacing:2px;text-transform:${ht};font-weight:${hw};text-align:center;">${config.announcementText}</p></td></tr>
</table></td></tr></table>

<!-- BLOCK 2: HEADER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.darkBg};"><tr><td align="center" style="padding:32px 20px;">
<a href="${site}"><img src="${darkLogo}" alt="${brand.name}" style="display:block;max-width:180px;max-height:50px;width:auto;height:auto;"></a>
</td></tr></table>

<!-- BLOCK 3: HERO -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
<tr><td style="padding:0;"><img src="${heroImg}" alt="" width="600" style="display:block;width:100%;"></td></tr>
<tr><td align="center" style="padding:40px 44px 0;background-color:${palette.lightBg};"><h1 style="margin:0 0 20px;font-family:${hf};font-size:40px;font-weight:${hw};color:${palette.darkBg};line-height:1.3;text-align:center;text-transform:${ht};">${config.heroHeadline}</h1></td></tr>
<tr><td align="center" style="padding:0 44px;background-color:${palette.lightBg};"><p style="margin:0;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.75;text-align:center;">${config.heroBody}</p></td></tr>
<tr><td align="center" style="padding:36px 40px 52px;background-color:${palette.lightBg};"><table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background-color:${palette.darkBg};border-radius:2px;"><a href="${config.heroCtaUrl || site}" style="display:inline-block;padding:18px 44px;font-family:${hf};font-size:15px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.heroCta}</a></td></tr></table></td></tr>
</table></td></tr></table>

<!-- BLOCK 4: PRODUCT GRID -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center" style="padding:52px 24px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.productsEyebrow}</p></td></tr>
<tr><td align="center"><h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">${config.productsHeadline}</h2></td></tr>
<tr><td style="padding:0 0 16px 0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkBg)},0.05);border:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.12);border-radius:6px;"><tr class="product-card-row">
<td class="product-card-img" width="180" valign="top" style="padding:0;background-image:url('${p1.imageUrl}');background-size:cover;background-position:center;background-color:rgba(${hexToRgbStr(palette.darkBg)},0.05);border-radius:6px 0 0 6px;"><a href="${p1.url || site}" style="display:block;min-height:200px;"></a></td>
<td class="product-card-body" valign="middle" style="padding:20px 24px;">
<p style="margin:0 0 4px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 4px;font-family:${hf};font-size:24px;color:${palette.darkBg};font-weight:${hw};text-transform:${ht};">${p1.name}</p>
<p style="margin:0 0 16px;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);">${p1.price}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${p1.url || site}" style="display:inline-block;padding:14px 28px;font-family:${hf};font-size:13px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.productButtonText}</a></td></tr></table>
</td></tr></table></td></tr>
<tr><td style="padding:16px 0 0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkBg)},0.05);border:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.12);border-radius:6px;"><tr class="product-card-row">
<td class="product-card-img" width="180" valign="top" style="padding:0;background-image:url('${p2.imageUrl}');background-size:cover;background-position:center;background-color:rgba(${hexToRgbStr(palette.darkBg)},0.05);border-radius:6px 0 0 6px;"><a href="${p2.url || site}" style="display:block;min-height:200px;"></a></td>
<td class="product-card-body" valign="middle" style="padding:20px 24px;">
<p style="margin:0 0 4px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 4px;font-family:${hf};font-size:24px;color:${palette.darkBg};font-weight:${hw};text-transform:${ht};">${p2.name}</p>
<p style="margin:0 0 16px;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);">${p2.price}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${p2.url || site}" style="display:inline-block;padding:14px 28px;font-family:${hf};font-size:13px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.productButtonText}</a></td></tr></table>
</td></tr></table></td></tr>
</table></td></tr></table>

<!-- BLOCK 5: CTA BANNER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.secondaryBg};"><tr><td align="center" style="padding:60px 40px;">
<table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;"><tr><td align="center">
<h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.secondaryText};line-height:1.3;text-align:center;text-transform:${ht};">${config.ctaBannerHeadline}</h2>
<p style="margin:0 0 28px;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.secondaryText)},0.9);line-height:1.7;text-align:center;">${config.ctaBannerBody}</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${site}" style="display:inline-block;padding:18px 44px;font-family:${hf};font-size:15px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.ctaBannerCta}</a></td></tr></table>
</td></tr></table></td></tr></table>

<!-- BLOCK 6: HOW IT WORKS -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center" style="padding:56px 34px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.stepsEyebrow}</p></td></tr>
<tr><td align="center"><h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">${config.stepsHeadline}</h2></td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="33%" align="center" valign="top" style="padding:0 10px;">
<div style="width:52px;height:52px;border-radius:50%;background:${palette.darkBg};color:${palette.darkText};font-family:${hf};font-size:24px;line-height:52px;text-align:center;margin:0 auto 16px;">1</div>
<p style="margin:0 0 6px;font-family:${hf};font-size:22px;color:${palette.darkBg};font-weight:${hw};text-align:center;text-transform:${ht};">${config.step1Title}</p>
<p style="margin:0;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.6;text-align:center;">${config.step1Body}</p>
</td>
<td width="33%" align="center" valign="top" style="padding:0 10px;">
<div style="width:52px;height:52px;border-radius:50%;background:${palette.darkBg};color:${palette.darkText};font-family:${hf};font-size:24px;line-height:52px;text-align:center;margin:0 auto 16px;">2</div>
<p style="margin:0 0 6px;font-family:${hf};font-size:22px;color:${palette.darkBg};font-weight:${hw};text-align:center;text-transform:${ht};">${config.step2Title}</p>
<p style="margin:0;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.6;text-align:center;">${config.step2Body}</p>
</td>
<td width="33%" align="center" valign="top" style="padding:0 10px;">
<div style="width:52px;height:52px;border-radius:50%;background:${palette.darkBg};color:${palette.darkText};font-family:${hf};font-size:24px;line-height:52px;text-align:center;margin:0 auto 16px;">3</div>
<p style="margin:0 0 6px;font-family:${hf};font-size:22px;color:${palette.darkBg};font-weight:${hw};text-align:center;text-transform:${ht};">${config.step3Title}</p>
<p style="margin:0;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.6;text-align:center;">${config.step3Body}</p>
</td>
</tr></table></td></tr>
</table></td></tr></table>

<!-- BLOCK 7: INGREDIENTS -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center" style="padding:56px 28px;">
<table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.ingredientsEyebrow}</p></td></tr>
<tr><td align="center"><h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">${config.ingredientsHeadline}</h2></td></tr>
<tr><td><table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" valign="top" style="padding:0 6px 12px 0;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkBg)},0.06);border:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:${palette.darkBg};margin:0 auto 12px;line-height:52px;font-size:22px;text-align:center;color:${palette.darkText};">${ic0.icon}</div><p style="margin:0 0 6px;font-family:${hf};font-size:22px;color:${palette.darkBg};font-weight:${hw};text-align:center;text-transform:${ht};">${ic0.title}</p><p style="margin:0;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.6;text-align:center;">${ic0.body}</p></td></tr></table></td>
<td width="50%" valign="top" style="padding:0 0 12px 6px;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkBg)},0.06);border:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:${palette.darkBg};margin:0 auto 12px;line-height:52px;font-size:22px;text-align:center;color:${palette.darkText};">${ic1.icon}</div><p style="margin:0 0 6px;font-family:${hf};font-size:22px;color:${palette.darkBg};font-weight:${hw};text-align:center;text-transform:${ht};">${ic1.title}</p><p style="margin:0;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.6;text-align:center;">${ic1.body}</p></td></tr></table></td>
</tr><tr>
<td width="50%" valign="top" style="padding:0 6px 0 0;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkBg)},0.06);border:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:${palette.darkBg};margin:0 auto 12px;line-height:52px;font-size:22px;text-align:center;color:${palette.darkText};">${ic2.icon}</div><p style="margin:0 0 6px;font-family:${hf};font-size:22px;color:${palette.darkBg};font-weight:${hw};text-align:center;text-transform:${ht};">${ic2.title}</p><p style="margin:0;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.6;text-align:center;">${ic2.body}</p></td></tr></table></td>
<td width="50%" valign="top" style="padding:0 0 0 6px;height:220px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.darkBg)},0.06);border:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);border-radius:6px;height:100%;"><tr><td align="center" style="padding:22px;text-align:center;"><div style="width:52px;height:52px;border-radius:50%;background:${palette.darkBg};margin:0 auto 12px;line-height:52px;font-size:22px;text-align:center;color:${palette.darkText};">${ic3.icon}</div><p style="margin:0 0 6px;font-family:${hf};font-size:22px;color:${palette.darkBg};font-weight:${hw};text-align:center;text-transform:${ht};">${ic3.title}</p><p style="margin:0;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.6;text-align:center;">${ic3.body}</p></td></tr></table></td>
</tr></table></td></tr>
</table></td></tr></table>

<!-- BLOCK 8: EXPERIENCE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};">
<tr><td align="center" style="padding:0;background-image:url('${experienceImg}');background-size:cover;background-position:center;background-color:${palette.lightBg};height:300px;max-height:300px;"></td></tr>
<tr><td align="center" style="padding:40px 44px 56px;">
<p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.experienceEyebrow}</p>
<h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkBg};line-height:1.3;text-align:center;text-transform:${ht};">${config.experienceHeadline}</h2>
<p style="margin:0 0 16px;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.75;text-align:center;">${config.experienceBody}</p>
<p style="margin:0 0 28px;font-family:${bf};font-size:18px;font-style:italic;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);text-align:center;">${config.experienceQuote}</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${site}" style="display:inline-block;padding:18px 44px;font-family:${hf};font-size:15px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.experienceCta}</a></td></tr></table>
</td></tr></table>

<!-- BLOCK 9: TESTIMONIALS -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.darkBg};"><tr><td align="center" style="padding:56px 34px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.testimonialsEyebrow}</p></td></tr>
<tr><td align="center"><h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkText};text-align:center;text-transform:${ht};">Real Experiences</h2></td></tr>
<tr><td style="padding:22px 24px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" valign="top" style="padding-right:14px;"><div style="width:44px;height:44px;border-radius:50%;background:${palette.darkBg};border:2px solid rgba(255,255,255,0.12);color:${palette.darkText};font-family:${hf};font-size:20px;line-height:44px;text-align:center;">${(t0.author || 'A')[0]}</div></td>
<td valign="top"><p style="margin:0 0 4px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p><p style="margin:0 0 8px;font-family:${bf};font-size:20px;font-style:italic;color:${palette.darkText};line-height:1.6;">"${t0.quote}"</p><p style="margin:0;font-family:${hf};font-size:12px;color:rgba(${hexToRgbStr(palette.darkText)},0.9);letter-spacing:1px;">${t0.author}</p></td>
</tr></table></td></tr>
<tr><td style="height:14px;"></td></tr>
<tr><td style="padding:22px 24px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" valign="top" style="padding-right:14px;"><div style="width:44px;height:44px;border-radius:50%;background:${palette.darkBg};border:2px solid rgba(255,255,255,0.12);color:${palette.darkText};font-family:${hf};font-size:20px;line-height:44px;text-align:center;">${(t1.author || 'A')[0]}</div></td>
<td valign="top"><p style="margin:0 0 4px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p><p style="margin:0 0 8px;font-family:${bf};font-size:20px;font-style:italic;color:${palette.darkText};line-height:1.6;">"${t1.quote}"</p><p style="margin:0;font-family:${hf};font-size:12px;color:rgba(${hexToRgbStr(palette.darkText)},0.9);letter-spacing:1px;">${t1.author}</p></td>
</tr></table></td></tr>
<tr><td style="height:14px;"></td></tr>
<tr><td style="padding:22px 24px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:6px;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44" valign="top" style="padding-right:14px;"><div style="width:44px;height:44px;border-radius:50%;background:${palette.darkBg};border:2px solid rgba(255,255,255,0.12);color:${palette.darkText};font-family:${hf};font-size:20px;line-height:44px;text-align:center;">${(t2.author || 'A')[0]}</div></td>
<td valign="top"><p style="margin:0 0 4px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p><p style="margin:0 0 8px;font-family:${bf};font-size:20px;font-style:italic;color:${palette.darkText};line-height:1.6;">"${t2.quote}"</p><p style="margin:0;font-family:${hf};font-size:12px;color:rgba(${hexToRgbStr(palette.darkText)},0.9);letter-spacing:1px;">${t2.author}</p></td>
</tr></table></td></tr>
</table></td></tr></table>

<!-- BLOCK 10: SOCIAL PROOF -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.secondaryBg};"><tr><td align="center" style="padding:44px 34px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;"><tr><td align="center">
<p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:1px;text-align:center;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<h2 style="margin:0 0 6px;font-family:${hf};font-size:48px;font-weight:${hw};color:${palette.secondaryText};text-align:center;text-transform:${ht};">${config.reviewCount}</h2>
<p style="margin:0 0 4px;font-family:${bf};font-size:20px;color:${palette.secondaryText};text-align:center;">Five-Star Reviews</p>
<p style="margin:0;font-family:${bf};font-size:20px;font-style:italic;color:rgba(${hexToRgbStr(palette.secondaryText)},0.9);text-align:center;">"${config.socialProofQuote}"</p>
</td></tr></table></td></tr></table>

<!-- BLOCK 11: FOUNDER / ORIGIN -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr class="origin-row">
<td class="origin-img" width="50%" valign="top" style="padding:0;background-image:url('${originImg}');background-size:cover;background-position:center;background-color:${palette.lightBg};"><div style="min-height:280px;"></div></td>
<td width="50%" valign="middle" style="padding:44px 32px;">
<p style="margin:0 0 8px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};">${config.originEyebrow}</p>
<h3 style="margin:0 0 14px;font-family:${hf};font-size:26px;font-weight:${hw};color:${palette.darkBg};line-height:1.3;text-transform:${ht};">${config.originHeadline}</h3>
<p style="margin:0 0 22px;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.7;">${config.originBody}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${site}/pages/about" style="display:inline-block;padding:16px 32px;font-family:${hf};font-size:14px;font-weight:500;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.originCta} &#8594;</a></td></tr></table>
</td></tr></table></td></tr></table>

<!-- BLOCK 12: SUBSCRIBE & SAVE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};">
<tr><td align="center" style="padding:40px 40px 56px;">
<p style="margin:0 0 8px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.subscribeEyebrow}</p>
<h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkBg};line-height:1.3;text-align:center;text-transform:${ht};">${config.subscribeHeadline}</h2>
<p style="margin:0 0 20px;font-family:${bf};font-size:20px;font-style:italic;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);text-align:center;">${config.subscribeTagline}</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;" align="center">
<tr><td style="padding:5px 0;font-family:${bf};font-size:20px;color:${palette.darkBg};text-align:center;"><span style="color:${palette.darkBg};">&#10003;</span> ${sp[0] || ''}</td></tr>
<tr><td style="padding:5px 0;font-family:${bf};font-size:20px;color:${palette.darkBg};text-align:center;"><span style="color:${palette.darkBg};">&#10003;</span> ${sp[1] || ''}</td></tr>
<tr><td style="padding:5px 0;font-family:${bf};font-size:20px;color:${palette.darkBg};text-align:center;"><span style="color:${palette.darkBg};">&#10003;</span> ${sp[2] || ''}</td></tr>
<tr><td style="padding:5px 0;font-family:${bf};font-size:20px;color:${palette.darkBg};text-align:center;"><span style="color:${palette.darkBg};">&#10003;</span> ${sp[3] || ''}</td></tr>
</table>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${site}" style="display:inline-block;padding:18px 44px;font-family:${hf};font-size:15px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.subscribeCta}</a></td></tr></table>
</td></tr></table>

<!-- BLOCK 13: PRODUCT FEATURE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.darkBg};"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr class="feature-row">
<td width="50%" valign="middle" style="padding:48px 32px;">
<p style="margin:0 0 8px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};">${config.featuredProductLabel}</p>
<h2 style="margin:0 0 14px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkText};line-height:1.3;text-transform:${ht};">${config.featuredProductName || p1.name}</h2>
<p style="margin:0 0 8px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:1px;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 24px;font-family:${bf};font-size:20px;color:rgba(255,255,255,0.9);line-height:1.7;">${config.featuredProductBody}</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${palette.accent};border-radius:2px;"><a href="${p1.url || site}" style="display:inline-block;padding:18px 40px;font-family:${hf};font-size:15px;font-weight:600;color:${palette.accentText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">${config.featuredProductCta}</a></td></tr></table>
</td>
<td class="feature-img" width="50%" valign="top" style="padding:0;background-color:${palette.accent};background-image:url('${p1.imageUrl}');background-size:cover;background-position:center;"><div style="min-height:320px;"></div></td>
</tr></table></td></tr></table>

<!-- BLOCK 14: PROMO CODE -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center" style="padding:52px 34px;">
<table width="460" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;width:100%;border-radius:6px;background:${palette.secondaryBg};">
<tr><td align="center" style="padding:44px 36px;">
<p style="margin:0 0 8px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};font-weight:500;text-align:center;">${config.promoEyebrow}</p>
<h1 style="margin:0 0 20px;font-family:${hf};font-size:72px;font-weight:${hw};color:${palette.secondaryText};line-height:1;text-align:center;text-transform:${ht};">${config.promoPercent}</h1>
<p style="margin:2px 0 0;font-family:${hf};font-size:22px;color:${palette.secondaryText};letter-spacing:1px;text-align:center;text-transform:${ht};">Off Your First Order</p>
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;" align="center"><tr><td style="padding:12px 30px;border:1.5px dashed rgba(${hexToRgbStr(palette.secondaryText)},0.3);border-radius:4px;background:rgba(${hexToRgbStr(palette.secondaryText)},0.08);"><p style="margin:0;font-family:'Courier New',monospace;font-size:24px;font-weight:700;color:${palette.secondaryText};letter-spacing:5px;text-align:center;">${config.promoCode}</p></td></tr></table>
<p style="margin:0 0 24px;font-family:${bf};font-size:18px;color:rgba(${hexToRgbStr(palette.secondaryText)},0.9);text-align:center;">Apply at checkout &#183; First-time customers only</p>
<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${site}" style="display:inline-block;padding:18px 44px;font-family:${hf};font-size:15px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">Redeem Now</a></td></tr></table>
</td></tr></table></td></tr></table>

<!-- BLOCK 15: FAQ -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center" style="padding:56px 34px;">
<table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.faqEyebrow}</p></td></tr>
<tr><td align="center"><h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">${config.faqHeadline}</h2></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:${hf};font-size:22px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">How does shipping work?</h4><p style="margin:0;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.7;text-align:center;">Free shipping on orders over $50. Most orders ship within 1-2 business days.</p></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:${hf};font-size:22px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">${fq0.question}</h4><p style="margin:0;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.7;text-align:center;">${fq0.answer}</p></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:${hf};font-size:22px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">${fq1.question}</h4><p style="margin:0;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.7;text-align:center;">${fq1.answer}</p></td></tr>
<tr><td style="padding:18px 0;border-top:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);border-bottom:1px solid rgba(${hexToRgbStr(palette.darkBg)},0.1);text-align:center;"><h4 style="margin:0 0 6px;font-family:${hf};font-size:22px;font-weight:${hw};color:${palette.darkBg};text-align:center;text-transform:${ht};">Do you ship internationally?</h4><p style="margin:0;font-family:${bf};font-size:20px;color:rgba(${hexToRgbStr(palette.darkBg)},0.9);line-height:1.7;text-align:center;">Contact us for international shipping options.</p></td></tr>
<tr><td align="center" style="padding-top:28px;"><table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${site}/pages/faq" style="display:inline-block;padding:16px 32px;font-family:${hf};font-size:14px;font-weight:500;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">View All FAQs &#8594;</a></td></tr></table></td></tr>
</table></td></tr></table>

<!-- BLOCK 16: BLOG -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.secondaryBg};"><tr><td align="center" style="padding:56px 28px;">
<table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;">
<tr><td align="center"><p style="margin:0 0 6px;font-family:${hf};font-size:14px;color:${palette.accent};letter-spacing:3px;text-transform:${ht};text-align:center;">${config.blogEyebrow}</p></td></tr>
<tr><td align="center"><h2 style="margin:0 0 20px;font-family:${hf};font-size:32px;font-weight:${hw};color:${palette.secondaryText};text-align:center;text-transform:${ht};">${config.blogHeadline}</h2></td></tr>
<tr><td style="padding:0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.secondaryText)},0.06);border:1px solid rgba(${hexToRgbStr(palette.secondaryText)},0.1);border-radius:6px;"><tr><td style="padding:24px;">
<p style="margin:0 0 8px;font-family:${hf};font-size:12px;color:${palette.accent};letter-spacing:2px;text-transform:${ht};text-align:left;">${b0.category || 'Journal'}</p>
<h3 style="margin:0 0 10px;font-family:${hf};font-size:22px;font-weight:${hw};color:${palette.secondaryText};line-height:1.3;text-align:left;text-transform:${ht};">${b0.title}</h3>
<p style="margin:0 0 16px;font-family:${bf};font-size:19px;color:rgba(${hexToRgbStr(palette.secondaryText)},0.9);line-height:1.7;text-align:left;">${b0.excerpt}</p>
<a href="${b0.url || site}" style="font-family:${hf};font-size:15px;font-weight:500;color:${palette.secondaryText};text-decoration:none;letter-spacing:2px;text-transform:${ht};border-bottom:1px solid rgba(${hexToRgbStr(palette.secondaryText)},0.3);padding-bottom:2px;">Read More &#8594;</a>
</td></tr></table></td></tr>
<tr><td style="padding:0 0 16px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(${hexToRgbStr(palette.secondaryText)},0.06);border:1px solid rgba(${hexToRgbStr(palette.secondaryText)},0.1);border-radius:6px;"><tr><td style="padding:24px;">
<p style="margin:0 0 8px;font-family:${hf};font-size:12px;color:${palette.accent};letter-spacing:2px;text-transform:${ht};text-align:left;">${b1.category || 'Journal'}</p>
<h3 style="margin:0 0 10px;font-family:${hf};font-size:22px;font-weight:${hw};color:${palette.secondaryText};line-height:1.3;text-align:left;text-transform:${ht};">${b1.title}</h3>
<p style="margin:0 0 16px;font-family:${bf};font-size:19px;color:rgba(${hexToRgbStr(palette.secondaryText)},0.9);line-height:1.7;text-align:left;">${b1.excerpt}</p>
<a href="${b1.url || site}" style="font-family:${hf};font-size:15px;font-weight:500;color:${palette.secondaryText};text-decoration:none;letter-spacing:2px;text-transform:${ht};border-bottom:1px solid rgba(${hexToRgbStr(palette.secondaryText)},0.3);padding-bottom:2px;">Read More &#8594;</a>
</td></tr></table></td></tr>
<tr><td align="center" style="padding-top:28px;"><table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:${palette.darkBg};border-radius:2px;"><a href="${site}/blogs" style="display:inline-block;padding:18px 44px;font-family:${hf};font-size:15px;font-weight:600;color:${palette.darkText};text-decoration:none;letter-spacing:2px;text-transform:${ht};">View All Articles</a></td></tr></table></td></tr>
</table></td></tr></table>

<!-- BLOCK 17: LIFESTYLE IMAGE BREAK -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.lightBg};"><tr><td align="center" style="padding:0;">
<a href="${site}"><img src="${lifestyleBreakImg}" alt="" width="600" style="display:block;width:100%;max-width:600px;"></a>
</td></tr></table>

<!-- BLOCK 18: FOOTER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${palette.darkBg};"><tr><td align="center" style="padding:48px 34px 24px;">
<table width="500" cellpadding="0" cellspacing="0" border="0" style="max-width:500px;width:100%;">
<tr><td align="center" style="padding-bottom:16px;"><a href="${site}"><img src="${darkLogo}" alt="${brand.name}" style="display:block;max-width:120px;max-height:40px;width:auto;height:auto;"></a></td></tr>
<tr><td align="center" style="padding-bottom:22px;"><p style="margin:0;font-family:${bf};font-size:15px;font-style:italic;color:rgba(255,255,255,0.9);text-align:center;">${config.footerTagline}</p></td></tr>
<tr><td align="center" style="padding-bottom:22px;text-align:center;"><a href="${config.instagramUrl || '#'}" style="font-family:${hf};font-size:13px;color:${palette.accent};text-decoration:none;letter-spacing:2px;text-transform:${ht};">Instagram</a></td></tr>
<tr><td align="center" style="padding-bottom:22px;text-align:center;"><a href="${site}/collections/all" style="font-family:${hf};font-size:13px;color:rgba(255,255,255,0.9);text-decoration:none;padding:0 8px;">Shop</a><a href="${site}/pages/about" style="font-family:${hf};font-size:13px;color:rgba(255,255,255,0.9);text-decoration:none;padding:0 8px;">About</a><a href="${site}/pages/faq" style="font-family:${hf};font-size:13px;color:rgba(255,255,255,0.9);text-decoration:none;padding:0 8px;">FAQs</a><a href="${site}/pages/contact" style="font-family:${hf};font-size:13px;color:rgba(255,255,255,0.9);text-decoration:none;padding:0 8px;">Contact</a></td></tr>
<tr><td style="padding-bottom:16px;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>
<tr><td align="center"><p style="margin:0;font-family:${hf};font-size:11px;color:rgba(255,255,255,0.9);text-align:center;">&#169; ${year} ${brand.name} &#183; <a href="${site}/policies/privacy-policy" style="color:rgba(255,255,255,0.9);text-decoration:underline;">Privacy</a></p></td></tr>
</table></td></tr></table>

</td></tr>
</table>
</td></tr></table>
</body>
</html>`
}
