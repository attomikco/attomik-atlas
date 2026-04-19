'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { colors, font, fontWeight, fontSize, radius, spacing } from '@/lib/design-tokens'
import type { AuditReport } from '@/lib/audit/types'
import AuditReportView from './AuditReportView'

// Progress strings rotate while the audit runs — there's no real streaming
// signal yet (the orchestrator runs opaque from the client's perspective).
// Real progress would require NDJSON streaming from /api/brands/[id]/audit/run
// — deferred until p99 latency demands it.
const PROGRESS_STEPS = [
  'Pulling flows from Klaviyo…',
  'Analyzing copy with Claude…',
  'Scoring against benchmarks…',
  'Identifying revenue opportunities…',
]

type AuditState =
  | { kind: 'idle' }
  | { kind: 'running'; startedAt: number }
  | { kind: 'report'; report: AuditReport }
  | { kind: 'error'; error: string; code: string }

type Props = {
  brandId: string
  brandName: string
  hasKlaviyoKey: boolean
}

export default function AuditClient({ brandId, brandName, hasKlaviyoKey }: Props) {
  const [state, setState] = useState<AuditState>({ kind: 'idle' })
  const [showOptional, setShowOptional] = useState(false)
  const [aov, setAov] = useState('')
  const [monthlyOrders, setMonthlyOrders] = useState('')

  // If no Klaviyo key is on file, skip the kickoff UI entirely — point the
  // user to Brand Setup. The API route returns KLAVIYO_KEY_MISSING too, so
  // this is a convenience + guardrail, not a trust boundary.
  if (!hasKlaviyoKey) {
    return <ConnectKlaviyo brandId={brandId} brandName={brandName} />
  }

  async function run() {
    setState({ kind: 'running', startedAt: Date.now() })
    try {
      const body: Record<string, number> = {}
      const aovNum = Number(aov)
      const moNum = Number(monthlyOrders)
      if (Number.isFinite(aovNum) && aovNum > 0) body.aov = aovNum
      if (Number.isFinite(moNum) && moNum > 0) body.monthlyOrders = moNum

      const res = await fetch(`/api/brands/${brandId}/audit/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setState({
          kind: 'error',
          error: data?.message || 'Audit failed',
          code: data?.error || 'UNKNOWN',
        })
        return
      }
      setState({ kind: 'report', report: data as AuditReport })
    } catch (err) {
      setState({
        kind: 'error',
        error: err instanceof Error ? err.message : 'Network error',
        code: 'NETWORK',
      })
    }
  }

  if (state.kind === 'report') {
    return (
      <AuditReportView
        report={state.report}
        brandName={brandName}
        onRerun={() => setState({ kind: 'idle' })}
      />
    )
  }

  if (state.kind === 'running') {
    return <RunningState startedAt={state.startedAt} />
  }

  if (state.kind === 'error') {
    return (
      <ErrorState
        brandId={brandId}
        error={state.error}
        code={state.code}
        onRetry={() => setState({ kind: 'idle' })}
      />
    )
  }

  return (
    <IdleState
      brandName={brandName}
      showOptional={showOptional}
      onToggleOptional={() => setShowOptional(v => !v)}
      aov={aov}
      onAovChange={setAov}
      monthlyOrders={monthlyOrders}
      onMonthlyOrdersChange={setMonthlyOrders}
      onRun={run}
    />
  )
}

// --- Sub-components -------------------------------------------------------

function IdleState(props: {
  brandName: string
  showOptional: boolean
  onToggleOptional: () => void
  aov: string
  onAovChange: (v: string) => void
  monthlyOrders: string
  onMonthlyOrdersChange: (v: string) => void
  onRun: () => void
}) {
  return (
    <Card>
      <h1 style={{
        fontFamily: font.heading,
        fontWeight: fontWeight.heading,
        fontSize: fontSize['4xl'],
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        margin: 0,
        marginBottom: spacing[3],
      }}>
        Retention Audit — {props.brandName}
      </h1>
      <p style={{ color: colors.muted, fontSize: fontSize.body, margin: 0, marginBottom: spacing[6], maxWidth: 640 }}>
        Reads every live Klaviyo flow for this brand, scores them against 2026 DTC benchmarks, identifies coverage gaps, and estimates how much annual revenue is being left on the table. Takes about 10-30 seconds.
      </p>

      <button
        onClick={props.onToggleOptional}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: colors.ink,
          fontSize: fontSize.caption,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: props.showOptional ? spacing[4] : spacing[6],
        }}
      >
        {props.showOptional ? '− Hide optional inputs' : '+ Improve estimates (optional)'}
      </button>

      {props.showOptional && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing[4],
          marginBottom: spacing[6],
          padding: spacing[4],
          background: colors.gray100,
          borderRadius: radius.lg,
          border: `1px solid ${colors.border}`,
        }}>
          <Field label="Average order value (USD)">
            <NumberInput value={props.aov} onChange={props.onAovChange} placeholder="e.g. 65" />
          </Field>
          <Field label="Monthly orders">
            <NumberInput value={props.monthlyOrders} onChange={props.onMonthlyOrdersChange} placeholder="e.g. 800" />
          </Field>
          <div style={{ gridColumn: '1 / -1', color: colors.muted, fontSize: fontSize.caption }}>
            These improve revenue estimates. The audit runs without them, but fix-list revenue impact will be marked as &ldquo;not estimated.&rdquo;
          </div>
        </div>
      )}

      <button
        onClick={props.onRun}
        style={{
          background: colors.ink,
          color: colors.accent,
          border: 'none',
          padding: '14px 28px',
          borderRadius: radius.md,
          fontSize: fontSize.body,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          fontFamily: font.heading,
        }}
      >
        Run audit
      </button>
    </Card>
  )
}

function RunningState({ startedAt }: { startedAt: number }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const step = setInterval(() => {
      setStepIdx(i => (i + 1) % PROGRESS_STEPS.length)
    }, 2500)
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    timerRef.current = tick
    return () => {
      clearInterval(step)
      clearInterval(tick)
    }
  }, [startedAt])

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
        <Spinner />
        <div style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Running audit…
        </div>
      </div>
      <div style={{ color: colors.muted, fontSize: fontSize.body, marginBottom: spacing[3] }}>
        {PROGRESS_STEPS[stepIdx]}
      </div>
      <div style={{ color: colors.gray750, fontSize: fontSize.caption }}>
        Elapsed: {elapsed}s
      </div>
    </Card>
  )
}

function ErrorState({ brandId, error, code, onRetry }: {
  brandId: string
  error: string
  code: string
  onRetry: () => void
}) {
  if (code === 'KLAVIYO_KEY_MISSING') {
    return <ConnectKlaviyo brandId={brandId} brandName="" />
  }
  return (
    <Card>
      <div style={{
        fontFamily: font.heading,
        fontWeight: fontWeight.heading,
        fontSize: fontSize.lg,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: colors.danger,
        marginBottom: spacing[2],
      }}>
        Audit failed
      </div>
      <div style={{ color: colors.muted, fontSize: fontSize.body, marginBottom: spacing[2] }}>
        {error}
      </div>
      <div style={{ color: colors.gray750, fontSize: fontSize.caption, marginBottom: spacing[5] }}>
        Error code: {code}
      </div>
      <button
        onClick={onRetry}
        style={{
          background: colors.ink,
          color: colors.paper,
          border: 'none',
          padding: '10px 20px',
          borderRadius: radius.md,
          fontSize: fontSize.caption,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </Card>
  )
}

function ConnectKlaviyo({ brandId, brandName }: { brandId: string; brandName: string }) {
  return (
    <Card>
      <h1 style={{
        fontFamily: font.heading,
        fontWeight: fontWeight.heading,
        fontSize: fontSize['3xl'],
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        margin: 0,
        marginBottom: spacing[3],
      }}>
        Connect Klaviyo first
      </h1>
      <p style={{ color: colors.muted, fontSize: fontSize.body, margin: 0, marginBottom: spacing[5], maxWidth: 560 }}>
        The retention audit reads {brandName ? `${brandName}'s` : 'this brand\u2019s'} live Klaviyo flows, messages, and performance data. Add a Klaviyo private API key in Brand Setup to continue.
      </p>
      <Link
        href={`/brand-setup/${brandId}`}
        style={{
          background: colors.ink,
          color: colors.accent,
          textDecoration: 'none',
          padding: '12px 24px',
          borderRadius: radius.md,
          fontSize: fontSize.body,
          fontWeight: fontWeight.bold,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          display: 'inline-block',
          fontFamily: font.heading,
        }}
      >
        Open Brand Setup
      </Link>
    </Card>
  )
}

// --- Shared primitives -----------------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: colors.paper,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.xl,
      padding: '28px 32px',
      marginBottom: spacing[4],
    }}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: fontSize.caption,
        fontWeight: fontWeight.bold,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: colors.muted,
        marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function NumberInput(props: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={props.value}
      onChange={e => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        fontSize: fontSize.body,
        background: colors.paper,
        color: colors.ink,
        fontFamily: 'inherit',
      }}
    />
  )
}

function Spinner() {
  return (
    <>
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `2px solid ${colors.gray300}`,
        borderTopColor: colors.ink,
        animation: 'audit-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes audit-spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
