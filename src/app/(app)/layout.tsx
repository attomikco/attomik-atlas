'use client'
import TopNav from '@/components/ui/TopNav'
import { BrandProvider, useBrand } from '@/lib/brand-context'

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <div style={{ minHeight: '100vh', background: 'var(--cream, #f8f7f4)' }}>
        <BrandSwitchIndicator />
        <TopNav />
        <main style={{ minHeight: 'calc(100vh - 72px)' }}>
          {children}
        </main>
      </div>
    </BrandProvider>
  )
}
