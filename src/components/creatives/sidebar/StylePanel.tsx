'use client'
import { Eye, EyeOff, ChevronDown, RotateCcw } from 'lucide-react'
import { POSITIONS } from '../templates/registry'
import type { TextPosition } from '../templates/types'
import type { Brand } from '../types'
import { colors, font, fontSize, fontWeight, spacing, radius, letterSpacing, transition } from '@/lib/design-tokens'

const FEATURES: Record<string, { position?: boolean; imagePos?: boolean; overlay?: boolean; textBanner?: boolean; cta?: boolean; bg?: boolean; fonts?: boolean }> = {
  overlay:      { position: true, overlay: true, cta: true, fonts: true },
  stat:         { position: true, imagePos: true, overlay: true, cta: false, fonts: true },
  mission:      { imagePos: true, overlay: true, cta: false, fonts: true },
  split:        { imagePos: true, cta: true, bg: true, fonts: true },
  ugc:          { imagePos: true, cta: true, bg: true, fonts: true },
  testimonial:  { imagePos: true, cta: true, bg: true, fonts: true },
  grid:         { cta: true, bg: true, fonts: true },
  infographic:  { bg: true, fonts: true },
  comparison:   { bg: true, fonts: true },
}

interface StylePanelProps {
  templateId: string
  brand: Brand | undefined
  textPosition: TextPosition
  setTextPosition: (v: TextPosition) => void
  imagePosition: string
  setImagePosition: (v: string) => void
  bgColor: string
  updateBgColor: (v: string) => void
  showOverlay: boolean
  setShowOverlay: (v: boolean) => void
  overlayOpacity: number
  setOverlayOpacity: (v: number) => void
  textBanner: 'none' | 'top' | 'bottom'
  setTextBanner: (v: 'none' | 'top' | 'bottom') => void
  textBannerColor: string
  setTextBannerColor: (v: string) => void
  headlineFont: string
  setHeadlineFont: (v: string) => void
  headlineColor: string
  setHeadlineColor: (v: string) => void
  headlineSizeMul: number
  setHeadlineSizeMul: (v: number) => void
  bodyFont: string
  setBodyFont: (v: string) => void
  bodyColor: string
  setBodyColor: (v: string) => void
  bodySizeMul: number
  setBodySizeMul: (v: number) => void
  brandColors: { label: string; value: string }[]
  pill: (active: boolean) => { className: string; style: React.CSSProperties }
  onReset: () => void
  setHeadlineWeight: (v: string) => void
  setHeadlineTransform: (v: string) => void
  setBodyFont2: (v: string) => void
  setBodyWeight: (v: string) => void
  setBodyTransform: (v: string) => void
  setBgColor: (v: string) => void
  setHeadlineSizeMul2: (v: number) => void
  setBodySizeMul2: (v: number) => void
  setShowOverlay2: (v: boolean) => void
  setOverlayOpacity2: (v: number) => void
  setTextBanner2: (v: 'none' | 'top' | 'bottom') => void
  ctaColor: string
  setCtaColor: (v: string) => void
  ctaFontColor: string
  setCtaFontColor: (v: string) => void
  ctaSizeMul: number
  setCtaSizeMul: (v: number) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: colors.gray700,
  letterSpacing: letterSpacing.wide,
  fontFamily: font.mono,
  textTransform: 'uppercase',
  minWidth: 90,
  flexShrink: 0,
}

const sectionStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: colors.gray100,
  borderRadius: radius.md,
  padding: spacing[3],
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[2],
}

// Ring-style selection: `outline` doesn't affect the box model, so toggling
// doesn't nudge neighbouring swatches. A constant 1px border keeps light
// swatches (white/cream) readable on a white card.
function Swatch({ color, selected, onClick, size = 24, ringColor }: {
  color: string
  selected: boolean
  onClick: () => void
  size?: number
  ringColor?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={color}
      style={{
        width: size,
        height: size,
        borderRadius: radius.sm,
        background: color,
        border: `1px solid ${colors.blackAlpha10}`,
        outline: selected ? `2px solid ${ringColor ?? colors.ink}` : 'none',
        outlineOffset: 2,
        cursor: 'pointer',
        padding: 0,
        transition: transition.fast,
      }}
    />
  )
}

