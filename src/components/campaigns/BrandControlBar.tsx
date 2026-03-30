'use client'
import { useEffect, useState } from 'react'

interface BrandControlBarProps {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  allImageUrls: string[]
  productImageUrls?: string[]
  lifestyleImageUrls?: string[]
  activeImageIndex: number
  onPrimaryChange: (v: string) => void
  onSecondaryChange: (v: string) => void
  onAccentChange: (v: string) => void
  onFontChange: (v: string) => void
  onImageIndexChange: (i: number) => void
  onAddImages: (files: File[]) => void
  onRemoveImage: (index: number) => void
  onSave: () => void
  saving?: boolean
}

export default function BrandControlBar({
  primaryColor, secondaryColor, accentColor,
  fontFamily, allImageUrls, productImageUrls = [], lifestyleImageUrls = [], activeImageIndex,
  onPrimaryChange, onSecondaryChange, onAccentChange,
  onFontChange, onImageIndexChange,
  onAddImages, onRemoveImage,
  onSave, saving,
}: BrandControlBarProps) {
  const [activeColorField, setActiveColorField] = useState<'primary' | 'secondary' | 'accent' | null>(null)

  const palette = [
    primaryColor,
    secondaryColor,
    accentColor,
    '#000000',
    '#ffffff',
    '#f5f5f5',
    '#1a1a1a',
  ].filter((c, i, arr) => arr.indexOf(c) === i)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('.color-picker-wrap')) {
        setActiveColorField(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Title + subtitle — outside card */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,151,0.12)', border: '1.5px solid rgba(0,255,151,0.5)', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#00ff97', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          ✦ Auto-detected from your website
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 32, color: '#000', letterSpacing: '-0.02em', marginBottom: 6, textTransform: 'uppercase' }}>
          This is what we fetched from your site.
        </div>
        <div style={{ fontSize: 16, color: '#888', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
          Update colors, font and images to make the creatives look dramatically better. Hit <strong style={{ color: '#000' }}>Save to brand</strong> to apply.
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 24px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        {/* Row 1: Colors + Font + Save */}
        <div className="pv-bcb-row" style={{
          display: 'flex', gap: 32, alignItems: 'flex-start',
          marginBottom: allImageUrls.length > 0 ? 24 : 0,
          paddingBottom: allImageUrls.length > 0 ? 24 : 0,
          borderBottom: allImageUrls.length > 0 ? '1px solid #f0f0f0' : 'none',
        }}>
          {/* Colors */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Colors</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Primary', value: primaryColor, key: 'primary' as const, onChange: onPrimaryChange },
                { label: 'Secondary', value: secondaryColor, key: 'secondary' as const, onChange: onSecondaryChange },
                { label: 'Accent', value: accentColor, key: 'accent' as const, onChange: onAccentChange },
              ].map(({ label, value, key, onChange }) => (
                <div key={label} className="color-picker-wrap" style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 7, position: 'relative',
                }}>
                  <div
                    onClick={() => setActiveColorField(activeColorField === key ? null : key)}
                    style={{
                      width: 52, height: 52, borderRadius: 12,
                      background: value,
                      border: activeColorField === key ? '3px solid #000' : '2px solid #eee',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      boxShadow: activeColorField === key ? '0 0 0 2px rgba(0,0,0,0.1)' : 'none',
                    }}
                  />
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#999', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                    {value.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {label}
                  </span>

                  {activeColorField === key && (
                    <div style={{
                      position: 'absolute', top: '100%', left: '50%',
                      transform: 'translateX(-50%)', marginTop: 8,
                      background: '#fff', border: '1px solid #e0e0e0',
                      borderRadius: 16, padding: 16, zIndex: 100,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', width: 220,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                        Brand colors
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {palette.map(color => (
                          <div
                            key={color}
                            onClick={() => { onChange(color); setActiveColorField(null) }}
                            title={color}
                            style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: color,
                              border: color === value ? '3px solid #000' : '1.5px solid #e0e0e0',
                              cursor: 'pointer', transition: 'transform 0.1s', flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                          />
                        ))}
                      </div>
                      <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: 12 }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                        Custom
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="color"
                          value={value}
                          onChange={e => onChange(e.target.value)}
                          style={{
                            width: 36, height: 36, borderRadius: 8,
                            border: '1.5px solid #eee', cursor: 'pointer',
                            padding: 2, background: 'none', flexShrink: 0,
                          }}
                        />
                        <input
                          type="text"
                          value={value.toUpperCase()}
                          onChange={e => {
                            const v = e.target.value
                            if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v)
                          }}
                          placeholder="#000000"
                          style={{
                            flex: 1, padding: '7px 10px',
                            border: '1.5px solid #eee', borderRadius: 8,
                            fontSize: 12, fontFamily: 'monospace',
                            fontWeight: 600, color: '#000', outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: '#f0f0f0', flexShrink: 0 }} />

          {/* Font */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Font</div>
            <input
              value={fontFamily}
              onChange={e => onFontChange(e.target.value)}
              placeholder="Barlow, Montserrat..."
              style={{ border: '2px solid #eee', borderRadius: 10, padding: '11px 14px', fontSize: 15, fontWeight: 700, width: '100%', maxWidth: 240, outline: 'none', fontFamily: fontFamily || 'inherit', color: '#000' }}
              onFocus={e => { e.target.style.borderColor = '#000' }}
              onBlur={e => {
                e.target.style.borderColor = '#eee'
                if (!e.target.value) return
                const link = document.createElement('link')
                link.rel = 'stylesheet'
                link.href = `https://fonts.googleapis.com/css2?family=${e.target.value.replace(/ /g, '+')}:wght@400;700;800;900&display=swap`
                document.head.appendChild(link)
              }}
            />
            {fontFamily && (
              <div style={{ fontSize: 13, color: '#555', marginTop: 7, fontFamily, fontWeight: 600 }}>The quick brown fox jumps</div>
            )}
          </div>

          {/* Save button */}
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'transparent', marginBottom: 12 }}>&nbsp;</div>
            <button onClick={onSave} disabled={saving} style={{
              background: '#000', color: '#00ff97',
              fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 14,
              padding: '13px 24px', borderRadius: 999, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, whiteSpace: 'nowrap',
            }}>
              {saving ? 'Saving...' : 'Save to brand →'}
            </button>
          </div>
        </div>

        {/* Row 2: Images — full width */}
        {allImageUrls.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Images ({allImageUrls.length})</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => onImageIndexChange((activeImageIndex - 1 + allImageUrls.length) % allImageUrls.length)}
                  style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #eee', background: '#fafafa', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <button onClick={() => onImageIndexChange((activeImageIndex + 1) % allImageUrls.length)}
                  style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #eee', background: '#fafafa', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {productImageUrls.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: -4 }}>Product</span>}
              {productImageUrls.slice(0, 4).map((url, i) => (
                <div key={`p-${i}`} style={{ position: 'relative', flexShrink: 0 }}>
                  <div onClick={() => onImageIndexChange(i)}
                    style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: activeImageIndex === i ? '3px solid #000' : '2px solid #eee', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
                  </div>
                </div>
              ))}
              {lifestyleImageUrls.length > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', marginLeft: 8, marginRight: -4 }}>Lifestyle</span>}
              {lifestyleImageUrls.slice(0, 4).map((url, i) => (
                <div key={`l-${i}`} style={{ position: 'relative', flexShrink: 0 }}>
                  <div onClick={() => onImageIndexChange(productImageUrls.length + i)}
                    style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: '2px solid #eee', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
                  </div>
                </div>
              ))}
              {productImageUrls.length === 0 && lifestyleImageUrls.length === 0 && allImageUrls.filter(url => !url.includes('/logo.') && !url.includes('_logo')).slice(0, 10).map((url, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <div onClick={() => onImageIndexChange(i)}
                    style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: activeImageIndex === i ? '3px solid #000' : '2px solid #eee', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
                  </div>
                  <button onClick={() => onRemoveImage(i)}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#000', color: '#fff', border: '2px solid #fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, zIndex: 1 }}>
                    ×
                  </button>
                </div>
              ))}
              {/* Add images button */}
              <label style={{ width: 96, height: 96, borderRadius: 12, border: '2px dashed #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', fontSize: 11, fontWeight: 600, gap: 4, flexShrink: 0, transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#999')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#ddd')}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                Add
                <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => { const files = Array.from(e.target.files || []); if (files.length) onAddImages(files); e.target.value = '' }} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
