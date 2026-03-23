import { createClient } from '@/lib/supabase/server'
import FacebookAdClient from '@/components/ads/FacebookAdClient'

export default async function AdsPage({
  searchParams,
}: {
  searchParams: { brand?: string }
}) {
  const supabase = await createClient()
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, primary_color, tone_keywords, brand_voice, target_audience, website, industry')
    .eq('status', 'active')
    .order('name')

  return (
    <div className="p-4 md:p-10 max-w-5xl">
      <div className="mb-8">
        <h1>Facebook ads</h1>
        <p className="text-muted mt-1">
          Generate Meta-ready ad copy — primary text, headline, and description — in three variations.
        </p>
      </div>
      <FacebookAdClient brands={brands ?? []} defaultBrandId={searchParams.brand} />
    </div>
  )
}
