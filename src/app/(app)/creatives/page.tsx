import { createClient } from '@/lib/supabase/server'
import CreativeBuilder from '@/components/creatives/CreativeBuilder'

export default async function CreativesPage({
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
    .order('name')

  return (
    <div className="p-4 md:p-10 max-w-[1600px]">
      <div className="mb-8">
        <h1>Creatives</h1>
        <p className="text-muted mt-1">
          Build ad creatives from your brand image library and copy.
        </p>
      </div>
      <CreativeBuilder brands={brands ?? []} defaultBrandId={brandParam} />
    </div>
  )
}
