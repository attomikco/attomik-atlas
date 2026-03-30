import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  const brand = brands?.[0]
  if (!brand) redirect('/onboarding')

  const completenessFields = [
    { key: 'logo_url',        label: 'Logo',              href: `/brand-setup/${brand.id}?step=1` },
    { key: 'mission',         label: 'Brand description', href: `/brand-setup/${brand.id}?step=1` },
    { key: 'target_audience', label: 'Target audience',   href: `/brand-setup/${brand.id}?step=1` },
    { key: 'brand_voice',     label: 'Brand voice',       href: `/brand-setup/${brand.id}?step=1` },
    { key: 'products',        label: 'Product details',   href: `/brand-setup/${brand.id}?step=2` },
  ]

  const completedCount = completenessFields.filter(
    f => {
      const v = (brand as any)[f.key]
      if (f.key === 'products') return Array.isArray(v) && v.length > 0
      return !!v
    }
  ).length
  const completenessPercent = Math.round((completedCount / completenessFields.length) * 100)

  const { count: imageCount } = await supabase
    .from('brand_images')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brand.id)

  const hasImages = (imageCount || 0) > 0

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at', { ascending: false })
    .limit(3)

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

      {/* Brand card */}
      <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 20, background: primaryColor, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle at 80% 50%, ${textOnPrimary}08 0%, transparent 60%)`, pointerEvents: 'none' }} />
        <div style={{ padding: '32px 36px', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', gap: 32, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {/* Left: identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {brand.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={brand.logo_url} alt={brand.name} style={{ height: 56, width: 'auto', objectFit: 'contain', maxWidth: 140, filter: isLight(primaryColor) ? 'none' : 'brightness(0) invert(1)' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${textOnPrimary}15`, border: `1.5px solid ${textOnPrimary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 26, color: textOnPrimary, flexShrink: 0 }}>
                {brand.name[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${textOnPrimary}55`, marginBottom: 4 }}>Active brand</div>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(20px, 3vw, 32px)', color: textOnPrimary, letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 1, marginBottom: 6 }}>{brand.name}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${textOnPrimary}10`, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: `${textOnPrimary}70`, fontWeight: 500 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff97', flexShrink: 0 }} />
                {brand.website?.replace(/https?:\/\//, '') || 'No website'}
              </div>
            </div>
          </div>

          {/* Right: completeness + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, minWidth: 200 }}>
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${textOnPrimary}60` }}>Brand strength</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: textOnPrimary }}>{completenessPercent}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: `${textOnPrimary}18`, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${completenessPercent}%`, background: completenessPercent === 100 ? '#00ff97' : `${textOnPrimary}90`, borderRadius: 3, transition: 'width 0.8s ease' }} />
              </div>
              {completenessPercent < 100 && (
                <div style={{ fontSize: 11, color: `${textOnPrimary}50`, marginTop: 6 }}>{completedCount}/{completenessFields.length} fields complete</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={`/brand-setup/${brand.id}`} style={{ fontSize: 12, fontWeight: 700, color: textOnPrimary, textDecoration: 'none', padding: '7px 14px', borderRadius: 999, border: `1px solid ${textOnPrimary}25`, background: `${textOnPrimary}10`, whiteSpace: 'nowrap' }}>Edit brand</Link>
              {latestCampaign && (
                <Link href={`/preview/${latestCampaign.id}`} style={{ fontSize: 12, fontWeight: 700, color: primaryColor, textDecoration: 'none', padding: '7px 14px', borderRadius: 999, background: textOnPrimary, whiteSpace: 'nowrap' }}>View funnel →</Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{ borderTop: `1px solid ${textOnPrimary}12`, padding: '12px 36px', display: 'flex', gap: 24, position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Campaigns', value: campaigns?.length || 0 },
            { label: 'Images', value: imageCount || 0 },
            { label: 'Products', value: (brand as any).products?.length || 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 16, color: textOnPrimary }}>{value}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: `${textOnPrimary}50`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
          ))}
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
            Missing:{' '}
            {completenessFields
              .filter(f => {
                const v = (brand as any)[f.key]
                if (f.key === 'products') return !(Array.isArray(v) && v.length > 0)
                return !v
              })
              .map(f => f.label)
              .join(', ')}
            {!hasImages && ' · Product images'}
          </div>
          <Link href={`/brand-setup/${brand.id}`} style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Complete brand setup →
          </Link>
        </div>
      )}

      {/* Three pillars */}
      <div className="pv-dash-pillars" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>

        {/* Brand Hub */}
        <Link href={`/brand-setup/${brand.id}`} style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%',
            cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20,
            }}>✦</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8, color: '#000' }}>
              Brand Hub
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Add your brand voice, colors, fonts and product details. The more context you give, the better your creatives get.
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'Colors', done: !!brand.primary_color },
                { label: 'Voice', done: !!brand.brand_voice },
                { label: 'Images', done: hasImages },
                { label: 'Product', done: !!(brand.products as any)?.length },
              ].map(({ label, done }) => (
                <span key={label} style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 4,
                  background: done ? 'rgba(0,255,151,0.1)' : 'rgba(0,0,0,0.05)',
                  color: done ? '#00a86b' : 'var(--muted)',
                  border: done ? '1px solid rgba(0,255,151,0.25)' : '1px solid transparent',
                }}>
                  {done ? '✓' : '○'} {label}
                </span>
              ))}
            </div>
          </div>
        </Link>

        {/* Creative Studio */}
        <Link
          href={latestCampaign ? `/creatives?brand=${brand.id}&campaign=${latestCampaign.id}` : `/creatives?brand=${brand.id}`}
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            background: '#000', borderRadius: 20, padding: '28px 24px', height: '100%',
            cursor: 'pointer', transition: 'transform 0.15s',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20,
            }}>▦</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8, color: '#fff' }}>
              Creative Studio
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 20 }}>
              Build ad creatives on demand. Pick a template, choose your image, tweak the copy. Export Meta-ready in seconds.
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#00ff97', fontSize: 13, fontWeight: 700 }}>
              Open studio →
            </div>
          </div>
        </Link>

        {/* Campaigns */}
        <Link href="/campaigns" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%',
            cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20,
            }}>◈</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8, color: '#000' }}>
              Campaigns
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Create a full campaign. Set your goal, audience, and budget — then generate your complete funnel in one shot.
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              {campaigns?.length || 0} campaign{campaigns?.length !== 1 ? 's' : ''} created
            </div>
          </div>
        </Link>
      </div>

      {/* Latest campaign preview */}
      {latestCampaign && (
        <div style={{
          background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
              Latest campaign
            </div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>
              {latestCampaign.name}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href={`/preview/${latestCampaign.id}`} style={{
              fontSize: 12, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none',
              padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 999, background: '#fff',
            }}>
              View funnel →
            </Link>
            <Link href={`/creatives?brand=${brand.id}&campaign=${latestCampaign.id}`} style={{
              fontSize: 12, fontWeight: 700, color: '#000', textDecoration: 'none',
              padding: '8px 16px', border: 'none', borderRadius: 999, background: '#00ff97',
            }}>
              Edit creatives →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
