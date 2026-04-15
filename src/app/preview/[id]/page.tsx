import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import PreviewClient from '@/components/campaigns/PreviewClient'

// Service-role client for the preview page. /preview/[id] is a public route —
// anonymous funnel visitors AND logged-in users viewing an unclaimed brand
// both need to be able to read the brand row, and the brand-members-gated RLS
// on `brands` blocks both. Using the admin client here mirrors the pattern
// /api/campaigns/[id]/email already uses; the campaign id in the URL is the
// effective auth token for this page.
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [{ data: campaign }, { data: generatedContent }] = await Promise.all([
    supabaseAdmin.from('campaigns').select('*, brand:brands(*)').eq('id', id).single(),
    supabaseAdmin.from('generated_content').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
  ])

  if (!campaign) notFound()

  const brand = campaign.brand

  const { data: brandImages } = await supabaseAdmin
    .from('brand_images')
    .select('*')
    .eq('brand_id', brand.id)
    .order('created_at')

  return (
    <PreviewClient
      campaign={campaign}
      brand={brand}
      generatedContent={generatedContent ?? []}
      brandImages={brandImages ?? []}
    />
  )
}
