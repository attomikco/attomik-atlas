import { NextRequest, NextResponse } from 'next/server'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'
import { listThemes } from '@/lib/shopify'

function parseNotes(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: brandId } = await params
  const { supabase, error, status } = await authorizeOwnerOrAdmin(brandId)
  if (error) return NextResponse.json({ error }, { status })

  const { data: brand } = await supabase
    .from('brands')
    .select('id, notes')
    .eq('id', brandId)
    .maybeSingle()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const notes = parseNotes(brand.notes)
  const shop = typeof notes.shopify_store_url === 'string' ? notes.shopify_store_url : null
  const token = typeof notes.shopify_access_token === 'string' ? notes.shopify_access_token : null
  if (!shop || !token) {
    return NextResponse.json({ error: 'Shopify credentials not configured' }, { status: 400 })
  }

  try {
    const themes = await listThemes(shop, token)
    return NextResponse.json({
      themes: themes.map(t => ({
        id: t.id,
        name: t.name,
        role: t.role,
        preview_url: t.preview_url ?? null,
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to list themes'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
