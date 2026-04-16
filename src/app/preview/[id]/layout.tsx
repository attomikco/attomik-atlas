export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      <main>{children}</main>
    </div>
  )
}
