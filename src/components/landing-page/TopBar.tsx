'use client'
import { colors, font, fontSize, fontWeight, radius, spacing, transition } from '@/lib/design-tokens'
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
}

// Phase 2: device/mode toggles wired; AI / Export / Publish are placeholders
// (disabled, title="Coming soon"). Real behavior lands in Phase 5 + 7.
export function TopBar({ pageSettings, device, onDevice, mode, onMode, saveState, onRetrySave, onBack }: Props) {
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

      {/* Right: mode toggle + disabled actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <ModeGroup mode={mode} onMode={onMode} />
        <GhostBtn disabled title="Coming soon">✦ Regenerate page</GhostBtn>
        <GhostBtn disabled title="Coming soon">Export HTML</GhostBtn>
        <button disabled title="Coming soon" style={{
          padding: `${spacing[2]}px ${spacing[4]}px`,
          background: colors.ink, color: colors.accent, border: 'none',
          borderRadius: radius.md, fontFamily: font.heading, fontWeight: fontWeight.bold,
          fontSize: fontSize.body, letterSpacing: '0.04em', textTransform: 'uppercase',
          opacity: 0.5, cursor: 'not-allowed',
        }}>Publish →</button>
      </div>
    </div>
  )
}

function SavePill({ state, onRetry }: { state: SaveState; onRetry?: () => void }) {
  // idle renders nothing — avoids a stale "Saved" label lingering past the
  // 2s hold window in useAutosave.
  if (state === 'idle') return null

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

function GhostBtn({ children, disabled, title }: { children: React.ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button disabled={disabled} title={title} style={{
      padding: `${spacing[2]}px ${spacing[3]}px`, background: colors.paper,
      border: `1px solid ${colors.border}`, borderRadius: radius.md,
      fontSize: fontSize.body, fontWeight: fontWeight.medium, cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit', color: colors.ink,
      opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  )
}
