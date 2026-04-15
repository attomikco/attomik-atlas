'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { colors, font, fontWeight, fontSize, radius, spacing } from '@/lib/design-tokens'
import type { StoreFieldSpec } from '@/lib/store-fields'

// ─────────────────────────────────────────────────────────────────────────────
// StoreCopyEditorClient
// Left-sidebar navigation + right content area of per-section field lists.
// Every field's <input> or <textarea> holds its value in local state; on
// blur we PATCH /api/brands/[brandId]/store/[themeId]/config with the
// { section, path, value } shape. Per-field "Saved" chip, no page reload.
//
// Deploy button POSTs /api/brands/[brandId]/store/deploy directly from
// this page. The target Shopify theme is picked once on mount: we prefer
// the theme that was last deployed to (store_themes.shopify_theme_id),
// falling back to the first non-main theme returned by GET /themes. If
// there's no target we disable the Deploy button and prompt the user.
// ─────────────────────────────────────────────────────────────────────────────

type GroupedFields = {
  section: string
  order: number
  fields: StoreFieldSpec[]
}

type ThemeRowLite = {
  id: string
  brand_id: string
  name: string
  shopify_theme_id: number | null
  shopify_theme_name: string | null
  last_deploy_status: 'idle' | 'deploying' | 'success' | 'failed' | null
  last_deploy_error: string | null
  last_deployed_at: string | null
}

type RemoteTheme = {
  id: number
  name: string
  role: 'main' | 'unpublished' | 'demo' | 'development'
  preview_url: string | null
}

const SAVED_FLASH_MS = 1500

