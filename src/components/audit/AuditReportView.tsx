'use client'
import { useState } from 'react'
import { colors, font, fontWeight, fontSize, radius, spacing } from '@/lib/design-tokens'
import type {
  AuditReport,
  FlowScore,
  LifecycleStage,
  PrioritizedFix,
} from '@/lib/audit/types'

type Props = {
  report: AuditReport
  brandName: string
  onRerun: () => void
}

const STAGE_PILLS: Array<{ stage: LifecycleStage; label: string }> = [
  { stage: 'welcome', label: 'Welcome' },
  { stage: 'browse_abandonment', label: 'Browse' },
  { stage: 'abandoned_cart', label: 'Cart' },
  { stage: 'abandoned_checkout', label: 'Checkout' },
  { stage: 'post_purchase', label: 'Post-Purchase' },
  { stage: 'win_back', label: 'Win-Back' },
  { stage: 'vip', label: 'VIP' },
  { stage: 'sunset', label: 'Sunset' },
]

const STAGE_LABEL: Record<LifecycleStage, string> = {
  welcome: 'Welcome',
  browse_abandonment: 'Browse Abandonment',
  abandoned_cart: 'Abandoned Cart',
  abandoned_checkout: 'Abandoned Checkout',
  post_purchase: 'Post-Purchase',
  win_back: 'Win-Back',
  vip: 'VIP',
  sunset: 'Sunset',
  subscription_churn: 'Subscription Churn Save',
  replenishment: 'Replenishment Reminder',
  campaign: 'Campaign',
}

export default function AuditReportView({ report, brandName, onRerun }: Props) {
  return (
    <div>
      <HeaderCard report={report} brandName={brandName} onRerun={onRerun} />
      <CoverageCard report={report} />
      <FixesCard fixes={report.prioritizedFixes} />
      <FlowsTable flowScores={report.flowScores} />
      {report.warnings.length > 0 && <WarningsCard warnings={report.warnings} />}
      <HowWeAuditedFooter report={report} />
    </div>
  )
}

// --- Header ---------------------------------------------------------------

function HeaderCard({ report, brandName, onRerun }: {
  report: AuditReport
  brandName: string
  onRerun: () => void
}) {
  const { low, high } = report.revenueLeftOnTable.annual
  const hasEstimate = low > 0 || high > 0
  const timeAgo = friendlyTimeAgo(report.generatedAt)

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[6], flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
          <div style={{
            fontFamily: font.heading,
            fontWeight: fontWeight.heading,
            fontSize: 96,
            lineHeight: 1,
            color: gradeColor(report.overallGrade),
          }}>
            {report.overallGrade}
          </div>
          <div>
            <div style={{
              fontFamily: font.heading,
              fontWeight: fontWeight.heading,
              fontSize: fontSize['2xl'],
              letterSpacing: '-0.01em',
              color: colors.ink,
            }}>
              {report.overallScore}/100
            </div>
            <div style={{ fontSize: fontSize.caption, color: colors.muted, marginTop: 2 }}>
              {brandName} · Audited {timeAgo}
            </div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          {hasEstimate ? (
            <>
              <div style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: fontSize['2xl'],
                color: colors.ink,
              }}>
                {formatMoneyRange(low, high)}/year
              </div>
              <div style={{ fontSize: fontSize.caption, color: colors.muted, marginTop: 2 }}>
                Estimated revenue left on the table
              </div>
            </>
          ) : (
            <div style={{ fontSize: fontSize.body, color: colors.muted, maxWidth: 280 }}>
              Revenue impact requires AOV — add it above and re-run.
            </div>
          )}
          <button
            onClick={onRerun}
            style={{
              marginTop: spacing[3],
              background: 'transparent',
              color: colors.ink,
              border: `1px solid ${colors.border}`,
              padding: '8px 16px',
              borderRadius: radius.md,
              fontSize: fontSize.caption,
              fontWeight: fontWeight.bold,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            Re-run audit
          </button>
        </div>
      </div>
    </Card>
  )
}

// --- Coverage -------------------------------------------------------------

function CoverageCard({ report }: { report: AuditReport }) {
  const { present, missingCritical, missingHighPriority } = report.coverage

  return (
    <Card>
      <SectionTitle>Lifecycle Coverage</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: spacing[4] }}>
        {STAGE_PILLS.map(({ stage, label }) => {
          const isPresent = present.includes(stage)
          const isCritical = missingCritical.includes(stage)
          const isHigh = missingHighPriority.includes(stage) && !isCritical
          let bg: string, text: string, border: string
          if (isPresent) {
            bg = colors.accentLight
            text = colors.success
            border = colors.success
          } else if (isCritical) {
            bg = colors.dangerLight
            text = colors.danger
            border = colors.danger
          } else if (isHigh) {
            bg = colors.warningLight
            text = colors.warning
            border = colors.warning
          } else {
            bg = colors.gray150
            text = colors.gray750
            border = colors.border
          }
          return (
            <div key={stage} style={{
              padding: '6px 12px',
              borderRadius: radius.pill,
              background: bg,
              color: text,
              border: `1px solid ${border}`,
              fontSize: fontSize.caption,
              fontWeight: fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {isPresent ? '✓ ' : ''}{label}
            </div>
          )
        })}
      </div>
      <div style={{ color: colors.muted, fontSize: fontSize.caption }}>
        {report.coverage.coverageScore}% coverage of required lifecycle stages.
      </div>
    </Card>
  )
}

