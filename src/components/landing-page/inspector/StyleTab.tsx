'use client'
// Universal style inspector. Reads variant list from
// BLOCK_REGISTRY[block.type].variants and renders the block's BlockStyle via
// the shared primitives. Every input is read-only in Phase 3 — real
// mutations wire up in Phase 4.

import { colors, font, fontSize, spacing } from '@/lib/design-tokens'
import type { AlignKey, BackgroundKey, Block, BlockStyle, PaddingKey, WidthKey } from '../types'
import { BLOCK_REGISTRY } from '../blocks/registry'
import { Field, PillGroup, SwatchGroup, TextInput, Toggle } from './primitives'

interface Props {
  block: Block
}

const PAD_OPTIONS: readonly PaddingKey[]  = ['none', 'sm', 'md', 'lg', 'xl']
const ALIGN_OPTIONS: readonly AlignKey[]  = ['left', 'center', 'right']
const WIDTH_OPTIONS: readonly WidthKey[]  = ['narrow', 'default', 'wide', 'full']

export function StyleTab({ block }: Props) {
  const config = BLOCK_REGISTRY[block.type]
  const style: BlockStyle = block.style ?? {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      <div style={{
        padding: `${spacing[2]}px ${spacing[3]}px`,
        border: `1px dashed ${colors.border}`, borderRadius: 8,
        fontFamily: font.mono, fontSize: fontSize.xs,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.subtle,
        background: colors.cream,
      }}>
        Editing lands in Phase 4
      </div>

      <Field label="Variant">
        <PillGroup
          options={config?.variants ?? []}
          value={block.variant}
          disabled
        />
      </Field>

      <Field label="Background">
        <SwatchGroup value={style.bg as BackgroundKey | undefined} disabled />
      </Field>

      <Field label="Padding">
        <PillGroup<PaddingKey>
          options={PAD_OPTIONS}
          value={style.pad}
          fallback="lg"
          disabled
        />
      </Field>

      <Field label="Alignment">
        <PillGroup<AlignKey>
          options={ALIGN_OPTIONS}
          value={style.align}
          fallback="left"
          disabled
        />
      </Field>

      <Field label="Container width">
        <PillGroup<WidthKey>
          options={WIDTH_OPTIONS}
          value={style.width}
          fallback="default"
          disabled
        />
      </Field>

      <Field label="Divider">
        <Toggle on={!!style.divider} disabled labelOn="Show divider above" labelOff="No divider" />
      </Field>

      <Field label="Anchor ID">
        <TextInput value={style.anchor ?? ''} placeholder="e.g. benefits" readOnly />
      </Field>

      <div style={{ borderTop: `1px solid ${colors.border}`, margin: `${spacing[2]}px 0 0` }} />
      <div style={{
        fontFamily: font.mono, fontSize: fontSize.xs,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
      }}>Advanced</div>
      <Field label="Custom CSS class">
        <TextInput value={style.cls ?? ''} placeholder="my-section" readOnly />
      </Field>
    </div>
  )
}
