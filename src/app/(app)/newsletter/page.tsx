import { createClient } from '@/lib/supabase/server'
import NewsletterClient from '@/components/newsletter/NewsletterClient'

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: { brand?: string }
}) {
  const supabase = await createClient()

  const [{ data: brands }, { data: templates }] = await Promise.all([
    supabase
      .from('brands')
      .select('id, name, primary_color, tone_keywords, brand_voice, target_audience')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('brand_assets')
      .select('brand_id, id, file_name, storage_path')
      .eq('type', 'html_template'),
  ])

  const templateMap: Record<string, { id: string; file_name: string; storage_path: string }> = {}
  templates?.forEach(t => { templateMap[t.brand_id] = t })

  return (
    <div className="p-4 md:p-10 max-w-5xl">
      <div className="mb-8">
        <h1>Newsletter builder</h1>
        <p className="text-muted mt-1">
          Describe your email, Claude writes it into your Klaviyo HTML template. Copy and paste straight in.
        </p>
      </div>
      <NewsletterClient
        brands={brands ?? []}
        templateMap={templateMap}
        defaultBrandId={searchParams.brand}
      />
    </div>
  )
}
