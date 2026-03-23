import { createClient } from '@/lib/supabase/server'
import GenerateClient from '@/components/ui/GenerateClient'

export default async function GeneratePage({ searchParams }: { searchParams: { brand?: string } }) {
  const supabase = createClient()
  const { data: brands } = await supabase
    .from('brands').select('id, name, primary_color, tone_keywords, brand_voice, target_audience')
    .eq('status', 'active').order('name')
  return (
    <div className="p-10 max-w-5xl">
      <div className="mb-8">
        <h1>Generate</h1>
        <p className="text-muted mt-1">AI-powered content, aware of each brand&apos;s voice and guidelines.</p>
      </div>
      <GenerateClient brands={brands ?? []} defaultBrandId={searchParams.brand} />
    </div>
  )
}
