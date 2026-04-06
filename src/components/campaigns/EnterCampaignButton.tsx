'use client'
import { useRouter } from 'next/navigation'
import { useBrand } from '@/lib/brand-context'

export default function EnterCampaignButton({ campaignId, brandId }: { campaignId: string; brandId: string }) {
  const { setActiveCampaignId, setActiveBrandId } = useBrand()
  const router = useRouter()
  function enter() {
    setActiveBrandId(brandId)
    setActiveCampaignId(campaignId)
    router.push('/creatives')
  }
  return (
    <button onClick={enter}
      className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-btn transition-opacity hover:opacity-90 flex-shrink-0"
      style={{ background: '#000', color: '#00ff97' }}>
      ⚡ Enter Campaign Mode
    </button>
  )
}
