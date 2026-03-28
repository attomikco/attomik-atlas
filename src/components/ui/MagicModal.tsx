'use client'
import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import AttomikLogo from '@/components/ui/AttomikLogo'

interface MagicModalProps {
  isOpen: boolean
  mode: 'scan' | 'adcopy' | 'landing'
  isDone: boolean
  brandName?: string
  onComplete?: () => void
  headline?: string
}

const COPY = {
  scan: {
    phrases: ['Reading your brand DNA.', 'Extracting your visual identity.', 'We found your colors.', 'Capturing what makes you, you.', 'Almost ready to blow your mind.'],
    sub: (name: string) => `Analyzing ${name} — this takes 5 seconds.`,
    donePhrase: 'Your brand is captured. ✦',
    doneSub: 'Colors, fonts, products — all ready.',
  },
  adcopy: {
    phrases: ['Teaching the AI your brand voice.', 'Writing copy that sounds like you.', '3 angles. 1 clear winner.', 'Crafting words that convert.', 'Your Meta ads are being born.'],
    sub: (name: string) => `Generating 3 ad variations for ${name}.`,
    donePhrase: 'Your ads are written. ✦',
    doneSub: '3 variations ready. Let\'s see them.',
  },
  landing: {
    phrases: ['Architecting your conversion story.', 'Building the page that closes the sale.', 'Mapping the journey from click to customer.', 'Structuring your most persuasive argument.', '7 sections. 1 goal: convert.'],
    sub: (name: string) => `Writing a full landing page brief for ${name}.`,
    donePhrase: 'Your landing page is architected. ✦',
    doneSub: '7 sections built. Ready to review.',
  },
}

