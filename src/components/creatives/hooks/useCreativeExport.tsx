'use client'
import { useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/client'
import { TEMPLATES, SIZES } from '../templates/registry'
import type { Variation, StyleSnapshot } from '../types'
import type { BrandImage } from '@/types'

interface UseCreativeExportOptions {
  brandSlug: string
  brandId: string | undefined
  campaignId?: string
  templateId: string
  sizeId: string
  templateProps: Record<string, any>
  TemplateComponent: React.ComponentType<any>
  size: { w: number; h: number }
  images: BrandImage[]
  variations: Variation[]
  savedDrafts: (Variation & { sizeId: string })[]
  brandColor: string
  brandName: string
  ctaColor: string
  ctaFontColor: string
  getPublicUrl: (storagePath: string) => string
  thumbProps: (v: Variation, imgUrl: string | null, w?: number, h?: number) => Record<string, any>
  setExporting: (v: boolean) => void
  setExportingAll: (v: boolean) => void
  setExportToast: (v: string | null) => void
}

// Core Puppeteer export — returns the PNG as an ArrayBuffer (for zip) or triggers download
export const fetchPngViaPuppeteer = async (
  templateId: string,
  templateProps: Record<string, any>,
  width: number,
  height: number,
  filename: string
): Promise<ArrayBuffer> => {
  const serializableProps = Object.fromEntries(
    Object.entries(templateProps).filter(([, v]) => {
      try { JSON.stringify(v); return true } catch { return false }
    })
  )

  const storeRes = await fetch('/api/export/props', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ props: serializableProps }),
  })
  const { id } = await storeRes.json()

  const baseUrl = window.location.origin
  const renderUrl = `${baseUrl}/render?template=${templateId}&width=${width}&height=${height}&propsId=${id}`

  console.log('Using Puppeteer export for:', templateId, width, 'x', height)
  const res = await fetch('/api/export/png', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ renderUrl, width, height, filename }),
  })

  if (!res.ok) {
    const text = await res.text()
    let details = 'Unknown error'
    try { const j = JSON.parse(text); details = j.details || j.error || text } catch { details = text }
    console.error('[Puppeteer export] Server error:', res.status, details)
    throw new Error(details)
  }

  return res.arrayBuffer()
}

