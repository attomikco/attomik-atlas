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

  const captureElement = useCallback(async (el: HTMLElement, w: number, h: number): Promise<string> => {
    const canvas = await html2canvas(el, {
      width: w, height: h, scale: 1,
      useCORS: true, allowTaint: true, logging: false,
    })
    return canvas.toDataURL('image/png')
  }, [])

  const renderAndCapture = useCallback(async (Component: any, props: any, w: number, h: number): Promise<string> => {
    const container = exportRef.current
    if (!container) throw new Error('Export container not available')
    container.style.cssText = `position:fixed;top:0;left:0;width:${w}px;height:${h}px;z-index:9999;overflow:hidden;`
    container.innerHTML = ''
    const { createRoot } = await import('react-dom/client')
    const wrapper = document.createElement('div'); wrapper.style.cssText = `width:${w}px;height:${h}px;overflow:hidden;`
    container.appendChild(wrapper)
    const root = createRoot(wrapper)
    root.render(<Component {...props} width={w} height={h} />)
    await new Promise(r => setTimeout(r, 500))
    const imgs = container.querySelectorAll('img')
    await Promise.all(Array.from(imgs).map(img => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r })))
    await new Promise(r => setTimeout(r, 200))
    const dataUrl = await captureElement(container, w, h)
    root.unmount()
    container.innerHTML = ''
    container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;pointer-events:none;'
    return dataUrl
  }, [captureElement])

  const exportPng = useCallback(async () => {
    setExporting(true)
    try {
      const dataUrl = await renderAndCapture(TemplateComponent, templateProps, size.w, size.h)
      const fileName = `${brandSlug}-${templateId}-${sizeId}-${Date.now()}.png`
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
    try {
      const zip = new JSZip()
      for (const s of SIZES) { const dataUrl = await renderAndCapture(TemplateComponent, templateProps, s.w, s.h); zip.file(`${brandSlug}-${templateId}-${s.id}-${s.w}x${s.h}.png`, dataUrl.split(',')[1], { base64: true }) }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-${templateId}-all-sizes-${Date.now()}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${SIZES.length} creatives`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export all failed:', err) }
    setExportingAll(false)
  }, [renderAndCapture, TemplateComponent, templateProps, brandSlug, templateId, setExportingAll, setExportToast])

  const exportAllVariations = useCallback(async () => {
    if (variations.length === 0) return
    setExportingAll(true)
    try {
      const zip = new JSZip()
      for (let i = 0; i < variations.length; i++) {
        const v = variations[i]
        const VComp = TEMPLATES.find(t => t.id === v.templateId)!.component
        const vImg = images.find(img => img.id === v.imageId)
        const vImgUrl = vImg ? getPublicUrl(vImg.storage_path) : null
        const props = thumbProps(v, vImgUrl)
        const dataUrl = await renderAndCapture(VComp, props, size.w, size.h)
        zip.file(`${brandSlug}-${v.templateId}-${sizeId}-${i + 1}.png`, dataUrl.split(',')[1], { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-variations-${sizeId}-${Date.now()}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${variations.length} variations`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export variations failed:', err) }
    setExportingAll(false)
  }, [variations, images, size, sizeId, brandSlug, getPublicUrl, thumbProps, renderAndCapture, setExportingAll, setExportToast])

  const exportAllDrafts = useCallback(async () => {
    if (savedDrafts.length === 0) return
    setExportingAll(true)
    try {
      const zip = new JSZip()
      for (let i = 0; i < savedDrafts.length; i++) {
        const d = savedDrafts[i]
        const DComp = TEMPLATES.find(t => t.id === d.templateId)!.component
        const dImg = images.find(img => img.id === d.imageId)
        const dImgUrl = dImg ? getPublicUrl(dImg.storage_path) : null
        const dSize = SIZES.find(s => s.id === d.sizeId) || size
        const props = thumbProps(d, dImgUrl, dSize.w, dSize.h)
        const dataUrl = await renderAndCapture(DComp, props, dSize.w, dSize.h)
        zip.file(`${brandSlug}-${d.templateId}-${d.sizeId}-${i + 1}.png`, dataUrl.split(',')[1], { base64: true })
      }
      const blob = await zip.generateAsync({ type: 'blob' }); const link = document.createElement('a')
      link.download = `${brandSlug}-drafts-${Date.now()}.zip`; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
      setExportToast(`Downloaded ${savedDrafts.length} drafts`); setTimeout(() => setExportToast(null), 3000)
    } catch (err) { console.error('Export drafts failed:', err) }
    setExportingAll(false)
  }, [savedDrafts, images, size, brandSlug, getPublicUrl, thumbProps, renderAndCapture, setExportingAll, setExportToast])

  return { exportRef, exportPng, exportAllSizes, exportAllVariations, exportAllDrafts, renderAndCapture }
}
