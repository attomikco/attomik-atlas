import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PreviewClient from '@/components/campaigns/PreviewClient'

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: campaign }, { data: generatedContent }, { data: brandImages }] = await Promise.all([
    supabase.from('campaigns').select('*, brand:brands(*)').eq('id', id).single(),
    supabase.from('generated_content').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
    supabase.from('brand_images').select('*').eq('brand_id', id).limit(3),
  ])

  if (!campaign) notFound()

  const brand = campaign.brand

  // Re-fetch brand images with the correct brand_id (the join above used campaign id)
  const { data: correctBrandImages } = await supabase
    .from('brand_images')
    .select('*')
    .eq('brand_id', brand.id)
    .limit(3)

  return (
    <PreviewClient
      campaign={campaign}
      brand={brand}
      generatedContent={generatedContent ?? []}
      brandImages={correctBrandImages ?? []}
    />
  )
}
