import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const META_API_VERSION = 'v19.0'

type LaunchBody = {
  brandId: string
  creativeId: string
  adSetId: string
  adName: string
  destinationUrl?: string
  ctaType: string
  primaryText?: string
  headline?: string
  description?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: LaunchBody
  try { body = await req.json() as LaunchBody } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { brandId, creativeId, adSetId, adName, destinationUrl, ctaType, primaryText, headline, description } = body
  if (!brandId || !creativeId || !adSetId || !adName || !ctaType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Load brand + Meta credentials + fallback website
  const { data: brand } = await supabase
    .from('brands')
    .select('id, website, notes')
    .eq('id', brandId)
    .single()
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  let notes: any = {}
  try { notes = brand.notes ? JSON.parse(brand.notes) : {} } catch {}

  const token = notes.meta_access_token
  const adAccountId = notes.meta_ad_account_id
  const pageId = notes.meta_page_id
  if (!token || !adAccountId || !pageId) {
    return NextResponse.json(
      { error: 'Meta not fully connected. Add token, ad account ID, and Facebook Page ID in Brand Hub → Integrations.' },
      { status: 400 }
    )
  }

  // Load the saved creative to get the image URL
  const { data: creative } = await supabase
    .from('saved_creatives')
    .select('id, brand_id, image_url, thumbnail_url, headline, body_text')
    .eq('id', creativeId)
    .single()
  if (!creative) return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
  if (creative.brand_id !== brandId) {
    return NextResponse.json({ error: 'Creative does not belong to this brand' }, { status: 403 })
  }

  // Prefer the 1080 thumbnail over the raw image_url — thumbnail is the
  // rendered-with-styling version the user sees. Fall back to image_url
  // if the post-save thumbnail pipeline hasn't finished yet.
  const imageUrl = creative.thumbnail_url || creative.image_url
  if (!imageUrl) {
    return NextResponse.json(
      { error: 'Creative has no image yet. Wait a few seconds for the thumbnail to generate and try again.' },
      { status: 400 }
    )
  }

  const finalLink = destinationUrl?.trim() || brand.website || ''
  if (!finalLink) {
    return NextResponse.json(
      { error: 'No destination URL. Set one on the creative or add a website to Brand Hub.' },
      { status: 400 }
    )
  }

  // ── Step 1: create ad creative ─────────────────────────────────────
  const adCreativeBody = {
    name: adName,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        image_url: imageUrl,
        link: finalLink,
        message: primaryText || '',
        name: headline || '',
        description: description || '',
        call_to_action: {
          type: ctaType,
          value: { link: finalLink },
        },
      },
    },
    access_token: token,
  }

  // Log the full outgoing payload (with the token redacted) so we can
  // diagnose exactly what we're sending to Meta. The token is long and
  // sensitive — just log its length and last 4 chars for correlation.
  const redactedBody = {
    ...adCreativeBody,
    access_token: `***${token.slice(-4)} (len=${token.length})`,
  }
  console.log('[meta-launch] adcreative request →', JSON.stringify({
    url: `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/adcreatives`,
    body: redactedBody,
  }, null, 2))

  const creativeRes = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/adcreatives`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adCreativeBody),
    }
  )
  const creativeJson: any = await creativeRes.json()
  if (!creativeRes.ok || creativeJson.error) {
    // Log the FULL Meta error — not just .message. Meta puts the actionable
    // info in error_user_title, error_user_msg, error_subcode, and sometimes
    // error_data.blame_field_specs which names the rejected field.
    console.error('[meta-launch] adcreative failed:', JSON.stringify({
      status: creativeRes.status,
      statusText: creativeRes.statusText,
      error: creativeJson.error,
      fullResponse: creativeJson,
      requestBody: redactedBody,
    }, null, 2))
    return NextResponse.json(
      {
        error: `Meta creative error: ${creativeJson.error?.message || creativeRes.statusText}`,
        metaError: creativeJson.error || null,
        // Surface the full error payload so the modal can display field-level
        // details from Meta (error_user_msg, blame_field_specs, etc.).
        metaResponse: creativeJson,
        debug: {
          requestBody: redactedBody,
          httpStatus: creativeRes.status,
        },
      },
      { status: 400 }
    )
  }
  const adCreativeId = creativeJson.id
  if (!adCreativeId) {
    return NextResponse.json({ error: 'Meta did not return a creative id' }, { status: 500 })
  }

  // ── Step 2: create ad, always PAUSED ───────────────────────────────
  const adBody = {
    name: adName,
    adset_id: adSetId,
    creative: { creative_id: adCreativeId },
    status: 'PAUSED',
    access_token: token,
  }

  const redactedAdBody = {
    ...adBody,
    access_token: `***${token.slice(-4)} (len=${token.length})`,
  }
  console.log('[meta-launch] ad request →', JSON.stringify({
    url: `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/ads`,
    body: redactedAdBody,
  }, null, 2))

  const adRes = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/ads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adBody),
    }
  )
  const adJson: any = await adRes.json()
  if (!adRes.ok || adJson.error) {
    console.error('[meta-launch] ad create failed:', JSON.stringify({
      status: adRes.status,
      statusText: adRes.statusText,
      error: adJson.error,
      fullResponse: adJson,
      requestBody: redactedAdBody,
      adCreativeId, // the creative WAS created — useful for cleanup
    }, null, 2))
    return NextResponse.json(
      {
        error: `Meta ad error: ${adJson.error?.message || adRes.statusText}`,
        metaError: adJson.error || null,
        metaResponse: adJson,
        debug: {
          requestBody: redactedAdBody,
          httpStatus: adRes.status,
          adCreativeId,
        },
      },
      { status: 400 }
    )
  }
  const adId = adJson.id
  if (!adId) {
    return NextResponse.json({ error: 'Meta did not return an ad id' }, { status: 500 })
  }

  // ── Step 3: persist the ad id on the saved creative ────────────────
  const { error: updateError } = await supabase
    .from('saved_creatives')
    .update({
      meta_ad_id: adId,
      meta_ad_status: 'PAUSED',
      // Persist the edited fields so the creative card reflects what was launched
      destination_url: destinationUrl?.trim() || null,
      cta_type: ctaType,
      fb_primary_text: primaryText || null,
      fb_headline: headline || null,
      fb_description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', creativeId)

  if (updateError) {
    console.error('[meta-launch] DB update failed after successful Meta launch:', updateError)
    // The ad IS live in Meta at this point — return success but flag it so
    // the client can warn the user that local state is out of sync.
    return NextResponse.json({
      adId,
      adCreativeId,
      status: 'PAUSED',
      warning: 'Ad launched but local DB update failed. Refresh the page.',
    })
  }

  return NextResponse.json({ adId, adCreativeId, status: 'PAUSED' })
}
