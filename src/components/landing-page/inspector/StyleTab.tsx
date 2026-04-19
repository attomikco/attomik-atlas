'use client'
// Universal style inspector. Every control live-mutates via actions.*
// handlers. Variant change uses updateVariant; bg/pad/align/width/divider/
// anchor/cls merge into block.style via updateStyle.

import { colors, font, fontSize, spacing } from '@/lib/design-tokens'
import type { AlignKey, BackgroundKey, Block, BlockStyle, PaddingKey, WidthKey } from '../types'
import type { BuilderActions } from '../BuilderClient'
import { BLOCK_REGISTRY } from '../blocks/registry'
import { Field, PillGroup, SwatchGroup, TextInput, Toggle } from './primitives'

interface Props {
  block: Block
  actions: BuilderActions
}

const PAD_OPTIONS: readonly PaddingKey[] = ['none', 'sm', 'md', 'lg', 'xl']
const ALIGN_OPTIONS: readonly AlignKey[] = ['left', 'center', 'right']
const WIDTH_OPTIONS: readonly WidthKey[] = ['narrow', 'default', 'wide', 'full']

export function StyleTab({ block, actions }: Props) {
  const config = BLOCK_REGISTRY[block.type]
  const style: BlockStyle = block.style ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      <Field label="Variant">
        <PillGroup
          options={(config?.variants ?? []) as readonly string[]}
          value={block.variant}
          onChange={v => actions.updateVariant(block.id, v)}
        />
      </Field>

      <Field label="Background">
        <SwatchGroup
          value={style.bg as BackgroundKey | undefined}
          onChange={v => actions.updateStyle(block.id, { bg: v })}
        />
      </Field>

      <Field label="Padding">
        <PillGroup<PaddingKey>
          options={PAD_OPTIONS}
          value={style.pad}
          fallback="lg"
          onChange={v => actions.updateStyle(block.id, { pad: v })}
        />
      </Field>

      <Field label="Alignment">
        <PillGroup<AlignKey>
          options={ALIGN_OPTIONS}
          value={style.align}
          fallback="left"
          onChange={v => actions.updateStyle(block.id, { align: v })}
        />
      </Field>

      <Field label="Container width">
        <PillGroup<WidthKey>
          options={WIDTH_OPTIONS}
          value={style.width}
          fallback="default"
          onChange={v => actions.updateStyle(block.id, { width: v })}
        />
      </Field>

      <Field label="Divider">
        <Toggle
          on={!!style.divider}
          onChange={v => actions.updateStyle(block.id, { divider: v })}
          labelOn="Show divider above"
          labelOff="No divider"
        />
      </Field>

      <Field label="Anchor ID">
        <TextInput
          value={style.anchor ?? ''}
          placeholder="e.g. benefits"
          onChange={v => actions.updateStyle(block.id, { anchor: v })}
        />
      </Field>

      <div style={{ borderTop: `1px solid ${colors.border}`, margin: `${spacing[2]}px 0 0` }} />
      <div style={{
        fontFamily: font.mono, fontSize: fontSize.xs,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
      }}>Advanced</div>
      <Field label="Custom CSS class">
        <TextInput
          value={style.cls ?? ''}
          placeholder="my-section"
          onChange={v => actions.updateStyle(block.id, { cls: v })}
        />
      </Field>
    </div>
  )
}
