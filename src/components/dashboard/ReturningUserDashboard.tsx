'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { colors, font, fontWeight, fontSize, radius, transition, letterSpacing } from '@/lib/design-tokens'
import AttomikLogo from '@/components/ui/AttomikLogo'
import BrandCard, { type BrandCardData } from './BrandCard'

interface ReturningUserDashboardProps {
  user: User
  brands: BrandCardData[]
  campaignsByBrand: Record<string, string>
  loading?: boolean
}

function displayNameFor(user: User): string {
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  const fullName = typeof meta.full_name === 'string' ? meta.full_name.trim() : ''
  if (fullName) return fullName
  const name = typeof meta.name === 'string' ? meta.name.trim() : ''
  if (name) return name
  if (user.email) return user.email.split('@')[0]
  return 'there'
}

export default function ReturningUserDashboard({ user, brands, campaignsByBrand, loading = false }: ReturningUserDashboardProps) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  function go(value: string) {
    const v = value.trim()
    if (!v) {
      router.push('/onboarding')
      return
    }
    let normalized = v
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized
    try {
      const parsed = new URL(normalized)
      if (!parsed.hostname.includes('.')) return
      router.push(`/onboarding?url=${encodeURIComponent(normalized)}`)
    } catch { /* invalid URL — ignore */ }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  const greeting = displayNameFor(user)

  return (
    <div style={{
      background: colors.darkBg,
      color: colors.paper,
      minHeight: '100vh',
      fontFamily: font.heading,
    }}>
      <style>{`
        @keyframes rudFadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .rud-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 900px) {
          .rud-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .rud-pad { padding-left: 24px !important; padding-right: 24px !important; }
          .rud-headline { font-size: clamp(34px, 7vw, 48px) !important; }
        }
        @media (max-width: 600px) {
          .rud-grid { grid-template-columns: 1fr !important; }
          .rud-cta-row { flex-direction: column !important; align-items: stretch !important; }
          .rud-cta-row button { width: 100% !important; }
          .rud-cta-row input { width: 100% !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="rud-pad" style={{
        padding: '20px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${colors.whiteAlpha10}`,
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <AttomikLogo height={24} color={colors.paper} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/dashboard" style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            color: colors.whiteAlpha60, textDecoration: 'none',
            letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
            transition: `color ${transition.normal}`,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = colors.accent }}
            onMouseLeave={e => { e.currentTarget.style.color = colors.whiteAlpha60 }}
          >
            Dashboard →
          </a>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              background: 'transparent', border: 'none', cursor: signingOut ? 'wait' : 'pointer',
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.whiteAlpha45, letterSpacing: letterSpacing.wide, textTransform: 'uppercase',
              transition: `color ${transition.normal}`, padding: 0,
            }}
            onMouseEnter={e => { if (!signingOut) e.currentTarget.style.color = colors.paper }}
            onMouseLeave={e => { if (!signingOut) e.currentTarget.style.color = colors.whiteAlpha45 }}
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </div>

      <div className="rud-pad" style={{
        padding: '64px 48px 96px',
        maxWidth: 1200, margin: '0 auto',
        opacity: 0, animation: 'rudFadeIn 0.5s ease forwards',
      }}>
        {/* Welcome */}
        <div style={{
          fontFamily: font.mono, fontSize: fontSize.caption,
          color: colors.accent, letterSpacing: letterSpacing.wide,
          textTransform: 'uppercase', marginBottom: 14,
        }}>
          ▸ Welcome back
        </div>
        <h1 className="rud-headline" style={{
          fontFamily: font.heading, fontWeight: fontWeight.heading,
          fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 0.98,
          letterSpacing: letterSpacing.tight, textTransform: 'uppercase',
          margin: 0, color: colors.paper,
        }}>
          Welcome back, <span style={{ color: colors.accent }}>{greeting}</span>
        </h1>
        <p style={{
          fontFamily: font.heading, fontSize: fontSize.lg, lineHeight: 1.6,
          color: colors.whiteAlpha60, maxWidth: 560, marginTop: 16,
        }}>
          Pick up where you left off, or scan a new brand to start fresh.
        </p>

        {/* Brand grid section */}
        <div style={{ marginTop: 56 }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 20, flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.whiteAlpha60, letterSpacing: letterSpacing.wide,
              textTransform: 'uppercase',
            }}>
              ▸ Your brands
            </div>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.whiteAlpha30, letterSpacing: letterSpacing.wide,
              textTransform: 'uppercase',
            }}>
              {loading ? 'Loading...' : `${brands.length} ${brands.length === 1 ? 'brand' : 'brands'}`}
            </div>
          </div>

          {loading ? (
            <div className="rud-grid">
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  background: colors.darkCard,
                  border: `1px solid ${colors.whiteAlpha10}`,
                  borderRadius: radius['2xl'],
                  height: 220,
                  opacity: 0.5,
                }} />
              ))}
            </div>
          ) : (
            <div className="rud-grid">
              {brands.map(b => (
                <BrandCard
                  key={b.id}
                  brand={b}
                  latestCampaignId={campaignsByBrand[b.id] || null}
                />
              ))}
            </div>
          )}
        </div>

        {/* Start a new brand */}
        <div style={{
          marginTop: 64,
          padding: '40px',
          background: colors.darkCard,
          border: `1px solid ${colors.whiteAlpha10}`,
          borderRadius: radius['3xl'],
        }}>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            color: colors.accent, letterSpacing: letterSpacing.wide,
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            ▸ Start a new brand
          </div>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading,
            fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.05,
            letterSpacing: letterSpacing.tight, textTransform: 'uppercase',
            color: colors.paper, marginBottom: 20,
          }}>
            Drop a URL. Get a full funnel.
          </div>
          <div className="rud-cta-row" style={{
            display: 'flex', gap: 10, alignItems: 'stretch',
          }}>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go(url)}
              placeholder="yourbrand.com"
              style={{
                flex: 1, padding: '14px 18px',
                background: colors.whiteAlpha8,
                border: `1.5px solid ${colors.whiteAlpha15}`,
                borderRadius: radius['2xl'],
                color: colors.paper, outline: 'none',
                fontFamily: font.mono, fontWeight: fontWeight.medium,
                fontSize: fontSize.lg,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.background = colors.whiteAlpha10 }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.whiteAlpha15; e.currentTarget.style.background = colors.whiteAlpha8 }}
            />
            <button
              onClick={() => go(url)}
              style={{
                padding: '0 28px',
                background: colors.accent, color: colors.ink,
                fontFamily: font.heading, fontWeight: fontWeight.bold,
                fontSize: fontSize.base, letterSpacing: letterSpacing.label,
                textTransform: 'uppercase',
                border: 'none', borderRadius: radius['2xl'],
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: `opacity ${transition.normal}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Scan brand →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
