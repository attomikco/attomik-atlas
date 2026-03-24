import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Mail } from 'lucide-react'
import BrandVoiceEditor from '@/components/brands/BrandVoiceEditor'
import BrandProfileEditor from '@/components/brands/BrandProfileEditor'
import BrandVoiceExamples from '@/components/brands/BrandVoiceExamples'
import BrandUploadAsset from '@/components/brands/BrandUploadAsset'

export default async function BrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: brand }, { data: assets }, { data: campaigns }, { data: voiceExamples }] = await Promise.all([
    supabase.from('brands').select('*').eq('id', id).single(),
    supabase.from('brand_assets').select('*').eq('brand_id', id).order('created_at'),
    supabase.from('campaigns').select('*').eq('brand_id', id).order('created_at', { ascending: false }).limit(10),
    supabase.from('brand_voice_examples').select('*').eq('brand_id', id).order('created_at'),
  ])
  if (!brand) notFound()

  const guidelines = assets?.filter(a => a.type === 'guidelines') ?? []
  const templates  = assets?.filter(a => a.type === 'html_template') ?? []

  return (
    <div className="p-4 md:p-10 max-w-6xl">
      <Link href="/brands" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6">
        <ArrowLeft size={14} /> All brands
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-card border border-border flex-shrink-0"
            style={{ background: brand.primary_color || '#f2f2f2' }} />
          <div>
            <h1>{brand.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-muted">{brand.industry || 'DTC'}</span>
              <span className={`badge status-${brand.status}`}>{brand.status}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/generate?brand=${brand.id}`}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-btn transition-opacity hover:opacity-90"
            style={{ background: '#00ff97', color: '#000' }}
          >
            <Sparkles size={14} /> Generate
          </Link>
          <Link href={`/campaigns/new?brand=${brand.id}`}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-btn bg-ink text-paper hover:bg-ink/80 transition-colors"
          >
            <Mail size={14} /> New campaign
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Row 1: Voice editor (full width) */}
        <BrandVoiceEditor brand={brand} />

        {/* Row 2: Assets + Colors side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <BrandUploadAsset brandId={brand.id} label="Brand guidelines" type="guidelines"
            assets={guidelines} accept=".pdf,.doc,.docx" hint="PDF or Word doc" />
          <BrandUploadAsset brandId={brand.id} label="HTML email template" type="html_template"
            assets={templates} accept=".html,.htm" hint=".html file" />
          <div className="bg-paper border border-border rounded-card p-5">
            <div className="label mb-3">Color palette</div>
            <div className="flex gap-5">
              {[
                { label: 'Primary',   value: brand.primary_color },
                { label: 'Secondary', value: brand.secondary_color },
                { label: 'Accent',    value: brand.accent_color },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-btn border border-border flex-shrink-0"
                    style={{ background: value || '#f2f2f2' }} />
                  <div>
                    <div className="text-[10px] text-muted uppercase tracking-label">{label}</div>
                    <div className="text-sm font-mono font-medium">{value || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Brand profile (full width) */}
        <BrandProfileEditor brand={brand} />

        {/* Row 4: Voice examples (full width) */}
        <BrandVoiceExamples brandId={brand.id} examples={voiceExamples ?? []} />

        {/* Row 5: Campaigns (full width) */}
        <div className="bg-paper border border-border rounded-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="label">Campaigns</div>
            <Link href={`/campaigns/new?brand=${brand.id}`}
              className="text-sm font-semibold text-muted hover:text-ink transition-colors">+ New</Link>
          </div>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-0 divide-y divide-border">
              {campaigns.map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`}
                  className="flex items-center justify-between py-3 hover:opacity-70 transition-opacity">
                  <div>
                    <div className="font-semibold text-sm">{c.name}</div>
                    <div className="text-muted text-xs mt-0.5">{c.type}</div>
                  </div>
                  <span className={`badge status-${c.status}`}>{c.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No campaigns yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
