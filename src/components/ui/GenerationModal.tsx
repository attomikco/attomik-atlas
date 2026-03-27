'use client'
import { useState, useEffect, useRef } from 'react'
import { Loader2, Check, X } from 'lucide-react'

export interface ModalStep {
  id: string
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
}

interface GenerationModalProps {
  isOpen: boolean
  steps: ModalStep[]
  brandName?: string
  onClose?: () => void
}

const SUBLABELS: Record<string, string[]> = {
  'ad-copy': ['Writing 3 ad variations...', 'Matching your brand voice...', 'Optimizing for Meta...'],
  'landing': ['Structuring your landing page...', 'Writing hero copy...', 'Building social proof section...'],
  'creative': ['Applying brand colors...', 'Composing layout...', 'Rendering creative...'],
}
const DEFAULT_SUBLABELS = ['Working on it...', 'Almost there...', 'Finishing up...']

function AnimatedSublabel({ stepId, status }: { stepId: string; status: string }) {
  const [idx, setIdx] = useState(0)
  const labels = SUBLABELS[stepId] || DEFAULT_SUBLABELS

  useEffect(() => {
    if (status !== 'loading') return
    setIdx(0)
    const interval = setInterval(() => setIdx(prev => (prev + 1) % labels.length), 2000)
    return () => clearInterval(interval)
  }, [status, labels.length])

  if (status === 'pending') return <span className="text-xs text-muted mt-0.5">Waiting...</span>
  if (status === 'done') return <span className="text-xs text-muted mt-0.5">Complete</span>
  if (status === 'error') return <span className="text-xs mt-0.5" style={{ color: '#e53e3e' }}>Failed — try again</span>
  return <span className="text-xs text-muted mt-0.5">{labels[idx]}</span>
}

export default function GenerationModal({ isOpen, steps, brandName, onClose }: GenerationModalProps) {
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const doneCount = steps.filter(s => s.status === 'done').length
  const totalCount = steps.length
  const allDone = doneCount === totalCount && totalCount > 0
  const hasError = steps.some(s => s.status === 'error')
  const isLoading = steps.some(s => s.status === 'loading')

  useEffect(() => {
    if (isOpen && !allDone) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isOpen, allDone])

  useEffect(() => {
    if (allDone && timerRef.current) clearInterval(timerRef.current)
  }, [allDone])

  if (!isOpen) return null

  const headline = allDone ? 'Your funnel is ready ✦' : hasError ? 'Something went wrong' : 'Building your funnel...'
  const subtext = allDone
    ? 'Click below to see your results'
    : brandName
      ? `Generating brand-aware content for ${brandName}`
      : 'This takes about 10–15 seconds'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" style={{ backdropFilter: 'blur(4px)' }} />
      <div className="relative bg-paper rounded-card p-8 w-full max-w-md mx-4 shadow-2xl" style={{ animation: 'fadeInScale 0.2s ease-out' }}>
        <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>

        {/* Spinner */}
        <div className="mx-auto mb-6 relative" style={{ width: 48, height: 48 }}>
          {!allDone ? (
            <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: '#e0e0e0', borderTopColor: '#00ff97' }} />
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#00ff97' }}>
              <Check size={24} strokeWidth={3} style={{ color: '#000' }} />
            </div>
          )}
        </div>

        {/* Headline */}
        <div className="text-center text-lg mb-1 uppercase tracking-tight" style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 800 }}>{headline}</div>
        <div className="text-center text-muted text-sm mb-8">{subtext}</div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map(step => {
            const bg = step.status === 'loading' ? 'rgba(0,0,0,0.03)' : step.status === 'done' ? 'rgba(0,255,151,0.06)' : step.status === 'error' ? 'rgba(229,62,62,0.06)' : 'transparent'
            const border = step.status === 'loading' ? '1px solid rgba(0,0,0,0.1)' : step.status === 'done' ? '1px solid rgba(0,255,151,0.2)' : step.status === 'error' ? '1px solid rgba(229,62,62,0.2)' : '1px solid transparent'
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 p-3 rounded-card transition-all" style={{ background: bg, border }}>
                {/* Icon */}
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center" style={
                  step.status === 'pending' ? { background: '#f5f5f5', border: '1px solid #e0e0e0' } :
                  step.status === 'loading' ? { background: '#111', border: '1px solid #111' } :
                  step.status === 'done' ? { background: '#00ff97', border: '1px solid #00ff97' } :
                  { background: '#fff5f5', border: '1px solid #e53e3e' }
                }>
                  {step.status === 'pending' && <div className="w-2 h-2 rounded-full" style={{ background: '#ddd' }} />}
                  {step.status === 'loading' && <Loader2 size={16} className="animate-spin" style={{ color: '#00ff97' }} />}
                  {step.status === 'done' && <Check size={16} strokeWidth={3} style={{ color: '#000' }} />}
                  {step.status === 'error' && <X size={16} style={{ color: '#e53e3e' }} />}
                </div>
                {/* Content */}
                <div className="text-center">
                  <div className={`text-sm ${step.status === 'pending' ? 'font-medium text-muted' : 'font-semibold'}`}>{step.label}</div>
                  <AnimatedSublabel stepId={step.id} status={step.status} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="w-full h-1 bg-cream rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ background: '#00ff97', width: `${(doneCount / totalCount) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted">{doneCount} of {totalCount} complete</span>
            <span className="text-xs text-muted">{elapsed}s</span>
          </div>
        </div>

        {/* Bottom action */}
        {(allDone || hasError) && (
          <div className="mt-6 pt-6 border-t border-border text-center">
            {allDone ? (
              <button onClick={onClose}
                className="w-full py-3 text-sm font-bold rounded-btn transition-opacity hover:opacity-90"
                style={{ background: '#00ff97', color: '#000' }}>
                View your funnel →
              </button>
            ) : (
              <>
                <p className="text-sm text-muted mb-3">Generation failed. Your brand context was saved.</p>
                <button onClick={onClose}
                  className="w-full py-3 border border-border rounded-btn text-sm font-semibold">
                  Try again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
