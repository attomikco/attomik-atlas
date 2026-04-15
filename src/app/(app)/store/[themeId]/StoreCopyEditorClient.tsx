'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { colors, font, fontWeight, spacing } from '@/lib/design-tokens'
import type { StoreFieldSpec } from '@/lib/store-fields'

// ─────────────────────────────────────────────────────────────────────────────
// StoreCopyEditorClient — styling rewrite (no logic changes)
//
// Layout: left sidebar (sticky under TopNav) + right content column. Both
// live inside a normal document flow so the whole page scrolls with the
// window — the sidebar uses `position: sticky; top: 72px` to clear the
// 72px sticky TopNav without getting clipped.
//
// Fields: all inputs/textareas inherit Barlow from globals.css (no mono).
// Labels mirror the Email editor's FieldLabel style (10px / 700 / 0.08em
// tracking / uppercase / muted color). Input borders use 1.5px solid
// var(--border) / radius 8 / padding 9×11 to match Email inputs exactly.
//
// Richtext handling: the generator wraps some text fields in <p>...</p>
// (see variable-map.json entries of type=richtext). The editor must show
// plain text to the user and re-wrap on save. We detect that the incoming
// value contains HTML tags at initial-load time, stash the field's
// placeholder in `htmlFields`, strip tags for the display value, and wrap
// back in <p>…</p> in the save path. No save logic or API call shape
// changes — just a pre/post transform around the existing code path.
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
const NAV_OFFSET = 72 // matches layout.navHeight in design-tokens.ts

// ─── Richtext helpers ────────────────────────────────────────────────────────
// Heuristic: treat any value that starts with `<p` or contains a `<tagname>`
// pattern as HTML. We don't try to parse it — a regex strip is enough for
// the content Claude generates, which is always simple `<p>…</p>` or
// occasionally `<p>…</p><p>…</p>`.
const HTML_RE = /<[a-z][^>]*>/i

function isLikelyHtml(raw: string): boolean {
  if (!raw) return false
  if (raw.trim().startsWith('<p')) return true
  return HTML_RE.test(raw)
}

