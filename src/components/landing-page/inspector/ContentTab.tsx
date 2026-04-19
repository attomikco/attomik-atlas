'use client'
// Registry-driven content inspector. Given a selected block, reads
// BLOCK_REGISTRY[block.type].contentFields and renders the matching input
// primitive per field.
//
// Phase 3: READ-ONLY. All inputs accept value but no onChange — editing
// lands in Phase 4 once autosave + block mutations are wired. A small
// caption at the top flags the status.

import Link from 'next/link'
import { colors, font, fontSize, spacing } from '@/lib/design-tokens'
import type { Block } from '../types'
import { BLOCK_REGISTRY, type ContentField } from '../blocks/registry'
import { Field, TextArea, TextInput } from './primitives'
import { ArrayEditor } from './ArrayEditor'

interface Props {
  block: Block
}

export function ContentTab({ block }: Props) {
  const config = BLOCK_REGISTRY[block.type]
  if (!config) {
    return <div style={{ fontSize: fontSize.caption, color: colors.muted }}>Unknown block type.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      <PhaseNotice />
      {config.contentFields.map(field => (
        <FieldRenderer key={field.key} block={block} field={field} />
      ))}
    </div>
  )
}

function FieldRenderer({ block, field }: { block: Block; field: ContentField }) {
  // Footer.cols edge case — read-only preview + brand-hub link.
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
    return (
      <ArrayEditor
        title={field.label}
        items={items}
        itemShape={field.itemShape ?? []}
        readOnly
      />
    )
  }

  const value = (block.data[field.key] as string | undefined) ?? ''
  return (
    <Field label={field.label}>
      {field.type === 'textarea'
        ? <TextArea value={value} rows={field.rows ?? 3} readOnly placeholder={field.placeholder} />
        : <TextInput value={value} readOnly placeholder={field.placeholder} />
      }
    </Field>
  )
}

function PhaseNotice() {
  return (
    <div style={{
      padding: `${spacing[2]}px ${spacing[3]}px`,
      border: `1px dashed ${colors.border}`, borderRadius: 8,
      fontFamily: font.mono, fontSize: fontSize.xs,
      letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.subtle,
      background: colors.cream,
    }}>
      Editing lands in Phase 4
    </div>
  )
}
