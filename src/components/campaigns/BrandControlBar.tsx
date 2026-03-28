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
    <div style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: '20px 24px',
      marginBottom: 28,
      boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#000', marginBottom: 3, fontFamily: 'Barlow, sans-serif' }}>
            This is what we fetched from your site
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            Update colors, font and images to make the preview look much better.
          </div>
        </div>
        <button onClick={onSave} disabled={saving} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#000', color: '#00ff97',
          fontSize: 13, fontWeight: 700,
          padding: '10px 20px', borderRadius: 999,
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
          flexShrink: 0,
        }}>
          {saving ? 'Saving...' : 'Save to brand →'}
        </button>
      </div>

      {/* Content row */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Colors */}
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Colors</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Primary', value: primaryColor, onChange: onPrimaryChange },
              { label: 'Secondary', value: secondaryColor, onChange: onSecondaryChange },
              { label: 'Accent', value: accentColor, onChange: onAccentChange },
            ].map(({ label, value, onChange }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <input type="color" value={value} onChange={e => onChange(e.target.value)} title={label}
                  style={{ width: 48, height: 48, borderRadius: 12, border: '2px solid #eee', cursor: 'pointer', padding: 3, background: 'none' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: '#eee', flexShrink: 0 }} />

        {/* Font */}
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Font</div>
          <input
            value={fontFamily}
            onChange={e => onFontChange(e.target.value)}
            placeholder="Barlow, Montserrat..."
            style={{ border: '2px solid #eee', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 600, width: 180, outline: 'none', fontFamily: fontFamily || 'inherit', color: '#000' }}
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
            <div style={{ fontSize: 12, color: '#bbb', marginTop: 5, fontFamily }}>The quick brown fox</div>
          )}
        </div>

        {/* Divider + Images */}
        {allImageUrls.length > 0 && (
          <>
            <div style={{ width: 1, alignSelf: 'stretch', background: '#eee', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Images ({allImageUrls.length})</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onImageIndexChange((activeImageIndex - 1 + allImageUrls.length) % allImageUrls.length)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #eee', background: '#fafafa', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ‹
                  </button>
                  <button onClick={() => onImageIndexChange((activeImageIndex + 1) % allImageUrls.length)}
                    style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #eee', background: '#fafafa', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ›
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {allImageUrls.slice(0, 8).map((url, i) => (
                  <div key={i} onClick={() => onImageIndexChange(i)}
                    style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', border: activeImageIndex === i ? '3px solid #000' : '2px solid #eee', cursor: 'pointer', transition: 'border-color 0.15s', flexShrink: 0 }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
