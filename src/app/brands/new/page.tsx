import NewBrandForm from '@/components/brands/NewBrandForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewBrandPage() {
  return (
    <div className="p-10 max-w-2xl">
      <Link href="/brands" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6">
        <ArrowLeft size={14} /> All brands
      </Link>
      <h1 className="mb-2">Add brand</h1>
      <p className="text-muted mb-8">Set up a new client in the Marketing OS.</p>
      <NewBrandForm />
    </div>
  )
}