// Native range input styled via .cs-slider — track + thumb tuned to match the
// rest of the tool's ink/paper palette instead of the browser default.
function Slider({ min, max, step, value, onChange, ariaLabel }: {
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  ariaLabel?: string
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
      aria-label={ariaLabel}
      className="cs-slider"
      style={{ flex: 1, minWidth: 0 }}
    />
  )
}

const SLIDER_CSS = `
  .cs-slider {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: ${colors.gray400};
    border-radius: 999px;
    outline: none;
    cursor: pointer;
  }
  .cs-slider:hover { background: ${colors.gray450}; }
  .cs-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: ${colors.ink};
    border: 2px solid ${colors.paper};
    border-radius: 50%;
    cursor: grab;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: transform 0.1s ease;
  }
  .cs-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
  .cs-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.2); }
  .cs-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: ${colors.ink};
    border: 2px solid ${colors.paper};
    border-radius: 50%;
    cursor: grab;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .cs-slider::-moz-range-track {
    height: 4px;
    background: ${colors.gray400};
    border-radius: 999px;
  }
  .cs-select {
    appearance: none;
    -webkit-appearance: none;
    background-color: ${colors.cream};
    padding: 6px 28px 6px 10px;
    border: 1px solid ${colors.border};
    border-radius: ${radius.md}px;
    font-size: ${fontSize.body}px;
    color: ${colors.ink};
    cursor: pointer;
    transition: border-color 0.15s ease;
    width: 100%;
    min-width: 0;
  }
  .cs-select:hover { border-color: ${colors.borderStrong}; }
  .cs-select:focus { outline: none; border-color: ${colors.accent}; }
`

