import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function CampaignsPage() {
  const supabase = createClient()
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, brand:brands(name, primary_color)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-10 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1>Campaigns</h1>
          <p className="text-muted mt-1">{campaigns?.length ?? 0} total</p>
        </div>
        <Link href="/campaigns/new"
          className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90"
          style={{ background: '#00ff97', color: '#000' }}
        >
          <Plus size={15} /> New campaign
        </Link>
      </div>

      <div className="attomik-table bg-paper">
        <table className="w-full">
          <thead>
            <tr>
              <th>Campaign</th><th>Brand</th><th>Type</th><th>Status</th><th>Scheduled</th><th></th>
            </tr>
          </thead>
          <tbody>
            {campaigns?.map((c: any) => (
              <tr key={c.id}>
                <td className="font-semibold">{c.name}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.brand?.primary_color || '#e0e0e0' }} />
                    <span className="text-muted">{c.brand?.name}</span>
                  </div>
                </td>
                <td><span className="text-muted capitalize">{c.type.replace('_', ' ')}</span></td>
                <td><span className={`badge status-${c.status}`}>{c.status}</span></td>
                <td className="text-muted font-mono text-xs">
                  {c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : '—'}
                </td>
                <td><Link href={`/campaigns/${c.id}`} className="text-muted hover:text-ink transition-colors text-sm">View →</Link></td>
              </tr>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <tr><td colSpan={6} className="text-center text-muted py-12">No campaigns yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
