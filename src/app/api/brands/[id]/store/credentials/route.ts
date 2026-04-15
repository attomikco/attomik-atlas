import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateCredentials, SHOPIFY_API_VERSION } from '@/lib/shopify'

// Shared — parse the brand.notes JSON blob defensively. Brand-context code
// throughout the app assumes notes may be a string, an already-parsed
// object, or null/undefined. Mirror that exactly.
function parseNotes(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeStoreUrl(input: string): string {
  return input.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase()
}

async function authorizeBrandMember(brandId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, error: 'Unauthorized', status: 401 as const }
  }
  const { data: membership } = await supabase
    .from('brand_members')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) {
    return { supabase, user, error: 'Forbidden', status: 403 as const }
  }
  return { supabase, user, error: null, status: 200 as const }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error, status } = await authorizeBrandMember(id)
  if (error) return NextResponse.json({ error }, { status })

  let body: { shopify_store_url?: string; shopify_access_token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const storeUrlRaw = (body.shopify_store_url || '').trim()
  const accessToken = (body.shopify_access_token || '').trim()
  if (!storeUrlRaw || !accessToken) {
    return NextResponse.json(
      { error: 'shopify_store_url and shopify_access_token required' },
      { status: 400 }
    )
  }

  const storeUrl = normalizeStoreUrl(storeUrlRaw)

  // Validate against Shopify before persisting.
  let shop_name: string
  let domain: string
  try {
    const result = await validateCredentials(storeUrl, accessToken)
    shop_name = result.shop_name
    domain = result.domain
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Load existing brand to merge notes.
  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('id, notes')
    .eq('id', id)
    .maybeSingle()
  if (brandErr || !brand) {
    return NextResponse.json({ error: 'Brand not found', details: brandErr?.message }, { status: 404 })
  }

  const notes = parseNotes(brand.notes)
  const updatedNotes = {
    ...notes,
    shopify_store_url: storeUrl,
    shopify_access_token: accessToken,
    shopify_api_version: SHOPIFY_API_VERSION,
    shopify_token_saved_at: new Date().toISOString(),
  }

  const { error: updateErr } = await supabase
    .from('brands')
    .update({ notes: JSON.stringify(updatedNotes) })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save credentials', details: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, shop_name, domain })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error, status } = await authorizeBrandMember(id)
  if (error) return NextResponse.json({ error }, { status })

  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('id, notes')
    .eq('id', id)
    .maybeSingle()
  if (brandErr || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const notes = parseNotes(brand.notes)
  const storeUrl = typeof notes.shopify_store_url === 'string' ? notes.shopify_store_url : null
  const token = typeof notes.shopify_access_token === 'string' ? notes.shopify_access_token : null
  const savedAt = typeof notes.shopify_token_saved_at === 'string' ? notes.shopify_token_saved_at : null
  const baseInstalledAt = typeof notes.shopify_base_theme_installed_at === 'string' ? notes.shopify_base_theme_installed_at : null

  if (!storeUrl || !token) {
    return NextResponse.json({
      connected: false,
      shopify_store_url: null,
      shop_name: null,
      shopify_token_saved_at: null,
      shopify_base_theme_installed_at: baseInstalledAt,
    })
  }

  // Re-validate on read so the UI shows a trustworthy "connected" state.
  // If the token was revoked in Shopify, the user sees it immediately.
  let shopName: string | null = null
  try {
    const result = await validateCredentials(storeUrl, token)
    shopName = result.shop_name
  } catch {
    return NextResponse.json({
      connected: false,
      shopify_store_url: storeUrl,
      shop_name: null,
      shopify_token_saved_at: savedAt,
      shopify_base_theme_installed_at: baseInstalledAt,
      error: 'Stored token is no longer valid',
    })
  }

  return NextResponse.json({
    connected: true,
    shopify_store_url: storeUrl,
    shop_name: shopName,
    shopify_token_saved_at: savedAt,
    shopify_base_theme_installed_at: baseInstalledAt,
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, error, status } = await authorizeBrandMember(id)
  if (error) return NextResponse.json({ error }, { status })

  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('id, notes')
    .eq('id', id)
    .maybeSingle()
  if (brandErr || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const notes = parseNotes(brand.notes)
  // Strip every Shopify-related key so the brand is cleanly disconnected.
  // Leaves Klaviyo, Meta, email_config, font blobs, etc untouched.
  delete notes.shopify_store_url
  delete notes.shopify_access_token
  delete notes.shopify_api_version
  delete notes.shopify_token_saved_at
  delete notes.shopify_base_theme_installed_at

  const { error: updateErr } = await supabase
    .from('brands')
    .update({ notes: JSON.stringify(notes) })
    .eq('id', id)
  if (updateErr) {
    return NextResponse.json({ error: 'Failed to clear credentials', details: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
