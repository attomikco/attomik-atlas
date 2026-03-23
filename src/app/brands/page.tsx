import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Globe, ArrowRight } from 'lucide-react'

export default async function BrandsPage() {
  const supabase = createClient()
  const { data: brands } = await supabase.from('brands').select('*').order('name')

  return (
    <div className="p-10 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1>Brands</h1>
          <p className="text-muted mt-1">{brands?.length ?? 0} clients</p>
        </div>
        <Link href="/brands/new"
          className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-btn transition-colors duration-150"
          style={{ background: '#00ff97', color: '#000' }}
        >
          <Plus size={15} />
          Add brand
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {brands?.map((brand) => (
          <Link key={brand.id} href={`/brands/${brand.id}`}
            className="bg-paper border border-border rounded-card p-6 hover:border-ink transition-all duration-150 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-btn border border-border flex-shrink-0"
                  style={{ background: brand.primary_color || '#f2f2f2' }} />
                <div>
                  <div className="font-bold text-base">{brand.name}</div>
                  <div className="text-muted text-sm">{brand.industry || 'DTC'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge status-${brand.status}`}>{brand.status}</span>
                <ArrowRight size={14} className="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {brand.tone_keywords && brand.tone_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {brand.tone_keywords.slice(0, 4).map((kw: string) => (
                  <span key={kw} className="text-xs px-2.5 py-0.5 bg-cream rounded-pill text-muted">{kw}</span>
                ))}
              </div>
            )}

            {brand.website && (
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Globe size={12} />
                {brand.website.replace('https://', '')}
              </div>
            )}
          </Link>
        ))}

        {(!brands || brands.length === 0) && (
          <div className="col-span-2 bg-paper border border-dashed border-border rounded-card p-16 text-center">
            <p className="text-muted mb-4">No brands yet.</p>
            <Link href="/brands/new" className="font-bold underline underline-offset-4">Add your first brand</Link>
          </div>
        )}
      </div>
    </div>
  )
}
