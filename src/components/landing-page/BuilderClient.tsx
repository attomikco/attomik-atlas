'use client'
// Top-level builder shell. Owns blocks/pageSettings state, wires every
// mutation helper to setBlocks, and drives autosave via useAutosave.
// Prop-drills the mutation surface to Canvas / LeftRail / Inspector;
// at ~3 consumers there's no case for a context yet.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { colors } from '@/lib/design-tokens'
import type { LandingPage } from '@/types'
import type { Block, BlockStyle, BlockType, LandingPageDocument, PageSettings } from './types'
import { CampaignModeBar } from '@/components/ui/CampaignModeBar'
import { TopBar } from './TopBar'
import { LeftRail, type LeftTab } from './LeftRail'
import { Canvas } from './Canvas'
import { CanvasFooter } from './CanvasFooter'
import { Inspector } from './Inspector'
import {
  addBlock,
  deleteBlock,
  duplicateBlock,
  reorderBlocks,
  toggleVisible,
  updateBlockData,
  updateBlockStyle,
  updateBlockVariant,
} from './lib/mutations'
import { useAutosave } from './lib/useAutosave'

type Device = 'desktop' | 'tablet' | 'mobile'
type Mode = 'edit' | 'preview'

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

// The mutation surface every subtree consumes. One object = fewer props to
// wire through Inspector / OutlinePanel / BlocksPanel / Canvas. Named verbs
// map 1:1 to lib/mutations.ts functions so the handler flow reads cleanly.
export interface BuilderActions {
  appendBlock: (type: BlockType) => void
  // When a library drag lands on an InsertZone we want the new block
  // selected so the user can tweak it immediately (drop-to-edit UX).
  // When the user clicks an empty InsertZone to spawn a richtext stub
  // we specifically DON'T want to yank selection — the user was
  // navigating between existing blocks. `select` controls both paths.
  insertBlock: (type: BlockType, index: number, opts?: { select?: boolean }) => void
  removeBlock: (id: string) => void
  duplicate: (id: string) => void
  toggleVisible: (id: string) => void
  updateData: (id: string, patch: Partial<Block['data']>) => void
  updateStyle: (id: string, patch: Partial<BlockStyle>) => void
  updateVariant: (id: string, variant: string) => void
  reorder: (from: number, to: number) => void
  select: (id: string | null) => void
  setBlocks: (blocks: Block[]) => void
  setPageSettings: (settings: PageSettings) => void
}

export default function BuilderClient({ brandId, initialLandingPage }: Props) {
  const router = useRouter()
  const pageId = initialLandingPage.id
  const storageKey = `lpb_state:${brandId}:${pageId}`

  const initialDoc = initialLandingPage.content as LandingPageDocument
  const [blocks, setBlocks] = useState<Block[]>(initialDoc.blocks)
  const [pageSettings, setPageSettings] = useState<PageSettings>(initialDoc.pageSettings)

  const [ui, setUi] = useState<UiState>(DEFAULT_UI)
  const hydrated = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UiState>
        setUi(prev => ({ ...prev, ...parsed }))
      }
    } catch { /* corrupt LS shouldn't brick the page */ }
    hydrated.current = true
  }, [storageKey])
  useEffect(() => {
    if (!hydrated.current) return
    try { localStorage.setItem(storageKey, JSON.stringify(ui)) } catch { /* ignore */ }
  }, [storageKey, ui])

  const patchUi = useCallback((p: Partial<UiState>) => {
    setUi(prev => ({ ...prev, ...p }))
  }, [])

  const selectedBlock = useMemo(
    () => blocks.find(b => b.id === ui.selectedId) ?? null,
    [blocks, ui.selectedId],
  )

  // ── Mutation handlers ───────────────────────────────────────────────
  // Each wraps the pure function from lib/mutations + updates selection
  // where user expectation calls for it (appending / inserting auto-selects
  // the new block; deleting clears selection).
  const actions: BuilderActions = useMemo(() => ({
    appendBlock: (type) => {
      setBlocks(prev => {
        const next = addBlock(prev, type)
        const newly = next[next.length - 1]
        if (newly) setUi(u => ({ ...u, selectedId: newly.id }))
        return next
      })
    },
    insertBlock: (type, index, opts) => {
      const select = opts?.select ?? true
      setBlocks(prev => {
        const next = addBlock(prev, type, index)
        if (select) {
          const inserted = next[Math.max(0, Math.min(index, next.length - 1))]
          if (inserted) setUi(u => ({ ...u, selectedId: inserted.id }))
        }
        return next
      })
    },
    removeBlock: (id) => {
      setBlocks(prev => deleteBlock(prev, id))
      setUi(u => (u.selectedId === id ? { ...u, selectedId: null } : u))
    },
    duplicate: (id) => {
      setBlocks(prev => {
        const next = duplicateBlock(prev, id)
        const i = next.findIndex(b => b.id === id)
        const clone = i >= 0 ? next[i + 1] : undefined
        if (clone) setUi(u => ({ ...u, selectedId: clone.id }))
        return next
      })
    },
    toggleVisible: (id) => {
      setBlocks(prev => toggleVisible(prev, id))
    },
    updateData: (id, patch) => {
      setBlocks(prev => updateBlockData(prev, id, patch))
    },
    updateStyle: (id, patch) => {
      setBlocks(prev => updateBlockStyle(prev, id, patch))
    },
    updateVariant: (id, variant) => {
      setBlocks(prev => updateBlockVariant(prev, id, variant))
    },
    reorder: (from, to) => {
      setBlocks(prev => reorderBlocks(prev, from, to))
    },
    select: (id) => setUi(u => ({ ...u, selectedId: id })),
    setBlocks: (next) => setBlocks(next),
    setPageSettings: (next) => setPageSettings(next),
  }), [])

  // ── Autosave ───────────────────────────────────────────────────────
  const liveDoc: LandingPageDocument = useMemo(
    () => ({ blocks, pageSettings, version: initialDoc.version ?? 1 }),
    [blocks, pageSettings, initialDoc.version],
  )
  const { state: saveState, retry: retrySave, version } = useAutosave(pageId, liveDoc, true)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: 0, background: colors.paper }}>
      <TopBar
        pageSettings={pageSettings}
        device={ui.device}
        onDevice={d => patchUi({ device: d })}
        mode={ui.mode}
        onMode={m => patchUi({ mode: m })}
        saveState={saveState}
        onRetrySave={retrySave}
        onBack={() => router.push('/dashboard')}
      />
      <CampaignModeBar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <LeftRail
          tab={ui.leftTab}
          onTab={t => patchUi({ leftTab: t })}
          blocks={blocks}
          selectedId={ui.selectedId}
          actions={actions}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <Canvas
            blocks={blocks}
            selectedId={ui.selectedId}
            onSelect={actions.select}
            onInsertAt={actions.insertBlock}
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
        {ui.mode === 'edit' && <Inspector block={selectedBlock} actions={actions} />}
      </div>
    </div>
  )
}