function stripHtmlToPlain(html: string): string {
  if (!html) return ''
  // Replace paragraph closers with double newlines, then strip any other
  // tag. Collapse whitespace so a `<p>foo</p><p>bar</p>` becomes
  // `foo\n\nbar`, matching how users expect multi-paragraph copy to read
  // in a plain textarea.
  const withBreaks = html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  // Decode the handful of entities Claude emits. Not a full HTML decoder —
  // just the ones we see in practice.
  return stripped
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function wrapPlainAsHtml(plain: string): string {
  if (!plain) return ''
  // Escape the same entities we decoded above so a user who types `<` or
  // `&` doesn't corrupt the JSON payload.
  const escape = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Split on blank lines → one <p> per paragraph.
  const paragraphs = plain
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
  if (paragraphs.length === 0) return ''
  return paragraphs.map(p => `<p>${escape(p)}</p>`).join('')
}

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
  // Compute the set of fields that hold HTML and the corresponding plain
  // display values just once, at mount. We derive both synchronously from
  // the `initialValues` prop so we don't need a separate effect.
  const { displayValues: initialDisplayValues, htmlPlaceholders } = useMemo(() => {
    const htmlSet = new Set<string>()
    const display: Record<string, string> = {}
    for (const [placeholder, raw] of Object.entries(initialValues)) {
      if (isLikelyHtml(raw)) {
        htmlSet.add(placeholder)
        display[placeholder] = stripHtmlToPlain(raw)
      } else {
        display[placeholder] = raw
      }
    }
    return { displayValues: display, htmlPlaceholders: htmlSet }
  }, [initialValues])

  const [values, setValues] = useState<Record<string, string>>(initialDisplayValues)
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
  // back to the first non-main.
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

  useEffect(() => {
    const timers = savedTimersRef.current
    return () => {
      Array.from(timers.values()).forEach(t => window.clearTimeout(t))
      timers.clear()
    }
  }, [])

  // Scroll-spy for the sidebar's active section. Rooted on the document
  // (null root) since the whole page now scrolls with the window rather
  // than a custom scroll container.
  useEffect(() => {
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
      { root: null, rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    sectionEls.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [grouped])

  const placeholderToField = useMemo(() => {
    const map = new Map<string, StoreFieldSpec>()
    for (const g of grouped) for (const f of g.fields) map.set(f.placeholder, f)
    return map
  }, [grouped])

  const saveField = useCallback(async (placeholder: string, displayValue: string) => {
    const field = placeholderToField.get(placeholder)
    if (!field) return
    // Richtext fields get re-wrapped in <p> on the way out so the theme's
    // Liquid rendering still gets valid HTML. Plain text fields go as-is.
    const valueToSave = htmlPlaceholders.has(placeholder)
      ? wrapPlainAsHtml(displayValue)
      : displayValue
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
          value: valueToSave,
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
  }, [brand.id, theme.id, placeholderToField, htmlPlaceholders])

  function updateValue(placeholder: string, value: string) {
    setValues(prev => ({ ...prev, [placeholder]: value }))
  }

  function onFieldBlur(placeholder: string) {
    const current = values[placeholder] ?? ''
    const initial = initialDisplayValues[placeholder] ?? ''
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
        minHeight: `calc(100vh - ${NAV_OFFSET}px)`,
        background: 'var(--cream, #f8f7f4)',
      }}
    >
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside
        style={{
          borderRight: '1px solid var(--border)',
          background: 'var(--paper)',
          padding: `${spacing[6]}px ${spacing[5]}px`,
          position: 'sticky',
          top: NAV_OFFSET,
          alignSelf: 'start',
          maxHeight: `calc(100vh - ${NAV_OFFSET}px)`,
          overflowY: 'auto',
        }}
      >
        <Link
          href={`/store?brand=${brand.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            marginBottom: spacing[6],
          }}
        >
          ← Store
        </Link>
        <div
          style={{
            fontFamily: font.heading,
            fontWeight: fontWeight.heading,
            fontSize: 18,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            marginBottom: spacing[5],
            lineHeight: 1.1,
          }}
        >
          Copy editor
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {grouped.map(g => {
            const isActive = g.section === activeSection
            return (
              <a
                key={g.section}
                href={`#store-section-${slugifySection(g.section)}`}
                onClick={(e) => {
                  e.preventDefault()
                  setActiveSection(g.section)
                  const target = document.getElementById(`store-section-${slugifySection(g.section)}`)
                  if (target) {
                    const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET - 16
                    window.scrollTo({ top, behavior: 'smooth' })
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 8,
                  background: isActive ? 'var(--ink)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--ink)',
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'background 120ms, color 120ms',
                }}
              >
                <span>{g.section}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: isActive ? 'var(--accent)' : 'var(--muted)',
                    opacity: isActive ? 0.75 : 1,
                  }}
                >
                  {g.fields.length}
                </span>
              </a>
            )
          })}
        </nav>
      </aside>

      {/* ── Right pane ────────────────────────────────────────── */}
      <div>
        {/* Top bar — sticky so it clears the TopNav when the page scrolls */}
        <div
          style={{
            position: 'sticky',
            top: NAV_OFFSET,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[4],
            padding: '20px 32px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              {brand.name}
            </div>
            <h1
              style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: 24,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Shopify copy
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            {deployStatus && deployStatus !== 'idle' && (
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 999,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background:
                    deployStatus === 'success' ? 'rgba(0,255,151,0.15)' :
                    deployStatus === 'failed'  ? 'rgba(244,63,94,0.12)' :
                    'var(--cream)',
                  color:
                    deployStatus === 'success' ? '#00a86b' :
                    deployStatus === 'failed'  ? '#b91c1c' :
                    'var(--muted)',
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
                  fontSize: 12,
                  color: 'var(--ink)',
                  fontWeight: 700,
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
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '-0.01em',
                padding: '10px 20px',
                borderRadius: 999,
                border: '1px solid transparent',
                background: (deploying || !targetThemeId) ? colors.gray200 : 'var(--ink)',
                color: (deploying || !targetThemeId) ? 'var(--muted)' : 'var(--accent)',
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
              margin: '20px 32px 0',
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.2)',
              color: '#b91c1c',
              fontSize: 12,
            }}
          >
            {deployError || themesError}
          </div>
        )}

        {targetThemeName && (
          <div
            style={{
              padding: '12px 32px 0',
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            Deploying to <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>{targetThemeName}</strong>
            {deployedAt && ` · last pushed ${new Date(deployedAt).toLocaleString()}`}
          </div>
        )}

        <div style={{ padding: '28px 32px 80px', maxWidth: 760 }}>
          {grouped.map(g => (
            <section
              key={g.section}
              id={`store-section-${slugifySection(g.section)}`}
              style={{ marginBottom: 40, scrollMarginTop: NAV_OFFSET + 80 }}
            >
              <h2
                style={{
                  fontFamily: font.heading,
                  fontWeight: fontWeight.heading,
                  fontSize: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  marginBottom: 20,
                  marginTop: 0,
                  lineHeight: 1.1,
                }}
              >
                {g.section}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {g.fields.map(field => (
                  <FieldRow
                    key={field.placeholder}
                    field={field}
                    value={values[field.placeholder] ?? ''}
                    onChange={v => updateValue(field.placeholder, v)}
                    onBlur={() => onFieldBlur(field.placeholder)}
                    saved={savedSet.has(field.placeholder)}
                    error={errorMap[field.placeholder]}
                    isRichtext={htmlPlaceholders.has(field.placeholder)}
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
// FieldRow — mirrors the Email editor's Field + inputStyle convention.
// fontFamily on the input/textarea is intentionally omitted so globals.css
// (`input,select,textarea { font-family: var(--font-sans) }`) takes over.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--border)',
  borderRadius: 8,
  padding: '9px 11px',
  fontSize: 13,
  color: 'var(--ink)',
  background: 'var(--paper)',
  boxSizing: 'border-box',
  outline: 'none',
}

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  resize: 'none',
  minHeight: 44,
  lineHeight: 1.55,
}

function FieldRow({
  field,
  value,
  onChange,
  onBlur,
  saved,
  error,
  isRichtext,
}: {
  field: StoreFieldSpec
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  saved: boolean
  error: string | undefined
  isRichtext: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Auto-grow the textarea to fit its content.
  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [value, field.type])

  // Richtext fields always render as textareas so users can write
  // multi-paragraph copy with blank-line breaks.
  const useTextarea = field.type === 'long' || isRichtext

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 5,
          minHeight: 14,
        }}
      >
        <label
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {field.label}
        </label>
        {saved && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
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
              fontWeight: 700,
              color: '#b91c1c',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {error}
          </span>
        )}
      </div>
      {useTextarea ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          rows={2}
          style={TEXTAREA_STYLE}
        />
      ) : (
        <input
          type={field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.type === 'url' ? 'https://' : ''}
          style={INPUT_STYLE}
        />
      )}
    </div>
  )
}

function slugifySection(section: string): string {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