// Convenience wrapper that downloads directly
export const exportPngViaPuppeteer = async (
  templateId: string,
  templateProps: Record<string, any>,
  width: number,
  height: number,
  filename: string
) => {
  const buf = await fetchPngViaPuppeteer(templateId, templateProps, width, height, filename)
  const blob = new Blob([buf], { type: 'image/png' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useCreativeExport(opts: UseCreativeExportOptions) {
  const {
    brandSlug, brandId, campaignId, templateId, sizeId,
    templateProps, TemplateComponent, size, images,
    variations, savedDrafts,
    getPublicUrl, thumbProps,
    setExporting, setExportingAll, setExportToast,
  } = opts

  const supabase = createClient()
  const exportRef = useRef<HTMLDivElement>(null)

  const renderAndCapture = useCallback(async (Component: any, props: any, w: number, h: number): Promise<string> => {
    const container = exportRef.current
    if (!container) throw new Error('Export container not available')
    // Render at 2x native size for crisp text
    const s = 2
    const rw = w * s, rh = h * s
    // Position far offscreen — NO opacity, NO visibility hidden (html2canvas needs fully rendered content)
    container.style.cssText = `position:fixed;left:-99999px;top:0px;width:${rw}px;height:${rh}px;z-index:9999;overflow:hidden;background:white;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;`
    container.innerHTML = ''
    const { createRoot } = await import('react-dom/client')
    const wrapper = document.createElement('div'); wrapper.style.cssText = `width:${rw}px;height:${rh}px;overflow:hidden;`
    container.appendChild(wrapper)
    const root = createRoot(wrapper)
    root.render(<Component {...props} width={rw} height={rh} isExporting={true} />)
    // Wait for two animation frames so browser fully paints
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    // Wait for all images to load (5s per-image timeout)
    const imgs = container.querySelectorAll('img')
    await Promise.all(
      Array.from(imgs).map(img =>
        img.complete && img.naturalWidth > 0 ? Promise.resolve() :
        new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); setTimeout(res, 5000) })
      )
    )
    // Buffer for final render
    await new Promise(r => setTimeout(r, 200))
    // Capture
    let canvas: HTMLCanvasElement
    try {
      canvas = await html2canvas(container, { width: rw, height: rh, scale: 1, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', logging: true })
    } catch (err) {
      console.error('[Export] html2canvas failed:', err)
      throw err
    }
    if (canvas.width === 0 || canvas.height === 0) throw new Error(`[Export] Canvas empty: ${canvas.width}x${canvas.height}`)
    // Downscale to target size
    const out = document.createElement('canvas')
    out.width = w; out.height = h
    const ctx = out.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(canvas, 0, 0, w, h)
    const dataUrl = out.toDataURL('image/png')
    // Cleanup immediately
    root.unmount()
    container.innerHTML = ''
    container.style.cssText = 'position:fixed;left:-99999px;top:0px;width:0;height:0;overflow:hidden;'
    return dataUrl
  }, [])

  const exportPng = useCallback(async () => {
    setExporting(true)
    const fileName = `${brandSlug}-${templateId}-${sizeId}-${Date.now()}.png`
    try {
      // Try server-side puppeteer export first
      try {
        await exportPngViaPuppeteer(templateId, templateProps, size.w, size.h, fileName)
        setExportToast(campaignId ? 'Downloaded & saved to campaign' : 'Downloaded creative')
        setTimeout(() => setExportToast(null), 3000)
        setExporting(false)
        return
      } catch (err) {
        console.warn('Puppeteer export failed, falling back to html2canvas:', err)
      }
      // Fallback to html2canvas
      console.log('Using html2canvas fallback')
      const dataUrl = await renderAndCapture(TemplateComponent, templateProps, size.w, size.h)
      const link = document.createElement('a'); link.download = fileName; link.href = dataUrl; link.click()
      if (campaignId && brandId) {
        const base64 = dataUrl.split(',')[1]; const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'image/png' }); const path = `${campaignId}/${fileName}`
        await supabase.storage.from('campaign-assets').upload(path, blob, { contentType: 'image/png' })
        await supabase.from('campaign_assets').insert({ campaign_id: campaignId, brand_id: brandId, file_name: fileName, storage_path: path, mime_type: 'image/png', size_bytes: blob.size, asset_type: 'creative' })
      }
      setExportToast(campaignId ? 'Downloaded & saved to campaign' : 'Downloaded creative')
      setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export failed:', err) }
    setExporting(false)
  }, [renderAndCapture, TemplateComponent, templateProps, size, brandSlug, templateId, sizeId, campaignId, brandId, supabase, setExporting, setExportToast])

  const exportAllSizes = useCallback(async () => {
    setExportingAll(true)
    const ts = Date.now()
    const campaignSlug = campaignId ? 'campaign' : 'brand'
    try {
      const zip = new JSZip()
      for (const s of SIZES) {
        const fileName = `${brandSlug}-${campaignSlug}-${templateId}-${s.id}-${ts}.png`
        let added = false
        try {
          const buf = await fetchPngViaPuppeteer(templateId, templateProps, s.w, s.h, fileName)
          zip.file(fileName, buf)
          added = true
        } catch (err) {
          console.warn(`Puppeteer failed for ${s.id}, falling back to html2canvas:`, err)
        }
        if (!added) {
          const dataUrl = await renderAndCapture(TemplateComponent, templateProps, s.w, s.h)
          zip.file(fileName, dataUrl.split(',')[1], { base64: true })
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-${templateId}-all-sizes-${ts}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${SIZES.length} creatives`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export all failed:', err) }
    setExportingAll(false)
  }, [renderAndCapture, TemplateComponent, templateProps, brandSlug, templateId, campaignId, setExportingAll, setExportToast])

  const exportAllVariations = useCallback(async () => {
    if (variations.length === 0) return
    setExportingAll(true)
    const ts = Date.now()
    try {
      const zip = new JSZip()
      for (let i = 0; i < variations.length; i++) {
        const v = variations[i]
        const vImg = images.find(img => img.id === v.imageId)
        const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
        const props = thumbProps(v, vImgUrl)
        const fileName = `${brandSlug}-${v.templateId}-${sizeId}-v${i + 1}-${ts}.png`
        let added = false
        try {
          const buf = await fetchPngViaPuppeteer(v.templateId, props, size.w, size.h, fileName)
          zip.file(fileName, buf)
          added = true
        } catch (err) { console.warn(`Puppeteer failed for variation ${i + 1}, falling back:`, err) }
        if (!added) {
          const VComp = TEMPLATES.find(t => t.id === v.templateId)!.component
          const dataUrl = await renderAndCapture(VComp, props, size.w, size.h)
          zip.file(fileName, dataUrl.split(',')[1], { base64: true })
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-variations-${sizeId}-${ts}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${variations.length} variations`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export variations failed:', err) }
    setExportingAll(false)
  }, [variations, images, size, sizeId, brandSlug, getPublicUrl, thumbProps, renderAndCapture, setExportingAll, setExportToast])

  const exportAllDrafts = useCallback(async () => {
    if (savedDrafts.length === 0) return
    setExportingAll(true)
    const ts = Date.now()
    try {
      const zip = new JSZip()
      for (let i = 0; i < savedDrafts.length; i++) {
        const d = savedDrafts[i]
        const dImg = images.find(img => img.id === d.imageId)
        const dImgUrl = dImg ? getPublicUrl(dImg.storage_path) : null
        const dSize = SIZES.find(s => s.id === d.sizeId) || size
        const props = thumbProps(d, dImgUrl, dSize.w, dSize.h)
        const fileName = `${brandSlug}-${d.templateId}-${d.sizeId}-d${i + 1}-${ts}.png`
        let added = false
        try {
          const buf = await fetchPngViaPuppeteer(d.templateId, props, dSize.w, dSize.h, fileName)
          zip.file(fileName, buf)
          added = true
        } catch (err) { console.warn(`Puppeteer failed for draft ${i + 1}, falling back:`, err) }
        if (!added) {
          const DComp = TEMPLATES.find(t => t.id === d.templateId)!.component
          const dataUrl = await renderAndCapture(DComp, props, dSize.w, dSize.h)
          zip.file(fileName, dataUrl.split(',')[1], { base64: true })
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-drafts-${ts}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${savedDrafts.length} drafts`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export drafts failed:', err) }
    setExportingAll(false)
  }, [savedDrafts, images, size, brandSlug, getPublicUrl, thumbProps, renderAndCapture, setExportingAll, setExportToast])

  return { exportRef, exportPng, exportAllSizes, exportAllVariations, exportAllDrafts, renderAndCapture }
}
