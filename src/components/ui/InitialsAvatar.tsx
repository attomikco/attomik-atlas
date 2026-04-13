'use client'
import { colors, font, fontWeight } from '@/lib/design-tokens'

// Six distinct on-brand backgrounds pulled from design-tokens. Each row picks
// a text color that stays legible on its background (ink or paper).
const AVATAR_PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: colors.ink, fg: colors.accent },
  { bg: colors.accent, fg: colors.ink },
  { bg: colors.emailBlue, fg: colors.paper },
  { bg: colors.violet, fg: colors.paper },
  { bg: colors.emerald, fg: colors.ink },
  { bg: colors.brandGreen, fg: colors.paper },
]

// Deterministic so the same name always lands on the same color.
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function getInitials(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

const SIZES = {
  sm: { px: 28, fontPx: 11 },
  md: { px: 36, fontPx: 13 },
  lg: { px: 48, fontPx: 16 },
} as const

export default function InitialsAvatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const key = (name || '').trim().toLowerCase() || 'default'
  const palette = AVATAR_PALETTE[hashString(key) % AVATAR_PALETTE.length]
  const { px, fontPx } = SIZES[size]
  const initials = getInitials(name)
  return (
    <div
      aria-label={name}
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        background: palette.bg,
        color: palette.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font.heading,
        fontWeight: fontWeight.heading,
        fontSize: fontPx,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}
