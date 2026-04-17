import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'
import BrandSync from './BrandSync'
import LogoImage from '@/components/ui/LogoImage'
import MetaTrendChart, { type MetaTrendChartDatum } from '@/components/charts/MetaTrendChart'
import CreativeSparkline, { type CreativeSparklineDatum } from '@/components/charts/CreativeSparkline'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>
}) {
  const { brand: brandParam } = await searchParams

  // Read the `activeBrandId` cookie written by BrandSync. This lets direct
  // /dashboard loads (no ?brand= param) resolve to the user's last-rendered
  // brand on the first pass, so BrandSync no longer needs to router.replace()
  // and re-fire every Supabase query in this page.
  const cookieStore = await cookies()
  const cookieBrandId = cookieStore.get('activeBrandId')?.value

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // profiles (for welcome heading) + brands list in parallel. RLS gates
  // brands selects through brand_members (see 20260413_brand_teams_fix.sql),
  // so filtering by user_id here would miss invited brands.
  const [brandsRes, profileRes] = await Promise.all([
    supabase
      .from('brands')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    user?.id
      ? supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { full_name: string | null } | null, error: null }),
  ])

  const brands = brandsRes.data

  let firstName: string | null = null
  const fullName = (profileRes.data?.full_name || '').trim()
  if (fullName) firstName = fullName.split(/\s+/)[0] || null

  if (!brands?.length) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>✦</div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', textAlign: 'center' }}>No brands yet</div>
        <p style={{ color: '#555', fontSize: 16, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>Add your first brand — paste your URL and we&rsquo;ll extract your identity in 30 seconds.</p>
        <a href="/new" style={{ background: '#00ff97', color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 15, padding: '14px 32px', borderRadius: 999, textDecoration: 'none', marginTop: 8 }}>+ Add brand</a>
      </div>
    )
  }

  // Priority: URL ?brand= param (explicit navigation always wins) → cookie
  // (user's last-rendered brand) → brands[0] (fallback).
  const cookieBrand = cookieBrandId ? brands.find((b: any) => b.id === cookieBrandId) : null
  const paramBrand = brandParam ? brands.find((b: any) => b.id === brandParam) : null
  const brand = paramBrand || cookieBrand || brands[0]

  const completenessFields = [
    { key: 'logo_url',        label: 'Logo' },
    { key: 'mission',         label: 'Brand description' },
    { key: 'target_audience', label: 'Target audience' },
    { key: 'brand_voice',     label: 'Brand voice' },
    { key: 'products',        label: 'Products' },
  ]

  // ── Meta Ads performance window — computed before the parallel fetch so
  // the insights query can use it inside Promise.all.
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const insightsCutoff = thirtyDaysAgo.toISOString().split('T')[0]

  // All 7 brand-scoped queries run in parallel. The two prior `generated_content`
  // email reads (latest-1-with-content and all-rows-for-campaign-set) collapse
  // into a single select, ordered desc — `[0]` feeds the "latest email" pill,
  // the full list feeds the per-campaign existence Set below.
  const [
    imageCountRes,
    campaignsRes,
    generatedEmailsRes,
    creativesRowsRes,
    emailTemplateCountRes,
    teamCountRes,
    insightRowsRes,
  ] = await Promise.all([
    supabase
      .from('brand_images')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brand.id),
    supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('generated_content')
      .select('id, campaign_id, content, created_at')
      .eq('brand_id', brand.id)
      .eq('type', 'email')
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_creatives')
      .select('id, campaign_id, meta_ad_id, meta_ad_status')
      .eq('brand_id', brand.id),
    supabase
      .from('email_templates')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brand.id),
    supabase
      .from('brand_members')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brand.id),
    supabase
      .from('brand_insight_rows')
      .select('ad_name, spend, purchases, purchase_value, roas, impressions, clicks, creative_image_url, creative_title, date')
      .eq('brand_id', brand.id)
      .gte('date', insightsCutoff)
      .order('date', { ascending: false }),
  ])

  const imageCount = imageCountRes.count
  const campaigns = campaignsRes.data
  const creativesRows = creativesRowsRes.data
  const emailTemplateCount = emailTemplateCountRes.count
  const teamCount = teamCountRes.count
  const insightRows = insightRowsRes.data

  const hasImages = (imageCount || 0) > 0
  const imageScore = (imageCount || 0) >= 3 ? 1 : 0

  const completedCount = completenessFields.filter(f => {
    const v = (brand as any)[f.key]
    if (f.key === 'products') return Array.isArray(v) && v.length > 0
    return !!v
  }).length + imageScore

  const totalFields = completenessFields.length + 1
  const completenessPercent = Math.round((completedCount / totalFields) * 100)

  const latestCampaign = campaigns?.[0]

  // ── Generated email derivations (single query, both consumers) ──
  const generatedEmailRows = generatedEmailsRes.data
  const latestEmailRow = generatedEmailRows?.[0] || null
  let latestEmailSubject: string | null = null
  if (latestEmailRow?.content) {
    try {
      const parsed = typeof latestEmailRow.content === 'string'
        ? JSON.parse(latestEmailRow.content)
        : latestEmailRow.content
      latestEmailSubject = parsed?.subject || null
    } catch {
      latestEmailSubject = null
    }
  }
  const emailsByCampaign = new Set<string>()
  for (const row of generatedEmailRows || []) {
    if (row.campaign_id) emailsByCampaign.add(row.campaign_id)
  }

  // Saved creatives + Meta-launched split — feeds the "Creatives" and
  // "Ads launched" pills plus the per-campaign roll-up below.
  const creativesCount = creativesRows?.length || 0
  const launchedAds = (creativesRows || []).filter((c: any) => !!c.meta_ad_id)
  const launchedCount = launchedAds.length
  const pausedCount = launchedAds.filter((c: any) => c.meta_ad_status === 'PAUSED').length
  const activeAdCount = launchedCount - pausedCount

  const creativesByCampaign = new Map<string, number>()
  for (const c of creativesRows || []) {
    if (c.campaign_id) {
      creativesByCampaign.set(c.campaign_id, (creativesByCampaign.get(c.campaign_id) || 0) + 1)
    }
  }

  // Snapshot display strings
  const latestEmailDate = latestEmailRow?.created_at
    ? new Date(latestEmailRow.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''
  const truncSubject = latestEmailSubject && latestEmailSubject.length > 28
    ? latestEmailSubject.slice(0, 28) + '…'
    : latestEmailSubject
  const latestEmailDisplay = latestEmailSubject
    ? `"${truncSubject}" · ${latestEmailDate}`
    : 'No emails yet'
  const adsDisplay = launchedCount === 0
    ? 'None yet'
    : `${launchedCount} · ${activeAdCount} active${pausedCount ? ` · ${pausedCount} paused` : ''}`

  const hasInsights = !!(insightRows && insightRows.length > 0)
  const totalSpend = (insightRows || []).reduce((s, r: any) => s + Number(r.spend || 0), 0)
  const totalPurchases = (insightRows || []).reduce((s, r: any) => s + Number(r.purchases || 0), 0)
  const totalRevenue = (insightRows || []).reduce((s, r: any) => s + Number(r.purchase_value || 0), 0)
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0

  type TopAd = {
    ad_name: string
    spend: number
    purchases: number
    purchase_value: number
    creative_image_url: string | null
    creative_title: string | null
  }
  const adGroups = new Map<string, TopAd>()
  for (const r of (insightRows || []) as any[]) {
    const name = r.ad_name || '(unnamed)'
    let g = adGroups.get(name)
    if (!g) {
      g = {
        ad_name: name,
        spend: 0,
        purchases: 0,
        purchase_value: 0,
        creative_image_url: r.creative_image_url || null,
        creative_title: r.creative_title || null,
      }
      adGroups.set(name, g)
    }
    g.spend += Number(r.spend || 0)
    g.purchases += Number(r.purchases || 0)
    g.purchase_value += Number(r.purchase_value || 0)
  }
  const topAds: TopAd[] = Array.from(adGroups.values())
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 3)

  // Daily aggregation for the trend chart. Revenue sums purchase_value per
  // row (Meta's directly-reported attributed revenue), matching the dashboard
  // KPI tile and the Insights chart/KPI.
  const dailyMap = new Map<string, { spend: number; revenue: number; clicks: number }>()
  for (const r of (insightRows || []) as any[]) {
    if (!r.date) continue
    let d = dailyMap.get(r.date)
    if (!d) {
      d = { spend: 0, revenue: 0, clicks: 0 }
      dailyMap.set(r.date, d)
    }
    d.spend += Number(r.spend || 0)
    d.revenue += Number(r.purchase_value || 0)
    d.clicks += Number(r.clicks || 0)
  }
  const trendData: MetaTrendChartDatum[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      spend: Math.round(d.spend * 100) / 100,
      revenue: Math.round(d.revenue * 100) / 100,
      roas: d.spend > 0 ? Math.round((d.revenue / d.spend) * 100) / 100 : 0,
      clicks: d.clicks,
    }))

  // Per-ad daily rollup for the top-3 creative sparklines. Only builds data
  // for ads that made the topAds cut, so the loop skips everything else.
  const topAdNameSet = new Set(topAds.map(a => a.ad_name))
  const adDailyMap = new Map<string, Map<string, { spend: number; revenue: number }>>()
  for (const r of (insightRows || []) as any[]) {
    if (!r.date || !r.ad_name || !topAdNameSet.has(r.ad_name)) continue
    let byDate = adDailyMap.get(r.ad_name)
    if (!byDate) {
      byDate = new Map()
      adDailyMap.set(r.ad_name, byDate)
    }
    let bucket = byDate.get(r.date)
    if (!bucket) {
      bucket = { spend: 0, revenue: 0 }
      byDate.set(r.date, bucket)
    }
    bucket.spend += Number(r.spend || 0)
    bucket.revenue += Number(r.purchase_value || 0)
  }
  const sparklineByAd = new Map<string, CreativeSparklineDatum[]>()
  adDailyMap.forEach((byDate, adName) => {
    const points: CreativeSparklineDatum[] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({
        date,
        spend: Math.round(bucket.spend * 100) / 100,
        revenue: Math.round(bucket.revenue * 100) / 100,
        roas: bucket.spend > 0 ? Math.round((bucket.revenue / bucket.spend) * 100) / 100 : 0,
      }))
    sparklineByAd.set(adName, points)
  })

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
      <BrandSync brandId={brand.id} paramExplicit={!!brandParam} />
      <style>{`
        @media (max-width: 768px) {
          .pv-dash { padding: 20px 16px !important; }
          .pv-dash-pillars { grid-template-columns: repeat(2, 1fr) !important; }
          .pv-dash-brand { flex-direction: column !important; }
        }
        .pv-dash-pillars > a { display: flex; min-width: 0; }
        .dash-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important; width: 100% !important; }
        .dash-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; border-color: #ccc !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
          Your workspace
        </div>
        <h1 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </h1>
      </div>

      {/* Brand card */}
      <div style={{ borderRadius: 20, background: '#fff', border: '1px solid var(--border)', marginBottom: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        {/* Left: color accent + logo + name + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
          <div style={{ width: 4, height: 44, borderRadius: 2, background: primaryColor, flexShrink: 0 }} />
          <div style={{ width: 44, height: 44, borderRadius: 10, background: primaryColor, border: `1px solid ${textOnPrimary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {brand.logo_url ? (
              <LogoImage src={brand.logo_url} onDark={!isLight(primaryColor)} style={{ width: 28, height: 28, objectFit: 'contain' }} alt={brand.name} />
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
            </div>
          </div>
        </div>

        {/* Right: colors + font + completeness + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          {/* Color swatches + font */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[brand.primary_color, brand.secondary_color, brand.accent_color].filter(Boolean).map((c, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c!, border: '2px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
              ))}
            </div>
            {brand.font_heading?.family && (
              <>
                <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1 }}>Font</div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, fontFamily: `${brand.font_heading.family}, sans-serif`, lineHeight: 1.2, marginTop: 2 }}>{brand.font_heading.family}</div>
                </div>
              </>
            )}
          </div>
          <div style={{ width: 1, height: 36, background: 'var(--border)', flexShrink: 0 }} />
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
              <Link href={`/preview/${latestCampaign.id}`} style={{ fontSize: 12, fontWeight: 700, color: '#00ff97', textDecoration: 'none', padding: '7px 14px', borderRadius: 999, background: '#000', whiteSpace: 'nowrap' }}>View funnel →</Link>
            )}
          </div>
        </div>
      </div>

      {/* Performance snapshot */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { icon: '📧', label: 'Last email',  value: latestEmailDisplay, title: latestEmailSubject || undefined },
          { icon: '🎨', label: 'Creatives',   value: `${creativesCount} saved` },
          { icon: '📢', label: 'Ads launched', value: adsDisplay },
          { icon: '✉',  label: 'Templates',   value: `${emailTemplateCount || 0}` },
          { icon: '👥', label: 'Team',        value: `${teamCount || 0} member${(teamCount || 0) !== 1 ? 's' : ''}` },
        ].map(({ icon, label, value, title }) => (
          <div
            key={label}
            title={title}
            style={{
              flex: '1 1 160px', minWidth: 0,
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{icon}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', lineHeight: 1 }}>{label}</div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
            </div>
          </div>
        ))}
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

      {/* Meta Ads — Last 30 days */}
      <div style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
      }}>
        {!hasInsights ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{
                fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 14,
                textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)',
                marginBottom: 4,
              }}>Meta Ads</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                No Meta Ads data yet — sync your account in Insights
              </div>
            </div>
            <Link href={`/insights?brand=${brand.id}`} style={{
              fontSize: 12, fontWeight: 700, color: 'var(--ink)', textDecoration: 'none',
              padding: '8px 18px', borderRadius: 999, border: '1px solid var(--border)',
              background: '#fff', whiteSpace: 'nowrap',
            }}>Open Insights →</Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
              <div style={{
                fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 14,
                textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink)',
              }}>Meta Ads — Last 30 days</div>
              <Link href={`/insights?brand=${brand.id}`} style={{
                fontSize: 12, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none',
              }}>View all →</Link>
            </div>

            {/* KPI row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24,
            }}>
              {[
                { label: 'Spend',     value: `$${Math.round(totalSpend).toLocaleString()}` },
                { label: 'Purchases', value: `${totalPurchases.toLocaleString()}` },
                { label: 'Revenue',   value: `$${Math.round(totalRevenue).toLocaleString()}` },
                { label: 'ROAS',      value: `${avgRoas.toFixed(2)}x` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  background: '#000', color: '#fff', borderRadius: 12,
                  padding: '20px 24px',
                }}>
                  <div style={{
                    fontFamily: 'Barlow, sans-serif', fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)', marginBottom: 10, lineHeight: 1,
                  }}>{label}</div>
                  <div style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 600,
                    color: '#00ff97', lineHeight: 1,
                  }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Trend chart */}
            <div style={{ marginBottom: 24 }}>
              <MetaTrendChart data={trendData} height={260} />
            </div>

            {/* Top creatives */}
            {topAds.length > 0 && (
              <>
                <div style={{
                  fontFamily: 'Barlow, sans-serif', fontSize: 9, fontWeight: 900,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)',
                  marginBottom: 12,
                }}>Top creatives</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {topAds.map((ad, i) => {
                    const initials = (ad.ad_name || 'AD')
                      .split(/\s+/)
                      .map((w: string) => w[0] || '')
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: 12,
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                      }}>
                        {/* LEFT — thumbnail */}
                        <div style={{
                          width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                          backgroundColor: '#2a2a2a',
                          backgroundImage: ad.creative_image_url ? `url("${ad.creative_image_url}")` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {!ad.creative_image_url && (
                            <div style={{
                              fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 24,
                              color: 'rgba(255,255,255,0.5)', letterSpacing: '-0.02em',
                            }}>{initials}</div>
                          )}
                        </div>

                        {/* MIDDLE — ad name + compact metrics */}
                        <div style={{ flex: '0 0 200px', minWidth: 0 }}>
                          <div
                            title={ad.ad_name}
                            style={{
                              fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: 14,
                              color: 'var(--ink)', letterSpacing: '-0.01em',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              marginBottom: 6,
                            }}
                          >{ad.ad_name}</div>
                          <div style={{
                            fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--muted)',
                            display: 'flex', gap: 10, alignItems: 'baseline',
                          }}>
                            <span><strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{ad.purchases}</strong> purchases</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span><strong style={{ color: 'var(--ink)', fontWeight: 700 }}>${Math.round(ad.spend).toLocaleString()}</strong> spend</span>
                          </div>
                        </div>

                        {/* RIGHT — sparkline fills remaining */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <CreativeSparkline
                            data={sparklineByAd.get(ad.ad_name) || []}
                            height={80}
                            variant="bars"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: '+ New Campaign', href: `/campaigns/new?brand=${brand.id}` },
          { label: '+ New Creative', href: `/creatives?brand=${brand.id}` },
          { label: '+ New Email',    href: `/newsletter?brand=${brand.id}` },
        ].map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            style={{
              fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 12,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--ink)', textDecoration: 'none',
              padding: '10px 20px', borderRadius: 999,
              border: '1.5px solid var(--ink)',
              background: '#fff',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Three pillars */}
      <div className="pv-dash-pillars" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32, alignItems: 'stretch' }}>

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
            <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
            <div style={{ marginTop: 'auto', display: 'flex', gap: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {[{ num: '9', label: 'Templates' }, { num: '3', label: 'Sizes' }, { num: '∞', label: 'Variations' }].map(({ num, label }) => (
                <div key={label}>
                  <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, color: '#000', lineHeight: 1 }}>{num}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </Link>

        {/* Copy Creator */}
        <Link href={`/copy?brand=${brand.id}`} style={{ textDecoration: 'none' }}>
          <div className="dash-card" style={{
            background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 22 }}>✎</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000', marginBottom: 10 }}>Copy Creator</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
              AI-generated ad copy variations. Headlines, body text, and CTAs tailored to your brand voice.
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Multiple angles</div>
          </div>
        </Link>

        {/* Email */}
        <Link href="/newsletter" style={{ textDecoration: 'none' }}>
          <div className="dash-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 22 }}>✉</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000', marginBottom: 10 }}>Email</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>Generate campaign emails from your brief. Export HTML or push directly to Klaviyo.</div>
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Klaviyo ready</div>
          </div>
        </Link>

        {/* Landing Page */}
        <Link href={latestCampaign ? `/preview/${latestCampaign.id}` : `/campaigns/new`} style={{ textDecoration: 'none' }}>
          <div className="dash-card" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 24px', height: '100%', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 22 }}>▤</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', color: '#000', marginBottom: 10 }}>Landing Page</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>AI-generated landing pages from your campaign brief. Conversion-ready HTML.</div>
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Hero · Features · CTA</div>
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
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {(creativesByCampaign.get(c.id) || 0) > 0 && (
                    <span title={`${creativesByCampaign.get(c.id)} creative${creativesByCampaign.get(c.id) === 1 ? '' : 's'}`} style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                      🎨 {creativesByCampaign.get(c.id)}
                    </span>
                  )}
                  {emailsByCampaign.has(c.id) && (
                    <span title="Email generated" style={{ fontSize: 13, lineHeight: 1 }}>📧</span>
                  )}
                </div>
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