export default function MagicModal({ isOpen, mode, isDone, brandName = 'your brand', onComplete, headline }: MagicModalProps) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [scanText, setScanText] = useState('Scanning website...')
  const [visibleBlocks, setVisibleBlocks] = useState(0)
  const [typedText, setTypedText] = useState('')

  const copy = COPY[mode]

  useEffect(() => {
    if (isOpen) { setPhraseIndex(0); setVisibleBlocks(0); setTypedText(''); setTimeout(() => setVisible(true), 50) }
    else setVisible(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || isDone) return
    const interval = setInterval(() => setPhraseIndex(i => (i + 1) % copy.phrases.length), 2500)
    return () => clearInterval(interval)
  }, [isOpen, isDone, copy.phrases.length])

  useEffect(() => {
    if (!isOpen || isDone || mode !== 'scan') return
    const texts = [`Scanning ${brandName}...`, 'Extracting colors...', 'Reading fonts...', 'Finding products...']
    let i = 0
    const interval = setInterval(() => { i = (i + 1) % texts.length; setScanText(texts[i]) }, 1500)
    return () => clearInterval(interval)
  }, [isOpen, isDone, mode, brandName])

  useEffect(() => {
    if (!isOpen || isDone || mode !== 'landing') return
    setVisibleBlocks(0); let count = 0
    const interval = setInterval(() => { count++; setVisibleBlocks(count); if (count >= 6) clearInterval(interval) }, 500)
    return () => clearInterval(interval)
  }, [isOpen, isDone, mode])

  useEffect(() => {
    if (!isOpen || isDone || mode !== 'adcopy') return
    const target = headline || `Discover ${brandName}.`
    let i = 0
    let loopTimeout: ReturnType<typeof setTimeout>
    let charInterval: ReturnType<typeof setInterval>
    function startTyping() {
      i = 0; setTypedText('')
      charInterval = setInterval(() => {
        i++; setTypedText(target.slice(0, i))
        if (i >= target.length) { clearInterval(charInterval); loopTimeout = setTimeout(startTyping, 2000) }
      }, 60)
    }
    startTyping()
    return () => { clearInterval(charInterval); clearTimeout(loopTimeout); setTypedText('') }
  }, [isOpen, isDone, mode, brandName])

  useEffect(() => { if (isDone || !isOpen) setTypedText('') }, [isOpen, isDone])

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes scanDot { 0%, 100% { opacity: 0; transform: scale(0.5); } 50% { opacity: 0.8; transform: scale(1); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ position: 'absolute', top: 32, left: 32 }}><AttomikLogo height={22} color="rgba(255,255,255,0.25)" /></div>


      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%', maxWidth: 480, padding: '0 32px' }}>
        {/* SCAN: Radar */}
        {mode === 'scan' && !isDone && (
          <div style={{ position: 'relative', width: 240, height: 240, marginBottom: 32 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,255,151,0.08) 20deg, rgba(0,255,151,0.35) 40deg, transparent 60deg)', animation: 'spin 3s linear infinite' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: '#00ff97', animation: 'pulse 1.5s ease infinite' }} />
            {[{ top: '15%', left: '50%' }, { top: '50%', left: '85%' }, { top: '80%', left: '65%' }, { top: '75%', left: '25%' }, { top: '40%', left: '10%' }].map((pos, i) => (
              <div key={i} style={{ position: 'absolute', ...pos, width: 6, height: 6, borderRadius: '50%', background: '#00ff97', opacity: 0.6, animation: `scanDot 1.4s ease-in-out infinite`, animationDelay: `${i * 0.25}s` }} />
            ))}
            <div style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11, color: '#00ff97', opacity: 0.8 }}>{scanText}<span style={{ animation: 'pulse 1s ease infinite' }}>_</span></div>
          </div>
        )}
        {mode === 'scan' && isDone && (
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}><CheckCircle size={40} color="#00ff97" /></div>
        )}

        {/* ADCOPY: Typewriter */}
        {mode === 'adcopy' && !isDone && (
          <div style={{ position: 'relative', width: 320, height: 200, marginBottom: 40 }}>
            {[{ scale: 0.92, y: 16, op: 0.3 }, { scale: 0.96, y: 8, op: 0.5 }, { scale: 1, y: 0, op: 1 }].map((c, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, transform: `translateY(${c.y}px) scale(${c.scale})`, opacity: c.op, padding: 20, transformOrigin: 'bottom center' }}>
                {i === 2 && (<>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#00ff97', marginBottom: 12 }}>VARIATION 1</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', minHeight: 28 }}>{typedText}<span style={{ animation: 'pulse 0.8s ease infinite' }}>|</span></div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 10, lineHeight: 1.5 }}>Premium quality crafted for people who value the best...</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#00ff97', marginTop: 12 }}>Shop Now →</div>
                </>)}
              </div>
            ))}
          </div>
        )}
        {mode === 'adcopy' && isDone && (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 96, fontWeight: 900, color: '#00ff97', lineHeight: 1, animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>3</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>variations ready</div>
          </div>
        )}

        {/* LANDING: Building blocks */}
        {mode === 'landing' && !isDone && (
          <div style={{ width: 280, marginBottom: 40 }}>
            {[{ label: 'HERO', h: 56, accent: true }, { label: 'PROBLEM', h: 32, accent: false }, { label: 'SOLUTION', h: 32, accent: false }, { label: 'BENEFITS', h: 40, accent: false }, { label: 'SOCIAL PROOF', h: 48, accent: false }, { label: 'CTA', h: 40, accent: true }].map((b, i) => (
              <div key={i} style={{ height: b.h, background: b.accent ? 'rgba(0,255,151,0.08)' : 'rgba(255,255,255,0.06)', border: `1px solid ${b.accent ? 'rgba(0,255,151,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', paddingLeft: 12, opacity: visibleBlocks > i ? 1 : 0, transform: visibleBlocks > i ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.4s ease, transform 0.4s ease' }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: b.accent ? '#00ff97' : 'rgba(255,255,255,0.3)' }}>{b.label}</span>
              </div>
            ))}
          </div>
        )}
        {mode === 'landing' && isDone && (
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <CheckCircle size={48} color="#00ff97" style={{ animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }} />
            <div style={{ color: '#00ff97', fontSize: 12, marginTop: 12, fontWeight: 700 }}>7 sections complete</div>
          </div>
        )}
      </div>

      {/* Bottom phrases */}
      <div style={{ position: 'absolute', bottom: 48, left: 0, right: 0, textAlign: 'center', padding: '0 32px' }}>
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 28, color: '#fff', transition: 'opacity 0.3s ease', marginBottom: 10 }}>
          {isDone ? copy.donePhrase : copy.phrases[phraseIndex]}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          {isDone ? copy.doneSub : copy.sub(brandName)}
        </div>
      </div>
    </div>
  )
}
