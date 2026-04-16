import Link from 'next/link'
import AttomikLogo from '@/components/ui/AttomikLogo'
import { colors, font, fontWeight, fontSize, letterSpacing } from '@/lib/design-tokens'

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
]

const socials: { label: string; href: string }[] = [
  { label: '𝕏', href: 'https://x.com/attomik' },
  { label: 'in', href: 'https://www.linkedin.com/company/attomik' },
  { label: 'ig', href: 'https://www.instagram.com/attomik' },
]

export default function MarketingFooter() {
  return (
    <footer style={{
      width: '100%', background: colors.ink,
      borderTop: `1px solid ${colors.whiteAlpha10}`,
      padding: 'clamp(48px, 6vw, 80px) clamp(24px, 6vw, 80px) 32px',
    }}>
      <style>{`
        @media (max-width: 768px) {
          .mkt-footer-grid { grid-template-columns: 1fr 1fr !important; }
          .mkt-footer-brand { grid-column: 1 / -1 !important; }
        }
        .mkt-footer-link:hover { color: ${colors.paper} !important; }
      `}</style>

      <div className="mkt-footer-grid" style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: 48, maxWidth: 1200, margin: '0 auto',
      }}>
        <div className="mkt-footer-brand">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <AttomikLogo height={24} color={colors.paper} />
            <span style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['2xl'], color: colors.paper, marginLeft: 10 }}>Atlas</span>
          </Link>
          <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha60, marginTop: 12, maxWidth: 200, lineHeight: 1.5 }}>
            AI-powered marketing for CPG & DTC brands.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {socials.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                style={{
                  width: 32, height: 32, borderRadius: '50%', background: colors.whiteAlpha10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha80,
                  textDecoration: 'none',
                }}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        {columns.map(col => (
          <div key={col.heading}>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha45, textTransform: 'uppercase', letterSpacing: letterSpacing.wide, marginBottom: 16 }}>
              {col.heading}
            </div>
            {col.links.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="mkt-footer-link"
                style={{ display: 'block', fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha60, marginBottom: 10, textDecoration: 'none' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div style={{
        borderTop: `1px solid ${colors.whiteAlpha5}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 1200, margin: '48px auto 0', paddingTop: 24,
      }}>
        <span style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha30 }}>
          © {new Date().getFullYear()} Attomik. All rights reserved.
        </span>
        <a href="https://attomik.co" target="_blank" rel="noopener noreferrer" style={{ fontFamily: font.mono, fontSize: fontSize.caption, color: colors.whiteAlpha30, textDecoration: 'none' }}>
          Built by Attomik Atlas
        </a>
      </div>
    </footer>
  )
}
