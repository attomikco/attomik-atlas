export default function NewCampaignLoading() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ height: 14, width: 100, background: '#f0f0f0', borderRadius: 4, marginBottom: 28, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 36, width: 220, background: '#e8e8e8', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 20, width: 180, background: '#f0f0f0', borderRadius: 4, marginBottom: 32, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: 140, borderRadius: 16, background: '#f0f0f0', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}