// --- Fixes ----------------------------------------------------------------

function FixesCard({ fixes }: { fixes: PrioritizedFix[] }) {
  const [toast, setToast] = useState<string | null>(null)

  function handleBuild(fix: PrioritizedFix) {
    // Stub for v1 — flow generation from the audit is the next prompt.
    setToast(`Coming soon — flow generation from audit ships next. (“${fix.title}”)`)
    setTimeout(() => setToast(null), 4000)
  }

  if (fixes.length === 0) {
    return (
      <Card>
        <SectionTitle>Prioritized fixes</SectionTitle>
        <div style={{ color: colors.muted, fontSize: fontSize.body }}>
          No fixes identified. Your retention program is in good shape.
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <SectionTitle>Prioritized fixes ({fixes.length})</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {fixes.map(fix => (
            <FixRow key={fix.id} fix={fix} onBuild={() => handleBuild(fix)} />
          ))}
        </div>
      </Card>
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: colors.ink,
          color: colors.paper,
          padding: '12px 20px',
          borderRadius: radius.md,
          fontSize: fontSize.caption,
          fontWeight: fontWeight.semibold,
          boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}>
          {toast}
        </div>
      )}
    </>
  )
}

function FixRow({ fix, onBuild }: { fix: PrioritizedFix; onBuild: () => void }) {
  const revenueText = fix.estimatedRevenueLift
    ? `${formatMoneyRange(fix.estimatedRevenueLift.low, fix.estimatedRevenueLift.high)}/year recoverable`
    : 'Revenue impact: not estimated'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing[4],
      padding: spacing[4],
      border: `1px solid ${colors.border}`,
      borderRadius: radius.lg,
      background: colors.gray100,
    }}>
      <PriorityBadge priority={fix.priority} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: font.heading,
          fontWeight: fontWeight.heading,
          fontSize: fontSize.lg,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          color: colors.ink,
          marginBottom: 4,
        }}>
          {fix.title}
        </div>
        <div style={{ color: colors.muted, fontSize: fontSize.body, marginBottom: spacing[2] }}>
          {fix.description}
        </div>
        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap', fontSize: fontSize.caption }}>
          <span style={{ color: colors.ink, fontWeight: fontWeight.semibold }}>{revenueText}</span>
          <EffortBadge effort={fix.effortLevel} />
        </div>
      </div>
      {fix.canAutoGenerate && (
        <button
          onClick={onBuild}
          style={{
            background: colors.ink,
            color: colors.accent,
            border: 'none',
            padding: '10px 18px',
            borderRadius: radius.md,
            fontSize: fontSize.caption,
            fontWeight: fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            fontFamily: font.heading,
            flexShrink: 0,
          }}
        >
          Build this flow
        </button>
      )}
    </div>
  )
}

function PriorityBadge({ priority }: { priority: 1 | 2 | 3 }) {
  const map: Record<1 | 2 | 3, { bg: string; fg: string; label: string }> = {
    1: { bg: colors.dangerLight, fg: colors.danger, label: 'P1' },
    2: { bg: colors.warningLight, fg: colors.warning, label: 'P2' },
    3: { bg: colors.gray200, fg: colors.gray750, label: 'P3' },
  }
  const { bg, fg, label } = map[priority]
  return (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: radius.md,
      background: bg,
      color: fg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: font.heading,
      fontWeight: fontWeight.heading,
      fontSize: fontSize.body,
      flexShrink: 0,
    }}>
      {label}
    </div>
  )
}

function EffortBadge({ effort }: { effort: 'low' | 'medium' | 'high' }) {
  const bg = effort === 'low' ? colors.accentLight : effort === 'medium' ? colors.warningLight : colors.dangerLight
  const fg = effort === 'low' ? colors.success : effort === 'medium' ? colors.warning : colors.danger
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: radius.pill,
      background: bg,
      color: fg,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {effort} effort
    </span>
  )
}

// --- Flows table -----------------------------------------------------------

