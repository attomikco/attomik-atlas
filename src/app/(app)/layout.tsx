'use client'
import { usePathname } from 'next/navigation'
import TopNav from '@/components/ui/TopNav'
import FirstNameModal from '@/components/ui/FirstNameModal'
import { CampaignModeBar } from '@/components/ui/CampaignModeBar'
import { BrandProvider, useBrand } from '@/lib/brand-context'
import { ProfileProvider } from '@/lib/profile-context'

function BrandSwitchIndicator() {
  const { isSwitching } = useBrand()
  if (!isSwitching) return null
  return (
    <>
      <style>{`
        @keyframes attomik-switch-progress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
        background: 'transparent', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', background: '#00ff97',
          animation: 'attomik-switch-progress 500ms ease-out forwards',
        }} />
      </div>
    </>
  )
}

function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showCampaignBar = ['/creatives', '/copy', '/newsletter', '/store'].some(p => pathname.startsWith(p))
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f8f7f4)' }}>
      <BrandSwitchIndicator />
      <TopNav />
      {showCampaignBar && <CampaignModeBar />}
      <main style={{ minHeight: 'calc(100vh - 72px)' }}>
        {children}
      </main>
      <FirstNameModal />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <BrandProvider>
        <LayoutShell>{children}</LayoutShell>
      </BrandProvider>
    </ProfileProvider>
  )
}
