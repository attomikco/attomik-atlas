'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MagicModal from '@/components/ui/MagicModal'
import { colors, font, fontWeight, fontSize, radius, transition, letterSpacing } from '@/lib/design-tokens'

type BusinessType = 'shopify' | 'ecommerce' | 'saas' | 'restaurant' | 'service' | 'brand'
type ScrapedImage = { url: string; tag: string; score: number; alt?: string | null }
type DetectedProduct = { name: string; description: string | null; price: string | null; image: string | null }
type DetectedOffering = { name: string; description: string | null; price: string | null; image: string | null; type: string }

export default function OnboardingWizard() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoAnalyzed = useRef(false)

  const [url, setUrl] = useState(searchParams.get('url') || '')
  const [loading, setLoading] = useState(!!searchParams.get('url'))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [carouselPaused, setCarouselPaused] = useState(false)

  const [brandName, setBrandName] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [ogImage, setOgImage] = useState<string | null>(null)
  const [detectedColors, setDetectedColors] = useState<string[]>([])
  const [primaryColor, setPrimaryColor] = useState('#000000')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [accentColor, setAccentColor] = useState('#00ff97')
  const [scrapedPalette, setScrapedPalette] = useState<string[]>([])
  const [brandFont, setBrandFont] = useState('')
  const [fontTransform, setFontTransform] = useState<'none' | 'uppercase' | 'lowercase' | 'capitalize'>('none')
  const [fontLetterSpacing, setFontLetterSpacing] = useState<'wide' | 'tight' | 'normal'>('normal')
  const [businessType, setBusinessType] = useState<BusinessType>('brand')
  const [products, setProducts] = useState<DetectedProduct[]>([])
  const [offerings, setOfferings] = useState<DetectedOffering[]>([])
  const [images, setImages] = useState<ScrapedImage[]>([])

  useEffect(() => {
    if (searchParams.get('url') && !autoAnalyzed.current) {
      autoAnalyzed.current = true
      discover()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!brandFont) return
    const id = 'discovery-font'
    let link = document.getElementById(id) as HTMLLinkElement | null
    if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link) }
    link.href = `https://fonts.googleapis.com/css2?family=${brandFont.replace(/ /g, '+') + ':wght@400;700;900'}&display=swap`
  }, [brandFont])

  async function discover() {
    const trimmed = url.trim()
    if (!trimmed) { setError('Enter a URL'); return }
    setError('')
    setLoading(true)
    setReady(false)
    setBrandName(''); setLogo(null); setOgImage(null); setDetectedColors([])
    setPrimaryColor('#000000'); setSecondaryColor('#ffffff'); setAccentColor('#00ff97')
    setScrapedPalette([]); setBrandFont(''); setFontTransform('none')
    setFontLetterSpacing('normal'); setBusinessType('brand')
    setProducts([]); setOfferings([]); setImages([])

    try {
      const res = await fetch('/api/brands/detect-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (data.name) setBrandName(data.name)
      if (data.colors?.[0]) setPrimaryColor(data.colors[0])
      if (data.colors?.[1]) setSecondaryColor(data.colors[1])
      if (data.colors?.[2]) setAccentColor(data.colors[2])
      if (data.allColors?.length) {
        setScrapedPalette(data.allColors)
        setDetectedColors(data.allColors.slice(0, 6))
      } else if (data.colors?.length) {
        setDetectedColors(data.colors.slice(0, 6))
      }
      if (data.font) setBrandFont(data.font)
      if (data.fontTransform && data.fontTransform !== 'none') setFontTransform(data.fontTransform)
      if (data.letterSpacing && data.letterSpacing !== 'normal') setFontLetterSpacing(data.letterSpacing)
      if (data.ogImage) setOgImage(data.ogImage)
      if (data.logo) setLogo(data.logo)
      if (data.products?.length > 0) setProducts(data.products)
      if (data.images?.length > 0) setImages(data.images)
      if (data.businessType) setBusinessType(data.businessType)
      if (data.offerings?.length) setOfferings(data.offerings)
      setReady(true)
    } catch {
      setError("Couldn't read that site — try another URL")
    }
    setLoading(false)
  }

  const displayImages = (() => {
    const nonLogo = images.filter(i => i.tag !== 'logo' && i.tag !== 'press')
    const lifestyle = nonLogo.filter(i => i.tag === 'lifestyle' || i.tag === 'background')
    const product = nonLogo.filter(i => i.tag === 'product' || i.tag === 'shopify')
    const rest = nonLogo.filter(i => !lifestyle.includes(i) && !product.includes(i))
    return [...lifestyle, ...product, ...rest].slice(0, 12)
  })()

  async function buildAtlas() {
    setSaving(true)
    setShowModal(true)
    await new Promise(r => setTimeout(r, 100))

    const name = brandName.trim() || url.trim().replace(/https?:\/\//, '').split('/')[0]
    const campaignName = `${name} — Launch Campaign`
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 6)

    const { data: brand, error: brandErr } = await supabase.from('brands').insert({
      name,
      slug,
      website: url.trim() || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      accent_color: accentColor || null,
      font_primary: brandFont ? `${brandFont}|700|${fontTransform}` : null,
      font_heading: brandFont ? { family: brandFont, weight: '700', transform: fontTransform, letterSpacing: fontLetterSpacing } : null,
      logo_url: null,
      notes: JSON.stringify({ business_type: businessType, scraped_colors: scrapedPalette.length > 0 ? scrapedPalette : null }),
      products: (() => {
        if (products.length > 0) return products.map(p => ({ name: p.name, description: p.description || null, price_range: p.price || null, image: p.image || null }))
        if (offerings.length > 0) return offerings.map(o => ({ name: o.name, description: o.description || null, price_range: o.price || null, image: o.image || null }))
        return null
      })(),
      status: 'active',
    }).select('id').single()

    if (brandErr || !brand) {
      setShowModal(false)
      setError(brandErr?.message || 'Failed to create brand')
      setSaving(false)
      return
    }

    const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
      brand_id: brand.id, name: campaignName, type: 'funnel', status: 'draft',
    }).select('id').single()

    if (campErr || !campaign) {
      setShowModal(false)
      setError(campErr?.message || 'Failed to create campaign')
      setSaving(false)
      return
    }

    sessionStorage.setItem('attomik_demo_brand_id', brand.id)
    sessionStorage.setItem('attomik_demo_campaign_id', campaign.id)
    router.push(`/preview/${campaign.id}`)

    fetch(`/api/brands/${brand.id}/upload-scraped-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logoUrl: logo || null,
        productImageUrls: products.map(p => p.image).filter(Boolean),
        scrapedImages: [
          ...(ogImage ? [{ url: ogImage, tag: 'lifestyle', alt: null }] : []),
          ...images.map(i => ({ url: i.url, tag: i.tag, alt: i.alt || null })),
        ].slice(0, 25),
      }),
    }).catch(() => {})
  }

  const showCanvas = loading || ready
  const hasContent = !!(logo || brandName || detectedColors.length || brandFont || displayImages.length)
  const carouselImages = displayImages.length > 0 ? [...displayImages, ...displayImages] : []
  const carouselDuration = Math.max(20, displayImages.length * 4)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: colors.ink, overflow: 'hidden',
    }}>
      <MagicModal isOpen={showModal} mode="scan" isDone={false} brandName={brandName} />

      <style>{`
        @keyframes discFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes discSlideIn { from { opacity: 0; transform: translateX(-12px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes discPulseGlow {
          0% { box-shadow: 0 0 0 0 ${colors.accentAlpha30} }
          70% { box-shadow: 0 0 0 12px transparent }
          100% { box-shadow: 0 0 0 0 transparent }
        }
        @keyframes discSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes carouselScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .disc-carousel::before, .disc-carousel::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 8%; z-index: 2; pointer-events: none;
        }
        .disc-carousel::before { left: 0; background: linear-gradient(to right, ${colors.ink} 0%, transparent 100%); }
        .disc-carousel::after { right: 0; background: linear-gradient(to left, ${colors.ink} 0%, transparent 100%); }
        @media (max-width: 768px) {
          .disc-top { padding: 32px 16px 24px !important; }
          .disc-brand-name { font-size: clamp(28px, 6vw, 48px) !important; }
          .disc-carousel-img { height: 220px !important; aspect-ratio: 2/3 !important; }
        }
      `}</style>

      {/* ── URL INPUT LAYER ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
        opacity: showCanvas ? 0 : 1,
        transform: showCanvas ? 'scale(0.95) translateY(-20px)' : 'scale(1) translateY(0)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        pointerEvents: showCanvas ? 'none' : 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: 'clamp(36px, 7vw, 64px)', lineHeight: 1,
            color: colors.paper, textTransform: 'uppercase',
            letterSpacing: letterSpacing.tight,
            marginBottom: 12, textAlign: 'center',
          }}>
            ATLAS
          </div>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            color: colors.whiteAlpha45, textTransform: 'uppercase',
            letterSpacing: letterSpacing.wide, marginBottom: 40,
            textAlign: 'center',
          }}>
            Discover your brand
          </div>
          <input
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && discover()}
            placeholder="yourbrand.com"
            autoFocus
            style={{
              width: '100%', padding: '16px 20px',
              fontSize: fontSize.lg, fontWeight: fontWeight.medium,
              background: colors.whiteAlpha8,
              border: `1.5px solid ${colors.whiteAlpha15}`,
              borderRadius: radius['2xl'],
              color: colors.paper, outline: 'none', textAlign: 'center',
            }}
            onFocus={e => { e.target.style.borderColor = colors.accent; e.target.style.background = colors.whiteAlpha10 }}
            onBlur={e => { e.target.style.borderColor = colors.whiteAlpha15; e.target.style.background = colors.whiteAlpha8 }}
          />
          {error && !showCanvas && (
            <div style={{
              marginTop: 12, textAlign: 'center',
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.dangerSoft,
            }}>
              {error}
            </div>
          )}
          <button
            onClick={discover}
            disabled={loading || !url.trim()}
            style={{
              marginTop: 16, width: '100%', padding: 17,
              background: !url.trim() ? colors.accentAlpha30 : colors.accent,
              color: colors.ink, fontFamily: font.heading,
              fontWeight: fontWeight.bold, fontSize: fontSize.lg,
              border: 'none', borderRadius: radius['2xl'],
              cursor: !url.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: `background ${transition.normal}`,
            }}
          >
            Discover your brand →
          </button>
        </div>
      </div>

      {/* ── DISCOVERY CANVAS ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        gap: 'clamp(32px, 5vh, 56px)',
        paddingTop: 'clamp(32px, 5vh, 56px)',
        paddingBottom: 'clamp(32px, 5vh, 56px)',
        opacity: showCanvas ? 1 : 0,
        transition: `opacity ${transition.overlay}`,
        pointerEvents: showCanvas ? 'auto' : 'none',
      }}>
        {/* Scanning indicator */}
        {loading && !ready && !hasContent && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 14, height: 14,
              border: `2px solid ${colors.accentAlpha30}`,
              borderTopColor: colors.accent,
              borderRadius: '50%',
              display: 'inline-block',
              opacity: 0,
              animation: 'discSpin 0.8s linear infinite, discFadeIn 0.4s ease 0.2s forwards',
            }} />
            <span style={{
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.whiteAlpha60, textTransform: 'uppercase',
              letterSpacing: letterSpacing.wide,
              opacity: 0, animation: 'discFadeIn 0.4s ease 0.2s forwards',
            }}>
              Scanning {url.replace(/https?:\/\//, '').split('/')[0]}...
            </span>
          </div>
        )}

        {/* ── TOP SECTION — centered brand info ── */}
        {hasContent && (
          <>
            <div className="disc-top" style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', textAlign: 'center',
              maxWidth: 600, padding: '0 24px',
            }}>
              {/* Logo */}
              {logo && (
                <img
                  src={logo}
                  alt=""
                  style={{
                    maxHeight: 64, maxWidth: 240, objectFit: 'contain',
                    marginBottom: 20, display: 'block',
                    opacity: 0, animation: 'discFadeIn 0.6s ease 0.3s forwards',
                  }}
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}

              {/* Brand name */}
              {brandName && (
                <div className="disc-brand-name" style={{
                  fontFamily: brandFont ? `${brandFont}, ${font.heading}` : font.heading,
                  fontWeight: fontWeight.heading,
                  fontSize: 'clamp(36px, 5vw, 72px)',
                  lineHeight: 1.05, color: colors.paper,
                  marginBottom: 16,
                  opacity: 0, animation: 'discFadeIn 0.6s ease 0.5s forwards',
                }}>
                  {brandName}
                </div>
              )}

              {/* Color swatches */}
              {detectedColors.length > 0 && (
                <div style={{
                  display: 'flex', gap: 10, marginBottom: 20,
                  justifyContent: 'center', flexWrap: 'wrap',
                }}>
                  {detectedColors.map((c, i) => (
                    <div key={c + i} style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: c,
                      border: `2px solid ${colors.whiteAlpha15}`,
                      flexShrink: 0,
                      opacity: 0,
                      animation: `discSlideIn 0.4s ease ${0.7 + i * 0.1}s forwards`,
                    }} />
                  ))}
                </div>
              )}

              {/* Font line */}
              {brandFont && (
                <div style={{
                  marginBottom: 32,
                  opacity: 0, animation: 'discFadeIn 0.5s ease 0.9s forwards',
                }}>
                  <div style={{
                    fontFamily: font.mono, fontSize: fontSize.caption,
                    color: colors.whiteAlpha45, textTransform: 'uppercase',
                    letterSpacing: letterSpacing.wide, marginBottom: 6,
                  }}>
                    {brandFont}
                  </div>
                  <div style={{
                    fontFamily: `${brandFont}, ${font.heading}`,
                    fontSize: fontSize.xl,
                    color: colors.whiteAlpha80,
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                  }}>
                    {brandName || url.trim().replace(/https?:\/\//, '').split(/[./]/)[0] || 'Atlas'}
                  </div>
                </div>
              )}

              {/* CTA */}
              {ready && (
                <div style={{
                  marginBottom: 48,
                  opacity: 0, animation: 'discFadeIn 0.5s ease 0.3s forwards',
                }}>
                  <button
                    onClick={buildAtlas}
                    disabled={saving}
                    style={{
                      background: colors.accent, color: colors.ink,
                      fontFamily: font.heading, fontWeight: fontWeight.bold,
                      fontSize: fontSize.lg, padding: '16px 40px',
                      borderRadius: radius.pill, border: 'none',
                      cursor: saving ? 'wait' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                      animation: saving ? 'none' : 'discPulseGlow 2s infinite',
                      whiteSpace: 'nowrap',
                      transition: `opacity ${transition.normal}`,
                    }}
                  >
                    {saving ? 'Building...' : 'Build my Atlas →'}
                  </button>
                </div>
              )}
            </div>

            {/* ── AUTO-SCROLLING CAROUSEL ── */}
            {carouselImages.length > 0 && (
              <div
                className="disc-carousel"
                onMouseEnter={() => setCarouselPaused(true)}
                onMouseLeave={() => setCarouselPaused(false)}
                style={{
                  width: '100vw',
                  overflow: 'hidden',
                  position: 'relative',
                  opacity: 0,
                  animation: 'discFadeIn 0.6s ease 1.0s forwards',
                }}
              >
                <div style={{
                  display: 'flex', flexDirection: 'row',
                  gap: 12,
                  animation: `carouselScroll ${carouselDuration}s linear infinite`,
                  animationPlayState: carouselPaused ? 'paused' : 'running',
                  width: 'max-content',
                }}>
                  {carouselImages.map((img, i) => (
                    <img
                      key={`${img.url}-${i}`}
                      src={img.url}
                      alt=""
                      className="disc-carousel-img"
                      style={{
                        height: 'clamp(180px, 22vw, 260px)',
                        width: 'auto',
                        aspectRatio: '3/4',
                        objectFit: 'cover',
                        borderRadius: radius.lg,
                        flexShrink: 0,
                        display: 'block',
                      }}
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
