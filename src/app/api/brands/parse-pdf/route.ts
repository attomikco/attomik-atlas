import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'

const MAX_TEXT_LENGTH = 50_000

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { assetId } = await req.json()
  if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 })

  // Fetch asset record
  const { data: asset, error: assetError } = await supabaseAdmin
    .from('brand_assets')
    .select('*')
    .eq('id', assetId)
    .single()

  if (assetError || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  // Download file from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('brand-assets')
    .download(asset.storage_path)

  if (downloadError || !fileData) {
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }

  try {
    const data = new Uint8Array(await fileData.arrayBuffer())
    const pdf = new PDFParse({ data })
    const textResult = await pdf.getText()
    const text = textResult.text.slice(0, MAX_TEXT_LENGTH)

    // Store parsed text
    await supabaseAdmin
      .from('brand_assets')
      .update({ parsed_text: text })
      .eq('id', assetId)

    return NextResponse.json({ success: true, textLength: text.length })
  } catch {
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
  }
}
