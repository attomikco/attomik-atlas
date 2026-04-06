'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'

export default function CampaignsPage() {
  const { activeBrandId, setActiveBrandId, setActiveCampaignId } = useBrand()
  const router = useRouter()

  function enterCampaignMode(campaignId: string, brandId: string) {
    setActiveBrandId(brandId)
    setActiveCampaignId(campaignId)
    router.push('/creatives')
  }
  const [campaigns, setCampaigns] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBrandId) return
    setLoading(true)
    const supabase = createClient()
    supabase.from('campaigns')
      .select('*, brand:brands(name, primary_color, logo_url)')
      .eq('brand_id', activeBrandId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCampaigns(data)
        setLoading(false)
      })
  }, [activeBrandId])

  if (loading) return null

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Campaigns</div>
          <h1 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Your funnels.</h1>
        </div>
        <Link href="/campaigns/new" style={{ background: '#000', color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13, padding: '10px 24px', borderRadius: 999, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>+ New campaign</Link>
      </div>

      {!campaigns?.length && (
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 20, padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>◈</div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', marginBottom: 8 }}>No campaigns yet.</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Create your first campaign to generate a full ad funnel.</div>
          <Link href="/campaigns/new" style={{ background: '#000', color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13, padding: '10px 24px', borderRadius: 999, textDecoration: 'none' }}>Create first campaign →</Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {campaigns?.map((c: any) => (
          <div key={c.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16, transition: 'box-shadow 0.15s' }}>
            <div style={{ width: 4, height: 44, borderRadius: 2, background: c.brand?.primary_color || '#000', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{c.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
                <span>{c.brand?.name}</span>
                <span>·</span>
                <span>{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {c.goal && (
                  <>
                    <span>·</span>
                    <span style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{c.goal}</span>
                  </>
                )}
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, background: c.status === 'active' ? 'rgba(0,255,151,0.1)' : '#f5f5f5', color: c.status === 'active' ? '#00a86b' : 'var(--muted)' }}>{c.status}</span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => enterCampaignMode(c.id, c.brand_id)} style={{ fontSize: 12, fontWeight: 700, color: '#000', border: '1px solid #000', borderRadius: 999, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>⚡ Work on this</button>
              <Link href={`/preview/${c.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none', padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 999, background: '#fff' }}>View funnel</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
