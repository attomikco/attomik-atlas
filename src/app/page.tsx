'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { colors, font, fontWeight } from '@/lib/design-tokens'
import AttomikLogo from '@/components/ui/AttomikLogo'

const BG = '#0a0a0a'
const BG_ALT = '#111111'
const BORDER = 'rgba(255,255,255,0.08)'
const BORDER_STRONG = 'rgba(255,255,255,0.14)'
const MUTED = 'rgba(255,255,255,0.55)'
const FAINT = 'rgba(255,255,255,0.35)'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'

const BRANDS = [
  { name: 'Afterdream',       category: 'THC Beverages',    image: 'https://static.wixstatic.com/media/87635f_0cfaec80bf25442ab2f6909fdd7509e5~mv2.jpg' },
  { name: 'WESAKE',           category: 'Premium Sake',     image: 'https://static.wixstatic.com/media/87635f_c9b88912e5544270a83e397f74f9127e~mv2.jpg' },
  { name: 'Stuzzi',           category: 'Hot Sauce',        image: 'https://static.wixstatic.com/media/87635f_637a869dda3040ebb99cfaad519fab4f~mv2.jpg' },
  { name: 'La Monjita',       category: 'Mexican Food',     image: 'https://static.wixstatic.com/media/87635f_0697bd913e0245e09e006a602197ff0c~mv2.jpg' },
  { name: 'Summer Water',     category: 'Canned Rosé',      image: 'https://static.wixstatic.com/media/87635f_4eee4a5f82fe467ba97fb0294afbbb40~mv2.jpg' },
  { name: 'Gameplan',         category: 'Sport Skincare',   image: 'https://static.wixstatic.com/media/87635f_cf238dbe2b9d4b548482199140d8db29~mv2.jpg' },
  { name: 'Jolene Coffee',    category: 'RTD Coffee',       image: 'https://attomik.co/assets/images/jolene-hero.jpg' },
  { name: 'Khloud',           category: 'Wellness',         image: 'https://attomik.co/assets/images/khloud-hero.jpg' },
]

// hero-specific green — explicitly spec'd as #00ff9d; slightly brighter than
// design-tokens `colors.accent` (#00ff97). Used only inside hero visual effects
// (particle canvas + scan panel) so the rest of the page's accent stays coherent.
const HERO_GREEN = '#00ff9d'

type ScanSegment = { text: string; color: string }
type ScanBrand = { url: string; lines: ScanSegment[][] }

const SCAN_CHK_WHITE = 'rgba(255,255,255,0.9)'
const SCAN_KEY_GRAY = '#888'
const SCAN_VAL_WHITE = '#fff'
const SCAN_BAR_EMPTY = '#333'

const scanCmd = (text: string): ScanSegment[] => [
  { text: '> ' + text, color: HERO_GREEN },
]
const scanKv = (key: string, value: string): ScanSegment[] => [
  { text: '✓ ', color: SCAN_CHK_WHITE },
  { text: key.padEnd(22), color: SCAN_KEY_GRAY },
  { text: value, color: SCAN_VAL_WHITE },
]
const scanProgress = (text: string, pct: number): ScanSegment[] => {
  const filled = Math.round(pct / (100 / 16))
  const empty = 16 - filled
  return [
    { text: '> ' + text + '    ', color: HERO_GREEN },
    { text: '█'.repeat(filled), color: HERO_GREEN },
    { text: '░'.repeat(empty), color: SCAN_BAR_EMPTY },
    { text: `  ${pct}%`, color: SCAN_VAL_WHITE },
  ]
}
const scanCheck = (text: string): ScanSegment[] => [
  { text: '✓ ' + text, color: SCAN_CHK_WHITE },
]

