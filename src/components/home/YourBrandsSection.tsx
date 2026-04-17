'use client'

import { colors, font, fontSize, letterSpacing } from '@/lib/design-tokens'
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
      `}</style>

      <div className="ybs-pad" style={{
        padding: '72px 48px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 20, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            color: colors.whiteAlpha60, letterSpacing: letterSpacing.wide,
            textTransform: 'uppercase',
          }}>
            ▸ Your brands
          </div>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            color: colors.whiteAlpha30, letterSpacing: letterSpacing.wide,
            textTransform: 'uppercase',
          }}>
            {`${brands.length} ${brands.length === 1 ? 'brand' : 'brands'}`}
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
