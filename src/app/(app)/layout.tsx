import TopNav from '@/components/ui/TopNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #f8f7f4)' }}>
      <TopNav />
      <main style={{ minHeight: 'calc(100vh - 72px)' }}>
        {children}
      </main>
    </div>
  )
}
