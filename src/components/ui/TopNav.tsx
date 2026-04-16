'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import { useProfile } from '@/lib/profile-context'
import AttomikLogo from './AttomikLogo'
import InitialsAvatar from './InitialsAvatar'
import LogoImage from './LogoImage'
import { colors, font, fontWeight, fontSize, radius, zIndex, shadow, transition, layout } from '@/lib/design-tokens'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/brand-setup', label: 'Brand Hub' },
  { href: '/creatives', label: 'Creative Studio' },
  { href: '/copy', label: 'Copy Creator' },
  { href: '/newsletter', label: 'Email' },
  { href: '/landing-page', label: 'Landing Page' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/insights', label: 'Insights' },
]

// Super-admin gate for the /store feature. Hardcoded to a single email
// while Store is internal-only. When the feature is ready to expose to
// clients, replace this with a `brand_members.role`-based check.
const SUPER_ADMIN_EMAIL = 'pablo@attomik.co'

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeBrandId, setActiveBrandId, brands, brandsLoaded } = useBrand()
  const { user, profile } = useProfile()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL

  // full_name is the primary label; fall back to email while the profile is
  // loading or in the unlikely case the first-name modal was bypassed.
  const profileLabel = profile?.full_name || user?.email || ''

  // On /brand-setup/[brandId], the URL defines the brand. Sync context to match.
  const urlBrandId = pathname.startsWith('/brand-setup/') ? pathname.split('/')[2] : null
  useEffect(() => {
    if (urlBrandId && urlBrandId !== activeBrandId) setActiveBrandId(urlBrandId)
  }, [urlBrandId])

  // Single source of truth: context's activeBrandId
  const activeBrand = brands.find((b: any) => b.id === activeBrandId) || null
  const displayBrand = activeBrand

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function switchBrand(brand: any) {
    setDropdownOpen(false)
    if (brand.id === activeBrandId) return

    // Let Next's router own the URL for every page, not just dashboard /
    // brand-setup. The old code also called history.replaceState inside
    // setActiveBrandId which raced router.push and silently killed the
    // navigation diff on dashboard. URL → context is the one direction now.
    if (pathname.startsWith('/brand-setup')) {
      router.push(`/brand-setup/${brand.id}`)
    } else {
      const params = new URLSearchParams(window.location.search)
      params.set('brand', brand.id)
      router.push(`${pathname}?${params.toString()}`)
    }
    setActiveBrandId(brand.id)
  }

  function getBrandNavHref(href: string) {
    const id = activeBrandId
    if (!id) return href
    if (href === '/brand-setup') return `/brand-setup/${id}`
    if (href === '/creatives') return `/creatives?brand=${id}`
    if (href === '/dashboard') return `/dashboard?brand=${id}`
    if (href === '/campaigns') return `/campaigns?brand=${id}`
    if (href === '/newsletter') return `/newsletter?brand=${id}`
    if (href === '/copy') return `/copy?brand=${id}`
    if (href === '/landing-page') return `/landing-page?brand=${id}`
    if (href === '/store') return `/store?brand=${id}`
    if (href === '/insights') return `/insights?brand=${id}`
    return href
  }

  const isLight = (hex: string) => {
    const c = (hex || '').replace('#', '')
    if (c.length < 6) return false
    return (parseInt(c.slice(0,2),16)*299+parseInt(c.slice(2,4),16)*587+parseInt(c.slice(4,6),16)*114)/1000 > 128
  }

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 40 /* TODO: tokenize */, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 32px', height: layout.navHeight, gap: 0 }}>
      <Link href={getBrandNavHref('/dashboard')} style={{ marginRight: 24, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <AttomikLogo width={140} color={colors.ink} />
      </Link>

      <div style={{ width: 1, height: 24, background: 'var(--border)', marginRight: 24, flexShrink: 0 }} />

      {!displayBrand && (!!activeBrandId || pathname.includes('/brand-setup')) && (
        <div style={{ marginRight: 24, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: colors.gray150, border: '1px solid var(--border)',
            borderRadius: radius.lg, padding: '6px 12px 6px 8px',
            width: 140, height: 40,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      )}

      {displayBrand && (
        <div ref={dropdownRef} style={{ position: 'relative', marginRight: 24, flexShrink: 0 }}>
          <button onClick={() => setDropdownOpen(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: dropdownOpen ? colors.gray200 : colors.gray150,
            border: '1px solid', borderColor: dropdownOpen ? colors.gray450 : 'var(--border)',
            borderRadius: radius.lg, padding: '6px 12px 6px 8px', cursor: 'pointer', transition: `all ${transition.base}`,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: radius.md, background: displayBrand.primary_color || colors.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {displayBrand.logo_url ? (
                <LogoImage src={displayBrand.logo_url} onDark={!isLight(displayBrand.primary_color || colors.paper)} style={{ width: 20, height: 20, objectFit: 'contain' }} alt="" />
              ) : (
                <span style={{ fontSize: fontSize.caption, fontWeight: fontWeight.heading, color: isLight(displayBrand.primary_color || colors.ink) ? colors.ink : colors.paper, fontFamily: font.heading }}>{displayBrand.name[0]}</span>
              )}
            </div>
            <span style={{ fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayBrand.name}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: `transform ${transition.normal}`, flexShrink: 0, opacity: 0.4 }}>
              <path d="M2 4L6 8L10 4" stroke={colors.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {dropdownOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: colors.paper, border: '1px solid var(--border)', borderRadius: radius.xl, boxShadow: shadow.dropdown, minWidth: 200, zIndex: zIndex.dropdown, overflow: 'hidden', padding: 6 }}>
              {brands.map((b: any) => (
                <button key={b.id} onClick={() => switchBrand(b)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: radius.md,
                  border: 'none', cursor: 'pointer', background: b.id === displayBrand.id ? colors.gray200 : 'transparent', textAlign: 'left', transition: `background ${transition.fast}`,
                }}
                  onMouseEnter={e => { if (b.id !== displayBrand.id) e.currentTarget.style.background = colors.gray100 }}
                  onMouseLeave={e => { if (b.id !== displayBrand.id) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: 28, height: 28, borderRadius: radius.md, background: b.primary_color || colors.ink, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {b.logo_url ? (
                      <LogoImage src={b.logo_url} onDark={!isLight(b.primary_color || colors.paper)} style={{ width: 18, height: 18, objectFit: 'contain' }} alt="" />
                    ) : (
                      <span style={{ fontSize: fontSize.caption, fontWeight: fontWeight.heading, color: isLight(b.primary_color || colors.ink) ? colors.ink : colors.paper, fontFamily: font.heading }}>{b.name[0]}</span>
                    )}
                  </div>
                  <div style={{ fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink, lineHeight: 1.2 }}>{b.name}</div>
                  {b.id === displayBrand.id && (
                    <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <polyline points="2,7 5.5,10.5 12,3.5" stroke={colors.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0 0', paddingTop: 6 }}>
                <Link href="/new" onClick={() => setDropdownOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: radius.md,
                  textDecoration: 'none', color: 'var(--muted)', fontSize: fontSize.caption, fontWeight: fontWeight.semibold,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: radius.md, border: `1.5px dashed ${colors.gray450}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize.lg, color: colors.gray450 }}>+</div>
                  Add new brand
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {(brandsLoaded && brands.length === 0 ? NAV_LINKS.filter(l => l.href === '/dashboard') : NAV_LINKS).map(({ href, label }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' || pathname === '/' : href === '/brand-setup' ? pathname.startsWith('/brand-setup') : pathname.startsWith(href)
          return (
            <Link key={href} href={getBrandNavHref(href)} style={{
              fontSize: fontSize.md, fontWeight: active ? fontWeight.bold : fontWeight.medium, color: active ? colors.ink : colors.gray750,
              textDecoration: 'none', padding: '7px 14px', borderRadius: radius.md,
              background: active ? colors.gray250 : 'transparent', transition: `all ${transition.base}`, whiteSpace: 'nowrap',
            }}>{label}</Link>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {profileLabel && (
          <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setUserMenuOpen(p => !p)}
              title={profile?.full_name ? `${profile.full_name} · Account` : 'Account'}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 12px 4px 4px', borderRadius: radius.pill,
                background: userMenuOpen ? colors.gray200 : colors.gray150,
                border: '1px solid', borderColor: userMenuOpen ? colors.gray450 : 'var(--border)',
                cursor: 'pointer', transition: `all ${transition.base}`,
                maxWidth: 180,
              }}
              onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = colors.gray200 }}
              onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = colors.gray150 }}
            >
              <InitialsAvatar name={profileLabel} size="sm" />
              <span style={{
                fontSize: fontSize.caption, fontWeight: fontWeight.bold,
                color: colors.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profileLabel}
              </span>
            </button>

            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: colors.paper,
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  boxShadow: shadow.dropdown,
                  minWidth: 200,
                  zIndex: zIndex.dropdown,
                  padding: 6,
                }}
              >
                <div style={{
                  fontSize: 10, fontWeight: fontWeight.bold,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--muted)', padding: '6px 12px 4px',
                }}>
                  Account
                </div>
                <Link
                  href="/settings/profile"
                  onClick={() => setUserMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: fontWeight.semibold,
                    color: colors.ink,
                    textDecoration: 'none',
                    transition: `background ${transition.fast}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Profile
                </Link>

                {isSuperAdmin && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                    <div style={{
                      fontSize: 10, fontWeight: fontWeight.bold,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--muted)', padding: '6px 12px 4px',
                    }}>
                      Admin
                    </div>
                    <Link
                      href={getBrandNavHref('/store')}
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: fontWeight.semibold,
                        color: colors.ink,
                        textDecoration: 'none',
                        transition: `background ${transition.fast}`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      Store
                    </Link>
                  </>
                )}

                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                <button
                  onClick={() => { setUserMenuOpen(false); signOut() }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    fontWeight: fontWeight.semibold,
                    color: colors.ink,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: `background ${transition.fast}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
