'use client'

interface BrandControlBarProps {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  allImageUrls: string[]
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
  fontFamily, allImageUrls, activeImageIndex,
  onPrimaryChange, onSecondaryChange, onAccentChange,
  onFontChange, onImageIndexChange,
  onAddImages, onRemoveImage,
  onSave, saving,
}: BrandControlBarProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Title + subtitle — outside card */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,151,0.08)', border: '1px solid rgba(0,255,151,0.2)', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#00ff97', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          ✦ Auto-detected from your website
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, color: '#000', letterSpacing: '-0.01em', marginBottom: 6, textTransform: 'uppercase' }}>
          This is what we fetched from your site.
        </div>
        <div style={{ fontSize: 14, color: '#888', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
          Update colors, font and images to make the creatives look dramatically better. Hit <strong style={{ color: '#000' }}>Save to brand</strong> to apply.
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 24px 20px', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}>
        {/* Row 1: Colors + Font + Save */}
        <div style={{
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
                { label: 'Primary', value: primaryColor, onChange: onPrimaryChange },
                { label: 'Secondary', value: secondaryColor, onChange: onSecondaryChange },
                { label: 'Accent', value: accentColor, onChange: onAccentChange },
              ].map(({ label, value, onChange }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                  <input type="color" value={value} onChange={e => onChange(e.target.value)} title={label}
                    style={{ width: 52, height: 52, borderRadius: 12, border: '2px solid #eee', cursor: 'pointer', padding: 3, background: 'none' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {allImageUrls.slice(0, 10).map((url, i) => (
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
