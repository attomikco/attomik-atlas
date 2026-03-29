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
      <div className="pv-dash-brand" style={{
        background: primaryColor, borderRadius: 20, padding: '28px 32px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {brand.logo_url ? (
            <img src={brand.logo_url} style={{ height: 48, width: 'auto', objectFit: 'contain', borderRadius: 8 }} alt={brand.name} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: `${textOnPrimary}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, color: textOnPrimary,
            }}>
              {brand.name[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 24, color: textOnPrimary, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
              {brand.name}
            </div>
            <div style={{ fontSize: 13, color: `${textOnPrimary}80`, marginTop: 2 }}>
              {brand.website || 'No website set'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 160 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: `${textOnPrimary}70`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Brand completeness
          </div>
          <div style={{ width: 160, height: 4, background: `${textOnPrimary}20`, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${completenessPercent}%`,
              background: completenessPercent === 100 ? '#00ff97' : textOnPrimary,
              borderRadius: 2, transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: textOnPrimary }}>
            {completedCount}/{completenessFields.length} complete
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