const SCAN_BRANDS: ScanBrand[] = [
  {
    url: 'afterdream.co',
    lines: [
      scanCmd('Scanning afterdream.co...'),
      scanKv('Colors extracted', '#1A1A2E · #E94560 · #F5F5F5'),
      scanKv('Font detected', 'Neue Haas Grotesk · Bold'),
      scanKv('Products found', '14 SKUs · lifestyle imagery detected'),
      scanKv('Brand voice', '"Bold, rebellious, youth-driven"'),
      scanProgress('Generating campaign...', 75),
      scanCheck('3 Meta creatives ready · 1 email draft · landing page live'),
    ],
  },
  {
    url: 'jolene.coffee',
    lines: [
      scanCmd('Scanning jolene.coffee...'),
      scanKv('Colors extracted', '#2C1810 · #D4956A · #FFF8F0'),
      scanKv('Font detected', 'Playfair Display · Serif'),
      scanKv('Products found', '6 SKUs · warm lifestyle imagery'),
      scanKv('Brand voice', '"Warm, artisanal, community-first"'),
      scanProgress('Generating campaign...', 100),
      scanCheck('4 Meta creatives ready · 1 email draft · landing page live'),
    ],
  },
  {
    url: 'wesake.com',
    lines: [
      scanCmd('Scanning wesake.com...'),
      scanKv('Colors extracted', '#F2EDE4 · #1C1C1C · #C4A882'),
      scanKv('Font detected', 'GT Alpina · Light'),
      scanKv('Products found', '8 SKUs · clean product photography'),
      scanKv('Brand voice', '"Minimal, refined, Japanese-inspired"'),
      scanProgress('Generating campaign...', 60),
      scanCheck('3 Meta creatives ready · 2 email drafts · landing page live'),
    ],
  },
]

const wordmark: React.CSSProperties = {
  fontFamily: font.heading,
  fontWeight: fontWeight.heading,
  fontSize: 22,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  color: '#fff',
}

const label: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: FAINT,
}

const sectionKicker: React.CSSProperties = {
  ...label,
  color: colors.accent,
  marginBottom: 20,
  display: 'inline-block',
}

const h2: React.CSSProperties = {
  fontFamily: font.heading,
  fontWeight: fontWeight.heading,
  fontSize: 'clamp(36px, 5vw, 64px)',
  lineHeight: 0.98,
  letterSpacing: '-0.025em',
  textTransform: 'uppercase',
  color: '#fff',
  margin: 0,
}

const body: React.CSSProperties = {
  fontFamily: font.heading,
  fontWeight: 400,
  fontSize: 16,
  lineHeight: 1.6,
  color: MUTED,
}

