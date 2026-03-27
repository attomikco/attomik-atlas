'use client'
import { useState, useEffect, useRef } from 'react'
import { Brand } from '@/types'
import OverlayTemplate from '@/components/creatives/templates/OverlayTemplate'
import SplitTemplate from '@/components/creatives/templates/SplitTemplate'
import StatTemplate from '@/components/creatives/templates/StatTemplate'
import TestimonialTemplate from '@/components/creatives/templates/TestimonialTemplate'
import UGCTemplate from '@/components/creatives/templates/UGCTemplate'

interface CreativeReelProps {
  brand: Brand
  adVariation: { primary_text: string; headline: string; description: string }
  imageUrl: string | null
  onComplete: () => void
}

export default function CreativeReel({ brand, adVariation, imageUrl, onComplete }: CreativeReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const TOTAL = 5

  const fontFamily = brand.font_heading?.family || brand.font_primary?.split('|')[0] || ''
  const base = {
    width: 1080, height: 1080,
    imageUrl,
    headline: adVariation.headline,
    bodyText: adVariation.primary_text.slice(0, 100),
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
    bgColor: brand.primary_color || '#000000',
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

  const configs = [
    { label: 'Hero Creative', component: OverlayTemplate, props: { ...base, textPosition: 'center' as const, overlayOpacity: 0.4 } },
    { label: 'Split Layout', component: SplitTemplate, props: { ...base, textPosition: 'center' as const, bgColor: brand.secondary_color || brand.primary_color || '#1a1a1a' } },
    { label: 'Statement', component: StatTemplate, props: { ...base, textPosition: 'center' as const, showOverlay: true, overlayOpacity: 0.3, bgColor: '#000' } },
    { label: 'Social Proof', component: TestimonialTemplate, props: { ...base, bgColor: brand.secondary_color || brand.primary_color || '#fff', imagePosition: 'bottom' } },
    { label: 'Card Style', component: UGCTemplate, props: { ...base, bgColor: brand.primary_color || '#fff', imagePosition: 'bottom' } },
  ]

  useEffect(() => {
    let step = 0
    function advance() {
      if (step >= TOTAL - 1) {
        // Last template shown — start exit
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
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
      style={{
        background: '#0a0a0a',
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 500ms ease',
      }}
    >
      {/* Top */}
      <div className="absolute top-8 left-0 right-0 flex justify-between items-center px-8">
        <span style={{ color: '#00ff97', fontSize: 11, fontWeight: 900, letterSpacing: '0.2em' }}>ATTOMIK</span>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{
              width: 32, height: 4, borderRadius: 2,
              background: i < currentIndex ? '#00ff97' : i === currentIndex ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)',
              transition: 'background 300ms',
            }} />
          ))}
        </div>
      </div>

      {/* Creative */}
      <div style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        transition: 'opacity 250ms ease, transform 250ms ease',
      }}>
        <div style={{
          width: 300, height: 300, borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          background: '#fff',
        }}>
          <div style={{ width: 1080, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Comp {...current.props} />
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <div style={{
          color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.15em', textTransform: 'uppercase',
          transition: 'opacity 250ms',
          opacity: isVisible ? 1 : 0,
        }}>
          {current.label}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 8 }}>
          Generating your creative variations...
        </div>
      </div>
    </div>
  )
}
