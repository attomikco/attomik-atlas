'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AttomikLogo from '@/components/ui/AttomikLogo'

export default function HomePage() {
  const router = useRouter()
  const [website, setWebsite] = useState('')
  const [website2, setWebsite2] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  function go(url: string) {
    const v = url.trim()
    if (!v) return
    // Must look like a URL — not random text pasted by accident
    let normalized = v
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized
    try {
      const parsed = new URL(normalized)
      if (!parsed.hostname.includes('.')) return
      router.push(`/onboarding?url=${encodeURIComponent(normalized)}`)
    } catch {
      return // not a valid URL, ignore
    }
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let frame: number
    let pos = 0
    function tick() {
      pos += 0.4
      if (pos >= el!.scrollWidth / 2) pos = 0
      el!.scrollLeft = pos
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const stripItems = [
    { bg: '#1a1a2e', accent: '#a78bfa', label: 'OVERLAY' },
    { bg: '#0d2818', accent: '#34d399', label: 'SPLIT' },
    { bg: '#2a1a0e', accent: '#fbbf24', label: 'STATEMENT' },
    { bg: '#1a0d2e', accent: '#f472b6', label: 'TESTIMONIAL' },
    { bg: '#0e1a2a', accent: '#60a5fa', label: 'CARD' },
    { bg: '#1a1a0e', accent: '#a3e635', label: 'GRID' },
    { bg: '#2a0e1a', accent: '#fb923c', label: 'STORY' },
    { bg: '#0e2a1a', accent: '#34d399', label: 'UGC' },
    { bg: '#1a0e0e', accent: '#f87171', label: 'STAT' },
    { bg: '#1a1a2e', accent: '#a78bfa', label: 'OVERLAY' },
    { bg: '#0d2818', accent: '#34d399', label: 'SPLIT' },
    { bg: '#2a1a0e', accent: '#fbbf24', label: 'STATEMENT' },
    { bg: '#1a0d2e', accent: '#f472b6', label: 'TESTIMONIAL' },
    { bg: '#0e1a2a', accent: '#60a5fa', label: 'CARD' },
    { bg: '#1a1a0e', accent: '#a3e635', label: 'GRID' },
    { bg: '#2a0e1a', accent: '#fb923c', label: 'STORY' },
    { bg: '#0e2a1a', accent: '#34d399', label: 'UGC' },
    { bg: '#1a0e0e', accent: '#f87171', label: 'STAT' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '16px 20px', fontSize: 16,
    fontWeight: 500, background: 'rgba(255,255,255,0.08)',
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: 14, color: '#fff', outline: 'none',
    textAlign: 'center',
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '17px',
    background: active ? '#00ff97' : 'rgba(0,255,151,0.25)',
    color: '#000', fontFamily: 'Barlow, sans-serif',
    fontWeight: 900, fontSize: 17, border: 'none',
    borderRadius: 14, cursor: active ? 'pointer' : 'not-allowed',
    letterSpacing: '-0.01em', transition: 'background 0.2s ease',
  })

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .fu { animation: fadeUp 0.7s ease forwards; opacity: 0; }
        .fu1 { animation-delay: 0.05s }
        .fu2 { animation-delay: 0.15s }
        .fu3 { animation-delay: 0.25s }
        .fu4 { animation-delay: 0.35s }
        .fu5 { animation-delay: 0.45s }
        .inp:focus { border-color: #00ff97 !important; background: rgba(255,255,255,0.1) !important; }
        .inp::placeholder { color: rgba(255,255,255,0.3) !important; }
        .cta-btn:hover:not(:disabled) { background: #1aff9f !important; transform: translateY(-1px); }
        .ghost-btn:hover { color: rgba(255,255,255,0.8) !important; }
        @media (max-width: 768px) {
          .hp-stats { gap: 24px !important; flex-wrap: wrap !important; }
          .hp-3col { grid-template-columns: 1fr !important; }
          .hp-compare td, .hp-compare th { font-size: 12px !important; padding: 10px 8px !important; }
          .hp-section { padding: 60px 20px !important; }
          .hp-hero-pad { padding: 100px 20px 60px !important; }
          .hp-nav-pad { padding: 16px 20px !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className="hp-nav-pad" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AttomikLogo height={26} color="#ffffff" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/login" className="ghost-btn" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}>Sign in</a>
          <button onClick={() => document.getElementById('hero-input')?.focus()} style={{ background: '#00ff97', color: '#000', fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13, padding: '9px 20px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>Get started →</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hp-hero-pad" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 60px', textAlign: 'center', color: '#fff' }}>
        <div className="fu fu1" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,255,151,0.08)', border: '1px solid rgba(0,255,151,0.2)', borderRadius: 999, padding: '6px 18px', fontSize: 11, fontWeight: 700, color: '#00ff97', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 28 }}>
          ✦ Free funnel preview — no credit card
        </div>
        <h1 className="fu fu2" style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(40px, 7vw, 80px)', lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: 20, textTransform: 'uppercase', maxWidth: 900, color: '#fff' }}>
          Go from website<br/><span style={{ color: '#00ff97' }}>to full ad funnel</span><br/>in 30 seconds.
        </h1>
        <p className="fu fu3" style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 520, marginBottom: 40 }}>
          Paste your URL. We extract your brand automatically and generate 9 ad creatives, 3 copy variations, and a full landing page — ready to launch on Meta today.
        </p>
        <div className="fu fu4" style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input id="hero-input" className="inp" style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} onKeyDown={e => e.key === 'Enter' && go(website)} placeholder="https://yourbrand.com" autoFocus />
          <button className="cta-btn" onClick={() => go(website)} disabled={!website.trim()} style={btnStyle(!!website.trim())}>Build my funnel →</button>
        </div>
        <div className="fu fu5 hp-stats" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, marginTop: 40 }}>
          {[{ num: '300+', label: 'CPG brands' }, { num: '30s', label: 'To full funnel' }, { num: '9', label: 'Ad creatives' }, { num: '100%', label: 'Brand-matched' }].map(({ num, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(22px, 3vw, 28px)', color: '#fff', lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AUTO-SCROLL STRIP */}
      <div style={{ marginBottom: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginBottom: 20 }}>What gets generated for your brand</div>
        <div ref={scrollRef} style={{ display: 'flex', gap: 12, overflowX: 'hidden', paddingBottom: 4, cursor: 'default', userSelect: 'none' }}>
          {stripItems.map((item, i) => (
            <div key={i} style={{ flexShrink: 0, width: 200, height: 200, borderRadius: 16, background: item.bg, border: `1px solid ${item.accent}22`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ width: 80, height: 80, borderRadius: 10, background: `${item.accent}22`, border: `1px solid ${item.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: item.accent, opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: item.accent, textTransform: 'uppercase' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WHAT YOU GET */}
      <section className="hp-section" style={{ padding: '100px 24px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>What you get</div>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(32px, 5vw, 52px)', textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            A complete funnel.<br/><span style={{ color: '#00ff97' }}>In 30 seconds.</span>
          </div>
        </div>
        <div className="hp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { num: '9', label: 'Ad Creatives', desc: 'Multi-format visuals in your exact brand colors, font and images. 4:5 feeds + 9:16 stories. Ready for Meta.', color: '#a78bfa', items: ['Overlay', 'Split', 'Testimonial', 'Statement', 'Card', 'Grid', '+ 3 stories'] },
            { num: '3', label: 'Copy Variations', desc: 'Three distinct angles with different hooks and audiences. Find the message that actually resonates.', color: '#34d399', items: ['Variation 1 — awareness', 'Variation 2 — problem', 'Variation 3 — solution'] },
            { num: '1', label: 'Landing Page', desc: 'A full HTML conversion page matched to your ad message. Same brand. Same promise. Download and deploy.', color: '#fbbf24', items: ['Hero + CTA', 'Problem + Solution', 'Benefits + Social proof', 'FAQ + Final CTA'] },
          ].map(({ num, label, desc, color, items }) => (
            <div key={label} style={{ background: `${color}06`, border: `1px solid ${color}20`, borderRadius: 20, padding: '36px 28px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${color}12`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 32, color }}>{num}</div>
              <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 12, color: 'rgba(255,255,255,0.95)' }}>{label}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 20 }}>{desc}</div>
              <div style={{ borderTop: `1px solid ${color}18`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color, fontSize: 10 }}>✦</span>{item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="hp-section" style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>How it works</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', textTransform: 'uppercase', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Three steps.<br/><span style={{ color: '#00ff97' }}>Zero design skills.</span>
            </div>
          </div>
          <div className="hp-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            {[
              { num: '1', title: 'Paste your URL', desc: 'We scan your website in seconds — extracting brand colors, fonts, products, and images automatically.', detail: 'Shopify, WooCommerce, or any site' },
              { num: '2', title: 'AI builds it', desc: '9 ad creatives, 3 copy variations, and a full landing page generated and matched to your brand.', detail: 'Powered by Claude AI' },
              { num: '3', title: 'Test & scale', desc: 'Download everything, upload to Meta, and start finding your winners. Replace guessing with data.', detail: 'Meta-ready formats included' },
            ].map(({ num, title, desc, detail }) => (
              <div key={num}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,255,151,0.08)', border: '1.5px solid rgba(0,255,151,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, color: '#00ff97' }}>{num}</div>
                <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12, color: 'rgba(255,255,255,0.95)' }}>{title}</div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 12 }}>{desc}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,255,151,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="hp-section" style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>How we compare</div>
            <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', textTransform: 'uppercase', lineHeight: 1.05 }}>
              Agency, freelancer,<br/><span style={{ color: '#00ff97' }}>or Attomik?</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="hp-compare" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['', 'Attomik ✦', 'Agency', 'Freelancer', 'DIY'].map((h, i) => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: i === 0 ? 'left' : 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: i === 1 ? '#00ff97' : 'rgba(255,255,255,0.35)', borderBottom: '1px solid rgba(255,255,255,0.08)', background: i === 1 ? 'rgba(0,255,151,0.04)' : 'transparent' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Time to funnel', '30 seconds', '2–4 weeks', '3–7 days', 'Never done'],
                  ['Cost', 'Free preview', '$3k–$15k/mo', '$500–$3k', 'Your time'],
                  ['Brand-matched', '✓ Always', '✓ Sometimes', '✓ Sometimes', '✗ Rarely'],
                  ['Ad + page consistent', '✓ Always', '✗ Extra cost', '✗ Separate', '✗ No'],
                  ['Ready to test today', '✓ Yes', '✗ No', '✗ No', '✗ No'],
                  ['Scales with you', '✓ Yes', '✗ Pay more', '✗ Pay more', '✗ No'],
                ].map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '14px 16px', textAlign: ci === 0 ? 'left' : 'center', fontSize: ci === 0 ? 13 : 14, color: ci === 0 ? 'rgba(255,255,255,0.5)' : ci === 1 ? (cell.startsWith('✓') ? '#00ff97' : 'rgba(255,255,255,0.9)') : (cell.startsWith('✓') ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'), borderBottom: '1px solid rgba(255,255,255,0.05)', background: ci === 1 ? 'rgba(0,255,151,0.04)' : 'transparent', fontWeight: ci === 1 ? 600 : 400 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Trusted by CPG brands growing on Meta</div>
        <div className="hp-stats" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {['Khloud', 'Jolene Coffee', 'Afterdream', 'Gameplan Skincare', 'Amass Brands'].map(name => (
            <span key={name} style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{name}</span>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="hp-section" style={{ padding: '120px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 'clamp(32px, 5vw, 64px)', textTransform: 'uppercase', lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: 20 }}>
          Stop guessing.<br/><span style={{ color: '#00ff97' }}>Start testing.</span>
        </div>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.4)', marginBottom: 40, maxWidth: 440, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Your competitors are already running ads. Build your first funnel in 30 seconds — completely free.
        </p>
        <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="inp" style={inputStyle} value={website2} onChange={e => setWebsite2(e.target.value)} onKeyDown={e => e.key === 'Enter' && go(website2)} placeholder="https://yourbrand.com" />
          <button className="cta-btn" onClick={() => go(website2)} disabled={!website2.trim()} style={btnStyle(!!website2.trim())}>Build my funnel free →</button>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>No credit card · No design skills · 30 seconds</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <AttomikLogo height={20} color="rgba(255,255,255,0.25)" />
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} Attomik. All rights reserved.</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy', 'Terms'].map(t => (
            <a key={t} href={`/${t.toLowerCase()}`} style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>{t}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}
