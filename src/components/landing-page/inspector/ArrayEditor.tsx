'use client'
// Generic list-of-objects editor. Each item renders its fields via the
// content-field registry so nothing here knows about benefit/stat/product/faq
// shape directly.
//
// Phase 3: read-only — mutations land in Phase 4. onAdd / onRemove are
// optional; when omitted, the buttons don't render. Field values pass through
// to TextInput / TextArea as `readOnly` so users can see the shape without
// autosave race risk.

import type { ReactNode } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { ContentField } from '../blocks/registry'
import { Field, TextArea, TextInput } from './primitives'

interface Props {
  title: string
  items: Array<Record<string, unknown>>
  itemShape: ContentField[]
  onAdd?: () => void
  onRemove?: (i: number) => void
  onUpdateItem?: (i: number, key: string, value: unknown) => void
  readOnly?: boolean
}
export function ArrayEditor({ title, items, itemShape, onAdd, onRemove, onUpdateItem, readOnly }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
        <div style={{
          fontFamily: font.mono, fontSize: fontSize.xs,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
        }}>{title}</div>
        {onAdd && !readOnly && <MiniBtn onClick={onAdd}>+ Add</MiniBtn>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {items.map((it, i) => (
          <div key={i} style={{
            padding: spacing[3], border: `1px solid ${colors.border}`, borderRadius: radius.md,
            background: colors.cream,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
              <div style={{
                fontFamily: font.mono, fontSize: fontSize['2xs'],
                letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
              }}>Item {i + 1}</div>
              {onRemove && !readOnly && <MiniBtn onClick={() => onRemove(i)} danger>Remove</MiniBtn>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {itemShape.map(f => {
                const v = (it[f.key] as string | undefined) ?? ''
                return (
                  <Field key={f.key} label={f.label}>
                    {f.type === 'textarea'
                      ? <TextArea value={v} rows={f.rows ?? 2} readOnly={readOnly} placeholder={f.placeholder}
                          onChange={onUpdateItem && !readOnly ? (nv => onUpdateItem(i, f.key, nv)) : undefined} />
                      : <TextInput value={v} readOnly={readOnly} placeholder={f.placeholder}
                          onChange={onUpdateItem && !readOnly ? (nv => onUpdateItem(i, f.key, nv)) : undefined} />
                    }
                  </Field>
                )
              })}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{
            padding: spacing[3], border: `1.5px dashed ${colors.border}`, borderRadius: radius.md,
            fontFamily: font.mono, fontSize: fontSize.xs, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: colors.subtle, textAlign: 'center',
          }}>Empty</div>
        )}
      </div>
    </div>
  )
}

function MiniBtn({ children, onClick, danger }: { children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: `3px ${spacing[2]}px`,
        background: colors.cream, border: `1px solid ${colors.border}`, borderRadius: radius.sm,
        fontSize: fontSize.xs, fontWeight: fontWeight.semibold, cursor: 'pointer',
        fontFamily: 'inherit', color: danger ? colors.danger : colors.ink,
      }}
    >{children}</button>
  )
}
