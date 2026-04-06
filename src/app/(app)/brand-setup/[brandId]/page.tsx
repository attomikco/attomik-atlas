import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BrandHubClient from './BrandSetupClient'

export const metadata = { title: 'Brand Hub — Attomik' }

export default async function BrandHubPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params
  const supabase = await createClient()

  const [{ data: brand }, { data: images }] = await Promise.all([
    supabase.from('brands').select('*').eq('id', brandId).single(),
    supabase.from('brand_images').select('*').eq('brand_id', brandId).order('created_at'),
  ])

  if (!brand) notFound()

  return <BrandHubClient brand={brand} initialImages={images || []} />
}
