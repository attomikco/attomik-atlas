import AttomikLogo from '@/components/ui/AttomikLogo'

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      {/* Attomik Header */}
      <header style={{ background: '#000', minHeight: 72, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between" style={{ padding: '20px 48px' }}>
          <div className="flex items-center">
            <AttomikLogo height={44} color="#ffffff" />
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.12)', margin: '0 20px' }} />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em' }}>
              AI-Powered Funnel Builder
            </span>
          </div>
          <div className="hidden md:flex items-center" style={{ gap: 40 }}>
            {['✦ Brand-aware copy', '✦ Multi-platform creatives', '✦ Conversion-optimized pages'].map(label => (
              <span key={label} style={{ color: '#00ff97', fontSize: 13 }}>{label}</span>
            ))}
          </div>
          <button style={{ background: '#00ff97', color: '#000', fontSize: 15, fontWeight: 500, padding: '13px 28px', borderRadius: 999, letterSpacing: 'normal' }}>
            Get full access →
          </button>
        </div>
      </header>

      <main>{children}</main>

      {/* Attomik Footer */}
      <footer style={{ background: '#000', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 64 }}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AttomikLogo height={18} color="#ffffff" />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
              Built by Attomik — the growth OS for CPG brands.
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>© 2026 Attomik. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
