'use client'
// Registry-driven content inspector. Given a selected block, reads
// BLOCK_REGISTRY[block.type].contentFields and renders the matching input
// primitive per field. All inputs live-mutate the block via actions.updateData.

import Link from 'next/link'
import { colors, font, fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import type { BuilderActions } from '../BuilderClient'
import { BLOCK_REGISTRY, type ContentField } from '../blocks/registry'
import { Field, TextArea, TextInput } from './primitives'
import { ArrayEditor } from './ArrayEditor'

interface Props {
  block: Block
  actions: BuilderActions
}

export function ContentTab({ block, actions }: Props) {
  const config = BLOCK_REGISTRY[block.type]
  if (!config) {
    return <div style={{ fontSize: fontSize.caption, color: colors.muted }}>Unknown block type.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      {config.contentFields.map(field => (
        <FieldRenderer key={field.key} block={block} field={field} actions={actions} />
      ))}
    </div>
  )
}

function FieldRenderer({ block, field, actions }: { block: Block; field: ContentField; actions: BuilderActions }) {
  // Footer.cols — read-only preview + brand-hub link.
  if (field.type === 'array' && field.readOnly) {
    const items = (block.data[field.key] as Array<{ title?: string }> | undefined) ?? []
    return (
      <div>
        <Field label={field.label}>
          <div style={{
            padding: spacing[3], border: `1px solid ${colors.border}`, borderRadius: 8,
            background: colors.cream, fontSize: fontSize.caption, color: colors.muted,
          }}>
            {items.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
                {items.map((it, i) => (
                  <span key={i} style={{
                    background: colors.paper, border: `1px solid ${colors.border}`,
                    borderRadius: 999, padding: `2px ${spacing[2]}px`, color: colors.ink,
                    fontFamily: font.mono, fontSize: fontSize.xs,
                  }}>{it.title ?? '—'}</span>
                ))}
              </div>
            ) : 'No columns'}
          </div>
        </Field>
        <div style={{ marginTop: spacing[1], fontSize: fontSize.xs, color: colors.subtle }}>
          <Link href="/brand-hub" style={{ color: colors.accentDark, textDecoration: 'none' }}>
            Edit in brand hub →
          </Link>
        </div>
      </div>
    )
  }

  if (field.type === 'array') {
    const items = (block.data[field.key] as Array<Record<string, unknown>> | undefined) ?? []
    const shape = field.itemShape ?? []
    const emptyItem = () => {
      const item: Record<string, unknown> = {}
      for (const f of shape) item[f.key] = ''
      return item
    }
    return (
      <ArrayEditor
        title={field.label}
        items={items}
        itemShape={shape}
        onAdd={() => {
          actions.updateData(block.id, { [field.key]: [...items, emptyItem()] })
        }}
        onRemove={(i) => {
          const next = items.slice()
          next.splice(i, 1)
          actions.updateData(block.id, { [field.key]: next })
        }}
        onUpdateItem={(i, key, value) => {
          const next = items.slice()
          next[i] = { ...next[i], [key]: value }
          actions.updateData(block.id, { [field.key]: next })
        }}
      />
    )
  }

  const value = (block.data[field.key] as string | undefined) ?? ''
  const handleChange = (nv: string) => actions.updateData(block.id, { [field.key]: nv })
  return (
    <Field label={field.label}>
      {field.type === 'textarea'
        ? <TextArea value={value} rows={field.rows ?? 3} onChange={handleChange} placeholder={field.placeholder} />
        : <TextInput value={value} onChange={handleChange} placeholder={field.placeholder} />
      }
    </Field>
  )
}
