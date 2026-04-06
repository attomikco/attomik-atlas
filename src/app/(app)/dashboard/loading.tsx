export default function Loading() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ height: 16, width: 120, background: '#f0f0f0', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 38, width: 280, background: '#e8e8e8', borderRadius: 6, marginBottom: 36, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 96, background: '#f0f0f0', borderRadius: 20, marginBottom: 24, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: 220, borderRadius: 20, background: '#f0f0f0', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
        @media (max-width: 768px) {
          .pv-dash-pillars { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
