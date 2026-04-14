'use client'
import { useState, useEffect } from 'react'
import {
  colors, font, fontWeight, fontSize, radius, shadow, zIndex,
  spacing, letterSpacing,
} from '@/lib/design-tokens'
import type { SavedCreative, CtaType } from './types'
import { CTA_TYPE_LABELS } from './types'

interface MetaCampaign { id: string; name: string; status?: string; objective?: string }
interface MetaAdSet { id: string; name: string; status?: string }

// Narrow brand shape — accepts either local or global Brand type. We need
// just enough to render the header, default the URL, and build the Ads
// Manager link from brand.notes.meta_ad_account_id.
interface MinimalBrand {
  id: string
  website?: string | null
  notes: string | null
}

interface Props {
  creative: SavedCreative
  brand: MinimalBrand
  onClose: () => void
  onSuccess: (result: { adId: string; adCreativeId: string; status: string }) => void
}

type Step = 1 | 2 | 3

export default function MetaLaunchModal({ creative, brand, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>(1)

  // Step 1 state
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([])
  const [adsets, setAdsets] = useState<MetaAdSet[]>([])
  const [campaignId, setCampaignId] = useState('')
  const [adSetId, setAdSetId] = useState('')
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [loadingAdsets, setLoadingAdsets] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Step 2 state — pre-filled from the saved creative + brand
  const defaultAdName = creative.name || creative.headline || 'Untitled ad'
  const [adName, setAdName] = useState(defaultAdName)
  const [primaryText, setPrimaryText] = useState(creative.fb_primary_text || '')
  const [headline, setHeadline] = useState(creative.fb_headline || '')
  const [description, setDescription] = useState(creative.fb_description || '')
  const [destinationUrl, setDestinationUrl] = useState(creative.destination_url || brand.website || '')
  const [ctaType, setCtaType] = useState<CtaType>(creative.cta_type || 'LEARN_MORE')

  // Step 3 state
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [launchedAdId, setLaunchedAdId] = useState<string | null>(null)

  // Read ad account id from brand.notes for the "View in Ads Manager" link
  let adAccountId = ''
  try {
    const notes = brand.notes ? JSON.parse(brand.notes) : {}
    adAccountId = notes.meta_ad_account_id || ''
  } catch {}

  // Fetch campaigns on mount
  useEffect(() => {
    let cancelled = false
    setLoadingCampaigns(true)
    setFetchError(null)
    fetch(`/api/meta/campaigns?brandId=${brand.id}`)
      .then(async r => {
        const json = await r.json()
        if (cancelled) return
        if (!r.ok) { setFetchError(json.error || 'Failed to load campaigns'); return }
        setCampaigns(json.campaigns || [])
      })
      .catch(e => { if (!cancelled) setFetchError(e?.message || 'Failed to load campaigns') })
      .finally(() => { if (!cancelled) setLoadingCampaigns(false) })
    return () => { cancelled = true }
  }, [brand.id])

  // Fetch ad sets when campaign changes
  useEffect(() => {
    if (!campaignId) { setAdsets([]); setAdSetId(''); return }
    let cancelled = false
    setLoadingAdsets(true)
    setAdSetId('')
    fetch(`/api/meta/adsets?brandId=${brand.id}&campaignId=${campaignId}`)
      .then(async r => {
        const json = await r.json()
        if (cancelled) return
        if (!r.ok) { setFetchError(json.error || 'Failed to load ad sets'); return }
        setAdsets(json.adsets || [])
      })
      .catch(e => { if (!cancelled) setFetchError(e?.message || 'Failed to load ad sets') })
      .finally(() => { if (!cancelled) setLoadingAdsets(false) })
    return () => { cancelled = true }
  }, [campaignId, brand.id])

  async function handleLaunch() {
    setLaunching(true)
    setLaunchError(null)
    try {
      const res = await fetch('/api/meta/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          creativeId: creative.id,
          adSetId,
          adName,
          destinationUrl,
          ctaType,
          primaryText,
          headline,
          description,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Launch failed')
      setLaunchedAdId(json.adId)
      setStep(3)
      onSuccess(json)
    } catch (e: any) {
      setLaunchError(e?.message || 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: font.mono,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.label,
    marginBottom: spacing[2],
  }
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    boxSizing: 'border-box',
    fontFamily: font.mono,
    fontSize: fontSize.sm,
    border: `1.5px solid ${colors.border}`,
    borderRadius: radius.md,
    outline: 'none',
    background: colors.paper,
    color: colors.ink,
    marginBottom: spacing[4],
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' }

  const primaryBtn: React.CSSProperties = {
    padding: '12px 20px',
    background: colors.ink,
    color: colors.accent,
    fontFamily: font.heading,
    fontWeight: fontWeight.extrabold,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide,
    border: 'none',
    borderRadius: radius.pill,
    cursor: 'pointer',
  }
  const secondaryBtn: React.CSSProperties = {
    padding: '12px 20px',
    background: 'transparent',
    color: colors.ink,
    fontFamily: font.heading,
    fontWeight: fontWeight.extrabold,
    fontSize: fontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.wide,
    border: `1.5px solid ${colors.ink}`,
    borderRadius: radius.pill,
    cursor: 'pointer',
  }

  const thumb = creative.thumbnail_url || creative.image_url

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: zIndex.modal,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: spacing[5],
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: colors.paper, borderRadius: radius['2xl'], boxShadow: shadow.modal,
        width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxSizing: 'border-box', padding: `${spacing[8]}px ${spacing[8]}px ${spacing[7]}px`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[5] }}>
          <div>
            <div style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading,
              fontSize: fontSize['4xl'], color: colors.ink,
              textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
              lineHeight: 1,
            }}>
              Launch to Meta
            </div>
            {step !== 3 && (
              <div style={{
                marginTop: spacing[2],
                fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted,
                textTransform: 'uppercase', letterSpacing: letterSpacing.label,
              }}>
                Step {step} of 2
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 24, color: colors.muted, lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* Step 1: Select ad set */}
        {step === 1 && (
          <div>
            {loadingCampaigns && (
              <div style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted, padding: spacing[4] }}>
                Loading campaigns…
              </div>
            )}
            {!loadingCampaigns && fetchError && (
              <div style={{
                background: colors.dangerLight, color: colors.danger,
                padding: spacing[3], borderRadius: radius.md, fontSize: fontSize.sm,
                marginBottom: spacing[4],
              }}>
                {fetchError}
              </div>
            )}
            {!loadingCampaigns && !fetchError && campaigns.length === 0 && (
              <div style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>
                No active or paused campaigns found in your Meta ad account. Create one in Meta Ads Manager first.
              </div>
            )}
            {!loadingCampaigns && !fetchError && campaigns.length > 0 && (
              <>
                <label style={labelStyle}>Campaign</label>
                <select
                  value={campaignId}
                  onChange={e => setCampaignId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">— Select a campaign —</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.status ? ` (${c.status})` : ''}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Ad Set</label>
                <select
                  value={adSetId}
                  onChange={e => setAdSetId(e.target.value)}
                  disabled={!campaignId || loadingAdsets}
                  style={{ ...selectStyle, opacity: !campaignId ? 0.5 : 1 }}
                >
                  <option value="">
                    {loadingAdsets
                      ? 'Loading ad sets…'
                      : !campaignId
                        ? '— Select a campaign first —'
                        : adsets.length === 0
                          ? '— No ad sets in this campaign —'
                          : '— Select an ad set —'}
                  </option>
                  {adsets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.status ? ` (${a.status})` : ''}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[4] }}>
              <button
                onClick={() => setStep(2)}
                disabled={!adSetId}
                style={{ ...primaryBtn, opacity: !adSetId ? 0.4 : 1, cursor: !adSetId ? 'not-allowed' : 'pointer' }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & edit */}
        {step === 2 && (
          <div>
            {thumb && (
              <div style={{
                width: 160, height: 160, borderRadius: radius.lg,
                overflow: 'hidden', border: `1px solid ${colors.border}`,
                marginBottom: spacing[4],
              }}>
                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <label style={labelStyle}>Ad name</label>
            <input
              type="text"
              value={adName}
              onChange={e => setAdName(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = colors.ink }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
            />

            <label style={labelStyle}>Primary text</label>
            <textarea
              value={primaryText}
              onChange={e => setPrimaryText(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
              onFocus={e => { e.currentTarget.style.borderColor = colors.ink }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
            />

            <label style={labelStyle}>Headline</label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = colors.ink }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
            />

            <label style={labelStyle}>Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = colors.ink }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
            />

            <label style={labelStyle}>Destination URL</label>
            <input
              type="url"
              value={destinationUrl}
              onChange={e => setDestinationUrl(e.target.value)}
              placeholder={brand.website || 'https://...'}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = colors.ink }}
              onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
            />

            <label style={labelStyle}>Call to action</label>
            <select
              value={ctaType}
              onChange={e => setCtaType(e.target.value as CtaType)}
              style={selectStyle}
            >
              {(Object.keys(CTA_TYPE_LABELS) as CtaType[]).map(t => (
                <option key={t} value={t}>{CTA_TYPE_LABELS[t]}</option>
              ))}
            </select>

            {launchError && (
              <div style={{
                background: colors.dangerLight, color: colors.danger,
                padding: spacing[3], borderRadius: radius.md, fontSize: fontSize.sm,
                marginBottom: spacing[3],
              }}>
                {launchError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing[3], marginTop: spacing[4] }}>
              <button onClick={() => setStep(1)} disabled={launching} style={secondaryBtn}>← Back</button>
              <button
                onClick={handleLaunch}
                disabled={launching || !adName.trim()}
                style={{ ...primaryBtn, opacity: launching || !adName.trim() ? 0.5 : 1, cursor: launching ? 'not-allowed' : 'pointer' }}
              >
                {launching ? 'Launching…' : 'Launch Ad →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: `${spacing[4]}px 0` }}>
            <div style={{ fontSize: 48, marginBottom: spacing[3] }}>🎉</div>
            <div style={{
              fontFamily: font.heading, fontWeight: fontWeight.heading,
              fontSize: fontSize['3xl'], color: colors.ink,
              textTransform: 'uppercase', letterSpacing: letterSpacing.snug,
              marginBottom: spacing[2],
            }}>
              Ad launched!
            </div>
            <div style={{
              fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted,
              marginBottom: spacing[2],
            }}>
              {adName}
            </div>
            <div style={{
              display: 'inline-block',
              background: colors.warningLight, color: colors.warning,
              padding: '4px 12px', borderRadius: radius.pill,
              fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
              textTransform: 'uppercase', letterSpacing: letterSpacing.label,
              marginBottom: spacing[5],
            }}>
              ⏸ Status: Paused
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              {adAccountId && (
                <a
                  href={`https://www.facebook.com/adsmanager/manage/ads?act=${adAccountId}${launchedAdId ? `&selected_ad_ids=${launchedAdId}` : ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...secondaryBtn,
                    textDecoration: 'none',
                    display: 'inline-block',
                    textAlign: 'center',
                  }}
                >
                  View in Meta Ads Manager ↗
                </a>
              )}
              <button onClick={onClose} style={primaryBtn}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
