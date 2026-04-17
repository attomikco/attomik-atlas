import { NextRequest } from 'next/server'
import { readFile, readdir, stat } from 'fs/promises'
import { join, relative, sep } from 'path'
import { authorizeOwnerOrAdmin } from '@/lib/authorize-store'
import { putAsset, putBinaryAsset } from '@/lib/shopify'

export const runtime = 'nodejs'
export const maxDuration = 300

const BINARY_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'woff', 'woff2', 'eot', 'ttf', 'otf', 'mp3', 'wav', 'mp4', 'mov', 'pdf'])

function parseNotes(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'object') return raw as Record<string, unknown>
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return {}
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(dir)
  for (const name of entries) {
    const full = join(dir, name)
    const s = await stat(full)
    if (s.isDirectory()) {
      const nested = await walk(full)
      out.push(...nested)
    } else {
      out.push(full)
    }
  }
  return out
}

function encodeAssetKey(themeRoot: string, absPath: string): string {
  // Shopify asset keys are POSIX-style relative paths like
  // "sections/hero.liquid", "assets/theme.css", "templates/index.json".
  return relative(themeRoot, absPath).split(sep).join('/')
}

function extOf(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : ''
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: brandId } = await params
  const { supabase, error, status } = await authorizeOwnerOrAdmin(brandId)
  if (error) {
    return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } })
  }

  let body: { themeId?: number }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }
  const themeId = typeof body.themeId === 'number' ? body.themeId : null
  if (!themeId) {
    return new Response(JSON.stringify({ error: 'themeId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, notes')
    .eq('id', brandId)
    .maybeSingle()
  if (!brand) {
    return new Response(JSON.stringify({ error: 'Brand not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
  const notes = parseNotes(brand.notes)
  const shop = typeof notes.shopify_store_url === 'string' ? notes.shopify_store_url : null
  const token = typeof notes.shopify_access_token === 'string' ? notes.shopify_access_token : null
  if (!shop || !token) {
    return new Response(JSON.stringify({ error: 'Shopify credentials not configured' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Collect all base-theme files up front so we can report total count
  // in every progress event. src/theme is part of the Next bundle.
  const themeRoot = join(process.cwd(), 'src/theme')
  let files: string[]
  try {
    files = await walk(themeRoot)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: `Failed to read src/theme: ${msg}` }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  const total = files.length

  // Stream newline-delimited JSON events back to the client as uploads
  // complete. ReadableStream lets us push rows without buffering the whole
  // response.
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      let done = 0
      let failed = 0
      const errors: Array<{ file: string; error: string }> = []

      // Concurrency limit — 3 concurrent PUTs against Shopify at a time.
      // Shopify's asset-API rate limit is 40/sec leaky bucket; 3 is safe
      // for the worst-case (large image files take seconds each).
      const CONCURRENCY = 3
      let index = 0

      async function worker() {
        while (true) {
          const i = index++
          if (i >= files.length) return
          const absPath = files[i]
          const key = encodeAssetKey(themeRoot, absPath)
          try {
            const ext = extOf(absPath)
            if (BINARY_EXTS.has(ext)) {
              const buf = await readFile(absPath)
              await putBinaryAsset(shop!, token!, themeId!, key, buf.toString('base64'))
            } else {
              const text = await readFile(absPath, 'utf-8')
              await putAsset(shop!, token!, themeId!, key, text)
            }
            done++
            write({ done, total, file: key })
          } catch (e) {
            failed++
            const msg = e instanceof Error ? e.message : String(e)
            // Log to server so a stalled install is debuggable without the
            // streamed events (Vercel Function logs persist; NDJSON doesn't).
            console.error(`[install-base-theme] ${key}: ${msg}`)
            errors.push({ file: key, error: msg })
            write({ done, total, file: key, error: msg })
          }
        }
      }

      try {
        const workers: Promise<void>[] = []
        for (let w = 0; w < CONCURRENCY; w++) workers.push(worker())
        await Promise.all(workers)

        if (failed === 0) {
          // Mark base theme as installed in brand.notes so the /store page
          // can surface the status without re-listing the remote theme.
          //
          // CRITICAL: re-read notes right before writing. brand.notes is TEXT,
          // not jsonb — there's no atomic server-side merge. The install can
          // take minutes streaming files to Shopify, and unrelated routes
          // (OAuth callback, email save, etc.) may have touched brand.notes
          // in the meantime. Using the `notes` snapshot captured at request
          // start would silently stomp those changes.
          const { data: freshRow } = await supabase
            .from('brands')
            .select('notes')
            .eq('id', brandId)
            .maybeSingle()
          const currentNotes = parseNotes(freshRow?.notes)
          const updated = {
            ...currentNotes,
            shopify_base_theme_installed_at: new Date().toISOString(),
          }
          await supabase.from('brands').update({ notes: JSON.stringify(updated) }).eq('id', brandId)
          write({ done, total, status: 'complete' })
        } else {
          write({ done, total, status: 'complete_with_errors', failed, errors: errors.slice(0, 20) })
        }
      } catch (e) {
        // Catastrophic failure — the worker loop or the post-install write
        // threw unexpectedly. Emit a terminal error event so the UI can
        // surface it rather than hang on an indefinite "processing" state.
        const msg = e instanceof Error ? e.message : String(e)
        console.error(`[install-base-theme] fatal: ${msg}`)
        write({ error: true, file: null, message: msg, done, total })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
    },
  })
}
