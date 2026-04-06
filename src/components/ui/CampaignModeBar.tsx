'use client'
import { useBrand } from '@/lib/brand-context'
import { colors, font, fontWeight } from '@/lib/design-tokens'

export function CampaignModeBar() {
  const { activeCampaign, exitCampaignMode } = useBrand()
  if (!activeCampaign) return null

  return (
    <div style={{
      width: '100%',
      background: colors.ink,
      borderBottom: `2px solid ${colors.accent}`,
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: colors.accent, color: colors.ink,
          padding: '3px 10px', borderRadius: 999,
          fontFamily: font.mono, fontSize: 11, fontWeight: fontWeight.heading,
          letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
        }}>
          ⚡ Campaign Mode
        </div>
        <span style={{
          fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 14,
          color: '#ffffff', textTransform: 'uppercase', letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {activeCampaign.name}
        </span>
        {activeCampaign.goal && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>·</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeCampaign.goal}
            </span>
          </>
        )}
        {activeCampaign.offer && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>·</span>
            <span style={{ fontSize: 13, color: colors.accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeCampaign.offer}
            </span>
          </>
        )}
      </div>
      <button onClick={exitCampaignMode} style={{
        background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12, padding: '4px 12px',
        cursor: 'pointer', fontFamily: font.mono, letterSpacing: '0.04em', flexShrink: 0,
      }}>
        Exit campaign ×
      </button>
    </div>
  )
}