function FlowsTable({ flowScores }: { flowScores: FlowScore[] }) {
  const [expanded, setExpanded] = useState(false)
  const [openFlowId, setOpenFlowId] = useState<string | null>(null)

  return (
    <Card>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          color: colors.ink,
        }}
      >
        <SectionTitle>All flows ({flowScores.length})</SectionTitle>
        <span style={{ color: colors.muted, fontSize: fontSize.caption }}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && flowScores.length === 0 && (
        <div style={{ color: colors.muted, fontSize: fontSize.body, marginTop: spacing[3] }}>
          No live flows found.
        </div>
      )}
      {expanded && flowScores.length > 0 && (
        <div style={{ marginTop: spacing[3], overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSize.caption }}>
            <thead>
              <tr style={{ textAlign: 'left', color: colors.muted, borderBottom: `1px solid ${colors.border}` }}>
                <Th>Flow</Th>
                <Th>Stage</Th>
                <Th>Grade</Th>
                <Th>Score</Th>
              </tr>
            </thead>
            <tbody>
              {flowScores.map(score => (
                <FlowRow
                  key={score.flowId}
                  score={score}
                  open={openFlowId === score.flowId}
                  onToggle={() => setOpenFlowId(id => id === score.flowId ? null : score.flowId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function FlowRow({ score, open, onToggle }: { score: FlowScore; open: boolean; onToggle: () => void }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer', borderBottom: `1px solid ${colors.border}` }}>
        <Td>
          <div style={{ fontWeight: fontWeight.semibold, color: colors.ink }}>{score.flowName}</div>
        </Td>
        <Td>{STAGE_LABEL[score.stage]}</Td>
        <Td>
          <span style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, color: gradeColor(score.grade) }}>
            {score.grade}
          </span>
        </Td>
        <Td>{score.totalScore}/100</Td>
      </tr>
      {open && (
        <tr>
          <td colSpan={4} style={{ padding: spacing[4], background: colors.gray100 }}>
            <FlowDetails score={score} />
          </td>
        </tr>
      )}
    </>
  )
}

function FlowDetails({ score }: { score: FlowScore }) {
  const dimensions = [
    { key: 'structure', label: 'Structure', dim: score.dimensions.structure },
    { key: 'performance', label: 'Performance', dim: score.dimensions.performance },
    { key: 'copy', label: 'Copy', dim: score.dimensions.copy },
    { key: 'segmentation', label: 'Segmentation', dim: score.dimensions.segmentation },
    { key: 'design', label: 'Design', dim: score.dimensions.design },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing[4] }}>
      {dimensions.map(({ key, label, dim }) => (
        <div key={key}>
          <div style={{
            fontSize: fontSize.caption,
            fontWeight: fontWeight.bold,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.muted,
            marginBottom: 4,
          }}>
            {label} · {dim.score.toFixed(1)}/20
          </div>
          {dim.issues.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: fontSize.caption, color: colors.danger }}>
              {dim.issues.map((issue, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{issue}</li>
              ))}
            </ul>
          )}
          {dim.strengths.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: fontSize.caption, color: colors.success, marginTop: dim.issues.length > 0 ? 4 : 0 }}>
              {dim.strengths.map((s, i) => (
                <li key={i} style={{ marginBottom: 2 }}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// --- Warnings --------------------------------------------------------------

function WarningsCard({ warnings }: { warnings: AuditReport['warnings'] }) {
  return (
    <div style={{
      background: colors.warningLight,
      border: `1px solid ${colors.warning}`,
      borderRadius: radius.lg,
      padding: spacing[4],
      marginBottom: spacing[4],
    }}>
      <div style={{
        fontSize: fontSize.caption,
        fontWeight: fontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: colors.warning,
        marginBottom: spacing[2],
      }}>
        Warnings
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: colors.warning, fontSize: fontSize.caption }}>
        {warnings.map((w, i) => (
          <li key={i} style={{ marginBottom: 2 }}>
            {w.message}
            {w.affectedFlowIds && w.affectedFlowIds.length > 0 && (
              <span style={{ color: colors.muted }}> (flows: {w.affectedFlowIds.join(', ')})</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// --- "How we audited" footer ----------------------------------------------

function HowWeAuditedFooter({ report }: { report: AuditReport }) {
  const n = report.flowFetchSummary.totalFlowsReturned
  const windowDays = report.context.performanceWindowDays
  return (
    <div style={{
      color: colors.gray750,
      fontSize: fontSize.caption,
      marginTop: spacing[2],
      padding: `${spacing[3]} 0`,
      borderTop: `1px dashed ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <span>
        Audited {n} live, non-archived flow{n === 1 ? '' : 's'} over the last {windowDays} days. Draft and paused flows are excluded.
      </span>
      <span
        title="If you expect to see flows that aren't here, check Klaviyo for flows in draft or paused status."
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: colors.gray200,
          color: colors.muted,
          fontSize: 10,
          fontWeight: fontWeight.bold,
          cursor: 'help',
        }}
      >
        ?
      </span>
    </div>
  )
}

// --- Primitives ------------------------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: colors.paper,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.xl,
      padding: '24px 28px',
      marginBottom: spacing[4],
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: font.heading,
      fontWeight: fontWeight.heading,
      fontSize: fontSize.lg,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      color: colors.ink,
      marginBottom: spacing[4],
    }}>
      {children}
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px 8px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: fontSize.caption }}>{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '10px 8px' }}>{children}</td>
}

// --- Helpers ---------------------------------------------------------------

function gradeColor(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
  switch (grade) {
    case 'A': return colors.success
    case 'B': return colors.success
    case 'C': return colors.warning
    case 'D': return colors.danger
    case 'F': return colors.danger
  }
}

function formatMoneyRange(low: number, high: number): string {
  return `${formatMoney(low)}–${formatMoney(high)}`
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`
  if (n >= 1_000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function friendlyTimeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  return `${day}d ago`
}
