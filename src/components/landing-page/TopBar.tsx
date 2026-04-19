'use client'
import { useState } from 'react'
import { colors, font, fontSize, fontWeight, letterSpacing, radius, spacing, transition, zIndex } from '@/lib/design-tokens'
import type { PageSettings } from './types'
import type { SaveState } from './lib/useAutosave'

type Device = 'desktop' | 'tablet' | 'mobile'
type Mode = 'edit' | 'preview'

interface Props {
  pageSettings: PageSettings
  device: Device
  onDevice: (d: Device) => void
  mode: Mode
  onMode: (m: Mode) => void
  saveState: SaveState
  onRetrySave?: () => void
  onBack: () => void
  onRegenerate: () => Promise<void>
  regenerating: boolean
}

// Phase 5: Regenerate wired behind a confirm. Export HTML / Publish still
// deferred (Phase 7) — rendered as disabled ghost buttons with
// title="Coming soon".
export function TopBar({
  pageSettings, device, onDevice, mode, onMode,
  saveState, onRetrySave, onBack,
  onRegenerate, regenerating,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleRegenerateConfirm = async () => {
    setConfirmOpen(false)
    await onRegenerate()
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing[2]}px ${spacing[5]}px`,
      background: colors.paper,
      borderBottom: `1px solid ${colors.border}`,
      gap: spacing[4],
      flexShrink: 0,
    }}>
      {/* Left: back + title + save pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], minWidth: 0, flex: 1 }}>
        <button onClick={onBack} title="Back" style={{
          width: 34, height: 34, background: colors.cream, border: `1px solid ${colors.border}`,
          borderRadius: radius.md, cursor: 'pointer', fontSize: fontSize.body,
          color: colors.ink, flexShrink: 0,
        }}>←</button>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption, color: colors.muted,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>Landing Page</div>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.md,
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420,
          }}>{pageSettings.title || 'Untitled page'}</div>
        </div>
        <SavePill state={saveState} onRetry={onRetrySave} />
      </div>

      {/* Center: device toggle */}
      <DeviceGroup device={device} onDevice={onDevice} />

      {/* Right: mode toggle + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <ModeGroup mode={mode} onMode={onMode} />
        <GhostBtn
          disabled={regenerating}
          onClick={() => setConfirmOpen(true)}
          title={regenerating ? 'Generating…' : 'Regenerate whole page with AI'}
        >{regenerating ? 'Generating…' : '✦ Regenerate page'}</GhostBtn>
        <GhostBtn disabled title="Coming soon">Export HTML</GhostBtn>
        <button disabled title="Coming soon" style={{
          padding: `${spacing[2]}px ${spacing[4]}px`,
          background: colors.ink, color: colors.accent, border: 'none',
          borderRadius: radius.md, fontFamily: font.heading, fontWeight: fontWeight.bold,
          fontSize: fontSize.body, letterSpacing: '0.04em', textTransform: 'uppercase',
          opacity: 0.5, cursor: 'not-allowed',
        }}>Publish →</button>
      </div>

      {confirmOpen && (
        <ConfirmDialog
          title="Regenerate page?"
          body="This will replace all current blocks with freshly generated content. Your edits will be lost."
          cancelLabel="Cancel"
          confirmLabel="Regenerate"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void handleRegenerateConfirm()}
        />
      )}
    </div>
  )
}

// Minimal inline confirm dialog. Backdrop + centered card + two buttons.
// No reusable Modal component exists in this repo yet; building a full
// modal system just for this would be overkill.
function ConfirmDialog({
  title, body, cancelLabel, confirmLabel, onCancel, onConfirm,
}: {
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: zIndex.modal,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.paper, borderRadius: radius.lg,
          padding: spacing[5],
          maxWidth: 440, width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{
          fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['3xl'],
          textTransform: 'uppercase', letterSpacing: letterSpacing.slight,
          color: colors.ink, marginBottom: spacing[3],
        }}>{title}</div>
        <div style={{ fontSize: fontSize.body, lineHeight: 1.5, color: colors.muted, marginBottom: spacing[5] }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            style={{
              padding: `${spacing[2]}px ${spacing[4]}px`,
              background: colors.paper, border: `1px solid ${colors.border}`,
              borderRadius: radius.md, cursor: 'pointer',
              fontSize: fontSize.body, fontWeight: fontWeight.medium,
              color: colors.ink, fontFamily: 'inherit',
            }}
          >{cancelLabel}</button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: `${spacing[2]}px ${spacing[4]}px`,
              background: colors.ink, color: colors.accent,
              border: 'none', borderRadius: radius.md, cursor: 'pointer',
              fontFamily: font.heading, fontWeight: fontWeight.extrabold,
              fontSize: fontSize.body, letterSpacing: letterSpacing.label,
              textTransform: 'uppercase',
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function SavePill({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  // idle renders a subtle ambient indicator — low-emphasis, always visible
  // so the user knows autosave is working without a flashing pill chrome.
  if (state === 'idle') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing[1],
        fontSize: fontSize.xs, fontFamily: font.mono,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.subtle,
        flexShrink: 0,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: radius.pill,
          background: colors.success, opacity: 0.5,
        }} />
        <span>All changes saved</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        style={{
          display: 'flex', alignItems: 'center', gap: spacing[1],
          padding: `4px ${spacing[2]}px`,
          background: colors.dangerLight, border: `1px solid ${colors.danger}`,
          borderRadius: radius.pill,
          fontSize: fontSize.caption, fontFamily: font.mono,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.danger,
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: radius.pill, background: colors.danger }} />
        <span>Save failed — retry</span>
      </button>
    )
  }

  const dot = state === 'saved' ? colors.success : state === 'saving' ? colors.warning : colors.danger
  const label = state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving…' : 'Unsaved changes'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: spacing[1],
      padding: `4px ${spacing[2]}px`, background: colors.cream, borderRadius: radius.pill,
      fontSize: fontSize.caption, fontFamily: font.mono,
      letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.muted,
      flexShrink: 0,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: radius.pill, background: dot }} />
      <span>{label}</span>
    </div>
  )
}

function DeviceGroup({ device, onDevice }: { device: Device; onDevice: (d: Device) => void }) {
  const items: Array<[Device, string]> = [['desktop', '▭'], ['tablet', '▯'], ['mobile', '▫']]
  return (
    <div style={{ display: 'flex', background: colors.cream, padding: 3, borderRadius: radius.md, gap: 2 }}>
      {items.map(([d, glyph]) => {
        const active = d === device
        return (
          <button key={d} onClick={() => onDevice(d)} title={d} style={{
            display: 'flex', alignItems: 'center', gap: spacing[1],
            padding: `${spacing[1]}px ${spacing[3]}px`, border: 'none', borderRadius: radius.md,
            cursor: 'pointer', fontFamily: 'inherit',
            background: active ? colors.ink : 'transparent',
            color: active ? colors.accent : colors.muted,
            transition: `background ${transition.base}, color ${transition.base}`,
          }}>
            <span style={{ fontSize: fontSize.md, fontFamily: font.heading, fontWeight: fontWeight.heading }}>{glyph}</span>
            <span style={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, textTransform: 'capitalize' }}>{d}</span>
          </button>
        )
      })}
    </div>
  )
}

function ModeGroup({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  const items: Array<[Mode, string]> = [['edit', '✎ Edit'], ['preview', '◉ Preview']]
  return (
    <div style={{ display: 'flex', background: colors.cream, padding: 3, borderRadius: radius.md, gap: 2 }}>
      {items.map(([m, label]) => {
        const active = m === mode
        return (
          <button key={m} onClick={() => onMode(m)} style={{
            padding: `${spacing[1]}px ${spacing[3]}px`, border: 'none', borderRadius: radius.md,
            background: active ? colors.paper : 'transparent',
            color: active ? colors.ink : colors.muted,
            cursor: 'pointer', fontSize: fontSize.body, fontWeight: fontWeight.bold,
            fontFamily: 'inherit',
            boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
          }}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

function GhostBtn({
  children, disabled, title, onClick,
}: { children: React.ReactNode; disabled?: boolean; title?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      style={{
        padding: `${spacing[2]}px ${spacing[3]}px`, background: colors.paper,
        border: `1px solid ${colors.border}`, borderRadius: radius.md,
        fontSize: fontSize.body, fontWeight: fontWeight.medium, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', color: colors.ink,
        opacity: disabled ? 0.5 : 1,
      }}
    >{children}</button>
  )
}
