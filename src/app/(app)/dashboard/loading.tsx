export default function Loading() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ height: 32, width: 200, background: '#e8e8e8', borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 20, width: 120, background: '#f0f0f0', borderRadius: 6, marginBottom: 28, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ height: 80, background: '#f0f0f0', borderRadius: 20, marginBottom: 16, animation: 'pulse 1.5s ease infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 200, borderRadius: 20, background: '#f0f0f0', animation: 'pulse 1.5s ease infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}