export default function StylePanel({
  templateId, brand, textPosition, setTextPosition, imagePosition, setImagePosition,
  bgColor, updateBgColor, showOverlay, setShowOverlay, overlayOpacity, setOverlayOpacity,
  textBanner, setTextBanner, textBannerColor, setTextBannerColor,
  headlineFont, setHeadlineFont, headlineColor, setHeadlineColor, headlineSizeMul, setHeadlineSizeMul,
  bodyFont, setBodyFont, bodyColor, setBodyColor, bodySizeMul, setBodySizeMul,
  brandColors, pill, onReset,
  ctaColor, setCtaColor, ctaFontColor, setCtaFontColor, ctaSizeMul, setCtaSizeMul,
}: StylePanelProps) {
  const f = FEATURES[templateId] || FEATURES.overlay

  const fontOptions = (
    <>
      <option value="">Barlow</option>
      {brand?.font_primary && <option value={brand.font_primary.split('|')[0]}>{brand.font_primary.split('|')[0]}</option>}
      {brand?.font_secondary && brand.font_secondary.split('|')[0] !== brand.font_primary?.split('|')[0] && (
        <option value={brand.font_secondary.split('|')[0]}>{brand.font_secondary.split('|')[0]}</option>
      )}
    </>
  )

  return (
    <div style={{
      background: colors.paper,
      borderRadius: radius.xl,
      border: `1px solid ${colors.border}`,
      padding: spacing[4],
      display: 'flex',
      flexDirection: 'column',
      gap: spacing[3],
    }}>
      <style>{SLIDER_CSS}</style>

      {/* Header */}
      <div className="flex items-center justify-between" style={{ paddingBottom: spacing[2], borderBottom: `1px solid ${colors.border}` }}>
        <span style={{ fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink }}>Style</span>
        <button
          type="button"
          onClick={onReset}
          style={{
            display: 'flex', alignItems: 'center', gap: spacing[1],
            fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
            color: colors.gray700, textTransform: 'uppercase', letterSpacing: letterSpacing.wide,
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: `${spacing[1]}px ${spacing[2]}px`, borderRadius: radius.xs,
            transition: transition.fast,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = colors.ink }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = colors.gray700 }}
        >
          <RotateCcw size={11} />
          Reset
        </button>
      </div>

      {/* Layout controls row */}
      {(f.position || f.imagePos || f.bg || f.overlay) && (
        <div className="flex gap-3 flex-wrap">
          {f.position && (
            <div>
              <span style={{ ...labelStyle, display: 'block', marginBottom: spacing[2] }}>Position</span>
              <div className="grid grid-cols-3 gap-1" style={{ width: 78 }}>
                {Array.from({ length: 9 }).map((_, i) => {
                  const match = POSITIONS.find(p => p.i === i)
                  if (!match) return <div key={i} style={{ width: 24, height: 24 }} />
                  const active = textPosition === match.pos
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTextPosition(match.pos)}
                      title={match.pos}
                      style={{
                        width: 24, height: 24,
                        borderRadius: radius.xs,
                        border: `1px solid ${active ? colors.ink : colors.gray400}`,
                        background: active ? colors.ink : colors.gray200,
                        cursor: 'pointer',
                        padding: 0,
                        transition: transition.fast,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )}
          {f.imagePos && (
            <div>
              <span style={{ ...labelStyle, display: 'block', marginBottom: spacing[2] }}>Image</span>
              <div className="flex flex-col gap-1">
                {['top', 'center', 'bottom'].map(pos => {
                  const active = imagePosition === pos
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setImagePosition(pos)}
                      style={{
                        width: 64, height: 24,
                        borderRadius: radius.xs,
                        border: `1px solid ${active ? colors.ink : colors.gray400}`,
                        background: active ? colors.ink : colors.gray200,
                        color: active ? colors.tailGreen400 : colors.gray750,
                        fontSize: 9, fontWeight: fontWeight.semibold,
                        fontFamily: font.mono, textTransform: 'uppercase',
                        letterSpacing: letterSpacing.wide,
                        cursor: 'pointer',
                        transition: transition.fast,
                      }}
                    >
                      {pos}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-[120px]" style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {f.bg && (
              <div>
                <span style={{ ...labelStyle, display: 'block', marginBottom: spacing[2] }}>Background</span>
                <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
                  {brandColors.map(c => (
                    <Swatch key={'bg-' + c.value} color={c.value} selected={bgColor === c.value} onClick={() => updateBgColor(c.value)} />
                  ))}
                </div>
              </div>
            )}
            {f.overlay && (
              <div>
                <div className="flex items-center justify-between">
                  <span style={labelStyle}>Overlay</span>
                  <button
                    type="button"
                    onClick={() => setShowOverlay(!showOverlay)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: spacing[1],
                      fontSize: fontSize.caption, color: colors.gray700,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: 0, transition: transition.fast,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = colors.ink }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = colors.gray700 }}
                  >
                    {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                    {showOverlay ? 'On' : 'Off'}
                  </button>
                </div>
                {showOverlay && (
                  <div className="flex items-center" style={{ gap: spacing[2], marginTop: spacing[1] }}>
                    <Slider min={0} max={100} step={5} value={overlayOpacity} onChange={setOverlayOpacity} ariaLabel="Overlay opacity" />
                    <span style={{ fontSize: fontSize.xs, fontFamily: font.mono, color: colors.gray700, width: 32, textAlign: 'right', flexShrink: 0 }}>{overlayOpacity}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text banner */}
      {f.textBanner && (
        <div className="flex items-center" style={{ gap: spacing[3] }}>
          <span style={{ ...labelStyle, flexShrink: 0 }}>Text bar</span>
          <div className="flex" style={{ gap: spacing[1] }}>
            {(['none', 'top', 'bottom'] as const).map(v => (
              <button key={v} type="button" onClick={() => {
                setTextBanner(v)
                if (v === 'top') setTextPosition(textPosition.replace(/^(top|bottom|center)/, 'top') as TextPosition)
                if (v === 'bottom') setTextPosition(textPosition.replace(/^(top|bottom|center)/, 'bottom') as TextPosition)
              }}
                {...pill(textBanner === v)}>{v === 'none' ? 'Off' : v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          {textBanner !== 'none' && (
            <div className="flex flex-wrap ml-auto" style={{ gap: spacing[2] }}>
              {brandColors.map(c => (
                <Swatch key={'tb-' + c.value} color={c.value} selected={textBannerColor === c.value} onClick={() => setTextBannerColor(c.value)} size={20} ringColor={colors.tailGreen400} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Font sections */}
      {f.fonts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          {[
            { label: 'Headline', short: 'H', font: headlineFont, setFont: setHeadlineFont, color: headlineColor, setColor: setHeadlineColor, sizeMul: headlineSizeMul, setSizeMul: setHeadlineSizeMul },
            { label: 'Body', short: 'B', font: bodyFont, setFont: setBodyFont, color: bodyColor, setColor: setBodyColor, sizeMul: bodySizeMul, setSizeMul: setBodySizeMul },
          ].map(row => (
            <div key={row.short} style={sectionStyle}>
              <div className="flex items-center" style={{ gap: spacing[2] }}>
                <span style={labelStyle}>{row.label}</span>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <select value={row.font} onChange={e => row.setFont(e.target.value)} className="cs-select">
                    {fontOptions}
                  </select>
                  <ChevronDown
                    size={14}
                    style={{ position: 'absolute', right: spacing[2], top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: colors.gray700 }}
                  />
                </div>
              </div>
              <div className="flex items-center" style={{ gap: spacing[2] }}>
                <span style={labelStyle}>Color</span>
                <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
                  {brandColors.map(c => (
                    <Swatch key={row.short + c.value} color={c.value} selected={row.color === c.value} onClick={() => row.setColor(c.value)} />
                  ))}
                </div>
              </div>
              <div className="flex items-center" style={{ gap: spacing[2] }}>
                <span style={labelStyle}>Size</span>
                <Slider min={0.5} max={2} step={0.1} value={row.sizeMul} onChange={row.setSizeMul} ariaLabel={`${row.label} size`} />
                <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: colors.gray700, width: 40, textAlign: 'right', flexShrink: 0 }}>{Math.round(row.sizeMul * 100)}%</span>
              </div>
            </div>
          ))}

          {/* CTA */}
          {f.cta && (
            <div style={sectionStyle}>
              <span style={{ ...labelStyle, display: 'block' }}>{templateId === 'testimonial' ? 'Stars' : 'CTA'}</span>
              <div className="flex items-center" style={{ gap: spacing[2] }}>
                <span style={labelStyle}>{templateId === 'testimonial' ? 'Color' : 'Background'}</span>
                <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
                  {brandColors.map(c => (
                    <Swatch key={'cta-' + c.value} color={c.value} selected={ctaColor === c.value} onClick={() => setCtaColor(c.value)} />
                  ))}
                </div>
              </div>
              <div className="flex items-center" style={{ gap: spacing[2] }}>
                <span style={labelStyle}>Text</span>
                <div className="flex flex-wrap" style={{ gap: spacing[2] }}>
                  {brandColors.map(c => (
                    <Swatch key={'ctaf-' + c.value} color={c.value} selected={ctaFontColor === c.value} onClick={() => setCtaFontColor(c.value)} />
                  ))}
                </div>
              </div>
              <div className="flex items-center" style={{ gap: spacing[2] }}>
                <span style={labelStyle}>Size</span>
                <Slider min={0.6} max={2} step={0.05} value={ctaSizeMul} onChange={setCtaSizeMul} ariaLabel="CTA size" />
                <span style={{ fontSize: fontSize.sm, fontFamily: font.mono, color: colors.gray700, width: 40, textAlign: 'right', flexShrink: 0 }}>{Math.round(ctaSizeMul * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
