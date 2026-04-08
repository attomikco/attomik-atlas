'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Upload, ArrowLeft } from 'lucide-react'
import AttomikLogo from '@/components/ui/AttomikLogo'
import MagicModal from '@/components/ui/MagicModal'
import { colors, font, fontWeight, fontSize, radius, transition, letterSpacing } from '@/lib/design-tokens'

const inputCls = `w-full text-sm border border-border rounded-btn px-3 py-2.5 bg-cream focus:outline-none focus:border-accent transition-colors font-sans placeholder:text-[${colors.gray500}]`

function isLight(hex: string) {
  const c = (hex || '').replace('#', '')
  if (c.length < 6) return true
  const r = parseInt(c.slice(0,2),16)
  const g = parseInt(c.slice(2,4),16)
  const b = parseInt(c.slice(4,6),16)
  return (r*299+g*587+b*114)/1000 > 128
}

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setIsLoggedIn(true); setAuthChecked(true) })
  }, [])

  // Step 1 — two states
  const [detecting, setDetecting] = useState(!!searchParams.get('url'))
  const [detected, setDetected] = useState(false)
  const [detectedName, setDetectedName] = useState<string | null>(null)
  const [detectedImage, setDetectedImage] = useState<string | null>(null)
  const [detectedLogo, setDetectedLogo] = useState<string | null>(null)
  const [brandName, setBrandName] = useState('')
  const [website, setWebsite] = useState(searchParams.get('url') || '')
  const [category, setCategory] = useState('')
  const [brandFont, setBrandFont] = useState('')
  const [fontTransform, setFontTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none')
  const [fontLetterSpacing, setFontLetterSpacing] = useState<'wide' | 'tight' | 'normal'>('normal')
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [accentColor, setAccentColor] = useState('#00ff97')
  const [scrapedPalette, setScrapedPalette] = useState<string[]>([])
  const [activeColorField, setActiveColorField] = useState<string | null>(null)

  // Close color palette picker on outside click
  useEffect(() => {
    if (!activeColorField) return
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('.wiz-color-grid')) setActiveColorField(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [activeColorField])

  // Business type
  type BusinessType = 'shopify' | 'ecommerce' | 'saas' | 'restaurant' | 'service' | 'brand'
  type DetectedOffering = { name: string; description: string | null; price: string | null; image: string | null; type: 'product' | 'plan' | 'service' | 'menu_item' }
  const [businessType, setBusinessType] = useState<BusinessType>('brand')
  const [offerings, setOfferings] = useState<DetectedOffering[]>([])

  // Step 2
  type DetectedProduct = { name: string; description: string | null; price: string | null; image: string | null }
  type ScrapedImage = { url: string; tag: 'product' | 'lifestyle' | 'background' | 'logo' | 'press' | 'shopify' | 'other'; score: number; alt?: string | null }
  const [detectedImages, setDetectedImages] = useState<ScrapedImage[]>([])
  const [detectedProducts, setDetectedProducts] = useState<DetectedProduct[]>([])
  const [productName, setProductName] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null)
  const [targetAudience, setTargetAudience] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [showModal, setShowModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoAnalyzed = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [step, detected])

  // Auto-analyze if URL param provided
  useEffect(() => {
    if (searchParams.get('url') && !autoAnalyzed.current && !detected) {
      autoAnalyzed.current = true
      analyzeWebsite()
    }
  }, [])

  // Step 3
  const [campaignName, setCampaignName] = useState('')

  async function analyzeWebsite() {
    if (!website.trim()) { setErrors({ website: 'Enter a URL' }); return }
    setBrandName('')
    setPrimaryColor('#000000')
    setSecondaryColor('#ffffff')
    setAccentColor('#00ff97')
    setBrandFont('')
    setDetectedImage(null)
    setDetectedLogo(null)
    setDetectedProducts([])
    setDetectedImages([])
    setDetecting(true)
    setErrors({})
    try {
      const res = await fetch('/api/brands/detect-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website.trim() }),
      })
      const data = await res.json()
      if (data.name) { setBrandName(data.name); setDetectedName(data.name) }
      if (data.colors?.[0]) setPrimaryColor(data.colors[0])
      if (data.colors?.[1]) setSecondaryColor(data.colors[1])
      if (data.colors?.[2]) setAccentColor(data.colors[2])
      if (data.allColors?.length) setScrapedPalette(data.allColors)
      if (data.font) setBrandFont(data.font)
      if (data.fontTransform && data.fontTransform !== 'none') setFontTransform(data.fontTransform)
      if (data.letterSpacing && data.letterSpacing !== 'normal') setFontLetterSpacing(data.letterSpacing)
      if (data.ogImage) setDetectedImage(data.ogImage)
      if (data.logo) setDetectedLogo(data.logo)
      if (data.products?.length > 0) setDetectedProducts(data.products)
      if (data.images?.length > 0) setDetectedImages(data.images)
      if (data.businessType) setBusinessType(data.businessType)
      if (data.offerings?.length) setOfferings(data.offerings)
      setDetected(true)
    } catch {
      setBrandName('')
      setDetected(true)
    }
    setDetecting(false)
  }

  function skipToManual() {
    setDetected(true)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (step === 0 && !brandName.trim()) errs.brandName = 'Brand name is required'
    if (step === 1 && detectedProducts.length === 0 && offerings.length === 0 && !productName.trim()) errs.productName = 'Add a product name'
    if (step === 2 && !campaignName.trim()) errs.campaignName = 'Campaign name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (!validate()) return
    if (step === 1 && !campaignName) setCampaignName(`${brandName.trim()} — Launch Campaign`)
    setStep(s => Math.min(s + 1, 2))
  }

  function back() {
    setErrors({})
    setStep(s => Math.max(s - 1, 0))
  }

  async function submit() {
    if (!validate()) return

    // Show animation immediately — no waiting
    setShowModal(true)
    setSaving(true)

    // Small delay so modal renders before heavy DB work starts
    await new Promise(r => setTimeout(r, 100))

    const slug = brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6)

    // If logged in, assign brand to current user
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    const { data: brand, error: brandErr } = await supabase.from('brands').insert({
      name: brandName.trim(),
      slug,
      website: website.trim() || null,
      ...(currentUser ? { user_id: currentUser.id, client_email: currentUser.email } : {}),
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      accent_color: accentColor || null,
      font_primary: brandFont ? `${brandFont}|700|${fontTransform}` : null,
      font_heading: brandFont ? { family: brandFont, weight: '700', transform: fontTransform, letterSpacing: fontLetterSpacing } : null,
      logo_url: null,
      notes: JSON.stringify({ business_type: businessType, scraped_colors: scrapedPalette.length > 0 ? scrapedPalette : null }),
      products: (() => {
        if (detectedProducts.length > 0) {
          return detectedProducts.map(p => ({
            name: p.name, description: p.description || null,
            price_range: p.price || null, image: p.image || null,
          }))
        }
        if (offerings.length > 0) {
          return offerings.map(o => ({
            name: o.name, description: o.description || null,
            price_range: o.price || null, image: o.image || null,
          }))
        }
        if (productName.trim()) {
          return [{ name: productName.trim(), description: productDesc.trim() || null, price_range: priceRange.trim() || null, image: null }]
        }
        return null
      })(),
      status: 'active',
    }).select('id').single()

    if (brandErr || !brand) {
      setShowModal(false)
      setErrors({ submit: brandErr?.message || 'Failed to create brand' })
      setSaving(false)
      return
    }

    const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
      brand_id: brand.id, name: campaignName.trim(), type: 'funnel', status: 'draft',
    }).select('id').single()

    if (campErr || !campaign) {
      setShowModal(false)
      setErrors({ submit: campErr?.message || 'Failed to create campaign' })
      setSaving(false)
      return
    }

    // Store demo IDs for post-auth redirect
    sessionStorage.setItem('attomik_demo_brand_id', brand.id)
    sessionStorage.setItem('attomik_demo_campaign_id', campaign.id)

    // Redirect immediately — uploads continue in background
    router.push(`/preview/${campaign.id}`)

    // Fire and forget to server — survives component unmount
    fetch(`/api/brands/${brand.id}/upload-scraped-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logoUrl: detectedLogo || null,
        productImageUrls: detectedProducts.map(p => p.image).filter(Boolean),
        scrapedImages: [
          ...(detectedImage ? [{ url: detectedImage, tag: 'lifestyle', alt: null }] : []),
          ...detectedImages.map(i => ({ url: i.url, tag: i.tag, alt: i.alt || null })),
        ].slice(0, 25),
      }),
    }).catch(() => {})
  }

  // ── Step 1 content ──────────────────────────────────────────────
  const step1Content = !detected ? (
    // STATE A: rendered in the hero layout above, not inside the card
    null
  ) : (
    // STATE B: Brand reveal
    <div key="review" style={{ animation: 'fadeInUp 0.2s ease-out' }}>
      {/* Tiny back link */}
      <button onClick={() => router.push('/')} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink, background: colors.accent,
        border: 'none', borderRadius: radius.pill,
        cursor: 'pointer', marginBottom: 16,
        padding: '8px 16px',
        transition: `background ${transition.normal}`,
      }}>
        <ArrowLeft size={14} /> Back to website detection
      </button>

      {/* Brand identity card */}
      <div className="wiz-brand-row" style={{ borderRadius: radius['2xl'], overflow: 'hidden', marginBottom: 16, display: 'flex', background: colors.darkCardAlt }}>
        {/* Left: brand info */}
        <div className="wiz-brand-info" style={{ flex: '0 0 50%', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
          {detectedLogo && (
            <div style={{ marginBottom: 16 }}>
              <img
                src={detectedLogo}
                alt={brandName}
                style={{
                  height: 48,
                  maxWidth: 160,
                  objectFit: 'contain',
                  objectPosition: 'left center',
                  display: 'block',
                  filter: !isLight(primaryColor || colors.ink) ? 'brightness(0) invert(1)' : 'none',
                }}
                onError={e => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}
          <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['5xl'], color: colors.paper, lineHeight: 1.1 }}>
            {brandName || 'Your Brand'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[
              { label: 'Primary', value: primaryColor },
              { label: 'Secondary', value: secondaryColor },
              { label: 'Accent', value: accentColor },
            ].filter(c => c.value).map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 28, height: 28, borderRadius: radius.md, background: value!, border: `2px solid ${colors.whiteAlpha15}` }} />
                <span style={{ fontSize: fontSize['2xs'], fontWeight: fontWeight.bold, color: colors.whiteAlpha40, letterSpacing: letterSpacing.wide, textTransform: 'uppercase' as const }}>{label}</span>
              </div>
            ))}
          </div>
          {brandFont && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ background: colors.whiteAlpha8, borderRadius: radius['4xl'], padding: '4px 12px', fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.whiteAlpha70 }}>{brandFont}</div>
            </div>
          )}
          {/* Bottom pills row */}
          <div style={{
            display: 'flex', gap: 6,
            flexWrap: 'wrap',
            marginTop: 12,
          }}>
            {businessType !== 'brand' && (
              <div style={{
                background: colors.accentAlpha12,
                border: `1px solid ${colors.accentAlpha30}`,
                borderRadius: radius['4xl'], padding: '4px 10px',
                fontSize: fontSize.xs, color: colors.accent, fontWeight: fontWeight.bold,
                display: 'inline-flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap',
              }}>
                {{ shopify: '⬡ Shopify', ecommerce: '◻ Ecommerce', saas: '◈ SaaS', restaurant: '✦ Restaurant', service: '◆ Service', brand: '' }[businessType]}
              </div>
            )}
            <div style={{
              background: colors.accentAlpha12,
              border: `1px solid ${colors.accentAlpha30}`,
              borderRadius: radius['4xl'], padding: '4px 10px',
              fontSize: fontSize.xs, color: colors.accent, fontWeight: fontWeight.bold,
              whiteSpace: 'nowrap',
            }}>
              {detectedName ? '✦ Detected' : '✦ Manual'}
            </div>
          </div>
        </div>
        {/* Right: OG image — full bleed */}
        {detectedImage && (
          <div className="wiz-brand-img" style={{ flex: '0 0 50%', overflow: 'hidden' }}>
            <img src={detectedImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
          </div>
        )}
      </div>

      {/* Logo strip */}
      {detectedLogo && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray700,
            letterSpacing: letterSpacing.wider, textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Logo
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center',
            background: primaryColor || colors.gray200,
            border: '1px solid var(--border)',
            borderRadius: radius.lg, padding: 12,
            width: 80, height: 80,
          }}>
            <img
              src={detectedLogo}
              alt="Logo"
              style={{
                maxWidth: 56, maxHeight: 56,
                objectFit: 'contain', display: 'block',
                filter: primaryColor && !isLight(primaryColor)
                  ? 'brightness(0) invert(1)'
                  : 'none',
              }}
              onError={e => {
                (e.currentTarget.parentElement as HTMLElement)
                  .style.display = 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Detected images strip */}
      {(() => {
        const displayImages = detectedImages.filter(
          img => img.tag !== 'logo' && img.url !== detectedLogo
        )
        return displayImages.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.gray700,
            letterSpacing: letterSpacing.wider, textTransform: 'uppercase', marginBottom: 8,
          }}>
            Detected images ({Math.min(displayImages.length, 8)})
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, minHeight: 80 }}>
            {displayImages.slice(0, 8).map((img, i) => (
              <img key={i} src={img.url} alt="" style={{
                width: 80, height: 80, objectFit: 'cover', borderRadius: radius.md,
                border: '1px solid var(--border)', flexShrink: 0,
              }} onError={e => { e.currentTarget.style.display = 'none' }} />
            ))}
          </div>
        </div>
      ) : null
      })()}

      {/* Editable fields — compact 2-col grid */}
      <div className="wiz-field-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.gray800, letterSpacing: letterSpacing.label, textTransform: 'uppercase' }}>Brand name *</label>
          <input className={inputCls} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Afterdream" />
          {errors.brandName && <p className="text-danger text-xs mt-1">{errors.brandName}</p>}
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.gray800, letterSpacing: letterSpacing.label, textTransform: 'uppercase' }}>Website</label>
          <input className={inputCls} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbrand.com" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.gray800, letterSpacing: letterSpacing.label, textTransform: 'uppercase' }}>Brand font</label>
          <input className={inputCls} value={brandFont} onChange={e => setBrandFont(e.target.value)} placeholder="Fraunces, Barlow..." />
        </div>
      </div>

      {/* Color inputs label */}
      <div style={{ marginBottom: 10, marginTop: 4 }}>
        <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: 'var(--ink)', marginBottom: 2 }}>
          Pick your brand colors
        </div>
        <div style={{ fontSize: fontSize.body, color: 'var(--muted)' }}>
          For a better preview — edit anything we detected.
        </div>
      </div>

      {/* Color inputs — 3 swatches with unified palette picker */}
      <div className="wiz-color-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
        {[
          { label: 'Primary', value: primaryColor, set: setPrimaryColor, id: 'color-primary' },
          { label: 'Secondary', value: secondaryColor, set: setSecondaryColor, id: 'color-secondary' },
          { label: 'Accent', value: accentColor, set: setAccentColor, id: 'color-accent' },
        ].map(({ label, value, set, id }) => (
          <div key={id} style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: fontSize.caption, fontWeight: fontWeight.semibold, color: colors.gray800, letterSpacing: letterSpacing.label, textTransform: 'uppercase' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: radius.sm,
                background: value || colors.ink,
                border: activeColorField === id ? '2px solid #000' : '1px solid var(--border)',
                flexShrink: 0, cursor: 'pointer', transition: 'border-color 0.15s',
              }} onClick={() => setActiveColorField(activeColorField === id ? null : id)} />
              <input className={inputCls + ' font-mono'} style={{ fontSize: fontSize.caption, padding: '6px 8px' }}
                value={value} placeholder="#000000"
                onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) set(v) }}
                onFocus={() => setActiveColorField(id)}
                onBlur={e => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) set(value) }} />
            </div>
            {/* Unified color picker dropdown */}
            {activeColorField === id && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 50,
                marginTop: 6, background: '#fff', border: '1px solid #e0e0e0',
                borderRadius: 12, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                width: 200,
              }}>
                {scrapedPalette.length > 0 && (<>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 8 }}>
                    From your website
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {scrapedPalette.map(color => (
                      <div key={color} onClick={() => { set(color); setActiveColorField(null) }}
                        style={{
                          width: 28, height: 28, borderRadius: 6, background: color, cursor: 'pointer',
                          border: color === value ? '2.5px solid #000' : '1.5px solid #e0e0e0',
                          transition: 'transform 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid #eee', paddingTop: 8, marginBottom: 2 }} />
                </>)}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 6 }}>
                  Pick custom color
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={value || '#000000'} onChange={e => { set(e.target.value); setActiveColorField(null) }}
                    style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e0e0e0', cursor: 'pointer', padding: 1, background: 'none', flexShrink: 0 }} />
                  <input className={inputCls + ' font-mono'} style={{ fontSize: fontSize.caption, padding: '6px 8px', flex: 1 }}
                    value={value} placeholder="#000000"
                    onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) set(v) }}
                    onBlur={e => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) set(value) }}
                    onKeyDown={e => { if (e.key === 'Enter') setActiveColorField(null) }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const step2Config = {
    shopify:    { title: 'YOUR PRODUCTS',  subtitle: 'All saved to your brand.', emptyLabel: 'Add your hero product', itemLabel: 'product', icon: '🛍' },
    ecommerce:  { title: 'YOUR PRODUCTS',  subtitle: 'Found on your website.', emptyLabel: 'Add your main product', itemLabel: 'product', icon: '🛍' },
    saas:       { title: 'YOUR PLANS',     subtitle: 'We found your pricing tiers.', emptyLabel: 'Add your main plan', itemLabel: 'plan', icon: '◈' },
    restaurant: { title: 'YOUR MENU',      subtitle: 'We found some menu items.', emptyLabel: 'Add a signature dish', itemLabel: 'dish', icon: '✦' },
    service:    { title: 'YOUR SERVICES',  subtitle: 'What you offer your clients.', emptyLabel: 'Add your main service', itemLabel: 'service', icon: '◆' },
    brand:      { title: 'WHAT YOU OFFER', subtitle: 'Tell us about your main offering.', emptyLabel: 'Describe what you sell or offer', itemLabel: 'offering', icon: '✦' },
  }[businessType]

  const steps = [
    {
      title: detected ? 'Review your brand' : "Let's find your brand",
      subtitle: detected ? 'Edit anything below before continuing.' : "Enter your website and we'll pull in your brand automatically.",
      content: step1Content,
    },
    {
      title: (detectedProducts.length > 0 || offerings.length > 0) ? step2Config.title : 'Your product & audience',
      subtitle: (detectedProducts.length > 0 || offerings.length > 0)
        ? step2Config.subtitle
        : step2Config.emptyLabel + " — you can always update this later.",
      content: (
        <div className="space-y-4" style={{ textAlign: 'center' }}>
          {(detectedProducts.length > 0 || offerings.length > 0) ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: colors.accentAlpha12, border: `1px solid ${colors.accentAlpha20}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: fontSize['5xl'] }}>{step2Config.icon}</div>
                <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], textTransform: 'uppercase', marginBottom: 8 }}>
                  We found {detectedProducts.length || offerings.length} {(detectedProducts.length || offerings.length) === 1 ? step2Config.itemLabel : step2Config.itemLabel + 's'}.
                </div>
                <div style={{ fontSize: fontSize.md, color: colors.gray800, lineHeight: 1.6 }}>
                  All saved to your brand. You can edit them in Brand Hub after your funnel is ready.
                </div>
              </div>
              {detectedProducts.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
                  {detectedProducts.slice(0, 8).map((p, i) => (
                    <div key={i} style={{ background: '#f8f8f8' /* TODO: tokenize */, borderRadius: radius['2xl'], overflow: 'hidden', border: `1px solid ${colors.gray300}`, display: 'flex', flexDirection: 'column' }}>
                      {p.image ? (
                        <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.parentElement!.style.display = 'none' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '1/1', background: `linear-gradient(135deg, ${colors.gray250}, #e0e0e0)` /* TODO: tokenize #e0e0e0 */, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: colors.gray450 }}>◻</div>
                      )}
                      <div style={{ padding: '10px 12px' }}>
                        <div style={{ fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink, marginBottom: 2, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {p.price && <span style={{ fontSize: fontSize.caption, color: colors.gray800, fontWeight: fontWeight.medium }}>${p.price}</span>}
                          <span style={{ fontSize: fontSize['2xs'], fontWeight: fontWeight.extrabold, color: colors.brandGreen, background: colors.accentAlpha12, padding: '2px 7px', borderRadius: radius.xs, border: `1px solid ${colors.accentAlpha20}`, letterSpacing: letterSpacing.label, textTransform: 'uppercase', marginLeft: 'auto' }}>✓ Saved</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {offerings.slice(0, 6).map((o, i) => (
                    <div key={i} style={{ background: '#f8f8f8' /* TODO: tokenize */, borderRadius: radius.xl, padding: '12px 16px', border: `1px solid ${colors.gray300}`, display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
                      <span style={{ fontSize: fontSize['2xl'], color: colors.gray700 }}>{step2Config.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                        {o.price && <span style={{ fontSize: fontSize.caption, color: colors.gray800 }}>{o.price}</span>}
                      </div>
                      <span style={{ fontSize: fontSize['2xs'], fontWeight: fontWeight.extrabold, color: colors.brandGreen, background: colors.accentAlpha12, padding: '2px 7px', borderRadius: radius.xs, border: `1px solid ${colors.accentAlpha20}`, letterSpacing: letterSpacing.label, textTransform: 'uppercase', flexShrink: 0 }}>✓ Saved</span>
                    </div>
                  ))}
                </div>
              )}
              {detectedProducts.length > 8 && (
                <div style={{ fontSize: fontSize.caption, color: colors.gray700, textAlign: 'center', padding: '8px 0 0', fontWeight: fontWeight.semibold }}>+{detectedProducts.length - 8} more saved to Brand Hub</div>
              )}
            </>
          ) : (
            <>
              <div style={{ background: '#fff8ed' /* TODO: tokenize */, border: '1px solid #fde8bb' /* TODO: tokenize */, borderRadius: radius.lg, padding: '10px 14px', fontSize: fontSize.body, color: '#92660a' /* TODO: tokenize */, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                <span>💡</span>
                <span>Tip: if you&apos;re on Shopify, make sure your store is public and not password protected.</span>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Product name *</label>
                <input className={inputCls} value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Dream Blend Coffee" />
                {errors.productName && <p className="text-danger text-xs mt-1">{errors.productName}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Single unit price</label>
                <input className={inputCls} value={priceRange} onChange={e => setPriceRange(e.target.value)} placeholder="$24" />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">One-line description</label>
                <input className={inputCls} value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="Organic single-origin pour-over coffee" />
              </div>
              {(businessType === 'service' || businessType === 'brand') && (
                <button onClick={() => { setStep(2); if (!campaignName) setCampaignName(`${brandName.trim()} — Launch Campaign`) }} style={{ background: 'none', border: 'none', fontSize: fontSize.body, color: colors.gray700, cursor: 'pointer', padding: 0, marginTop: 4 }}>
                  Skip for now →
                </button>
              )}
            </>
          )}

          {/* Image uploads */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, color: 'var(--ink)', marginBottom: 4 }}>
                Product images
                <span style={{ fontSize: fontSize.body, fontWeight: fontWeight.medium, color: 'var(--muted)', marginLeft: 8 }}>optional</span>
              </div>
              <div style={{ fontSize: fontSize.md, color: 'var(--muted)' }}>
                Add images for a better preview — you can always do this later too.
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => setImageFiles(Array.from(e.target.files || []))} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors border border-dashed border-border rounded-btn px-4 py-3 w-full justify-center">
              <Upload size={14} />
              {imageFiles.length > 0 ? `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} selected` : 'Choose images'}
            </button>
          </div>
        </div>
      ),
    },
    {
      title: 'Almost there',
      subtitle: "We'll generate your full funnel automatically — ad copy, landing page brief, and creatives.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Campaign name *</label>
            <input className={inputCls} value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Spring Launch — Premium Taste" />
            {errors.campaignName && <p className="text-danger text-xs mt-1">{errors.campaignName}</p>}
          </div>
          {errors.submit && <p className="text-danger text-xs">{errors.submit}</p>}
        </div>
      ),
    },
  ]

  const current = steps[step]
  // On step 0 STATE A, hide Next — the Analyze button handles progression
  const showNext = step > 0 || detected

  const hasUrlParam = !!searchParams.get('url')
  const isHeroState = step === 0 && !detected && !hasUrlParam

  return (
    <div ref={scrollRef} className="fixed inset-0 bg-ink z-50 flex flex-col items-center wizard-scroll" style={{ padding: 'clamp(16px, 4vw, 80px) 16px', overflowY: 'auto' }}>
      <MagicModal
        isOpen={showModal}
        mode="scan"
        isDone={false}
        brandName={brandName}
      />
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .wizard-scroll::-webkit-scrollbar { display: none; }
        .wizard-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 600px) {
          .wiz-card { padding: 20px !important; }
          .wiz-brand-row { flex-direction: column !important; }
          .wiz-brand-img { flex: none !important; width: 100% !important; height: 140px !important; border-radius: 0 0 14px 14px !important; }
          .wiz-brand-info { flex: none !important; width: 100% !important; }
          .wiz-color-grid { grid-template-columns: 1fr 1fr !important; }
          .wiz-field-grid { grid-template-columns: 1fr !important; }
          .wiz-field-grid > div { grid-column: auto !important; }
          .wiz-product-grid { grid-template-columns: 1fr !important; }
          .wiz-nav { flex-direction: column !important; gap: 8px !important; }
          .wiz-nav button { width: 100% !important; text-align: center !important; }
          .wiz-subtext { font-size: 15px !important; }
        }
      `}</style>

      {/* ANALYZING STATE: URL param provided, waiting for detection */}
      {step === 0 && !detected && hasUrlParam && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20, minHeight: '60vh' }}>
          <AttomikLogo height={32} color="#ffffff" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 18, height: 18, border: `2.5px solid ${colors.accentAlpha30}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            <span style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: 'rgba(255,255,255,0.6)' /* TODO: tokenize */ }}>Analyzing {website}...</span>
          </div>
        </div>
      )}

      {/* STATE A: Full-screen hero on black */}
      {isHeroState && (
        <>
          {/* Logo */}
          <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
            <AttomikLogo height={28} color="#ffffff" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '100%', margin: '0 auto', padding: '0 16px', paddingTop: 120, textAlign: 'center' }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.accentAlpha12, border: `1px solid ${colors.accentAlpha25}`, borderRadius: radius.pill, padding: '5px 16px', fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent, letterSpacing: letterSpacing.caps, textTransform: 'uppercase', marginBottom: 24 }}>
              ✦ AI-Powered Funnel Builder
            </div>

            {/* Big headline */}
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 'clamp(32px, 8vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.03em', color: colors.paper, marginBottom: 20, textTransform: 'uppercase' as const }}>
              How much revenue are{' '}
              <span style={{ color: colors.accent }}>you leaving on the table?</span>
            </div>

            {/* Subtext */}
            <div style={{ fontSize: fontSize.xl, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 36, maxWidth: 420 }}>
              Enter your website. We&apos;ll build a complete ad funnel in 30 seconds — creatives, copy, and landing page.
            </div>

            {/* Input + button */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyzeWebsite()}
                placeholder="https://yourbrand.com"
                autoFocus
                style={{ width: '100%', padding: '16px 20px', fontSize: fontSize.lg, fontWeight: fontWeight.medium, background: colors.whiteAlpha8, border: `1.5px solid ${colors.whiteAlpha15}`, borderRadius: radius['2xl'], color: colors.paper, outline: 'none', textAlign: 'center' }}
                onFocus={e => { e.target.style.borderColor = colors.accent; e.target.style.background = 'rgba(255,255,255,0.1)' }}
                onBlur={e => { e.target.style.borderColor = colors.whiteAlpha15; e.target.style.background = colors.whiteAlpha8 }}
              />
              {errors.website && <p style={{ color: '#ff4444', fontSize: fontSize.body, margin: 0 }}>{errors.website}</p>}
              <button
                onClick={analyzeWebsite}
                disabled={detecting || !website.trim()}
                style={{
                  width: '100%', padding: 17,
                  background: detecting || !website.trim() ? colors.accentAlpha30 : colors.accent,
                  color: colors.ink, fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.xl,
                  border: 'none', borderRadius: radius['2xl'],
                  cursor: detecting || !website.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: '-0.01em', transition: `background ${transition.normal}`,
                }}
              >
                {detecting ? (
                  <>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: colors.ink, borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Analyzing your site...
                  </>
                ) : 'Build my funnel →'}
              </button>
            </div>

            {/* Skip */}
            <button onClick={skipToManual} style={{ background: 'none', border: 'none', fontSize: fontSize.body, color: 'rgba(255,255,255,0.55)', cursor: 'pointer', marginTop: 16, padding: 0 }}>
              or set up manually →
            </button>
          </div>
        </>
      )}


      {/* STATE B + Steps 1-2: White card */}
      {!isHeroState && (step > 0 || detected) && (
        <>
          {/* Logo above card */}
          <div className="flex justify-center mb-8">
            <AttomikLogo height={38} color="#ffffff" />
          </div>

          <div className="mx-4 wiz-card" style={{
            maxWidth: '100%', width: 'min(540px, calc(100vw - 32px))', background: colors.paper,
            borderRadius: 16 /* TODO: tokenize */, padding: '32px',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: 40, flexShrink: 0,
          }}>
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i === step ? colors.accent : 'transparent',
              border: i === step ? `2px solid ${colors.accent}` : '2px solid #ddd' /* TODO: tokenize #ddd */,
              transition: `all ${transition.normal}`,
            }} />
          ))}
        </div>

        <h2 className="text-center uppercase tracking-tight" style={{ fontFamily: font.heading, fontWeight: fontWeight.extrabold, fontSize: fontSize['5xl'], marginBottom: 4 }}>{current.title}</h2>
        <p className="text-muted text-sm mb-6 text-center">{current.subtitle}</p>

        {current.content}

        {/* Navigation */}
        {showNext && (
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button onClick={back} className="text-sm text-muted hover:text-ink transition-colors font-semibold">Back</button>
            ) : <div />}

            {step < 2 ? (
              <button onClick={next}
                className="text-sm font-bold px-6 py-2.5 rounded-btn transition-opacity hover:opacity-90"
                style={{ background: colors.accent, color: colors.ink }}>
                Next
              </button>
            ) : (
              <button onClick={submit} disabled={saving}
                className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-btn transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: colors.accent, color: colors.ink, position: 'relative', overflow: 'hidden' }}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Building your funnel...' : 'Build my funnel →'}
              </button>
            )}
          </div>
        )}

          </div>
        </>
      )}
    </div>
  )
}