export default function HomePage() {
  const router = useRouter()
  const [heroUrl, setHeroUrl] = useState('')
  const [ctaUrl, setCtaUrl] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setIsLoggedIn(true) })
  }, [])

  function go(url: string) {
    const v = url.trim()
    if (!v) return
    let normalized = v
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized
    try {
      const parsed = new URL(normalized)
      if (!parsed.hostname.includes('.')) return
      router.push(`/onboarding?url=${encodeURIComponent(normalized)}`)
    } catch { return }
  }

  return (
    <div style={{ background: BG, color: '#fff', minHeight: '100vh', overflowX: 'hidden', fontFamily: font.heading }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; }
        @keyframes fade { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        .fade { animation: fade 0.7s ease forwards; }
        .fade2 { animation: fade 0.7s 0.1s ease forwards; opacity: 0; }
        .fade3 { animation: fade 0.7s 0.2s ease forwards; opacity: 0; }
        .fade4 { animation: fade 0.7s 0.3s ease forwards; opacity: 0; }
        .hero-input::placeholder { color: rgba(0,0,0,0.35); }
        .hero-input:focus { outline: none; }
        .cta-btn:hover { opacity: 0.85; }
        .ghost:hover { color: #fff !important; }
        .cap:hover { background: rgba(255,255,255,0.02) !important; }

        /* streaming headline caret — opacity toggles every 530ms */
        @keyframes caret-blink { 0%, 49.99% { opacity: 1 } 50%, 100% { opacity: 0 } }
        .caret {
          display: inline-block;
          color: ${colors.accent};
          font-weight: ${fontWeight.heading};
          margin-left: 0.06em;
          animation: caret-blink 1060ms steps(1) infinite;
        }

        /* hero animated gradient mesh — 3 layered cool dark radials (no warm tint).
           note: hex darks below are NOT in design-tokens (tokens only go to #111);
           strictly cool navies + near-blacks per spec. */
        @keyframes hero-mesh {
          0%   { background-position:   0% 20%,  100% 80%,  50% 50%; }
          100% { background-position: 100% 80%,    0% 20%,  50%  0%; }
        }
        .hero-mesh {
          background-color: ${BG};
          background-image:
            radial-gradient(circle at 20% 30%, #0a0f1e, transparent 55%),
            radial-gradient(circle at 80% 70%, #0d1117, transparent 55%),
            radial-gradient(circle at 50% 50%, #080c14, transparent 62%);
          background-size: 180% 180%;
          animation: hero-mesh 12s ease-in-out infinite alternate;
        }

        @media (max-width: 900px) {
          .grid-6 { grid-template-columns: repeat(2, 1fr) !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .feat-row { grid-template-columns: 1fr !important; gap: 32px !important; }
          .feat-text-right { order: 1 !important; }
          .feat-mock-right { order: 2 !important; }
          .page-pad { padding-left: 24px !important; padding-right: 24px !important; }
          .hero-headline { font-size: 40px !important; }
          .h2-resp { font-size: 36px !important; }
          .section-heavy { padding-top: 72px !important; padding-bottom: 72px !important; }
          .hero-content { padding-top: 12px !important; padding-bottom: 24px !important; }
          .nav-top { padding-top: 16px !important; padding-bottom: 16px !important; }
          .hero-logo svg { height: 44px !important; }
          .hero-sub { font-size: 14px !important; margin-top: 12px !important; margin-bottom: 0 !important; }
          .cap-card { min-height: 150px !important; padding: 24px 20px !important; }
          .brand-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .brand-grid > a:nth-child(2n) { border-right: none !important; }
          .brand-grid > a:nth-child(2n+1) { border-right: 1px solid ${BORDER} !important; }
          .brand-grid > a:nth-child(-n+6) { border-bottom: 1px solid ${BORDER} !important; }
          .brand-cell-name { font-size: 18px !important; }
          .brand-gallery-top { padding-top: 72px !important; padding-bottom: 32px !important; }
          .brand-gallery-bottom { padding-top: 28px !important; padding-bottom: 72px !important; }
          .insights-header { margin-bottom: 32px !important; }
          .footer-row { flex-direction: column !important; align-items: flex-start !important; gap: 14px !important; padding: 28px 24px !important; }
          .mock-pad { padding: 14px !important; }
          .mock-head { padding: 10px 12px !important; }
          .corner-stamps { padding-bottom: 20px !important; padding-top: 0 !important; }
          .stamp-hide { display: none !important; }
        }

        @media (max-width: 600px) {
          .url-row { flex-direction: column !important; border: none !important; background: transparent !important; gap: 10px !important; }
          .url-row input { border: 1px solid ${BORDER_STRONG} !important; background: #fff !important; padding: 16px 18px !important; width: 100% !important; }
          .url-row button { padding: 16px !important; width: 100% !important; border: none !important; }
          .hero-headline { font-size: 34px !important; }
          .h2-resp { font-size: 28px !important; }
          .cta-headline { font-size: 32px !important; }
          .hero-logo svg { height: 40px !important; }
          .hero-content { padding-top: 8px !important; padding-bottom: 20px !important; }
          .section-heavy { padding-top: 56px !important; padding-bottom: 56px !important; }
          .cap-strip-head { padding: 28px 24px 14px !important; }
          .cap-card { min-height: 136px !important; padding: 20px 18px !important; }
          .cap-card-icon { font-size: 24px !important; }
          .cap-card-name { font-size: 14px !important; }
          .brand-cell-name { font-size: 15px !important; }
          .brand-cell-label { font-size: 10px !important; }
          .brand-cell-stamp { display: none !important; }
          .mock-pad { padding: 12px !important; }
          .brand-hub-grid { grid-template-columns: 1fr !important; }
          .insights-meta { display: none !important; }
          .hero-proof { font-size: 10px !important; letter-spacing: 0.12em !important; }
          .scan-panel { height: 178px !important; padding: 10px 14px !important; font-size: 11px !important; }
        }
      `}</style>

      {/* ── 1. HERO ─────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', borderBottom: `1px solid ${BORDER}`, overflow: 'hidden', background: BG }}>
        {/* animated particle field — sits beneath all hero content */}
        <ParticleCanvas />

        {/* top bar */}
        <div className="page-pad nav-top" style={{ padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
          <a href="/login" className="ghost" style={{ ...label, color: MUTED, textDecoration: 'none', transition: 'color 0.15s' }}>Sign in →</a>
        </div>

        {/* center content */}
        <div className="page-pad hero-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 48px 32px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div className="fade hero-logo" style={{ marginBottom: 18 }}>
            <AttomikLogo height={52} color="#ffffff" />
          </div>
          <div className="fade" style={{ ...label, color: colors.accent, marginBottom: 14 }}>Atlas · v1.0 · Live</div>

          <h1
            className="fade2 hero-headline"
            style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading,
              fontSize: 'clamp(38px, 6vw, 76px)',
              lineHeight: 0.96,
              letterSpacing: '-0.035em',
              textTransform: 'uppercase',
              margin: 0,
              maxWidth: 1100,
              color: '#fff',
            }}
          >
            Enter a URL.<br />Get a full marketing funnel.
          </h1>

          <p className="fade3 hero-sub" style={{ ...body, fontSize: 16, maxWidth: 620, marginTop: 14, marginBottom: 20 }}>
            AI-powered marketing for CPG brands. Testing and learning has never been faster — or more efficient.
          </p>

          <div className="fade4 url-row" style={{ width: '100%', maxWidth: 560, display: 'flex', border: `1px solid ${BORDER_STRONG}`, background: '#fff' }}>
            <input
              value={heroUrl}
              onChange={e => setHeroUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go(heroUrl)}
              placeholder="Enter your brand URL (e.g. afterdream.co)"
              className="hero-input"
              autoFocus
              style={{ flex: 1, padding: '18px 20px', fontSize: 15, fontFamily: MONO, fontWeight: 500, border: 'none', background: 'transparent', color: '#000', minWidth: 0 }}
            />
            <button
              onClick={() => go(heroUrl)}
              className="cta-btn"
              style={{ padding: '0 28px', background: colors.accent, color: '#000', fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}
            >
              Analyze my brand →
            </button>
          </div>

          <ScanPanel />

          <div className="fade4 hero-proof" style={{ ...label, marginTop: 14, color: FAINT }}>
            Used by Afterdream · Jolene Coffee · WESAKE · Stuzzi · La Monjita
          </div>

          {isLoggedIn && (
            <a href="/dashboard" style={{ ...label, marginTop: 32, color: colors.accent, textDecoration: 'none' }}>Go to dashboard →</a>
          )}
        </div>

        {/* corner stamps */}
        <div className="page-pad corner-stamps" style={{ padding: '0 48px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
          <div style={{ ...label }}>Scroll ↓</div>
          <div className="stamp-hide" style={{ ...label, textAlign: 'right' }}>EST. 2026 · SF · NYC</div>
        </div>
      </section>

      {/* ── 2. CAPABILITIES STRIP ───────────────────────── */}
      <section style={{ background: BG_ALT, borderBottom: `1px solid ${BORDER}` }}>
        <div className="page-pad cap-strip-head" style={{ padding: '40px 48px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={label}>▸ Six capabilities. One OS.</div>
          <div style={{ ...label, fontFamily: MONO }}>[01 / 05]</div>
        </div>
        <div className="grid-6 page-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', padding: '0 48px 40px' }}>
          {[
            { icon: '🎨', name: 'Ad Creatives', tag: 'Meta-ready in seconds' },
            { icon: '📧', name: 'Email', tag: 'On-brand newsletters, one click' },
            { icon: '📊', name: 'Meta Insights', tag: 'Know what converts' },
            { icon: '🏢', name: 'Multi-brand', tag: 'Manage every brand in one OS' },
            { icon: '🚀', name: 'Publish', tag: 'Live to Meta & Klaviyo instantly' },
            { icon: '🌐', name: 'Landing Pages', tag: 'Hosted, branded, deployed' },
          ].map((c, i) => (
            <div key={c.name} className="cap cap-card" style={{
              padding: '32px 24px',
              borderLeft: i === 0 ? `1px solid ${BORDER}` : 'none',
              borderRight: `1px solid ${BORDER}`,
              borderTop: `1px solid ${BORDER}`,
              borderBottom: `1px solid ${BORDER}`,
              transition: 'background 0.15s',
              minHeight: 200,
              display: 'grid',
              gridTemplateRows: '32px 1fr 14px 20px 36px',
              rowGap: 8,
            }}>
              <div className="cap-card-icon" style={{ fontSize: 28, lineHeight: 1 }}>{c.icon}</div>
              <div />
              <div style={{ ...label, color: colors.accent, fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</div>
              <div className="cap-card-name" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.01em', color: '#fff', lineHeight: 1.2 }}>{c.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{c.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. FEATURE SHOWCASE ─────────────────────────── */}
      <section>
        {/* Row A — Brand Intelligence */}
        <FeatureRow
          index="02"
          total="05"
          kicker="Brand Intelligence"
          title={<>Scan any URL.<br /><span style={{ color: colors.accent }}>Instantly know the brand.</span></>}
          body="Drop in a URL and Attomik extracts colors, fonts, voice, imagery, and product catalog — automatically. No manual setup."
          mockup={<BrandHubMockup />}
          reversed={false}
        />
        {/* Row B — Creative Generation */}
        <FeatureRow
          index="03"
          total="05"
          kicker="Creative Generation"
          title={<>AI creatives that<br /><span style={{ color: colors.accent }}>actually look on-brand.</span></>}
          body="Generate Meta ad creatives in every format — static, carousel, video-ready — using your actual brand assets, not templates."
          mockup={<CreativeMockup />}
          reversed={true}
        />
        {/* Row C — Publishing */}
        <FeatureRow
          index="04"
          total="05"
          kicker="One-Click Publishing"
          title={<>From generated<br /><span style={{ color: colors.accent }}>to live in one click.</span></>}
          body="Connect Meta Ads and Klaviyo once. Then publish any creative, email, or campaign directly from Attomik Atlas."
          mockup={<PublishMockup />}
          reversed={false}
        />
      </section>

      {/* ── BRAND GALLERY ───────────────────────────────── */}
      <BrandGallery />

      {/* ── 4. INSIGHTS PREVIEW ─────────────────────────── */}
      <section style={{ background: BG_ALT, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="page-pad section-heavy" style={{ padding: '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div className="insights-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
            <div style={{ maxWidth: 560 }}>
              <div style={sectionKicker}>▸ Insights · 05 / 05</div>
              <h2 className="h2-resp" style={h2}>Know exactly<br /><span style={{ color: colors.accent }}>what's working.</span></h2>
              <p style={{ ...body, marginTop: 20 }}>
                Upload your Meta Ads CSV or connect directly. AI surfaces your top creatives, spend patterns, and what to scale.
              </p>
              <a href="/onboarding" style={{ ...label, color: colors.accent, textDecoration: 'none', marginTop: 24, display: 'inline-block' }}>See your data →</a>
            </div>
            <div className="insights-meta" style={{ textAlign: 'right' }}>
              <div style={label}>Live data feed</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: colors.accent, marginTop: 6 }}>● SYNCING</div>
            </div>
          </div>

          <InsightsTable />
        </div>
      </section>

      {/* ── 5. CTA FOOTER ───────────────────────────────── */}
      <section style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="page-pad section-heavy" style={{ padding: '120px 48px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={sectionKicker}>▸ Start now</div>
          <h2 className="h2-resp cta-headline" style={{ ...h2, fontSize: 'clamp(40px, 6vw, 80px)' }}>
            Ready to run your brand<br /><span style={{ color: colors.accent }}>like an operating system?</span>
          </h2>
          <p style={{ ...body, maxWidth: 520, margin: '28px auto 40px', fontSize: 17 }}>
            Drop your URL below. Live demo. No credit card. Free to explore.
          </p>

          <div className="url-row" style={{ width: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', border: `1px solid ${BORDER_STRONG}`, background: '#fff' }}>
            <input
              value={ctaUrl}
              onChange={e => setCtaUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go(ctaUrl)}
              placeholder="Enter your brand URL (e.g. afterdream.co)"
              className="hero-input"
              style={{ flex: 1, padding: '18px 20px', fontSize: 15, fontFamily: MONO, fontWeight: 500, border: 'none', background: 'transparent', color: '#000', minWidth: 0 }}
            />
            <button
              onClick={() => go(ctaUrl)}
              className="cta-btn"
              style={{ padding: '0 28px', background: colors.accent, color: '#000', fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.15s' }}
            >
              Analyze my brand →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="page-pad footer-row" style={{ padding: '32px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <AttomikLogo height={20} color="rgba(255,255,255,0.35)" />
        <div style={{ ...label }}>© {new Date().getFullYear()} Attomik · All rights reserved</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <a href="/privacy" style={{ ...label, textDecoration: 'none' }} className="ghost">Privacy</a>
          <a href="/terms" style={{ ...label, textDecoration: 'none' }} className="ghost">Terms</a>
        </div>
      </footer>
    </div>
  )
}

// ── PARTICLE CANVAS (hero background) ──────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let width = 0
    let height = 0

    const resize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    resize()

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; o: number }
    const particles: Particle[] = Array.from({ length: 200 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3, // max ~0.15px / frame — slow drift
      vy: (Math.random() - 0.5) * 0.3,
      r: 1 + Math.random() * 1.5,      // 1 – 2.5px
      o: 0.04 + Math.random() * 0.10,  // 0.04 – 0.14 — subtle field
    }))

    let frameId = 0
    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      // update
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x > width) p.x = 0
        else if (p.x < 0) p.x = width
        if (p.y > height) p.y = 0
        else if (p.y < 0) p.y = height
      }

      // links between nearby particles
      ctx.lineWidth = 1
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            const op = (1 - dist / 100) * 0.03
            ctx.strokeStyle = `rgba(0, 255, 157, ${op})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // particles
      for (const p of particles) {
        ctx.fillStyle = `rgba(0, 255, 157, ${p.o})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      frameId = requestAnimationFrame(draw)
    }

    const handleResize = () => resize()
    window.addEventListener('resize', handleResize)
    frameId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

// ── SCAN PANEL (hero — terminal-style brand scan) ──────
function renderScanSegments(segments: ScanSegment[], maxChars: number): React.ReactNode[] {
  let remaining = maxChars
  const out: React.ReactNode[] = []
  for (let i = 0; i < segments.length; i++) {
    if (remaining <= 0) break
    const seg = segments[i]
    const visible = seg.text.slice(0, remaining)
    out.push(
      <span key={i} style={{ color: seg.color }}>
        {visible}
      </span>
    )
    remaining -= seg.text.length
  }
  return out
}

function ScanPanel() {
  const [brandIndex, setBrandIndex] = useState(0)
  const [lineIndex, setLineIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'pausing'>('typing')

  const currentBrand = SCAN_BRANDS[brandIndex]
  const totalLines = currentBrand.lines.length
  const currentLine = currentBrand.lines[lineIndex]
  const currentLineLength = currentLine.reduce((sum, s) => sum + s.text.length, 0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    if (phase === 'typing') {
      if (charIndex < currentLineLength) {
        timer = setTimeout(() => setCharIndex(c => c + 1), 22)
      } else {
        // line finished — wait 400ms, then advance or enter pause
        timer = setTimeout(() => {
          if (lineIndex + 1 >= totalLines) {
            setPhase('pausing')
          } else {
            setLineIndex(i => i + 1)
            setCharIndex(0)
          }
        }, 400)
      }
    } else {
      // pausing — full scan visible for 2.5s, then reset to next brand
      timer = setTimeout(() => {
        setBrandIndex(i => (i + 1) % SCAN_BRANDS.length)
        setLineIndex(0)
        setCharIndex(0)
        setPhase('typing')
      }, 2500)
    }

    return () => { if (timer) clearTimeout(timer) }
  }, [phase, lineIndex, charIndex, brandIndex, currentLineLength, totalLines])

  return (
    <div
      className="scan-panel fade4"
      style={{
        width: '100%',
        maxWidth: 560,
        margin: '16px auto',
        background: '#000',
        border: `1px solid ${HERO_GREEN}33`, // #00ff9d @ ~20% alpha
        borderRadius: 6,
        padding: '12px 18px',
        // locked height — fits header + 7 fully-typed lines at 12px/1.5
        // so the URL button below never shifts as the scan types in
        height: 200,
        fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
        fontSize: 12,
        textAlign: 'left',
        overflowX: 'auto',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
        </div>
        <div style={{ fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace", fontSize: 11, color: HERO_GREEN }}>
          {currentBrand.url}
        </div>
      </div>

      {/* lines */}
      <div style={{ lineHeight: 1.5 }}>
        {currentBrand.lines.map((line, i) => {
          if (i > lineIndex) return null
          const lineLength = line.reduce((sum, s) => sum + s.text.length, 0)
          const visibleChars = i < lineIndex ? lineLength : charIndex
          const showCaret = i === lineIndex && phase === 'typing'
          return (
            <div key={`${brandIndex}-${i}`} style={{ whiteSpace: 'pre' }}>
              {renderScanSegments(line, visibleChars)}
              {showCaret && (
                <span className="caret" style={{ color: HERO_GREEN }} aria-hidden="true">|</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── FEATURE ROW ─────────────────────────────────────────
function FeatureRow({ index, total, kicker, title, body: bodyText, mockup, reversed }: {
  index: string; total: string; kicker: string; title: React.ReactNode; body: string; mockup: React.ReactNode; reversed: boolean
}) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="page-pad section-heavy" style={{ padding: '120px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div className="feat-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div className={reversed ? 'feat-text-right' : ''} style={{ order: reversed ? 2 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ ...label, color: colors.accent }}>▸ {kicker}</div>
              <div style={{ ...label, fontFamily: MONO }}>[{index} / {total}]</div>
            </div>
            <h2 className="h2-resp" style={h2}>{title}</h2>
            <p style={{ ...body, marginTop: 24, maxWidth: 480 }}>{bodyText}</p>
          </div>
          <div className={reversed ? 'feat-mock-right' : ''} style={{ order: reversed ? 1 : 2 }}>
            {mockup}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── BRAND GALLERY ───────────────────────────────────────
function BrandGallery() {
  return (
    <section style={{ background: BG_ALT, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <div className="page-pad brand-gallery-top" style={{ padding: '100px 48px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div style={{ ...label, color: colors.accent, marginBottom: 14 }}>▸ Built for brands like</div>
            <h2 className="h2-resp" style={h2}>Every brand.<br /><span style={{ color: colors.accent }}>Full funnel.</span></h2>
          </div>
          <div style={{ ...label, textAlign: 'right', fontFamily: MONO }}>{BRANDS.length} case studies · updated daily</div>
        </div>
      </div>

      <div className="brand-grid page-pad" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: `1px solid ${BORDER}`,
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {BRANDS.map((b, i) => (
          <a key={b.name} href="/onboarding" style={{
            position: 'relative',
            aspectRatio: '1',
            overflow: 'hidden',
            borderRight: (i + 1) % 4 === 0 ? 'none' : `1px solid ${BORDER}`,
            borderBottom: i < 4 ? `1px solid ${BORDER}` : 'none',
            background: '#000',
            textDecoration: 'none',
            display: 'block',
          }} className="brand-cell">
            <img src={b.image} alt={b.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.2)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.85) 100%)' }} />
            <div className="brand-cell-label" style={{ position: 'absolute', top: 16, left: 16, ...label, fontSize: 10, color: colors.accent, fontFamily: MONO }}>
              [{String(i + 1).padStart(2, '0')}]
            </div>
            <div className="brand-cell-stamp" style={{ position: 'absolute', top: 16, right: 16, fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              ● CASE STUDY
            </div>
            <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
              <div className="brand-cell-name" style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 22, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1 }}>{b.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{b.category}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="page-pad brand-gallery-bottom" style={{ padding: '32px 48px 80px', maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={label}>▸ CPG · BEVERAGE · WELLNESS · FOOD · BEAUTY</div>
        <a href="/onboarding" style={{ ...label, color: colors.accent, textDecoration: 'none' }}>See all brands →</a>
      </div>

      <style>{`
        .brand-cell:hover img { filter: grayscale(0) !important; transform: scale(1.03); transition: all 0.4s ease; }
        .brand-cell img { transition: all 0.4s ease; }
      `}</style>
    </section>
  )
}

// ── MOCKUPS ─────────────────────────────────────────────
function MockFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div style={{ border: `1px solid ${BORDER_STRONG}`, background: '#000' }}>
      <div className="mock-head" style={{ borderBottom: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: FAINT, letterSpacing: '0.1em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: colors.accent, flexShrink: 0 }}>● LIVE</div>
      </div>
      <div className="mock-pad" style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function BrandHubMockup() {
  const featured = BRANDS[0]
  return (
    <MockFrame title={`brand-hub / ${featured.name.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="brand-hub-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={{ aspectRatio: '4/3', border: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
          <img src={featured.image} alt={featured.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))', padding: '20px 10px 8px' }}>
            <div style={{ fontFamily: MONO, fontSize: 8, color: colors.accent, letterSpacing: '0.12em' }}>● SCANNED</div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 13, color: '#fff', textTransform: 'uppercase', lineHeight: 1, marginTop: 4 }}>{featured.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <div style={{ ...label, fontSize: 9, marginBottom: 4 }}>Category</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#fff' }}>{featured.category}</div>
          </div>
          <div>
            <div style={{ ...label, fontSize: 9, marginBottom: 4 }}>Heading font</div>
            <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 14, color: '#fff', textTransform: 'uppercase', lineHeight: 1 }}>Barlow 900</div>
          </div>
          <div>
            <div style={{ ...label, fontSize: 9, marginBottom: 4 }}>Voice</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, lineHeight: 1.4 }}>Bold · playful · confident</div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...label, fontSize: 10, marginBottom: 6 }}>Colors extracted · 5</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {['#1a0f2a', '#c9a961', '#f4e9d0', '#00ff97', '#6b1818'].map((c, i) => (
            <div key={i} style={{ aspectRatio: '1', background: c, border: `1px solid ${BORDER}` }} />
          ))}
        </div>
      </div>
      <div>
        <div style={{ ...label, fontSize: 10, marginBottom: 6 }}>Image library · {BRANDS.length * 14}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {BRANDS.slice(0, 4).map((b) => (
            <div key={b.name} style={{ aspectRatio: '1', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <img src={b.image} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  )
}

function CreativeMockup() {
  const cards = [
    { brand: BRANDS[0], accent: '#c9a961', label: 'OVERLAY',    headline: 'Drink\nthe dream.' },
    { brand: BRANDS[1], accent: '#e8d5a8', label: 'SPLIT',      headline: 'Premium\nsake. Cold.' },
    { brand: BRANDS[2], accent: '#ff4444', label: 'STATEMENT',  headline: 'Heat that\nhits first.' },
  ]
  return (
    <MockFrame title="creative-studio / batch-1">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ aspectRatio: '4/5', background: '#000', border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 10, position: 'relative', overflow: 'hidden' }}>
            <img src={c.brand.image} alt={c.brand.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.9) 100%)' }} />
            <div style={{ fontFamily: MONO, fontSize: 8, color: c.accent, letterSpacing: '0.1em', position: 'relative', zIndex: 2 }}>{c.label}</div>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 11, color: '#fff', textTransform: 'uppercase', lineHeight: 1, marginBottom: 4, whiteSpace: 'pre-line' }}>{c.headline}</div>
              <div style={{ height: 2, width: '100%', background: c.accent, marginTop: 6 }} />
              <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.brand.name}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...label, fontSize: 10 }}>3 generated · 4:5 · Meta-ready</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: colors.accent }}>✓ 12s</div>
      </div>
    </MockFrame>
  )
}

