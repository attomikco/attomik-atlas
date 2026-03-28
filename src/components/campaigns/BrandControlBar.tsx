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
  onSave: () => void
  saving?: boolean
}

export default function BrandControlBar({
  primaryColor, secondaryColor, accentColor,
  fontFamily, allImageUrls, activeImageIndex,
  onPrimaryChange, onSecondaryChange, onAccentChange,
  onFontChange, onImageIndexChange,
  onSave, saving,
}: BrandControlBarProps) {
  return (
    <div style={{ marginBottom: 32 }}>
      {/* Title + subtitle — outside card */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,151,0.08)', border: '1px solid rgba(0,255,151,0.2)', borderRadius: 999, padding: '4px 14px', fontSize: 11, fontWeight: 700, color: '#00ff97', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          ✦ Auto-detected from your website
        </div>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 26, color: '#000', letterSpacing: '-0.01em', marginBottom: 6 }}>
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
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Colors</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Primary', value: primaryColor, onChange: onPrimaryChange },
                { label: 'Secondary', value: secondaryColor, onChange: onSecondaryChange },
                { label: 'Accent', value: accentColor, onChange: onAccentChange },
              ].map(({ label, value, onChange }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                  <input type="color" value={value} onChange={e => onChange(e.target.value)} title={label}
                    style={{ width: 52, height: 52, borderRadius: 12, border: '2px solid #eee', cursor: 'pointer', padding: 3, background: 'none' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: '#f0f0f0', flexShrink: 0 }} />

          {/* Font */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Font</div>
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
              <div style={{ fontSize: 13, color: '#ccc', marginTop: 7, fontFamily, fontWeight: 600 }}>The quick brown fox jumps</div>
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
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <div key={i} onClick={() => onImageIndexChange(i)}
                  style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', border: activeImageIndex === i ? '3px solid #000' : '2px solid #eee', cursor: 'pointer', transition: 'border-color 0.15s', flexShrink: 0 }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
