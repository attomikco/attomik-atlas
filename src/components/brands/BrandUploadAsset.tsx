'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BrandAsset, AssetType } from '@/types'
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  brandId: string; label: string; type: AssetType
  assets: BrandAsset[]; accept: string; hint: string
}

export default function BrandUploadAsset({ brandId, label, type, assets, accept, hint }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    const ext = file.name.split('.').pop()
    const path = `${brandId}/${type}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('brand-assets').upload(path, file)
    if (uploadError) { setError(uploadError.message); setUploading(false); return }
    await supabase.from('brand_assets').insert({ brand_id: brandId, type, file_name: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size })
    setUploading(false)
    router.refresh()
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(asset: BrandAsset) {
    await supabase.storage.from('brand-assets').remove([asset.storage_path])
    await supabase.from('brand_assets').delete().eq('id', asset.id)
    router.refresh()
  }

  return (
    <div className="bg-paper border border-border rounded-card p-5">
      <div className="label mb-3">{label}</div>
      {assets.length > 0 && (
        <div className="space-y-2 mb-3">
          {assets.map(asset => (
            <div key={asset.id} className="flex items-center justify-between bg-cream rounded-btn px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={13} className="text-muted flex-shrink-0" />
                <span className="text-sm truncate">{asset.file_name}</span>
              </div>
              <button onClick={() => handleDelete(asset)} className="text-muted hover:text-danger transition-colors ml-2 flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => inputRef.current?.click()} disabled={uploading}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-btn py-3 text-sm text-muted hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {uploading ? 'Uploading...' : `Upload ${hint}`}
      </button>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />
    </div>
  )
}
