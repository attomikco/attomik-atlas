'use client'
// Shared inspector primitives — used by ContentTab, StyleTab, and any panel
// that wants the same visual vocabulary. Kept token-only; no hardcoded hex.

import type { ReactNode } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: font.mono, fontSize: fontSize.xs,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
        marginBottom: spacing[1],
      }}>{label}</div>
      {children}
    </label>
  )
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: `${spacing[2]}px ${spacing[2]}px`,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  fontSize: fontSize.body,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  color: colors.ink,
  background: colors.paper,
}

interface TextInputProps {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
}
export function TextInput({ value, onChange, placeholder, disabled, readOnly }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      style={{ ...inputStyle, opacity: disabled ? 0.55 : 1 }}
    />
  )
}

interface TextAreaProps {
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  readOnly?: boolean
}
export function TextArea({ value, onChange, placeholder, rows = 3, disabled, readOnly }: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      readOnly={readOnly}
      style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, opacity: disabled ? 0.55 : 1 }}
    />
  )
}

interface PillGroupProps<T extends string> {
  options: readonly T[]
  value: T | undefined
  onChange?: (v: T) => void
  disabled?: boolean
  // Which option shows as active when `value` is undefined. Used by style
  // pills where a bare block falls back to a sensible default (e.g. 'lg' for
  // padding, 'default' for width).
  fallback?: T
}
export function PillGroup<T extends string>({ options, value, onChange, disabled, fallback }: PillGroupProps<T>) {
  const effective = value ?? fallback
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: spacing[1] }}>
      {options.map(o => {
        const active = o === effective
        return (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange?.(o)}
            style={{
              padding: `${spacing[2]}px ${spacing[2]}px`,
              border: `1px solid ${active ? colors.ink : colors.border}`,
              background: active ? colors.ink : colors.paper,
              color: active ? colors.paper : colors.ink,
              borderRadius: radius.sm,
              fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
              cursor: disabled ? 'not-allowed' : 'pointer',
              textTransform: 'capitalize', fontFamily: 'inherit',
              opacity: disabled ? 0.55 : 1,
            }}
          >{o}</button>
        )
      })}
    </div>
  )
}

type BgKey = 'paper' | 'cream' | 'ink' | 'accent' | 'custom'
const BG_SAMPLE: Record<BgKey, string> = {
  paper: colors.paper,
  cream: colors.cream,
  ink: colors.ink,
  accent: colors.accent,
  custom: colors.paper,  // placeholder fill; Phase 6 swaps in a picker
}
const BG_LABEL_INK: Record<BgKey, string> = {
  paper: colors.ink,
  cream: colors.ink,
  ink: colors.paper,
  accent: colors.ink,
  custom: colors.ink,
}

interface SwatchGroupProps {
  value: BgKey | undefined
  onChange?: (v: BgKey) => void
  disabled?: boolean
  // In v1 the "custom" swatch is disabled (Phase 6 will ship a ColorPicker
  // that backs it). We render it greyed + title="Coming soon" so the slot
  // is visible but not clickable.
  customDisabled?: boolean
}
export function SwatchGroup({ value, onChange, disabled, customDisabled = true }: SwatchGroupProps) {
  const keys: BgKey[] = ['paper', 'cream', 'ink', 'accent', 'custom']
  return (
    <div style={{ display: 'flex', gap: spacing[1], flexWrap: 'wrap' }}>
      {keys.map(k => {
        const active = k === value
        const thisDisabled = disabled || (customDisabled && k === 'custom')
        return (
          <button
            key={k}
            type="button"
            disabled={thisDisabled}
            title={thisDisabled && k === 'custom' ? 'Coming soon' : k}
            onClick={() => !thisDisabled && onChange?.(k)}
            style={{
              flex: '0 0 calc(33% - 4px)', height: 40,
              borderRadius: radius.sm,
              cursor: thisDisabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: BG_SAMPLE[k],
              color: BG_LABEL_INK[k],
              border: active ? `2px solid ${colors.accentDark}` : `1px solid ${colors.border}`,
              opacity: thisDisabled ? 0.5 : 1,
              fontSize: fontSize.xs, fontWeight: fontWeight.bold,
              textTransform: 'capitalize', fontFamily: 'inherit',
            }}
          >{k}</button>
        )
      })}
    </div>
  )
}

interface ToggleProps {
  on: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  labelOn?: string
  labelOff?: string
}
export function Toggle({ on, onChange, disabled, labelOn = 'On', labelOff = 'Off' }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!on)}
      style={{
        display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-start',
        padding: `${spacing[2]}px ${spacing[3]}px`, border: 'none',
        borderRadius: radius.pill,
        background: on ? colors.ink : colors.cream,
        color: on ? colors.accent : colors.ink,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1, fontFamily: 'inherit',
      }}
    >
      <span style={{
        width: 12, height: 12, borderRadius: radius.pill,
        background: on ? colors.accent : colors.paper,
        marginRight: spacing[2], boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }} />
      <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>{on ? labelOn : labelOff}</span>
    </button>
  )
}

interface IcnBtnProps {
  children: ReactNode
  onClick?: () => void
  title?: string
  disabled?: boolean
  danger?: boolean
}
export function IcnBtn({ children, onClick, title, disabled, danger }: IcnBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 30, height: 30,
        border: `1px solid ${colors.border}`, background: colors.paper,
        borderRadius: radius.sm, cursor: disabled ? 'not-allowed' : 'pointer',
        color: danger ? colors.danger : colors.ink,
        fontSize: fontSize.body,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >{children}</button>
  )
}
