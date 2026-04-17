'use client'

import { colors, font, fontSize, fontWeight, letterSpacing, radius, transition } from '@/lib/design-tokens'
import BrandCard, { type BrandCardData } from '@/components/dashboard/BrandCard'

interface YourBrandsSectionProps {
  brands: BrandCardData[]
  campaignsByBrand: Record<string, string>
}

export default function YourBrandsSection({ brands, campaignsByBrand }: YourBrandsSectionProps) {
  return (
    <section style={{
      background: colors.darkBg,
      borderBottom: `1px solid ${colors.whiteAlpha10}`,
    }}>
      <style>{`
        .ybs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 900px) {
          .ybs-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ybs-pad { padding-left: 24px !important; padding-right: 24px !important; }
        }
        @media (max-width: 600px) {
          .ybs-grid { grid-template-columns: 1fr !important; }
        }
        .ybs-dashboard-btn:hover { opacity: 0.85; }
      `}</style>

      <div className="ybs-pad" style={{
        padding: '72px 48px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20, flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            color: colors.whiteAlpha60, letterSpacing: letterSpacing.wide,
            textTransform: 'uppercase',
          }}>
            ▸ Your brands
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.caption,
              color: colors.whiteAlpha30, letterSpacing: letterSpacing.wide,
              textTransform: 'uppercase',
            }}>
              {`${brands.length} ${brands.length === 1 ? 'brand' : 'brands'}`}
            </div>
            <a
              href="/dashboard"
              className="ybs-dashboard-btn"
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                background: colors.accent,
                color: colors.ink,
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: fontSize.base,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                border: 'none',
                borderRadius: radius.pill,
                textDecoration: 'none',
                transition: `opacity ${transition.normal}`,
              }}
            >
              Go to dashboard →
            </a>
          </div>
        </div>

        <div className="ybs-grid">
          {brands.map(b => (
            <BrandCard
              key={b.id}
              brand={b}
              latestCampaignId={campaignsByBrand[b.id] || null}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
