import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/email-templates?brandId=...  — list all templates for a brand.
// Master template is always first in the returned list, followed by everything
// else ordered by created_at ascending.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const brandId = req.nextUrl.searchParams.get('brandId')
  if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Master template first, then everything else in creation order.
  const rows = data || []
  const sorted = [
    ...rows.filter(r => r.type === 'master'),
    ...rows.filter(r => r.type !== 'master'),
  ]
  return NextResponse.json({ templates: sorted })
}

// POST /api/email-templates  — create a new template row.
// Body: { brand_id, name, type, brief?, email_config? }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.brand_id || !body.name || !body.type) {
    return NextResponse.json({ error: 'brand_id, name, type required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('email_templates')
    .insert({
      brand_id: body.brand_id,
      name: body.name,
      type: body.type,
      brief: body.brief || null,
      email_config: body.email_config || null,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    console.error('[email-templates POST]', error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ template: data })
}
