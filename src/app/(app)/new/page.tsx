import NewFunnelForm from '@/components/ui/NewFunnelForm'

export default function NewFunnelPage() {
  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 }}>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 700, color: '#00ff97', letterSpacing: '0.06em', textTransform: 'uppercase' }}>✦ New Funnel</div>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', textAlign: 'center' }}>What&apos;s the brand URL?</div>
      <p style={{ color: '#555', fontSize: 16, textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>We&apos;ll scan it and build a full funnel in 30 seconds.</p>
      <NewFunnelForm />
    </div>
  )
}