export default function StoreCopyEditorClient({
  brand,
  theme,
  shopifyStoreUrl,
  grouped,
  initialValues,
}: {
  brand: { id: string; name: string }
  theme: ThemeRowLite
  shopifyStoreUrl: string | null
  grouped: GroupedFields[]
  initialValues: Record<string, string>
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [activeSection, setActiveSection] = useState<string>(grouped[0]?.section || '')
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set())
  const [errorMap, setErrorMap] = useState<Record<string, string>>({})
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deployedAt, setDeployedAt] = useState<string | null>(theme.last_deployed_at)
  const [deployStatus, setDeployStatus] = useState<ThemeRowLite['last_deploy_status']>(theme.last_deploy_status)
  const [targetThemeId, setTargetThemeId] = useState<number | null>(theme.shopify_theme_id)
  const [targetThemeName, setTargetThemeName] = useState<string | null>(theme.shopify_theme_name)
  const [themesError, setThemesError] = useState<string | null>(null)
  const savedTimersRef = useRef<Map<string, number>>(new Map())

  // Fetch the list of non-main Shopify themes once on mount so the deploy
  // button knows where to push. Prefer the row's last-deployed theme; fall
  // back to the first non-main. If the fetch fails (credentials missing,
  // network error) we surface the error inline but don't block the editor.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/brands/${brand.id}/store/themes`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setThemesError(data.error || 'Failed to list themes')
          return
        }
        const list = ((data.themes as RemoteTheme[]) || []).filter(t => t.role !== 'main')
        if (targetThemeId == null && list.length > 0) {
          setTargetThemeId(list[0].id)
          setTargetThemeName(list[0].name)
        } else if (targetThemeId != null) {
          const match = list.find(t => t.id === targetThemeId)
          if (match) setTargetThemeName(match.name)
        }
      } catch (e) {
        if (cancelled) return
        setThemesError(e instanceof Error ? e.message : 'Failed to list themes')
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id])

  // Clean up any pending saved-flash timers on unmount.
  useEffect(() => {
    const timers = savedTimersRef.current
    return () => {
      Array.from(timers.values()).forEach(t => window.clearTimeout(t))
      timers.clear()
    }
  }, [])

  // Track which section is currently in view. Simple IntersectionObserver
  // rooted at the scroll container — the first visible section wins.
  useEffect(() => {
    const el = document.getElementById('store-editor-scroll')
    if (!el) return
    const sectionEls = grouped
      .map(g => document.getElementById(`store-section-${slugifySection(g.section)}`))
      .filter((s): s is HTMLElement => !!s)
    if (sectionEls.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) {
          const id = visible.target.id.replace('store-section-', '')
          const match = grouped.find(g => slugifySection(g.section) === id)
          if (match) setActiveSection(match.section)
        }
      },
      { root: el, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )
    sectionEls.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [grouped])

  const placeholderToField = useMemo(() => {
    const map = new Map<string, StoreFieldSpec>()
    for (const g of grouped) for (const f of g.fields) map.set(f.placeholder, f)
    return map
  }, [grouped])

  const saveField = useCallback(async (placeholder: string, value: string) => {
    const field = placeholderToField.get(placeholder)
    if (!field) return
    // Clear any stale error for this field before the request fires.
    setErrorMap(prev => {
      if (!(placeholder in prev)) return prev
      const next = { ...prev }
      delete next[placeholder]
      return next
    })
    try {
      const res = await fetch(`/api/brands/${brand.id}/store/${theme.id}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: field.source,
          path: field.path,
          value,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSavedSet(prev => {
        const next = new Set(prev)
        next.add(placeholder)
        return next
      })
      const existing = savedTimersRef.current.get(placeholder)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        setSavedSet(prev => {
          if (!prev.has(placeholder)) return prev
          const next = new Set(prev)
          next.delete(placeholder)
          return next
        })
        savedTimersRef.current.delete(placeholder)
      }, SAVED_FLASH_MS)
      savedTimersRef.current.set(placeholder, timer)
    } catch (e) {
      setErrorMap(prev => ({ ...prev, [placeholder]: e instanceof Error ? e.message : 'Save failed' }))
    }
  }, [brand.id, theme.id, placeholderToField])

  function updateValue(placeholder: string, value: string) {
    setValues(prev => ({ ...prev, [placeholder]: value }))
  }

  function onFieldBlur(placeholder: string) {
    const current = values[placeholder] ?? ''
    const initial = initialValues[placeholder] ?? ''
    // Only save when the value actually differs from the last persisted
    // value. We approximate "last persisted" by the initialValues from
    // the server load — after a save we don't update initialValues but
    // re-saving the same string is a harmless no-op.
    if (current === initial && !savedSet.has(placeholder)) return
    saveField(placeholder, current)
  }

  async function deployNow() {
    if (!targetThemeId) return
    setDeploying(true)
    setDeployError(null)
    setDeployStatus('deploying')
    try {
      const res = await fetch(`/api/brands/${brand.id}/store/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: targetThemeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deploy failed')
      setDeployStatus('success')
      setDeployedAt(new Date().toISOString())
    } catch (e) {
      setDeployError(e instanceof Error ? e.message : 'Deploy failed')
      setDeployStatus('failed')
    } finally {
      setDeploying(false)
    }
  }

  const previewUrl = deployStatus === 'success' && targetThemeId && shopifyStoreUrl
    ? `https://${shopifyStoreUrl}/?preview_theme_id=${targetThemeId}`
    : null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        minHeight: 'calc(100vh - 72px)',
      }}
    >
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        style={{
          borderRight: `1px solid ${colors.border}`,
          background: colors.paper,
          padding: `${spacing[6]} ${spacing[5]}`,
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          maxHeight: 'calc(100vh - 72px)',
          overflowY: 'auto',
        }}
      >
        <Link
          href={`/store?brand=${brand.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            color: colors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            marginBottom: spacing[5],
          }}
        >
          ← Store
        </Link>
        <div
          style={{
            fontFamily: font.heading,
            fontWeight: fontWeight.heading,
            fontSize: fontSize.lg,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: colors.ink,
            marginBottom: spacing[5],
            lineHeight: 1.1,
          }}
        >
          Copy editor
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {grouped.map(g => {
            const isActive = g.section === activeSection
            return (
              <a
                key={g.section}
                href={`#store-section-${slugifySection(g.section)}`}
                onClick={(e) => {
                  // Smooth scroll inside the right pane instead of the
                  // browser-default jump, which snaps the whole window.
                  e.preventDefault()
                  setActiveSection(g.section)
                  const target = document.getElementById(`store-section-${slugifySection(g.section)}`)
                  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: radius.md,
                  background: isActive ? colors.ink : 'transparent',
                  color: isActive ? colors.accent : colors.ink,
                  fontFamily: font.mono,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.bold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  textDecoration: 'none',
                  transition: 'background 120ms, color 120ms',
                }}
              >
                <span>{g.section}</span>
                <span style={{ opacity: 0.6, fontSize: 10 }}>{g.fields.length}</span>
              </a>
            )
          })}
        </div>
      </aside>

      {/* ── Right pane ────────────────────────────────────────── */}
      <div
        id="store-editor-scroll"
        style={{
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 72px)',
          scrollBehavior: 'smooth',
        }}
      >
        {/* Top bar — brand name + deploy */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${spacing[4]} ${spacing[8]}`,
            borderBottom: `1px solid ${colors.border}`,
            background: colors.paper,
          }}
        >
          <div>
            <div
              style={{
                fontSize: fontSize.xs,
                fontWeight: fontWeight.bold,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: colors.muted,
                marginBottom: 4,
              }}
            >
              {brand.name}
            </div>
            <div
              style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: fontSize['2xl'],
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
                color: colors.ink,
                lineHeight: 1.1,
              }}
            >
              Shopify copy
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            {deployStatus && (
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.bold,
                  padding: '4px 10px',
                  borderRadius: radius.pill,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  background:
                    deployStatus === 'success' ? 'rgba(0,255,151,0.15)' :
                    deployStatus === 'failed'  ? 'rgba(244,63,94,0.12)' :
                    colors.gray200,
                  color:
                    deployStatus === 'success' ? '#00a86b' :
                    deployStatus === 'failed'  ? '#b91c1c' :
                    colors.muted,
                }}
              >
                {deployStatus}
              </span>
            )}
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: fontSize.caption,
                  color: colors.ink,
                  fontWeight: fontWeight.bold,
                  textDecoration: 'underline',
                }}
              >
                Preview →
              </a>
            )}
            <button
              onClick={deployNow}
              disabled={deploying || !targetThemeId}
              style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.extrabold,
                fontSize: fontSize.body,
                letterSpacing: '0.02em',
                padding: '10px 20px',
                borderRadius: radius.pill,
                border: '1px solid transparent',
                background: (deploying || !targetThemeId) ? colors.gray200 : colors.ink,
                color: (deploying || !targetThemeId) ? colors.muted : colors.accent,
                cursor: (deploying || !targetThemeId) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {deploying ? 'Deploying…' : 'Deploy changes'}
            </button>
          </div>
        </div>

        {(deployError || themesError) && (
          <div
            style={{
              margin: `${spacing[4]} ${spacing[8]} 0`,
              padding: '10px 14px',
              borderRadius: radius.md,
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              color: '#b91c1c',
              fontSize: fontSize.caption,
            }}
          >
            {deployError || themesError}
          </div>
        )}

        {targetThemeName && (
          <div
            style={{
              padding: `${spacing[3]} ${spacing[8]} 0`,
              fontSize: fontSize.xs,
              color: colors.muted,
              fontFamily: font.mono,
            }}
          >
            Deploying to <strong style={{ color: colors.ink }}>{targetThemeName}</strong>
            {deployedAt && ` · last pushed ${new Date(deployedAt).toLocaleString()}`}
          </div>
        )}

        <div style={{ padding: `${spacing[6]} ${spacing[8]} ${spacing[10]}`, maxWidth: 820 }}>
          {grouped.map(g => (
            <section
              key={g.section}
              id={`store-section-${slugifySection(g.section)}`}
              style={{ marginBottom: spacing[8], scrollMarginTop: spacing[6] }}
            >
              <h2
                style={{
                  fontFamily: font.heading,
                  fontWeight: fontWeight.heading,
                  fontSize: fontSize.xl,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                  color: colors.ink,
                  marginBottom: spacing[4],
                  marginTop: 0,
                  lineHeight: 1.1,
                }}
              >
                {g.section}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                {g.fields.map(field => (
                  <FieldRow
                    key={field.placeholder}
                    field={field}
                    value={values[field.placeholder] ?? ''}
                    onChange={v => updateValue(field.placeholder, v)}
                    onBlur={() => onFieldBlur(field.placeholder)}
                    saved={savedSet.has(field.placeholder)}
                    error={errorMap[field.placeholder]}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-field row — short text, long text (auto-resize textarea), url
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  value,
  onChange,
  onBlur,
  saved,
  error,
}: {
  field: StoreFieldSpec
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  saved: boolean
  error: string | undefined
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Auto-resize the textarea to fit its content. Runs on every value
  // change (including the initial mount) so the initial height is right.
  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [value, field.type])

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            color: colors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {field.label}
        </label>
        {saved && (
          <span
            style={{
              fontSize: 10,
              fontWeight: fontWeight.bold,
              color: '#00a86b',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Saved
          </span>
        )}
        {error && !saved && (
          <span
            style={{
              fontSize: 10,
              fontWeight: fontWeight.bold,
              color: '#b91c1c',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {error}
          </span>
        )}
      </div>
      {field.type === 'long' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          rows={2}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            background: colors.paper,
            fontFamily: font.mono,
            fontSize: fontSize.body,
            color: colors.ink,
            outline: 'none',
            resize: 'none',
            minHeight: 44,
            lineHeight: 1.5,
          }}
        />
      ) : (
        <input
          type={field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.type === 'url' ? 'https://' : ''}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            background: colors.paper,
            fontFamily: field.type === 'url' ? font.mono : font.mono,
            fontSize: fontSize.body,
            color: colors.ink,
            outline: 'none',
          }}
        />
      )}
    </div>
  )
}

function slugifySection(section: string): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
