'use client'
// Debounced autosave for the landing-page builder.
//
// Contract:
//   - Call on every render with the current document (blocks + pageSettings +
//     version). A deep stable signature is computed via JSON.stringify and
//     change detection is ref-based so we don't fire on initial mount.
//   - 800ms after the last change, PATCH /api/landing-pages/<id> with
//     { content }. Version increments client-side on successful save.
//   - Race guard: edits during an in-flight PATCH do NOT cancel it; instead
//     the hook re-enters 'dirty' after the PATCH resolves and a new timer
//     kicks off. Simple, safe, no stale writes overwriting fresh edits.
//   - Save-pill states: idle | dirty | saving | saved | error. 'saved'
//     auto-clears to 'idle' after 2s so the pill doesn't linger.
//   - beforeunload guard fires a synchronous fetch with keepalive when the
//     tab closes with pending work, so accidental refreshes don't lose
//     edits that haven't flushed yet.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LandingPageDocument } from '../types'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 800
const SAVED_HOLD_MS = 2000

export function useAutosave(
  pageId: string,
  doc: LandingPageDocument,
  enabled = true,
): { state: SaveState; retry: () => void; version: number } {
  const [state, setState] = useState<SaveState>('idle')
  const [version, setVersion] = useState<number>(doc.version)

  // Sig keeps a stable fingerprint of the last-saved content so we don't
  // re-save when a parent rerenders without real data changes.
  const lastSavedSigRef = useRef<string>(JSON.stringify({ blocks: doc.blocks, pageSettings: doc.pageSettings }))
  // Holds the most-recent doc so the PATCH always sees the latest values
  // (even if the ref was updated after the debounce fired).
  const docRef = useRef(doc)
  docRef.current = { ...doc, version }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)
  const hasInitialisedRef = useRef(false)

  const performSave = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setState('saving')

    const payloadDoc = { ...docRef.current }
    // Optimistically bump the version client-side. If the PATCH fails we'd
    // leave the in-memory version ahead of the DB — acceptable for v1,
    // beats the UI feeling frozen during a flaky network.
    payloadDoc.version = (payloadDoc.version ?? 1) + 1
    const sig = JSON.stringify({ blocks: payloadDoc.blocks, pageSettings: payloadDoc.pageSettings })

    try {
      const res = await fetch(`/api/landing-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payloadDoc }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      lastSavedSigRef.current = sig
      setVersion(payloadDoc.version)
      inFlightRef.current = false

      // If another edit landed while this request was in flight, the
      // current sig will differ from lastSavedSigRef — fall back to
      // 'dirty' and let the next effect kick another timer.
      const currentSig = JSON.stringify({
        blocks: docRef.current.blocks,
        pageSettings: docRef.current.pageSettings,
      })
      if (currentSig !== lastSavedSigRef.current) {
        setState('dirty')
      } else {
        setState('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setState('idle'), SAVED_HOLD_MS)
      }
    } catch (err) {
      console.error('[useAutosave] PATCH failed:', err instanceof Error ? err.message : err)
      inFlightRef.current = false
      setState('error')
    }
  }, [pageId])

  // Fire the debounced save on content change.
  useEffect(() => {
    if (!enabled) return
    const currentSig = JSON.stringify({ blocks: doc.blocks, pageSettings: doc.pageSettings })
    if (!hasInitialisedRef.current) {
      hasInitialisedRef.current = true
      lastSavedSigRef.current = currentSig
      return
    }
    if (currentSig === lastSavedSigRef.current) return

    setState('dirty')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void performSave()
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [doc.blocks, doc.pageSettings, enabled, performSave])

  // Unmount cleanup.
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  // beforeunload — synchronous best-effort flush when the tab closes
  // with unsaved work. Uses fetch(..., { keepalive: true }) which the
  // browser will let outlive the page.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const currentSig = JSON.stringify({
        blocks: docRef.current.blocks,
        pageSettings: docRef.current.pageSettings,
      })
      if (currentSig === lastSavedSigRef.current) return

      try {
        fetch(`/api/landing-pages/${pageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: { ...docRef.current, version: (docRef.current.version ?? 1) + 1 } }),
          keepalive: true,
        })
      } catch {
        // nothing to do — user is leaving
      }
      // Chrome ignores custom text in this message but still warns on
      // unsaved state when preventDefault is called.
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [pageId])

  const retry = useCallback(() => {
    if (state === 'error') void performSave()
  }, [state, performSave])

  return { state, retry, version }
}
