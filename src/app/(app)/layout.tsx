import Sidebar from '@/components/ui/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-cream pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
