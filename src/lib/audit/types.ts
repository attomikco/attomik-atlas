export type LifecycleStage =
  | 'welcome'
  | 'browse_abandonment'
  | 'abandoned_cart'
  | 'abandoned_checkout'
  | 'post_purchase'
  | 'win_back'
  | 'vip'
  | 'sunset'
  | 'subscription_churn'
  | 'replenishment'
  | 'campaign'

export type FlowMetric = 'openRate' | 'clickRate' | 'conversionRate' | 'revenuePerRecipient'

export type BenchmarkRange = {
  low: number
  high: number
}

export type FlowBenchmark = {
  stage: LifecycleStage
  displayName: string
  isCritical: boolean
  isHighPriority: boolean
  openRate: BenchmarkRange
  clickRate: BenchmarkRange
  conversionRate: BenchmarkRange
  revenuePerRecipient: BenchmarkRange
}

export type FlowPerformance = {
  sent: number
  openRate: number | null
  clickRate: number | null
  conversionRate: number | null
  revenuePerRecipient: number | null
}

export type FlowMessage = {
  id: string
  position: number
  delayHours: number
  subjectLine: string
  previewText: string | null
  bodyText: string
  hasImages: boolean
  imageToTextRatio: number
  ctaCount: number
  isMobileOptimized: boolean
  hasUnsubscribeLink: boolean
  hasPreferenceLink: boolean
  performance: FlowPerformance
}

export type FlowFilter = {
  type: 'inclusion' | 'exclusion'
  field: string
  description: string
}

export type Flow = {
  id: string
  name: string
  stage: LifecycleStage
  isLive: boolean
  messages: FlowMessage[]
  filters: FlowFilter[]
  hasExitCondition: boolean
  hasBranching: boolean
  performance: FlowPerformance
}

export type DimensionScore = {
  score: number
  issues: string[]
  strengths: string[]
}

export type CopyAnalysisInput = {
  brandVoiceConsistency: number
  hasSpecificValueProps: boolean
  handlesObjections: boolean
  subjectLineVariance: number
  subjectLineQuality: number
  issues: string[]
  strengths: string[]
}

export type BrandVoiceContext = {
  voiceDescription: string
  toneAttributes: string[]
  forbiddenPhrases?: string[]
}

export type FlowScore = {
  flowId: string
  flowName: string
  stage: LifecycleStage
  totalScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  dimensions: {
    structure: DimensionScore
    performance: DimensionScore
    copy: DimensionScore
    segmentation: DimensionScore
    design: DimensionScore
  }
}

export type FixPriority = 1 | 2 | 3

export type FixType = 'missing_flow' | 'broken_flow' | 'underperforming_flow'

export type EffortLevel = 'low' | 'medium' | 'high'

export type RevenueRange = {
  low: number
  high: number
  basis: string
}

export type PrioritizedFix = {
  id: string
  priority: FixPriority
  type: FixType
  stage: LifecycleStage
  title: string
  description: string
  estimatedRevenueLift: RevenueRange | null
  effortLevel: EffortLevel
  canAutoGenerate: boolean
  relatedFlowId?: string
}

export type CoverageReport = {
  present: LifecycleStage[]
  missing: LifecycleStage[]
  missingCritical: LifecycleStage[]
  missingHighPriority: LifecycleStage[]
  coverageScore: number
}

export type AuditWarning = {
  code: string
  message: string
  affectedFlowIds?: string[]
}

export type FlowFetchSummary = {
  totalFlowsReturned: number
  filterApplied: string
}

export type AuditReport = {
  brandId: string
  generatedAt: string
  overallScore: number
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F'
  coverage: CoverageReport
  flowScores: FlowScore[]
  prioritizedFixes: PrioritizedFix[]
  revenueLeftOnTable: {
    annual: { low: number; high: number }
    methodology: string
  }
  warnings: AuditWarning[]
  flowFetchSummary: FlowFetchSummary
  context: {
    totalFlows: number
    totalSubscribers: number
    performanceWindowDays: number
    senderEmail: string
  }
}
