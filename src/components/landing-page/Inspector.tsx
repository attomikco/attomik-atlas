'use client'
import { useState } from 'react'
import { colors, font, fontSize, fontWeight, radius, spacing } from '@/lib/design-tokens'
import type { Block } from './types'
import { BLOCK_REGISTRY } from './blocks/registry'
import { ContentTab } from './inspector/ContentTab'
import { StyleTab } from './inspector/StyleTab'

type Tab = 'content' | 'style' | 'ai'

interface Props {
  block: Block | null
}

// Phase 2: 320px right rail. Header block + 3-tab switcher. Tab bodies are
// placeholders for the real Content / Style / ✦ AI implementations landing
// in Phases 3 and 5. Actions (visibility / duplicate / delete) render
// disabled until Phase 4 wires them.
export function Inspector({ block }: Props) {
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
      {/* Header: glyph + label + variant + action buttons */}
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
          <IcnBtn disabled title="Coming soon">◉</IcnBtn>
          <IcnBtn disabled title="Coming soon">⎘</IcnBtn>
          <IcnBtn disabled title="Coming soon" danger>×</IcnBtn>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Tab body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${spacing[4]}px ${spacing[4]}px ${spacing[6]}px` }}>
        {tab === 'content' && <ContentTab block={block} />}
        {tab === 'style' && <StyleTab block={block} />}
        {tab === 'ai' && <AiStub />}
      </div>
    </div>
  )
}

// AI tab still stubbed — real implementation lands in Phase 5 alongside
// /api/landing-pages/[id]/rewrite-block.
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

function IcnBtn({
  children, disabled, title, danger,
}: { children: React.ReactNode; disabled?: boolean; title?: string; danger?: boolean }) {
  return (
    <button disabled={disabled} title={title} style={{
      width: 30, height: 30,
      border: `1px solid ${colors.border}`, background: colors.paper,
      borderRadius: radius.sm, cursor: disabled ? 'not-allowed' : 'pointer',
      color: danger ? colors.danger : colors.ink,
      fontSize: fontSize.body,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
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
