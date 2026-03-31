'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AttomikLogo from './AttomikLogo'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/brand-setup', label: 'Brand Hub' },
  { href: '/creatives', label: 'Creative Studio' },
  { href: '/copy', label: 'Copy Creator' },
  { href: '/campaigns', label: 'Campaigns' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [brands, setBrands] = useState<any[]>([])
  const [activeBrand, setActiveBrand] = useState<any>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('brands')
      .select('id, name, primary_color, logo_url')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data?.length) return
        setBrands(data)
        const savedId = localStorage.getItem('attomik_active_brand_id')
        const found = data.find((b: any) => b.id === savedId) || data[0]
        setActiveBrand(found)
      })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function switchBrand(brand: any) {
    setActiveBrand(brand)
    localStorage.setItem('attomik_active_brand_id', brand.id)
    setDropdownOpen(false)
    if (pathname.startsWith('/brand-setup')) router.push(`/brand-setup/${brand.id}`)
    else if (pathname.startsWith('/creatives')) router.push(`/creatives?brand=${brand.id}`)
    else if (pathname.startsWith('/copy')) router.push('/copy')
    else if (pathname === '/dashboard' || pathname === '/') router.push(`/dashboard?brand=${brand.id}`)
  }

  function getBrandNavHref(href: string) {
    if (!activeBrand?.id) return href
    if (href === '/brand-setup') return `/brand-setup/${activeBrand.id}`
    if (href === '/creatives') return `/creatives?brand=${activeBrand.id}`
    if (href === '/dashboard') return `/dashboard?brand=${activeBrand.id}`
    if (href === '/campaigns') return `/campaigns?brand=${activeBrand.id}`
    return href
  }

  const isLight = (hex: string) => {
    const c = (hex || '').replace('#', '')
    if (c.length < 6) return false
    return (parseInt(c.slice(0,2),16)*299+parseInt(c.slice(2,4),16)*587+parseInt(c.slice(4,6),16)*114)/1000 > 128
  }

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 32px', height: 72, gap: 0 }}>
      <Link href="/dashboard" style={{ marginRight: 24, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <AttomikLogo height={24} color="#000" />
      </Link>

      <div style={{ width: 1, height: 24, background: 'var(--border)', marginRight: 24, flexShrink: 0 }} />

      {activeBrand && (
        <div ref={dropdownRef} style={{ position: 'relative', marginRight: 24, flexShrink: 0 }}>
          <button onClick={() => setDropdownOpen(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: dropdownOpen ? '#f5f5f5' : '#f8f8f8',
            border: '1px solid', borderColor: dropdownOpen ? '#ccc' : 'var(--border)',
            borderRadius: 10, padding: '6px 12px 6px 8px', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: activeBrand.primary_color || '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {activeBrand.logo_url ? (
                <img src={activeBrand.logo_url} style={{ width: 14, height: 14, objectFit: 'contain', filter: isLight(activeBrand.primary_color || '#fff') ? 'none' : 'brightness(0) invert(1)' }} alt="" />
              ) : (
                <span style={{ fontSize: 10, fontWeight: 900, color: isLight(activeBrand.primary_color || '#000') ? '#000' : '#fff', fontFamily: 'Barlow, sans-serif' }}>{activeBrand.name[0]}</span>
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#000', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeBrand.name}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, opacity: 0.4 }}>
              <path d="M2 4L6 8L10 4" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {dropdownOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 200, zIndex: 100, overflow: 'hidden', padding: 6 }}>
              {brands.map((b: any) => (
                <button key={b.id} onClick={() => switchBrand(b)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', background: b.id === activeBrand.id ? '#f5f5f5' : 'transparent', textAlign: 'left', transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { if (b.id !== activeBrand.id) e.currentTarget.style.background = '#f9f9f9' }}
                  onMouseLeave={e => { if (b.id !== activeBrand.id) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: b.primary_color || '#000', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {b.logo_url ? (
                      <img src={b.logo_url} style={{ width: 18, height: 18, objectFit: 'contain', filter: isLight(b.primary_color || '#fff') ? 'none' : 'brightness(0) invert(1)' }} alt="" />
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 900, color: isLight(b.primary_color || '#000') ? '#000' : '#fff', fontFamily: 'Barlow, sans-serif' }}>{b.name[0]}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#000', lineHeight: 1.2 }}>{b.name}</div>
                  {b.id === activeBrand.id && (
                    <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <polyline points="2,7 5.5,10.5 12,3.5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0 0', paddingTop: 6 }}>
                <Link href="/onboarding" onClick={() => setDropdownOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                  textDecoration: 'none', color: 'var(--muted)', fontSize: 12, fontWeight: 600,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#ccc' }}>+</div>
                  Add new brand
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' || pathname === '/' : href === '/brand-setup' ? pathname.startsWith('/brand-setup') : pathname.startsWith(href)
          return (
            <Link key={href} href={getBrandNavHref(href)} style={{
              fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#000' : '#888',
              textDecoration: 'none', padding: '7px 14px', borderRadius: 8,
              background: active ? '#f0f0f0' : 'transparent', transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>{label}</Link>
          )
        })}
      </div>

      <Link href="/onboarding" style={{
        background: '#000', color: '#00ff97', fontFamily: 'Barlow, sans-serif',
        fontWeight: 800, fontSize: 13, padding: '9px 20px', borderRadius: 999,
        textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
      }}>+ New funnel</Link>
    </nav>
  )
}
