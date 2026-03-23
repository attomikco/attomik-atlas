import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'Attomik Marketing OS',
  description: 'Brand management and AI content platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
