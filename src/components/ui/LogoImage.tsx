'use client'

import { useEffect, useState } from 'react'
import { detectLogoBrightness, getCachedLogoBrightness } from '@/lib/logo-brightness'

interface LogoImageProps {
  src: string
  alt?: string
  onDark: boolean
  style?: React.CSSProperties
  className?: string
  onError?: React.ReactEventHandler<HTMLImageElement>
}

/**
 * Renders a brand logo with smart brightness-aware filtering.
 *
 * Behavior:
 *   - On a light background → never filter (logo shows as-is).
 *   - On a dark background, when the logo itself is already light
 *     (detected via canvas) → no filter; the original colors stay.
 *   - On a dark background, when the logo is dark → apply the classic
 *     `filter: brightness(0) invert(1)` so a black logo reads as white.
 *
 * While detection is in-flight we fall back to the dark-logo assumption
 * (filter applied on dark bg) — that matches the app's historic default
 * so nothing regresses for the few hundred ms canvas analysis takes.
 */
export default function LogoImage({
  src,
  alt = '',
  onDark,
  style,
  className,
  onError,
}: LogoImageProps) {
  const [logoIsLight, setLogoIsLight] = useState<boolean | undefined>(() =>
    src ? getCachedLogoBrightness(src) : undefined
  )

  useEffect(() => {
    if (!src) { setLogoIsLight(undefined); return }
    const cached = getCachedLogoBrightness(src)
    if (cached !== undefined) { setLogoIsLight(cached); return }
    let cancelled = false
    detectLogoBrightness(src).then(result => {
      if (!cancelled) setLogoIsLight(result)
    })
    return () => { cancelled = true }
  }, [src])

  const needsFilter = onDark && logoIsLight !== true
  const resolvedFilter = needsFilter ? 'brightness(0) invert(1)' : 'none'
  const incomingFilter = style?.filter
  const mergedStyle: React.CSSProperties = {
    ...style,
    filter: incomingFilter && incomingFilter !== 'none'
      ? `${resolvedFilter === 'none' ? '' : resolvedFilter + ' '}${incomingFilter}`.trim()
      : resolvedFilter,
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={onError}
      style={mergedStyle}
    />
  )
}
