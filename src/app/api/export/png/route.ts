import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { renderUrl, width, height, filename } = await req.json()
    console.log('[PNG Export] Starting:', { renderUrl: renderUrl?.slice(0, 100), width, height, filename })

    const isLocal = process.env.NODE_ENV === 'development'

    let executablePath: string | undefined
    if (isLocal) {
      const possiblePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
      ]
      const fs = await import('fs')
      executablePath = possiblePaths.find(p => fs.existsSync(p))

      if (!executablePath) {
        const { execSync } = await import('child_process')
        try {
          executablePath = execSync('which google-chrome || which chromium').toString().trim()
        } catch {}
      }
    } else {
      executablePath = await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      )
    }

    if (!executablePath) {
      throw new Error('No Chrome executable found. Checked: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome and others')
    }
    console.log('[PNG Export] Using Chrome at:', executablePath)

    // Create a fresh temp profile dir so no extensions load
    const userDataDir = mkdtempSync(join(tmpdir(), 'puppeteer-'))

    const browser = await puppeteer.launch({
      args: isLocal
        ? [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-plugins',
            `--user-data-dir=${userDataDir}`,
          ]
        : chromium.args,
      defaultViewport: { width, height },
      executablePath,
      headless: true,
    })

    // Clean up temp dir after browser closes
    browser.on('disconnected', () => {
      try { rmSync(userDataDir, { recursive: true, force: true }) } catch {}
    })

    const page = await browser.newPage()
    await page.setViewport({ width, height })

    // Load the render page with all template props in URL
    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 30000 })

    // Wait for images to load
    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img')
      return Array.from(imgs).every(img => img.complete && img.naturalHeight > 0)
    }, { timeout: 10000 }).catch(() => {}) // don't fail if timeout

    // Wait for the render page to signal fonts are ready
    await page.waitForSelector('[data-fonts-ready="true"]', { timeout: 8000 }).catch(() => {})

    // Wait for browser's font loading API to settle
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts?.ready) { try { await document.fonts.ready } catch {} }
    })

    // Extra buffer for layout/paint after fonts swap in
    await new Promise(r => setTimeout(r, 500))

    // Hide Next.js dev toolbar and overlays
    await page.evaluate(() => {
      const nextToolbar = document.querySelector('nextjs-portal')
      if (nextToolbar) (nextToolbar as HTMLElement).style.display = 'none'
      document.querySelectorAll('[data-nextjs-dialog-overlay], [data-nextjs-toast], nextjs-portal, #__next-build-indicator').forEach(el => {
        (el as HTMLElement).style.display = 'none'
      })
    })
    await new Promise(r => setTimeout(r, 100))

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
    })

    await browser.close()

    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('PNG export error:', error)
    return NextResponse.json({ error: 'Export failed', details: String(error) }, { status: 500 })
  }
}
