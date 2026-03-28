'use client'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import AttomikLogo from '@/components/ui/AttomikLogo'

interface MagicModalProps {
  isOpen: boolean
  mode: 'scan' | 'adcopy' | 'landing'
  isDone: boolean
  brandName?: string
  onComplete?: () => void
  headline?: string
  bodyText?: string
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
    doneSub: '12 creatives ready. Let\'s see them.',
  },
  landing: {
    phrases: ['Architecting your conversion story.', 'Building the page that closes the sale.', 'Mapping the journey from click to customer.', 'Structuring your most persuasive argument.', '7 sections. 1 goal: convert.'],
    sub: (name: string) => `Writing a full landing page brief for ${name}.`,
    donePhrase: 'Your landing page is architected. ✦',
    doneSub: '7 sections built. Ready to review.',
  },
}

export default function MagicModal({ isOpen, mode, isDone, brandName = 'your brand', onComplete, headline, bodyText }: MagicModalProps) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [scanText, setScanText] = useState('Scanning website...')
  const [visibleBlocks, setVisibleBlocks] = useState(0)
  const [currentBlock, setCurrentBlock] = useState(-1)
  const [typedText, setTypedText] = useState('')

  const copy = COPY[mode]

  useEffect(() => {
    if (isOpen) { setPhraseIndex(0); setVisibleBlocks(0); setCurrentBlock(-1); setTypedText(''); setTimeout(() => setVisible(true), 50) }
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
    setVisibleBlocks(0); setCurrentBlock(-1)
    let count = 0
    const buildInterval = setInterval(() => {
      count++
      setVisibleBlocks(count)
      setCurrentBlock(count - 1)
      if (count >= 6) {
        clearInterval(buildInterval)
        let cycle = 0
        cycleIntervalRef.current = setInterval(() => {
          cycle = (cycle + 1) % 6
          setCurrentBlock(cycle)
        }, 800)
      }
    }, 600)
    return () => {
      clearInterval(buildInterval)
      if (cycleIntervalRef.current) { clearInterval(cycleIntervalRef.current); cycleIntervalRef.current = null }
    }
  }, [isOpen, isDone, mode])

  const charIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const targetIndexRef = useRef(0)
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (charIntervalRef.current) clearInterval(charIntervalRef.current)
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current)
    setTypedText('')
    targetIndexRef.current = 0

    if (!isOpen || isDone || mode !== 'adcopy') return

    const targets = headline
      ? [headline, headline.split(' ').slice(0, 3).join(' ') + '.', 'Beyond Ordinary.']
      : ['Built Different.', 'Made to Convert.', 'Your Story, Told Right.']

    let i = 0

    function startTyping() {
      const target = targets[targetIndexRef.current]
      i = 0
      setTypedText('')
      charIntervalRef.current = setInterval(() => {
        i++
        setTypedText(target.slice(0, i))
        if (i >= target.length) {
          clearInterval(charIntervalRef.current!)
          charIntervalRef.current = null
          loopTimeoutRef.current = setTimeout(() => {
            targetIndexRef.current = (targetIndexRef.current + 1) % targets.length
            startTyping()
          }, 2000)
        }
      }, 55)
    }

    startTyping()

    return () => {
      if (charIntervalRef.current) clearInterval(charIntervalRef.current)
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current)
      charIntervalRef.current = null
      loopTimeoutRef.current = null
      setTypedText('')
    }
  }, [isOpen, isDone, mode, headline])

  // Clean up landing cycle interval
  useEffect(() => {
    return () => { if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current) }
  }, [])

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000', opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes scanDot { 0%,100%{opacity:0;transform:scale(0.5)} 50%{opacity:0.8;transform:scale(1)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
      `}</style>

      {/* ZONE 1: Logo */}
      <div style={{ position: 'absolute', top: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
        <AttomikLogo height={36} color="#ffffff" />
      </div>

      {/* ZONE 2: Animation */}
      <div style={{ position: 'absolute', top: 100, bottom: 120, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {mode === 'scan' && !isDone && (
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div style={{ position: 'absolute', inset: 28, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,255,151,0.08) 20deg, rgba(0,255,151,0.35) 40deg, transparent 60deg)', animation: 'spin 3s linear infinite' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 10, height: 10, borderRadius: '50%', background: '#00ff97', animation: 'pulse 1.5s ease infinite' }} />
            {[{top:'15%',left:'50%'},{top:'50%',left:'85%'},{top:'80%',left:'65%'},{top:'75%',left:'25%'},{top:'40%',left:'10%'}].map((pos,i) => (
              <div key={i} style={{ position: 'absolute', ...pos, width: 6, height: 6, borderRadius: '50%', background: '#00ff97', opacity: 0.6, animation: 'scanDot 1.4s ease-in-out infinite', animationDelay: `${i*0.25}s` }} />
            ))}
            <div style={{ position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11, color: '#00ff97', opacity: 0.8 }}>
              {scanText}<span style={{ animation: 'pulse 1s ease infinite' }}>_</span>
            </div>
          </div>
        )}
        {mode === 'scan' && isDone && (
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
            <CheckCircle size={36} color="#00ff97" />
          </div>
        )}

        {mode === 'adcopy' && !isDone && (
          <div style={{ position: 'relative', width: '100%', maxWidth: 400, height: 200, margin: '0 auto' }}>
            {[{scale:0.92,y:16,opacity:0.25},{scale:0.96,y:8,opacity:0.45}].map((card,i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.02)', borderRadius: 20, transform: `translateY(${card.y}px) scale(${card.scale})`, opacity: card.opacity, transformOrigin: 'bottom center' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))', borderRadius: 20, boxShadow: '0 24px 48px rgba(0,0,0,0.5)', padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ width: 32, height: 3, background: '#00ff97', borderRadius: 2, margin: '0 auto 10px' }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#00ff97', marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>VARIATION 1</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Barlow,sans-serif', minHeight: 28, marginBottom: 10, lineHeight: 1.2 }}>
                {typedText}<span style={{ display: 'inline-block', width: 2, height: 20, background: '#00ff97', marginLeft: 2, verticalAlign: 'middle', animation: 'pulse 0.8s ease infinite' }} />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                {bodyText ? bodyText.slice(0,80)+(bodyText.length>80?'...':'') : 'Crafting your message...'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00ff97' }}>Shop Now →</div>
            </div>
          </div>
        )}
        {mode === 'adcopy' && isDone && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 96, fontWeight: 900, color: '#00ff97', lineHeight: 1, animation: 'popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>12</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>creatives ready</div>
          </div>
        )}

        {mode === 'landing' && !isDone && (
          <div style={{ width: 280 }}>
            {[{label:'HERO',h:52},{label:'PROBLEM',h:32},{label:'SOLUTION',h:32},{label:'BENEFITS',h:40},{label:'SOCIAL PROOF',h:44},{label:'CTA',h:40}].map((b,i) => {
              const isActive = currentBlock === i
              const isVis = visibleBlocks > i
              return (
                <div key={i} style={{ height: b.h, background: isActive ? 'rgba(0,255,151,0.12)' : isVis ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(0,255,151,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 8, marginBottom: 5, display: 'flex', alignItems: 'center', paddingLeft: 12, opacity: isVis ? 1 : 0, transform: isVis ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.4s ease' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: isActive ? '#00ff97' : isVis ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>{b.label}</span>
                </div>
              )
            })}
          </div>
        )}
        {mode === 'landing' && isDone && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div style={{ width: 280, marginBottom: 16 }}>
              {[...Array(6)].map((_,i) => (
                <div key={i} style={{ height: 32, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, marginBottom: 5 }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={18} color="#00ff97" />
              <span style={{ color: '#00ff97', fontSize: 13, fontWeight: 700 }}>7 sections complete</span>
            </div>
          </div>
        )}
      </div>

      {/* ZONE 3: Phrases */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, height: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px', pointerEvents: 'none' }}>
        <div style={{ fontFamily: 'Barlow,sans-serif', fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>
          {isDone ? copy.donePhrase : copy.phrases[phraseIndex]}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          {isDone ? copy.doneSub : copy.sub(brandName)}
        </div>
      </div>
    </div>
  )
}
