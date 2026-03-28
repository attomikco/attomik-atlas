'use client'
import { useState, useEffect, useRef } from 'react'
import { Brand } from '@/types'
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
  style?: React.CSSProperties
}

export default function CreativeReel({ brand, adVariation, imageUrl, allImageUrls, adVariations, onComplete, style: externalStyle }: CreativeReelProps) {
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
  const imgs = allImageUrls && allImageUrls.length > 0 ? allImageUrls : [imageUrl, imageUrl, imageUrl, imageUrl, imageUrl]
  const getImg = (i: number) => imgs[i % imgs.length] || imageUrl
  const getVariation = (i: number): AdVariation => adVariations?.[i % (adVariations?.length || 1)] || adVariation

  const bgColors = [
    brand.primary_color || '#000000',
    brand.secondary_color || brand.primary_color || '#000000',
    brand.primary_color || '#000000',
    brand.accent_color || brand.secondary_color || '#000000',
    brand.primary_color || '#000000',
  ]

  const makeBase = (i: number) => {
    const v = getVariation(i)
    return {
      width: 1080, height: 1080,
      imageUrl: getImg(i),
      headline: v.headline,
      bodyText: v.primary_text.slice(0, 100),
      ctaText: 'Shop Now',
      brandColor: brand.primary_color || '#000000',
      brandName: brand.name,
      headlineFont: fontFamily,
      headlineWeight: brand.font_heading?.weight || '800',
      headlineTransform: brand.font_heading?.transform || 'none',
      headlineColor: '#ffffff',
      bodyFont: fontFamily,
      bodyWeight: '400',
      bodyTransform: 'none',
      bodyColor: 'rgba(255,255,255,0.85)',
      bgColor: bgColors[i],
      headlineSizeMul: 1,
      bodySizeMul: 1,
      showOverlay: true,
      overlayOpacity: 0.35,
      textBanner: 'none' as const,
      textBannerColor: '#000',
      textPosition: 'bottom-left' as const,
      showCta: true,
      ctaColor: brand.accent_color || brand.secondary_color || '#00ff97',
      ctaFontColor: '#000000',
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
  }, [onComplete])

  const current = configs[currentIndex]
  const Comp = current.component
  const scale = 300 / 1080

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '40px 24px',
      opacity: isExiting ? 0 : 1, transition: 'opacity 500ms ease',
      ...externalStyle,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 520, margin: '0 auto' }}>
        {/* Logo */}
        <AttomikLogo height={38} color="#ffffff" />
        {/* Divider */}
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)', margin: '20px 0' }} />

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{
              width: 32, height: 4, borderRadius: 2,
              background: i < currentIndex ? '#00ff97' : i === currentIndex ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
              transition: 'background 300ms',
            }} />
          ))}
        </div>

        {/* Creative */}
        <div style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 250ms ease, transform 250ms ease',
          marginBottom: 32,
        }}>
          <div style={{ width: 300, height: 300, borderRadius: 12, overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)', background: '#fff' }}>
            <div style={{ width: 1080, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
              <Comp {...current.props} />
            </div>
          </div>
        </div>

        {/* Phrase */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 20, transition: 'opacity 300ms', opacity: isVisible ? 1 : 0, marginBottom: 4 }}>
            {phrases[currentIndex]}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 12 }}>
            Attomik — AI-powered funnel builder
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'opacity 250ms', opacity: isVisible ? 1 : 0 }}>
            {current.label}
          </div>
        </div>
      </div>
    </div>
  )
}
