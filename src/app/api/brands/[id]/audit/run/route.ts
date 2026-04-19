import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { KlaviyoClient } from '@/lib/klaviyo/klaviyoClient'
import { runAudit } from '@/lib/audit/orchestrator'
import { getBrandVoiceContext } from '@/lib/audit/getBrandVoiceContext'

// Audit runs inline — no background queue exists in this codebase. 60s ceiling
// is Vercel Pro's max for serverless; a real-world audit with ~10 live flows
// typically finishes in 10-20s (Klaviyo paginates, Claude is called in
// parallel per flow). If p99s cross this ceiling, the next move is NDJSON
// progress streaming — not a job queue.
export const maxDuration = 60

// POST /api/brands/[id]/audit/run
// Body: { monthlyOrders?: number, aov?: number } — both optional, improve
// the fix-list revenue estimates when provided.
//
// Stateless: v1 does not persist the report. Persistence lives behind a
// future prompt so users can revisit past audits — not a blocker for the
// audit → ship loop.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RLS on `brands` gates this — a non-member gets `data: null` and we 404.
  // Mirrors the membership check in /api/campaigns/[id]/email/klaviyo.
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Inline-parse brand.notes — same pattern every other Klaviyo read site in
  // this codebase uses (5 call sites today). A shared accessor is future work.
  const notesData = (() => {
    try {
      return brand.notes ? JSON.parse(brand.notes) : {}
    } catch {
      return {}
    }
  })()

  const klaviyoKey = notesData?.klaviyo_api_key
  if (!klaviyoKey || typeof klaviyoKey !== 'string' || klaviyoKey.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'KLAVIYO_KEY_MISSING',
        message: 'No Klaviyo API key configured for this brand. Add one in Brand Setup.',
      },
      { status: 400 },
    )
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) {
    return NextResponse.json(
      { error: 'SERVER_MISCONFIG', message: 'ANTHROPIC_API_KEY is not set on the server.' },
      { status: 500 },
    )
  }

  let body: { monthlyOrders?: number; aov?: number } = {}
  try {
    body = (await req.json()) ?? {}
  } catch {
    // No body is fine — both inputs are optional.
  }
  const monthlyOrders =
    typeof body.monthlyOrders === 'number' && Number.isFinite(body.monthlyOrders) && body.monthlyOrders > 0
      ? body.monthlyOrders
      : undefined
  const aov =
    typeof body.aov === 'number' && Number.isFinite(body.aov) && body.aov > 0
      ? body.aov
      : undefined

  const klaviyoClient = new KlaviyoClient({ apiKey: klaviyoKey })
  const brandVoice = getBrandVoiceContext(brand)

  try {
    const report = await runAudit({
      brandId: id,
      klaviyoClient,
      brandVoice,
      anthropicApiKey,
      monthlyOrders,
      aov,
    })
    return NextResponse.json(report)
  } catch (err) {
    console.error('[audit] runAudit failed', { brandId: id, error: err })
    const message = err instanceof Error ? err.message : 'Audit failed'
    const code = (err as { code?: string } | undefined)?.code ?? 'UNKNOWN'
    return NextResponse.json(
      { error: 'AUDIT_FAILED', message, code },
      { status: 500 },
    )
  }
}
