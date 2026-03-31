import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>
}) {
  const { brand: brandParam } = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (!brands?.length) redirect('/onboarding')

  const brand = brands.find((b: any) => b.id === brandParam) || brands[0]

  const completenessFields = [
    { key: 'logo_url',        label: 'Logo' },
    { key: 'mission',         label: 'Brand description' },
    { key: 'target_audience', label: 'Target audience' },
    { key: 'brand_voice',     label: 'Brand voice' },
    { key: 'products',        label: 'Products' },
  ]

  const { count: imageCount } = await supabase
    .from('brand_images')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brand.id)

  const hasImages = (imageCount || 0) > 0
  const imageScore = (imageCount || 0) >= 3 ? 1 : 0

  const completedCount = completenessFields.filter(f => {
    const v = (brand as any)[f.key]
    if (f.key === 'products') return Array.isArray(v) && v.length > 0
    return !!v
  }).length + imageScore

  const totalFields = completenessFields.length + 1
  const completenessPercent = Math.round((completedCount / totalFields) * 100)

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false })

  const latestCampaign = campaigns?.[0]

  const primaryColor = brand.primary_color || '#000'
  function isLight(hex: string) {
    const c = hex.replace('#', '')
    if (c.length < 6) return false
    const r = parseInt(c.slice(0, 2), 16)
    const g = parseInt(c.slice(2, 4), 16)
    const b = parseInt(c.slice(4, 6), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128
  }
  const textOnPrimary = isLight(primaryColor) ? '#000' : '#fff'

  return (
    <div className="pv-dash" style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        @media (max-width: 768px) {
          .pv-dash { padding: 20px 16px !important; }
          .pv-dash-pillars { grid-template-columns: 1fr !important; }
          .pv-dash-brand { flex-direction: column !important; }
        }
        .dash-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important; }
        .dash-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; border-color: #ccc !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
          Your workspace
        </div>
        <h1 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          Welcome back.
        </h1>
      </div>

      {/* Brand switcher */}
      {brands.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {brands.map((b: any) => {
            const isActive = b.id === brand.id
            return (
              <Link key={b.id} href={`/dashboard?brand=${b.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                borderRadius: 999, border: isActive ? '2px solid #000' : '1.5px solid var(--border)',
                background: isActive ? '#000' : '#fff', textDecoration: 'none', transition: 'all 0.15s', flexShrink: 0,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.primary_color || '#000', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? '#fff' : 'var(--ink)', whiteSpace: 'nowrap' }}>{b.name}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Brand card */}
      <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--border)', marginBottom: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        {/* Left: color accent + logo + name + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
          <div style={{ width: 4, height: 44, borderRadius: 2, background: primaryColor, flexShrink: 0 }} />
          <div style={{ width: 44, height: 44, borderRadius: 10, background: primaryColor, border: `1px solid ${textOnPrimary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {brand.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={brand.logo_url} style={{ width: 28, height: 28, objectFit: 'contain', filter: isLight(primaryColor) ? 'none' : 'brightness(0) invert(1)' }} alt={brand.name} />
            ) : (
              <span style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, color: textOnPrimary }}>{brand.name[0].toUpperCase()}</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{brand.website?.replace(/https?:\/\//, '') || '—'}</span>
              <span style={{ fontSize: 10, color: '#ddd' }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{campaigns?.length || 0} campaign{(campaigns?.length || 0) !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: 10, color: '#ddd' }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{imageCount || 0} images</span>
            </div>
          </div>
        </div>

        {/* Right: completeness + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Brand strength</div>
            <div style={{ width: 120, height: 4, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
              <div style={{ height: '100%', width: `${completenessPercent}%`, background: completenessPercent === 100 ? '#00ff97' : primaryColor, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{completedCount}/{totalFields}</div>
          </div>
          <div style={{ width: 1, height: 36, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/brand-setup/${brand.id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none', padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Edit →</Link>
            {latestCampaign && (
              <Link href={`/preview/${latestCampaign.id}`} style={{ fontSize: 12, fontWeight: 700, color: textOnPrimary, textDecoration: 'none', padding: '7px 14px', borderRadius: 999, background: primaryColor, whiteSpace: 'nowrap' }}>View funnel →</Link>
            )}
          </div>
        </div>
      </div>

      {/* Missing fields hint */}
      {completenessPercent < 100 && (
        <div style={{
          background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '12px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            To reach 100%:{' '}
            {completenessFields
              .filter(f => {
                const v = (brand as any)[f.key]
                if (f.key === 'products') return !(Array.isArray(v) && v.length > 0)
                return !v
              })
              .map(f => f.label)
              .join(', ')}
            {(imageCount || 0) < 3 && ' · 3+ product images'}
          </div>
          <Link href={`/brand-setup/${brand.id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {completenessPercent >= 60 ? 'Almost there — complete your brand →' : 'Get to 100% for better creatives →'}
          </Link>
        </div>
      )}

      {/* Three pillars */}
      <div className="pv-dash-pillars" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>

        {/* Brand Hub */}
        <Link href={`/brand-setup/${brand.id}`} style={{ textDecoration: 'none' }}>
          <div className="dash-card" style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 22 }}>✦</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000', marginBottom: 10 }}>Brand Hub</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
              Colors, fonts, voice and product details. The more you add, the better every creative gets.
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'Colors', done: !!brand.primary_color },
                { label: 'Voice', done: !!brand.brand_voice },
                { label: 'Images', done: hasImages },
                { label: 'Products', done: !!(brand.products as any)?.length },
              ].map(({ label, done }) => (
                <span key={label} style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '4px 10px', borderRadius: 6,
                  background: done ? 'rgba(0,255,151,0.08)' : '#f5f5f5',
                  color: done ? '#00a86b' : '#bbb',
                  border: done ? '1px solid rgba(0,255,151,0.2)' : '1px solid transparent',
                }}>
                  {done ? '✓' : '○'} {label}
                </span>
              ))}
            </div>
          </div>
        </Link>

        {/* Creative Studio */}
        <Link href={latestCampaign ? `/creatives?brand=${brand.id}&campaign=${latestCampaign.id}` : `/creatives?brand=${brand.id}`} style={{ textDecoration: 'none' }}>
          <div className="dash-card" style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 22 }}>▦</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000', marginBottom: 10 }}>Creative Studio</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
              9 templates, batch generation, Meta-ready exports. Your brand applied automatically.
            </div>
            <div style={{ display: 'flex', gap: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {[{ num: '9', label: 'Templates' }, { num: '3', label: 'Sizes' }, { num: '∞', label: 'Variations' }].map(({ num, label }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, color: primaryColor, lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Link>

        {/* Campaigns */}
        <Link href="/campaigns" style={{ textDecoration: 'none' }}>
          <div className="dash-card" style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 22 }}>◈</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000', marginBottom: 10 }}>Campaigns</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
              Set your goal, audience and offer. Generate a complete funnel in one shot.
            </div>
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {campaigns?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(campaigns as any[]).slice(0, 2).map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{c.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#00a86b', background: 'rgba(0,255,151,0.08)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(0,255,151,0.2)' }}>Active</span>
                    </div>
                  ))}
                  {campaigns.length > 2 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>+{campaigns.length - 2} more</div>}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No campaigns yet — create your first</div>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Campaigns section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)' }}>
            Campaigns <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, color: 'var(--muted)', fontFamily: 'system-ui', textTransform: 'none', letterSpacing: 0 }}>{campaigns?.length || 0}</span>
          </div>
          <Link href="/campaigns" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none' }}>View all →</Link>
        </div>
        {!campaigns?.length ? (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>No campaigns yet.</div>
            <Link href="/campaigns/new" style={{ fontSize: 13, fontWeight: 700, color: '#000', textDecoration: 'none', padding: '8px 20px', background: '#00ff97', borderRadius: 999 }}>New campaign →</Link>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            {(campaigns as any[]).map((c: any, i: number) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < campaigns.length - 1 ? '1px solid var(--border)' : 'none', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: primaryColor, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: c.status === 'active' ? 'rgba(0,255,151,0.1)' : '#f5f5f5', color: c.status === 'active' ? '#00a86b' : 'var(--muted)', flexShrink: 0 }}>{c.status}</span>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link href={`/preview/${c.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none', padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 999, background: '#fff', whiteSpace: 'nowrap' }}>View</Link>
                  <Link href={`/creatives?brand=${brand.id}&campaign=${c.id}`} style={{ fontSize: 12, fontWeight: 700, color: '#000', textDecoration: 'none', padding: '5px 12px', background: '#f0f0f0', borderRadius: 999, whiteSpace: 'nowrap' }}>Creatives →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
