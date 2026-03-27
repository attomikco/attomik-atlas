'use client'
import { Eye, EyeOff } from 'lucide-react'
import { POSITIONS } from '../templates/registry'
import type { TextPosition } from '../templates/types'
import type { Brand } from '../types'

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
}

const sectionCls = "border border-border rounded-btn p-3 space-y-2"
const labelCls = "text-[11px] font-semibold text-muted uppercase tracking-wide"
const swatchCls = "w-7 h-7 rounded-[5px] border-2 transition-all cursor-pointer"

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
    <div className="bg-paper border border-border rounded-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <label className="label">Style</label>
        <button onClick={onReset}
          className="text-[10px] text-muted hover:text-ink transition-colors font-semibold uppercase tracking-wide">
          Reset to brand
        </button>
      </div>

      {/* Layout controls row */}
      {(f.position || f.imagePos || f.bg || f.overlay) && (
        <div className="flex gap-3 flex-wrap">
          {f.position && (
            <div>
              <span className={labelCls + ' block mb-1.5'}>Position</span>
              <div className="grid grid-cols-3 gap-1" style={{ width: 78 }}>
                {Array.from({ length: 9 }).map((_, i) => {
                  const match = POSITIONS.find(p => p.i === i)
                  if (!match) return <div key={i} className="w-6 h-6" />
                  return (
                    <button key={i} onClick={() => setTextPosition(match.pos)}
                      className="w-6 h-6 rounded-[4px] border transition-all"
                      style={textPosition === match.pos
                        ? { background: '#111', borderColor: '#111' }
                        : { background: '#f5f5f5', borderColor: '#ddd' }}
                      title={match.pos} />
                  )
                })}
              </div>
            </div>
          )}
          {f.imagePos && (
            <div>
              <span className={labelCls + ' block mb-1.5'}>Image</span>
              <div className="flex flex-col gap-1">
                {['top', 'center', 'bottom'].map(pos => (
                  <button key={pos} onClick={() => setImagePosition(pos)}
                    className="w-16 h-6 rounded-[4px] border transition-all text-[9px] font-semibold"
                    style={imagePosition === pos
                      ? { background: '#111', borderColor: '#111', color: '#4ade80' }
                      : { background: '#f5f5f5', borderColor: '#ddd', color: '#888' }}>
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-[120px] space-y-2">
            {f.bg && (
              <div>
                <span className={labelCls + ' block mb-1.5'}>Background</span>
                <div className="flex gap-1.5 flex-wrap">
                  {brandColors.map(c => (
                    <button key={'bg-' + c.value} onClick={() => updateBgColor(c.value)}
                      className={swatchCls}
                      style={{ background: c.value, borderColor: bgColor === c.value ? '#111' : '#ddd' }}
                      title={c.label} />
                  ))}
                </div>
              </div>
            )}
            {f.overlay && (
              <div>
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Overlay</span>
                  <button onClick={() => setShowOverlay(!showOverlay)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
                    {showOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                    {showOverlay ? 'On' : 'Off'}
                  </button>
                </div>
                {showOverlay && (
                  <div className="flex items-center gap-2 mt-1">
                    <input type="range" min={0} max={100} step={5} value={overlayOpacity}
                      onChange={e => setOverlayOpacity(parseInt(e.target.value))}
                      className="flex-1 min-w-0 accent-[#888]" />
                    <span className="text-[10px] font-mono text-muted flex-shrink-0 w-8 text-right">{overlayOpacity}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text banner */}
      {f.textBanner && (
        <div className="flex items-center gap-3">
          <span className={labelCls + ' flex-shrink-0'}>Text bar</span>
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
            <div className="flex gap-1.5 ml-auto">
              {brandColors.map(c => (
                <button key={'tb-' + c.value} onClick={() => setTextBannerColor(c.value)}
                  className={swatchCls + ' !w-5 !h-5'}
                  style={{ background: c.value, borderColor: textBannerColor === c.value ? '#4ade80' : '#ddd' }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Font sections */}
      {f.fonts && (
        <div className="space-y-2">
          {[
            { label: 'Headline', short: 'H', font: headlineFont, setFont: setHeadlineFont, color: headlineColor, setColor: setHeadlineColor, sizeMul: headlineSizeMul, setSizeMul: setHeadlineSizeMul },
            { label: 'Body', short: 'B', font: bodyFont, setFont: setBodyFont, color: bodyColor, setColor: setBodyColor, sizeMul: bodySizeMul, setSizeMul: setBodySizeMul },
          ].map(row => (
            <div key={row.short} className={sectionCls}>
              <div className="flex items-center gap-2">
                <span className={labelCls + ' w-16 flex-shrink-0'}>{row.label}</span>
                <select value={row.font} onChange={e => row.setFont(e.target.value)}
                  className="text-sm border border-border rounded-btn px-2 py-1.5 bg-cream focus:outline-none focus:border-accent flex-1 min-w-0 appearance-none">
                  {fontOptions}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className={labelCls + ' w-16 flex-shrink-0'}>Color</span>
                <div className="flex gap-1.5 flex-wrap">
                  {brandColors.map(c => (
                    <button key={row.short + c.value} onClick={() => row.setColor(c.value)}
                      className={swatchCls}
                      style={{ background: c.value, borderColor: row.color === c.value ? '#111' : '#ddd' }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={labelCls + ' w-16 flex-shrink-0'}>Size</span>
                <input type="range" min={0.5} max={2} step={0.1} value={row.sizeMul}
                  onChange={e => row.setSizeMul(parseFloat(e.target.value))}
                  className="flex-1 accent-[#888] min-w-0" />
                <span className="text-[11px] font-mono text-muted w-10 text-right flex-shrink-0">{Math.round(row.sizeMul * 100)}%</span>
              </div>
            </div>
          ))}

          {/* CTA */}
          {f.cta && (
            <div className={sectionCls}>
              <span className={labelCls + ' block'}>{templateId === 'testimonial' ? 'Stars' : 'CTA'}</span>
              <div className="flex items-center gap-2">
                <span className={labelCls + ' w-16 flex-shrink-0'}>{templateId === 'testimonial' ? 'Color' : 'Background'}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {brandColors.map(c => (
                    <button key={'cta-' + c.value} onClick={() => setCtaColor(c.value)}
                      className={swatchCls}
                      style={{ background: c.value, borderColor: ctaColor === c.value ? '#111' : '#ddd' }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={labelCls + ' w-16 flex-shrink-0'}>Text</span>
                <div className="flex gap-1.5 flex-wrap">
                  {brandColors.map(c => (
                    <button key={'ctaf-' + c.value} onClick={() => setCtaFontColor(c.value)}
                      className={swatchCls}
                      style={{ background: c.value, borderColor: ctaFontColor === c.value ? '#111' : '#ddd' }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
