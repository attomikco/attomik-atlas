import { redirect } from 'next/navigation'

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/brand-setup/${id}`)
}
