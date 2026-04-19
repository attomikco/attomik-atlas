'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { colors } from '@/lib/design-tokens'
import type { LandingPage } from '@/types'
import type { Block, LandingPageDocument, PageSettings } from './types'
import { CampaignModeBar } from '@/components/ui/CampaignModeBar'
import { TopBar } from './TopBar'
import { LeftRail, type LeftTab } from './LeftRail'
import { Canvas } from './Canvas'
import { CanvasFooter } from './CanvasFooter'
import { Inspector } from './Inspector'

type Device = 'desktop' | 'tablet' | 'mobile'
type Mode = 'edit' | 'preview'
type SaveState = 'saved' | 'dirty' | 'saving'

interface Props {
  brandId: string
  initialLandingPage: LandingPage
}

type UiState = {
  selectedId: string | null
  leftTab: LeftTab
  device: Device
  zoom: number
  mode: Mode
}

const DEFAULT_UI: UiState = {
  selectedId: null,
  leftTab: 'blocks',
  device: 'desktop',
  zoom: 100,
  mode: 'edit',
}

// Phase 2: state scaffolding + layout shell. No autosave, no mutations,
// no drag-and-drop. The document blocks/pageSettings are read from the
// initial row and held in state; state changes update the save pill via
// a stub transition (dirty → saving → saved) but do NOT persist to DB.
// Real useAutosave lands in Phase 4.
export default function BuilderClient({ brandId, initialLandingPage }: Props) {
  const router = useRouter()
  const pageId = initialLandingPage.id
  const storageKey = `lpb_state:${brandId}:${pageId}`

  // Unpack initial document. initialLandingPage.content is typed as unknown
  // at the DB boundary; cast here now that the row is known to exist.
  const initialDoc = initialLandingPage.content as LandingPageDocument
  const [blocks] = useState<Block[]>(initialDoc.blocks)
  const [pageSettings] = useState<PageSettings>(initialDoc.pageSettings)
  const version = initialDoc.version ?? 1

  // UI state — hydrated from localStorage on mount, defaults otherwise.
  const [ui, setUi] = useState<UiState>(DEFAULT_UI)
  const hydrated = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UiState>
        setUi(prev => ({ ...prev, ...parsed }))
      }
    } catch { /* swallow — corrupt localStorage shouldn't brick the page */ }
    hydrated.current = true
  }, [storageKey])

  // Persist UI state as it changes. Guard the first mount so we don't
  // overwrite localStorage with defaults before hydration runs.
  useEffect(() => {
    if (!hydrated.current) return
    try { localStorage.setItem(storageKey, JSON.stringify(ui)) } catch { /* ignore */ }
  }, [storageKey, ui])

  const selectedBlock = useMemo(
    () => blocks.find(b => b.id === ui.selectedId) ?? null,
    [blocks, ui.selectedId],
  )

  // Save-pill stub. Any UI mutation path that's wired to "content" changes
  // in later phases will call dirty(). For Phase 2 we expose it and wire
  // it to the state-setters below so the pill at least animates on device
  // / tab / zoom changes (visual confirmation the chrome works).
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const saveTimers = useRef<{ a?: ReturnType<typeof setTimeout>; b?: ReturnType<typeof setTimeout> }>({})
  const markDirty = () => {
    if (saveTimers.current.a) clearTimeout(saveTimers.current.a)
    if (saveTimers.current.b) clearTimeout(saveTimers.current.b)
    setSaveState('dirty')
    saveTimers.current.a = setTimeout(() => setSaveState('saving'), 400)
    saveTimers.current.b = setTimeout(() => setSaveState('saved'), 1000)
  }
  useEffect(() => () => {
    if (saveTimers.current.a) clearTimeout(saveTimers.current.a)
    if (saveTimers.current.b) clearTimeout(saveTimers.current.b)
  }, [])

  // Setter helpers. Each update marks the pill dirty → saving → saved.
  // Selection changes don't trigger the pill; they're UI-only.
  const patchUi = (p: Partial<UiState>, markPill = true) => {
    setUi(prev => ({ ...prev, ...p }))
    if (markPill) markDirty()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0, background: colors.paper }}>
      <TopBar
        pageSettings={pageSettings}
        device={ui.device}
        onDevice={d => patchUi({ device: d })}
        mode={ui.mode}
        onMode={m => patchUi({ mode: m })}
        saveState={saveState}
        onBack={() => router.push('/dashboard')}
      />
      <CampaignModeBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <LeftRail tab={ui.leftTab} onTab={t => patchUi({ leftTab: t })} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <Canvas
            blocks={blocks}
            selectedId={ui.selectedId}
            onSelect={id => patchUi({ selectedId: id }, false)}
            device={ui.device}
            zoom={ui.zoom}
          />
          <CanvasFooter
            blockCount={blocks.length}
            device={ui.device}
            zoom={ui.zoom}
            onZoom={z => patchUi({ zoom: z })}
            version={version}
          />
        </div>
        {ui.mode === 'edit' && <Inspector block={selectedBlock} />}
      </div>
    </div>
  )
}