function PublishMockup() {
  return (
    <MockFrame title="campaigns / publish">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { name: 'Meta Ads', sub: 'ad-account · 12847', status: 'Connected' },
          { name: 'Klaviyo', sub: 'list · summer-2026', status: 'Connected' },
        ].map(p => (
          <div key={p.name} style={{ border: `1px solid ${BORDER}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 13, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{p.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: FAINT, marginTop: 2 }}>{p.sub}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: colors.accent }}>● {p.status}</div>
          </div>
        ))}
        <div style={{ background: colors.accent, color: '#000', padding: '16px', textAlign: 'center', marginTop: 4, fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Publish campaign →
        </div>
        <div style={{ border: `1px solid ${colors.accent}44`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,255,151,0.04)' }}>
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#fff' }}>summer-2026-launch</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: colors.accent }}>● LIVE · 2m ago</div>
        </div>
      </div>
    </MockFrame>
  )
}

function InsightsTable() {
  const rows = [
    { name: 'overlay-v3-afterdream-carousel', spend: '$2,847', purchases: 142, roas: '4.82', best: true },
    { name: 'split-lifestyle-male-25-34', spend: '$1,923', purchases: 78, roas: '3.14', best: false },
    { name: 'testimonial-ugc-jolene-v1', spend: '$1,104', purchases: 41, roas: '2.88', best: false },
    { name: 'statement-bold-wesake-4x5', spend: '$842', purchases: 19, roas: '1.42', best: false },
  ]
  return (
    <div style={{ border: `1px solid ${BORDER_STRONG}`, background: '#000', overflowX: 'auto' }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ ...label, color: '#fff' }}>▸ Top creatives · last 7 days</div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: FAINT }}>4 rows · updated 2m ago</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO }}>
        <thead>
          <tr>
            {['Ad name', 'Spend', 'Purchases', 'ROAS', 'Status'].map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '14px 20px', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: FAINT, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: r.best ? 'rgba(0,255,151,0.05)' : 'transparent' }}>
              <td style={{ padding: '16px 20px', fontSize: 12, color: r.best ? '#fff' : MUTED, borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${BORDER}` }}>
                {r.best && <span style={{ color: colors.accent, marginRight: 8 }}>▸</span>}
                {r.name}
              </td>
              <td style={{ padding: '16px 20px', fontSize: 12, color: r.best ? '#fff' : MUTED, textAlign: 'right', borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${BORDER}` }}>{r.spend}</td>
              <td style={{ padding: '16px 20px', fontSize: 12, color: r.best ? '#fff' : MUTED, textAlign: 'right', borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${BORDER}` }}>{r.purchases}</td>
              <td style={{ padding: '16px 20px', fontSize: 12, color: r.best ? colors.accent : MUTED, textAlign: 'right', fontWeight: 700, borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${BORDER}` }}>{r.roas}x</td>
              <td style={{ padding: '16px 20px', fontSize: 10, textAlign: 'right', borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${BORDER}` }}>
                {r.best
                  ? <span style={{ color: colors.accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>● Best performer</span>
                  : <span style={{ color: FAINT, letterSpacing: '0.1em', textTransform: 'uppercase' }}>○ Active</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
