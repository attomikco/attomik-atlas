'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { colors, font, fontWeight, fontSize, radius, transition, letterSpacing } from '@/lib/design-tokens'
import LogoImage from '@/components/ui/LogoImage'

export interface BrandCardData {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
  updated_at: string | null
  created_at: string | null
}

interface BrandCardProps {
  brand: BrandCardData
  latestCampaignId: string | null
}

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const d = Math.round(hr / 24)
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`
  const w = Math.round(d / 7)
  if (w < 5) return `${w} week${w === 1 ? '' : 's'} ago`
  const mo = Math.round(d / 30)
  if (mo < 12) return `${mo} mo ago`
  const y = Math.round(d / 365)
  return `${y} yr${y === 1 ? '' : 's'} ago`
}

function isLight(hex: string | null): boolean {
  if (!hex) return false
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

export default function BrandCard({ brand, latestCampaignId }: BrandCardProps) {
  const router = useRouter()
  const [hover, setHover] = useState(false)

  const swatchBg = brand.primary_color || colors.darkCardAlt
  const swatchLight = isLight(brand.primary_color)
  const lastModified = formatRelative(brand.updated_at || brand.created_at)

  function handleClick() {
    if (latestCampaignId) {
      router.push(`/preview/${latestCampaignId}`)
    } else {
      router.push(`/dashboard?brand=${brand.id}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        all: 'unset',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        background: colors.darkCard,
        border: `1px solid ${hover ? colors.accentAlpha30 : colors.whiteAlpha10}`,
        borderRadius: radius['2xl'],
        overflow: 'hidden',
        transition: `border-color ${transition.normal}, transform ${transition.normal}`,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        textAlign: 'left',
        width: '100%',
      }}
    >
      {/* Color/logo header */}
      <div style={{
        position: 'relative',
        height: 120,
        background: swatchBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {brand.logo_url ? (
          <LogoImage
            src={brand.logo_url}
            alt=""
            onDark={!swatchLight}
            style={{
              maxHeight: 56,
              maxWidth: '70%',
              objectFit: 'contain',
            }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div style={{
            fontFamily: font.heading,
            fontWeight: fontWeight.heading,
            fontSize: fontSize['7xl'],
            color: swatchLight ? colors.ink : colors.paper,
            textTransform: 'uppercase',
            letterSpacing: letterSpacing.tight,
          }}>
            {brand.name.slice(0, 1)}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{
          fontFamily: font.heading,
          fontWeight: fontWeight.heading,
          fontSize: fontSize['3xl'],
          color: colors.paper,
          textTransform: 'uppercase',
          letterSpacing: letterSpacing.tight,
          lineHeight: 1.1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {brand.name}
        </div>

        <div style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{
            fontFamily: font.mono,
            fontSize: fontSize.caption,
            color: colors.whiteAlpha45,
            letterSpacing: letterSpacing.wide,
            textTransform: 'uppercase',
          }}>
            {lastModified || 'New'}
          </div>
          <div style={{
            fontFamily: font.mono,
            fontSize: fontSize.caption,
            color: hover ? colors.accent : colors.whiteAlpha45,
            letterSpacing: letterSpacing.wide,
            textTransform: 'uppercase',
            transition: `color ${transition.normal}`,
          }}>
            Open →
          </div>
        </div>
      </div>
    </button>
  )
}
