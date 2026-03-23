import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Users, Mail, Sparkles } from 'lucide-react'

export default async function HomePage() {
  const supabase = createClient()
  const [{ count: brandCount }, { count: campaignCount }, { count: contentCount }] = await Promise.all([
    supabase.from('brands').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }),
    supabase.from('generated_content').select('*', { count: 'exact', head: true }),
  ])
  const { data: recentCampaigns } = await supabase
    .from('campaigns')
    .select('*, brand:brands(name, primary_color)')
    .order('created_at', { ascending: false })
    .limit(6)

  const stats = [
    { label: 'Active brands',    value: brandCount ?? 0,  icon: Users,    href: '/brands' },
    { label: 'Campaigns',        value: campaignCount ?? 0, icon: Mail,   href: '/campaigns' },
    { label: 'Generated pieces', value: contentCount ?? 0, icon: Sparkles, href: '/generate' },
  ]

  return (
    <div className="p-10 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1>Good morning</h1>
        <p className="text-muted mt-1">Here&apos;s what&apos;s happening across your brands.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}
            className="bg-paper border border-border rounded-card p-6 hover:border-ink transition-all duration-150 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Icon size={16} className="text-muted" />
              <ArrowRight size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="kpi">{value}</div>
            <div className="label mt-1">{label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <div className="label mb-3">Quick actions</div>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/brands/new"
            className="bg-paper border border-border rounded-card p-5 hover:border-ink transition-all duration-150"
          >
            <div className="font-semibold mb-1">Add brand</div>
            <div className="text-muted text-sm">Set up a new client</div>
          </Link>
          <Link href="/campaigns/new"
            className="bg-paper border border-border rounded-card p-5 hover:border-ink transition-all duration-150"
          >
            <div className="font-semibold mb-1">New campaign</div>
            <div className="text-muted text-sm">Email, social, SEO, ad copy</div>
          </Link>
          <Link href="/generate"
            style={{ background: '#00ff97', border: '1px solid #00ff97' }}
            className="rounded-card p-5 hover:opacity-90 transition-opacity"
          >
            <div className="font-bold mb-1">Generate content</div>
            <div className="text-sm" style={{ color: 'rgba(0,0,0,0.6)' }}>AI-powered, brand-aware</div>
          </Link>
        </div>
      </div>

      {/* Recent campaigns */}
      {recentCampaigns && recentCampaigns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="label">Recent campaigns</div>
            <Link href="/campaigns" className="text-sm text-muted hover:text-ink transition-colors">View all →</Link>
          </div>
          <div className="attomik-table bg-paper">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Brand</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: c.brand?.primary_color || '#e0e0e0' }} />
                        <span className="text-muted">{c.brand?.name}</span>
                      </div>
                    </td>
                    <td><span className="text-muted">{c.type}</span></td>
                    <td><span className={`badge status-${c.status}`}>{c.status}</span></td>
                    <td>
                      <Link href={`/campaigns/${c.id}`} className="text-muted hover:text-ink transition-colors text-sm">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
