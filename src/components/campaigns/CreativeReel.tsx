'use client'
import { useState, useEffect, useRef } from 'react'
import { Brand } from '@/types'
import { colors, font, fontWeight, fontSize, radius, zIndex } from '@/lib/design-tokens'
import AttomikLogo from '@/components/ui/AttomikLogo'
import OverlayTemplate from '@/components/creatives/templates/OverlayTemplate'
import SplitTemplate from '@/components/creatives/templates/SplitTemplate'
import StatTemplate from '@/components/creatives/templates/StatTemplate'
import TestimonialTemplate from '@/components/creatives/templates/TestimonialTemplate'
import UGCTemplate from '@/components/creatives/templates/UGCTemplate'

interface AdVariation {
  primary_text: string
  headline: string
  description: string
}

interface CreativeReelProps {
  brand: Brand
  adVariation: AdVariation
  imageUrl: string | null
  allImageUrls?: string[]
  adVariations?: AdVariation[]
  onComplete: () => void
  isActive?: boolean
  style?: React.CSSProperties
}

export default function CreativeReel({ brand, adVariation, imageUrl, allImageUrls, adVariations, onComplete, isActive = true, style: externalStyle }: CreativeReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const TOTAL = 5
  const phrases = [
    'Your funnel is about to 100x.',
    'Built from your brand. Ready to convert.',
    'This is what scroll-stopping looks like.',
    '5 creatives. 0 hours of design work.',
    'Your brand, campaign-ready.',
  ]

  const fontFamily = brand.font_heading?.family || brand.font_primary?.split('|')[0] || ''
  // Dedup by URL, cap at 8
  const reelImages = allImageUrls && allImageUrls.length > 0
    ? Array.from(new Set(allImageUrls)).slice(0, 8)
    : []
  const getImg = (i: number): string | null =>
    reelImages.length > 0 ? reelImages[i % reelImages.length] : null
  const getVariation = (i: number): AdVariation => {
    if (!adVariations || adVariations.length === 0) return adVariation
    // For cards beyond the variation count, remix the copy to avoid looking identical
    if (i < adVariations.length) return adVariations[i]
    const base = adVariations[i % adVariations.length]
    const alt = adVariations[(i + 1) % adVariations.length]
    return { ...base, headline: alt.headline, primary_text: base.primary_text, description: base.description }
  }

  const pri = brand.primary_color || colors.ink
  const sec = brand.secondary_color || brand.primary_color || colors.ink
  const bgColors = [pri, sec, pri, sec, pri]

  const makeBase = (i: number) => {
    const v = getVariation(i)
    return {
      width: 1080, height: 1080,
      imageUrl: getImg(i) || '',
      headline: v.headline,
      bodyText: v.primary_text.slice(0, 100),
      ctaText: 'Shop Now',
      brandColor: brand.primary_color || colors.ink,
      brandName: brand.name,
      headlineFont: fontFamily,
      headlineWeight: brand.font_heading?.weight || '800',
      headlineTransform: brand.font_heading?.transform || 'none',
      headlineColor: colors.paper,
      bodyFont: fontFamily,
      bodyWeight: '400',
      bodyTransform: 'none',
      bodyColor: colors.whiteAlpha85,
      bgColor: bgColors[i],
      headlineSizeMul: 1,
      bodySizeMul: 1,
      showOverlay: true,
      overlayOpacity: 0.35,
      textBanner: 'none' as const,
      textBannerColor: colors.ink,
      textPosition: 'bottom-left' as const,
      showCta: true,
      ctaColor: brand.accent_color || brand.secondary_color || colors.accent,
      ctaFontColor: colors.ink,
      imagePosition: 'center',
    }
  }

  const configs = [
    { label: 'Hero Creative', component: OverlayTemplate, props: { ...makeBase(0), textPosition: 'center' as const, overlayOpacity: 0.4 } },
    { label: 'Split Layout', component: SplitTemplate, props: { ...makeBase(1), textPosition: 'center' as const } },
    { label: 'Statement', component: StatTemplate, props: { ...makeBase(2), textPosition: 'center' as const, overlayOpacity: 0.3 } },
    { label: 'Social Proof', component: TestimonialTemplate, props: { ...makeBase(3), imagePosition: 'bottom' } },
    { label: 'Card Style', component: UGCTemplate, props: { ...makeBase(4), imagePosition: 'bottom' } },
  ]

  useEffect(() => {
    if (!isActive) return
    let step = 0
    function advance() {
      if (step >= TOTAL - 1) {
        setTimeout(() => {
          setIsExiting(true)
          setTimeout(() => onComplete(), 600)
        }, 1100)
        return
      }
      setIsVisible(false)
      setTimeout(() => {
        step++
        setCurrentIndex(step)
        setIsVisible(true)
      }, 250)
    }
    intervalRef.current = setInterval(advance, 1100)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [onComplete, isActive])

  useEffect(() => {
    if (!isActive) {
      setCurrentIndex(0)
      setIsVisible(true)
      setIsExiting(false)
    }
  }, [isActive])

  const current = configs[currentIndex]
  const Comp = current.component
  const scale = 300 / 1080

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: zIndex.modal, background: colors.ink,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '40px 24px',
      opacity: isExiting ? 0 : 1, transition: 'opacity 500ms ease',
      ...externalStyle,
    }}>
      {/* Zone 1 — LOGO */}
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: zIndex.reel }}>
        <AttomikLogo height={36} color={colors.paper} />
      </div>

      {/* Zone 2 — CENTER CONTENT */}
      <div style={{ position: 'absolute', top: 100, bottom: 120, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{
              width: 32, height: 4, borderRadius: 2, // TODO: tokenize
              background: i < currentIndex ? colors.accent : i === currentIndex ? colors.whiteAlpha40 : colors.whiteAlpha10,
              transition: 'background 300ms',
            }} />
          ))}
        </div>

        {/* Creative */}
        <div style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 250ms ease, transform 250ms ease',
        }}>
          <div style={{ width: 300, height: 300, borderRadius: radius.xl, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' /* TODO: tokenize */, background: colors.paper }}>
            <div style={{ width: 1080, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <Comp {...current.props} />
            </div>
          </div>
        </div>

        {/* Template label */}
        <div style={{ color: colors.whiteAlpha30, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'opacity 250ms', opacity: isVisible ? 1 : 0, marginTop: 16 }}>
          {current.label}
        </div>
      </div>

      {/* Zone 3 — PHRASES */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, height: 80, textAlign: 'center', padding: '0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ color: colors.paper, fontFamily: font.heading, fontWeight: fontWeight.extrabold, fontSize: fontSize['3xl'], transition: 'opacity 300ms', opacity: isVisible ? 1 : 0, marginBottom: 4 }}>
          {phrases[currentIndex]}
        </div>
        <div style={{ color: colors.whiteAlpha40, fontSize: 11 /* TODO: tokenize */ }}>
          Attomik — AI-powered funnel builder
        </div>
      </div>
    </div>
  )
}
