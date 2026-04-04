export default function RenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: 'transparent' }}>
        {children}
      </body>
    </html>
  )
}
