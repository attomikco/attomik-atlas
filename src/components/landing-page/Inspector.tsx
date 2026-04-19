'use client'
import { useState } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from './types'
import type { BuilderActions } from './BuilderClient'
import { BLOCK_REGISTRY } from './blocks/registry'
import { ContentTab } from './inspector/ContentTab'
import { StyleTab } from './inspector/StyleTab'
import { IcnBtn } from './inspector/primitives'

type Tab = 'content' | 'style' | 'ai'

interface Props {
  block: Block | null
  actions: BuilderActions
}

export function Inspector({ block, actions }: Props) {
  const [tab, setTab] = useState<Tab>('content')

  if (!block) {
    return (
      <div style={{ ...rootStyle, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: spacing[10] }}>
        <div style={{ color: colors.disabled }}>
          <div style={{ fontSize: 36, marginBottom: spacing[3] }}>◌</div>
          <div style={{
            fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.body,
            textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.ink,
            marginBottom: spacing[1],
          }}>No block selected</div>
          <div style={{ fontSize: fontSize.caption, color: colors.subtle, maxWidth: 200, margin: '0 auto', lineHeight: 1.5 }}>
            Click any block on the canvas to edit.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={rootStyle}>
      <div style={{
        padding: `${spacing[3]}px ${spacing[4]}px`,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing[2],
      }}>
        <div>
          <div style={{
            fontFamily: font.mono, fontSize: fontSize.caption,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.muted,
            marginBottom: 3,
          }}>Selected block</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <div style={glyphTileStyle}>{BLOCK_REGISTRY[block.type]?.glyph ?? block.type[0].toUpperCase()}</div>
            <div>
              <div style={{
                fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
                textTransform: 'uppercase', color: colors.ink,
              }}>{BLOCK_REGISTRY[block.type]?.label ?? block.type}</div>
              <div style={{
                fontFamily: font.mono, fontSize: fontSize.caption,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.subtle,
              }}>{block.variant}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <IcnBtn
            title={block.visible ? 'Hide on page' : 'Show on page'}
            onClick={() => actions.toggleVisible(block.id)}
          >{block.visible ? '◉' : '◎'}</IcnBtn>
          <IcnBtn title="Duplicate" onClick={() => actions.duplicate(block.id)}>⎘</IcnBtn>
          <IcnBtn title="Delete" onClick={() => actions.removeBlock(block.id)} danger>×</IcnBtn>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 4,
        padding: `${spacing[2]}px ${spacing[2]}px 0`,
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {(['content', 'style', 'ai'] as Tab[]).map(t => {
          const active = t === tab
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, background: 'transparent', border: 'none',
              padding: `${spacing[2]}px ${spacing[2]}px`,
              fontFamily: font.mono, fontSize: fontSize.caption,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: active ? colors.ink : colors.subtle,
              cursor: 'pointer',
              borderBottom: `2px solid ${active ? colors.accent : 'transparent'}`,
            }}>
              {t === 'ai' ? '✦ AI' : t}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: `${spacing[4]}px ${spacing[4]}px ${spacing[6]}px` }}>
        {tab === 'content' && <ContentTab block={block} actions={actions} />}
        {tab === 'style' && <StyleTab block={block} actions={actions} />}
        {tab === 'ai' && <AiStub />}
      </div>
    </div>
  )
}

// AI tab still stubbed — Phase 5.
function AiStub() {
  return (
    <div style={{
      padding: spacing[4], textAlign: 'center',
      border: `1.5px dashed ${colors.border}`, borderRadius: radius.md,
    }}>
      <div style={{
        fontFamily: font.mono, fontSize: fontSize.caption,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.subtle,
        marginBottom: spacing[2],
      }}>Rewrite this block with AI</div>
      <div style={{
        fontFamily: font.mono, fontSize: fontSize.caption,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: colors.ink,
        fontWeight: fontWeight.bold,
      }}>Lands in Phase 5</div>
    </div>
  )
}

const rootStyle: React.CSSProperties = {
  width: 320, flexShrink: 0,
  background: colors.paper, borderLeft: `1px solid ${colors.border}`,
  display: 'flex', flexDirection: 'column', height: '100%',
}

const glyphTileStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: radius.md,
  background: colors.ink, color: colors.accent,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.body,
}
