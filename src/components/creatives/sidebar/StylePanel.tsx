'use client'
import { Eye, EyeOff } from 'lucide-react'
import { POSITIONS } from '../templates/registry'
import type { TextPosition } from '../templates/types'
import type { Brand } from '../types'

// Which features each template supports
const FEATURES: Record<string, { position?: boolean; imagePos?: boolean; overlay?: boolean; textBanner?: boolean; cta?: boolean; bg?: boolean; fonts?: boolean }> = {
  overlay:      { position: true, overlay: true, cta: true, fonts: true },
  stat:         { position: true, imagePos: true, overlay: true, cta: false, bg: true, fonts: true },
  mission:      { position: false, imagePos: true, overlay: true, cta: false, bg: true, fonts: true },
  split:        { position: false, imagePos: true, cta: true, bg: true, fonts: true },
  ugc:          { position: false, imagePos: true, cta: true, bg: true, fonts: true },
  testimonial:  { position: false, imagePos: true, cta: true, bg: true, fonts: true },
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
}

export default function StylePanel({
  templateId, brand, textPosition, setTextPosition, imagePosition, setImagePosition,
  bgColor, updateBgColor, showOverlay, setShowOverlay, overlayOpacity, setOverlayOpacity,
  textBanner, setTextBanner, textBannerColor, setTextBannerColor,
  headlineFont, setHeadlineFont, headlineColor, setHeadlineColor, headlineSizeMul, setHeadlineSizeMul,
  bodyFont, setBodyFont, bodyColor, setBodyColor, bodySizeMul, setBodySizeMul,
  brandColors, pill, onReset,
  ctaColor, setCtaColor, ctaFontColor, setCtaFontColor,
}: StylePanelProps) {
  const f = FEATURES[templateId] || FEATURES.overlay

  return (
    <div className="bg-paper border border-border rounded-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="label">Style</label>
        <button onClick={onReset}
          className="text-[10px] text-muted hover:text-ink transition-colors font-semibold uppercase tracking-wide">
          Reset to brand
        </button>
      </div>

      {/* Position + Image + Background + Overlay row */}
      <div className="flex gap-4">
        {f.position && (
          <div>
            <span className="text-[10px] text-muted uppercase tracking-wide block mb-1">Position</span>
            <div className="grid grid-cols-3 gap-0.5 w-[72px]">
              {Array.from({ length: 9 }).map((_, i) => {
                const match = POSITIONS.find(p => p.i === i)
                if (!match) return <div key={i} className="w-6 h-6" />
                return (
                  <button key={i} onClick={() => setTextPosition(match.pos)}
                    className="w-6 h-6 rounded-[3px] border transition-all"
                    style={textPosition === match.pos
                      ? { background: '#000', borderColor: '#000' }
                      : { background: '#f2f2f2', borderColor: '#e0e0e0' }}
                    title={match.pos} />
                )
              })}
            </div>
          </div>
        )}
        {f.imagePos && (
          <div>
            <span className="text-[10px] text-muted uppercase tracking-wide block mb-1">Image</span>
            <div className="grid grid-cols-3 gap-0.5 w-[72px]">
              {['top', 'center', 'bottom'].map(pos => (
                <button key={pos} onClick={() => setImagePosition(pos)}
                  className="w-6 h-6 rounded-[3px] border transition-all text-[8px] font-bold"
                  style={imagePosition === pos
                    ? { background: '#000', borderColor: '#000', color: '#00ff97' }
                    : { background: '#f2f2f2', borderColor: '#e0e0e0', color: '#999' }}
                  title={pos}>
                  {pos[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          {f.bg && (
            <div>
              <span className="text-[10px] text-muted uppercase tracking-wide block mb-1">Background</span>
              <div className="flex gap-1">
                {brandColors.map(c => (
                  <button key={'bg-' + c.value} onClick={() => updateBgColor(c.value)}
                    className="w-5 h-5 rounded-[3px] border-2 transition-all flex-shrink-0"
                    style={{ background: c.value, borderColor: bgColor === c.value ? '#000' : '#e0e0e0' }}
                    title={c.label} />
                ))}
              </div>
            </div>
          )}
          {f.overlay && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted uppercase tracking-wide">Overlay</span>
                <button onClick={() => setShowOverlay(!showOverlay)}
                  className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                  {showOverlay ? <Eye size={11} /> : <EyeOff size={11} />}
                  {showOverlay ? 'On' : 'Off'}
                </button>
              </div>
              {showOverlay && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <input type="range" min={0} max={100} step={5} value={overlayOpacity}
                    onChange={e => setOverlayOpacity(parseInt(e.target.value))}
                    className="flex-1 min-w-0 accent-[#00ff97]" />
                  <span className="text-[10px] font-mono text-muted flex-shrink-0">{overlayOpacity}%</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Text banner */}
      {f.textBanner && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted uppercase tracking-wide flex-shrink-0">Text bar</span>
          <div className="flex gap-1">
            {(['none', 'top', 'bottom'] as const).map(v => (
              <button key={v} onClick={() => {
                setTextBanner(v)
                if (v === 'top') setTextPosition(textPosition.replace(/^(top|bottom|center)/, 'top') as TextPosition)
                if (v === 'bottom') setTextPosition(textPosition.replace(/^(top|bottom|center)/, 'bottom') as TextPosition)
              }}
                {...pill(textBanner === v)}>{v === 'none' ? 'Off' : v.charAt(0).toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          {textBanner !== 'none' && (
            <div className="flex gap-1 ml-auto">
              {brandColors.map(c => (
                <button key={'tb-' + c.value} onClick={() => setTextBannerColor(c.value)}
                  className="w-5 h-5 rounded-[3px] border-2 transition-all flex-shrink-0"
                  style={{ background: c.value, borderColor: textBannerColor === c.value ? '#00ff97' : '#e0e0e0' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Font & color rows */}
      {f.fonts && (
        <div className="space-y-2">
          {[
            { label: 'H', font: headlineFont, setFont: setHeadlineFont, color: headlineColor, setColor: setHeadlineColor, sizeMul: headlineSizeMul, setSizeMul: setHeadlineSizeMul },
            { label: 'B', font: bodyFont, setFont: setBodyFont, color: bodyColor, setColor: setBodyColor, sizeMul: bodySizeMul, setSizeMul: setBodySizeMul },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted w-4 flex-shrink-0">{row.label}</span>
              <select value={row.font} onChange={e => row.setFont(e.target.value)}
                className="text-xs border border-border rounded-btn px-2 py-1 bg-cream focus:outline-none focus:border-accent w-24 flex-shrink-0 appearance-none">
                <option value="">Barlow</option>
                {brand?.font_primary && <option value={brand.font_primary.split('|')[0]}>{brand.font_primary.split('|')[0]}</option>}
                {brand?.font_secondary && brand.font_secondary.split('|')[0] !== brand.font_primary?.split('|')[0] && (
                  <option value={brand.font_secondary.split('|')[0]}>{brand.font_secondary.split('|')[0]}</option>
                )}
              </select>
              <div className="flex gap-0.5 flex-shrink-0">
                {brandColors.map(c => (
                  <button key={row.label + c.value} onClick={() => row.setColor(c.value)}
                    className="w-5 h-5 rounded-[3px] border-2 transition-all"
                    style={{ background: c.value, borderColor: row.color === c.value ? '#000' : '#e0e0e0' }} />
                ))}
              </div>
              <input type="range" min={0.5} max={2} step={0.1} value={row.sizeMul}
                onChange={e => row.setSizeMul(parseFloat(e.target.value))}
                className="flex-1 accent-[#00ff97] min-w-0" />
              <span className="text-[10px] font-mono text-muted w-7 text-right flex-shrink-0">{Math.round(row.sizeMul * 100)}%</span>
            </div>
          ))}

          {/* CTA colors */}
          {f.cta && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted w-4 flex-shrink-0">CTA</span>
              <span className="text-[9px] text-muted flex-shrink-0 w-24">bg</span>
              <div className="flex gap-0.5 flex-shrink-0">
                {brandColors.map(c => (
                  <button key={'cta-' + c.value} onClick={() => setCtaColor(c.value)}
                    className="w-5 h-5 rounded-[3px] border-2 transition-all"
                    style={{ background: c.value, borderColor: ctaColor === c.value ? '#000' : '#e0e0e0' }} />
                ))}
              </div>
              <span className="text-[9px] text-muted flex-shrink-0 ml-1">text</span>
              <div className="flex gap-0.5 flex-shrink-0">
                {brandColors.map(c => (
                  <button key={'ctaf-' + c.value} onClick={() => setCtaFontColor(c.value)}
                    className="w-5 h-5 rounded-[3px] border-2 transition-all"
                    style={{ background: c.value, borderColor: ctaFontColor === c.value ? '#000' : '#e0e0e0' }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
