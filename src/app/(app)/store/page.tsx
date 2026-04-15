'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import { colors, font, fontWeight, fontSize, radius, spacing } from '@/lib/design-tokens'
import ColorPickerPopover from '@/components/ui/ColorPickerPopover'
import {
  THEME_COLOR_KEYS,
  THEME_COLOR_LABELS,
  type ThemeColors,
} from '@/lib/store-colors'

type CredentialStatus = {
  connected: boolean
  shopify_store_url: string | null
  shop_name: string | null
  shopify_token_saved_at: string | null
  shopify_base_theme_installed_at: string | null
  error?: string
}

type RemoteTheme = {
  id: number
  name: string
  role: 'main' | 'unpublished' | 'demo' | 'development'
  preview_url: string | null
}

type StoreTheme = {
  id: string
  brand_id: string
  name: string
  selected_variant: number | null
  color_variants: unknown
  index_json: unknown
  product_json: unknown
  footer_group_json: unknown
  shopify_theme_id: number | null
  shopify_theme_name: string | null
  last_deployed_at: string | null
  last_deploy_status: 'idle' | 'deploying' | 'success' | 'failed' | null
  last_deploy_error: string | null
  updated_at: string | null
}

function useStoreData(brandId: string | null) {
  const [creds, setCreds] = useState<CredentialStatus | null>(null)
  const [theme, setTheme] = useState<StoreTheme | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!brandId) return
    setLoading(true)
    const supabase = createClient()
    const [credsRes, themeRes] = await Promise.all([
      fetch(`/api/brands/${brandId}/store/credentials`).then(r => r.json()).catch(() => null),
      supabase.from('store_themes').select('*').eq('brand_id', brandId).maybeSingle(),
    ])
    setCreds(credsRes)
    setTheme((themeRes.data as StoreTheme) || null)
    setLoading(false)
  }, [brandId])

  useEffect(() => { refresh() }, [refresh])
  return { creds, theme, loading, refresh }
}

export default function StorePage() {
  const { activeBrandId, brandsLoaded } = useBrand()
  const { creds, theme, loading, refresh } = useStoreData(activeBrandId)

  if (!brandsLoaded || loading) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ color: colors.gray750, fontSize: fontSize.body }}>Loading…</div>
      </div>
    )
  }
  if (!activeBrandId) {
    return (
      <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ color: colors.gray750, fontSize: fontSize.body }}>Select a brand to manage its store.</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: spacing[8] }}>
        <div style={{ fontSize: fontSize.caption, fontWeight: fontWeight.bold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colors.muted, marginBottom: 6 }}>
          Store
        </div>
        <h1 style={{ fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize['4xl'], letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0 }}>
          Shopify theme
        </h1>
        <p style={{ color: colors.muted, fontSize: fontSize.body, marginTop: 8, maxWidth: 600 }}>
          Generate, push, and pull a brand-aware Shopify theme. Credentials, the base theme install, the generator, and the deploy controls all live here.
        </p>
      </div>

      <CredentialsSection brandId={activeBrandId} creds={creds} onSaved={refresh} />
      <BaseThemeSection brandId={activeBrandId} creds={creds} onInstalled={refresh} />
      <GenerateSection brandId={activeBrandId} creds={creds} theme={theme} onGenerated={refresh} />
      <ThemeColorsSection brandId={activeBrandId} theme={theme} onSaved={refresh} />
      <DeploySection brandId={activeBrandId} creds={creds} theme={theme} onDeployed={refresh} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable card shell to keep each section visually consistent.
// ─────────────────────────────────────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: colors.paper,
      border: '1px solid var(--border)',
      borderRadius: radius.xl,
      padding: '24px 28px',
      marginBottom: spacing[4],
    }}>
      <div style={{ marginBottom: spacing[5] }}>
        <div style={{
          fontFamily: font.heading, fontWeight: fontWeight.heading, fontSize: fontSize.lg,
          textTransform: 'uppercase', letterSpacing: '0.04em', color: colors.ink, lineHeight: 1.1,
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ color: colors.muted, fontSize: fontSize.caption, marginTop: 6, maxWidth: 560 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: radius.md,
        border: '1px solid var(--border)',
        background: colors.paper,
        fontFamily: font.mono,
        fontSize: fontSize.body,
        color: colors.ink,
        outline: 'none',
        ...props.style,
      }}
    />
  )
}

function Button({ children, disabled, onClick, variant = 'primary', ...rest }: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: font.heading,
        fontWeight: fontWeight.extrabold,
        fontSize: fontSize.body,
        letterSpacing: '0.02em',
        padding: '10px 20px',
        borderRadius: radius.pill,
        border: isSecondary ? `1px solid ${colors.ink}` : '1px solid transparent',
        background: disabled
          ? colors.gray200
          : isPrimary
            ? colors.ink
            : isSecondary
              ? colors.paper
              : 'transparent',
        color: disabled
          ? colors.muted
          : isPrimary
            ? colors.accent
            : colors.ink,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

function Badge({ status }: { status: StoreTheme['last_deploy_status'] }) {
  const label = status || 'idle'
  const palette: Record<string, { bg: string; fg: string }> = {
    idle:       { bg: colors.gray200, fg: colors.muted },
    deploying:  { bg: colors.gray200, fg: colors.ink },
    success:    { bg: 'rgba(0,255,151,0.15)', fg: '#00a86b' },
    failed:     { bg: 'rgba(244,63,94,0.12)', fg: '#b91c1c' },
  }
  const p = palette[label] || palette.idle
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
      padding: '4px 10px', borderRadius: radius.pill,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      background: p.bg, color: p.fg,
    }}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Credentials
// ─────────────────────────────────────────────────────────────────────────────

const SHOP_INPUT_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/

function CredentialsSection({ brandId, creds, onSaved }: {
  brandId: string
  creds: CredentialStatus | null
  onSaved: () => void
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [shopInput, setShopInput] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const [showConnected, setShowConnected] = useState(false)

  // Prefill the shop input with the currently connected domain (disabled
  // when connected, so editing it has no effect — it's a display aid).
  useEffect(() => {
    if (creds?.shopify_store_url) setShopInput(creds.shopify_store_url)
  }, [creds?.shopify_store_url])

  // Success + error banners are driven by query params set by the callback.
  const oauthError = searchParams?.get('oauth_error') || null
  const connectedFlag = searchParams?.get('connected') === 'true'

  useEffect(() => {
    if (!connectedFlag) return
    setShowConnected(true)
    onSaved() // re-fetch status so the connected banner populates
    // Strip the ?connected=true and ?oauth_error= params from the URL so a
    // refresh doesn't re-trigger the toast.
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []))
    params.delete('connected')
    params.delete('oauth_error')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
    const timer = setTimeout(() => setShowConnected(false), 4000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedFlag])

  const shopValid = SHOP_INPUT_REGEX.test(shopInput.trim())

  function connect() {
    if (!shopValid) return
    const shop = shopInput.trim().toLowerCase()
    // Full-page navigation — OAuth flow cannot run inside a fetch.
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(shop)}&brandId=${encodeURIComponent(brandId)}`
  }

  async function disconnect() {
    if (!confirm('Disconnect this store? Your generated theme row is kept — only the credentials are cleared.')) return
    setDisconnecting(true)
    setDisconnectError(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/store/credentials`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect')
      onSaved()
    } catch (e) {
      setDisconnectError(e instanceof Error ? e.message : 'Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <Card title="Shopify connection" subtitle="Connect your Shopify store via OAuth. Attomik redirects you to Shopify to approve the install, then stores an offline access token for theme operations.">
      {showConnected && (
        <div style={{ marginBottom: spacing[4], padding: '10px 14px', borderRadius: radius.md, background: 'rgba(0,255,151,0.12)', border: '1px solid rgba(0,255,151,0.3)', color: '#00a86b', fontSize: fontSize.body, fontWeight: fontWeight.bold }}>
          Shopify connected successfully
        </div>
      )}
      {oauthError && !showConnected && (
        <div style={{ marginBottom: spacing[4], padding: '10px 14px', borderRadius: radius.md, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#b91c1c', fontSize: fontSize.caption }}>
          OAuth failed: {oauthError.replace(/_/g, ' ')}. Try the connect flow again.
        </div>
      )}
      {creds?.connected && (
        <div style={{ marginBottom: spacing[4], padding: '10px 14px', borderRadius: radius.md, background: 'rgba(0,255,151,0.1)', border: '1px solid rgba(0,255,151,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: font.mono, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
              padding: '4px 10px', borderRadius: radius.pill,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: 'rgba(0,255,151,0.2)', color: '#00a86b',
            }}>
              Connected
            </span>
            <span style={{ color: colors.ink, fontSize: fontSize.body, fontWeight: fontWeight.bold, fontFamily: font.mono }}>
              {creds.shopify_store_url}
            </span>
            {creds.shop_name && creds.shop_name !== creds.shopify_store_url && (
              <span style={{ color: colors.muted, fontSize: fontSize.caption }}>· {creds.shop_name}</span>
            )}
          </div>
          <Button variant="secondary" onClick={disconnect} disabled={disconnecting}>
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </div>
      )}
      {creds && !creds.connected && creds.error && (
        <div style={{ marginBottom: spacing[4], padding: '10px 14px', borderRadius: radius.md, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#b91c1c', fontSize: fontSize.caption }}>
          {creds.error} — reconnect to refresh the token.
        </div>
      )}
      {disconnectError && (
        <div style={{ marginBottom: spacing[3], color: '#b91c1c', fontSize: fontSize.caption }}>{disconnectError}</div>
      )}

      {!creds?.connected && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing[3], marginBottom: spacing[3], alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Shopify store domain
              </label>
              <Input
                type="text"
                placeholder="my-brand.myshopify.com"
                value={shopInput}
                onChange={e => setShopInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && shopValid) connect() }}
              />
            </div>
            <Button onClick={connect} disabled={!shopValid}>
              Connect Shopify
            </Button>
          </div>
          {shopInput && !shopValid && (
            <div style={{ color: '#b91c1c', fontSize: fontSize.xs, marginBottom: spacing[2] }}>
              Enter a domain like <code style={{ fontFamily: font.mono }}>my-brand.myshopify.com</code>
            </div>
          )}
          <div style={{ fontSize: fontSize.xs, color: colors.muted }}>
            You&apos;ll be redirected to Shopify to approve the install. The token comes back automatically — no copy-paste.
          </div>
        </>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Base Theme
// ─────────────────────────────────────────────────────────────────────────────

function BaseThemeSection({ brandId, creds, onInstalled }: {
  brandId: string
  creds: CredentialStatus | null
  onInstalled: () => void
}) {
  const [themes, setThemes] = useState<RemoteTheme[]>([])
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null)
  const [loadingThemes, setLoadingThemes] = useState(false)
  const [themeError, setThemeError] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number; file?: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const connected = !!creds?.connected

  const fetchThemes = useCallback(async () => {
    if (!connected) return
    setLoadingThemes(true)
    setThemeError(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/store/themes`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to list themes')
      const nonMain = (data.themes as RemoteTheme[]).filter(t => t.role !== 'main')
      setThemes(nonMain)
      if (nonMain.length > 0 && selectedThemeId == null) setSelectedThemeId(nonMain[0].id)
    } catch (e) {
      setThemeError(e instanceof Error ? e.message : 'Failed to list themes')
    } finally {
      setLoadingThemes(false)
    }
  }, [brandId, connected, selectedThemeId])

  useEffect(() => {
    if (connected) fetchThemes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  async function install() {
    if (!selectedThemeId) return
    setInstalling(true)
    setInstallError(null)
    setProgress(null)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(`/api/brands/${brandId}/store/install-base-theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: selectedThemeId }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed: ${res.status}`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const evt = JSON.parse(line) as { done: number; total: number; file?: string; error?: string; status?: string }
            setProgress({ done: evt.done, total: evt.total, file: evt.file })
            if (evt.status === 'complete_with_errors') setInstallError('Some files failed to upload. Check the server logs.')
          } catch { /* ignore malformed line */ }
        }
      }
      onInstalled()
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setInstalling(false)
      abortRef.current = null
    }
  }

  const installedAt = creds?.shopify_base_theme_installed_at

  return (
    <Card title="Base theme" subtitle="Install the Attomik base theme liquid code onto a non-live Shopify theme. This is a one-time step — generated JSONs are pushed separately after generate.">
      {!connected && (
        <div style={{ color: colors.muted, fontSize: fontSize.caption }}>Connect Shopify credentials first.</div>
      )}

      {connected && (
        <>
          <div style={{ marginBottom: spacing[4], display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {installedAt ? (
              <span style={{ color: '#00a86b', fontSize: fontSize.caption, fontWeight: fontWeight.bold }}>
                Base theme installed {new Date(installedAt).toLocaleString()}
              </span>
            ) : (
              <span style={{ color: colors.muted, fontSize: fontSize.caption }}>Base theme not installed yet.</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing[3], marginBottom: spacing[3], alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Target theme
              </label>
              <select
                value={selectedThemeId || ''}
                onChange={e => setSelectedThemeId(Number(e.target.value))}
                disabled={loadingThemes || themes.length === 0}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: radius.md,
                  border: '1px solid var(--border)', background: colors.paper,
                  fontFamily: font.mono, fontSize: fontSize.body, color: colors.ink,
                }}
              >
                {loadingThemes && <option>Loading themes…</option>}
                {!loadingThemes && themes.length === 0 && <option>No non-live themes found — create an unpublished theme in Shopify Admin</option>}
                {themes.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={fetchThemes} disabled={loadingThemes}>
              Refresh
            </Button>
          </div>
          {themeError && (
            <div style={{ marginBottom: spacing[3], color: '#b91c1c', fontSize: fontSize.caption }}>{themeError}</div>
          )}

          <Button onClick={install} disabled={installing || !selectedThemeId}>
            {installing ? 'Installing…' : 'Install base theme'}
          </Button>

          {installing && progress && (
            <div style={{ marginTop: spacing[4] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>
                  {progress.done}/{progress.total} files
                </span>
                {progress.file && (
                  <span style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}>
                    {progress.file}
                  </span>
                )}
              </div>
              <div style={{ height: 6, background: colors.gray200, borderRadius: radius.pill, overflow: 'hidden' }}>
                <div style={{
                  width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                  height: '100%',
                  background: colors.ink,
                  transition: 'width 120ms linear',
                }} />
              </div>
            </div>
          )}

          {installError && (
            <div style={{ marginTop: spacing[3], color: '#b91c1c', fontSize: fontSize.caption }}>{installError}</div>
          )}
        </>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Generate
// ─────────────────────────────────────────────────────────────────────────────

function GenerateSection({ brandId, creds, theme, onGenerated }: {
  brandId: string
  creds: CredentialStatus | null
  theme: StoreTheme | null
  onGenerated: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { activeCampaignId } = useBrand()

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/store/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeCampaignId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generate failed')
      onGenerated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card title="Generate" subtitle="Build a brand-aware theme config from the brand hub. Reads colors, fonts, products, and voice — no scraping required. Runs in ~30 seconds.">
      {!creds?.connected && (
        <div style={{ color: colors.muted, fontSize: fontSize.caption }}>Connect Shopify credentials first.</div>
      )}

      {creds?.connected && (
        <>
          <div style={{ marginBottom: spacing[4] }}>
            {theme?.updated_at ? (
              <span style={{ color: colors.muted, fontSize: fontSize.caption }}>
                Last generated {new Date(theme.updated_at).toLocaleString()}
              </span>
            ) : (
              <span style={{ color: colors.muted, fontSize: fontSize.caption }}>No theme generated yet.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
            <Button onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : theme ? 'Regenerate' : 'Generate theme'}
            </Button>
            {theme && (
              <Link
                href={`/store/${theme.id}`}
                style={{
                  fontFamily: font.mono, fontSize: fontSize.caption, fontWeight: fontWeight.bold,
                  color: colors.muted, textDecoration: 'none',
                  padding: '10px 16px', border: '1px solid var(--border)', borderRadius: radius.pill,
                }}
              >
                Open editor →
              </Link>
            )}
          </div>

          {error && (
            <div style={{ marginTop: spacing[3], color: '#b91c1c', fontSize: fontSize.caption }}>{error}</div>
          )}
        </>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Deploy
// ─────────────────────────────────────────────────────────────────────────────

function DeploySection({ brandId, creds, theme, onDeployed }: {
  brandId: string
  creds: CredentialStatus | null
  theme: StoreTheme | null
  onDeployed: () => void
}) {
  const [themes, setThemes] = useState<RemoteTheme[]>([])
  const [selectedThemeId, setSelectedThemeId] = useState<number | null>(null)
  const [loadingThemes, setLoadingThemes] = useState(false)
  const [action, setAction] = useState<'idle' | 'deploying' | 'pulling'>('idle')
  const [error, setError] = useState<string | null>(null)

  const connected = !!creds?.connected
  const baseInstalled = !!creds?.shopify_base_theme_installed_at
  const hasTheme = !!theme

  useEffect(() => {
    if (!connected || !hasTheme) return
    setLoadingThemes(true)
    fetch(`/api/brands/${brandId}/store/themes`)
      .then(r => r.json())
      .then(data => {
        const list = ((data.themes as RemoteTheme[]) || []).filter(t => t.role !== 'main')
        setThemes(list)
        // Default to the theme that was last deployed to, falling back to first.
        const fallbackId = theme?.shopify_theme_id || list[0]?.id || null
        setSelectedThemeId(fallbackId)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to list themes'))
      .finally(() => setLoadingThemes(false))
  }, [brandId, connected, hasTheme, theme?.shopify_theme_id])

  async function deploy() {
    if (!selectedThemeId) return
    setAction('deploying')
    setError(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/store/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: selectedThemeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Deploy failed')
      onDeployed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deploy failed')
    } finally {
      setAction('idle')
    }
  }

  async function pullSettings() {
    if (!selectedThemeId) return
    setAction('pulling')
    setError(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/store/pull-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: selectedThemeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Pull failed')
      onDeployed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pull failed')
    } finally {
      setAction('idle')
    }
  }

  if (!hasTheme) return null

  const previewUrl = theme && theme.last_deploy_status === 'success' && theme.shopify_theme_id && creds?.shopify_store_url
    ? `https://${creds.shopify_store_url}/?preview_theme_id=${theme.shopify_theme_id}`
    : null

  return (
    <Card title="Deploy" subtitle="Push the 4 generated JSON files to a non-live Shopify theme. Deploy is blocked on the live theme.">
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4], flexWrap: 'wrap' }}>
        <Badge status={theme?.last_deploy_status ?? 'idle'} />
        {theme?.last_deployed_at && (
          <span style={{ color: colors.muted, fontSize: fontSize.caption }}>
            Last deployed {new Date(theme.last_deployed_at).toLocaleString()}
          </span>
        )}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: fontSize.caption, color: colors.ink, fontWeight: fontWeight.bold, textDecoration: 'underline' }}
          >
            Open preview →
          </a>
        )}
      </div>
      {theme?.last_deploy_error && (
        <div style={{ marginBottom: spacing[4], padding: '10px 14px', borderRadius: radius.md, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#b91c1c', fontSize: fontSize.caption }}>
          {theme.last_deploy_error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing[3], marginBottom: spacing[3], alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Target theme
          </label>
          <select
            value={selectedThemeId || ''}
            onChange={e => setSelectedThemeId(Number(e.target.value))}
            disabled={loadingThemes || themes.length === 0}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: radius.md,
              border: '1px solid var(--border)', background: colors.paper,
              fontFamily: font.mono, fontSize: fontSize.body, color: colors.ink,
            }}
          >
            {loadingThemes && <option>Loading…</option>}
            {!loadingThemes && themes.length === 0 && <option>No non-live themes</option>}
            {themes.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
        <Button onClick={deploy} disabled={action !== 'idle' || !selectedThemeId || !baseInstalled}>
          {action === 'deploying' ? 'Deploying…' : 'Deploy theme'}
        </Button>
        <Button variant="secondary" onClick={pullSettings} disabled={action !== 'idle' || !selectedThemeId || !baseInstalled}>
          {action === 'pulling' ? 'Pulling…' : 'Pull settings'}
        </Button>
      </div>

      {!baseInstalled && (
        <div style={{ marginTop: spacing[3], fontSize: fontSize.xs, color: colors.muted }}>
          Install the base theme first — deploy only pushes generated JSONs and assumes the liquid code is already on the target theme.
        </div>
      )}
      {error && (
        <div style={{ marginTop: spacing[3], color: '#b91c1c', fontSize: fontSize.caption }}>{error}</div>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.5 — Theme Colors (9-slot editor)
// ─────────────────────────────────────────────────────────────────────────────

type StoredVariant = {
  name?: string
  colors?: Partial<ThemeColors> | null
  theme_settings?: Record<string, string>
}

function parseStoredVariants(raw: unknown): StoredVariant[] {
  if (!Array.isArray(raw)) return []
  return raw as StoredVariant[]
}

const NEUTRAL_LIGHT_COLORS: ThemeColors = {
  body: '#ffffff',
  text: '#1a1a1a',
  alternative_text: '#ffffff',
  primary_background: '#000000',
  primary_foreground: '#ffffff',
  secondary_background: '#2c2c2c',
  secondary_foreground: '#ffffff',
  tertiary_background: '#f5f5f5',
  tertiary_foreground: '#1a1a1a',
}

function readVariantColors(variant: StoredVariant | undefined): ThemeColors {
  const base: ThemeColors = { ...NEUTRAL_LIGHT_COLORS }
  if (!variant?.colors) return base
  for (const key of THEME_COLOR_KEYS) {
    const value = (variant.colors as Record<string, unknown>)[key]
    if (typeof value === 'string') base[key] = value
  }
  return base
}

function ThemeColorsSection({ brandId, theme, onSaved }: {
  brandId: string
  theme: StoreTheme | null
  onSaved: () => void
}) {
  const [brandPalette, setBrandPalette] = useState<string[]>([])
  const [workingColors, setWorkingColors] = useState<ThemeColors>(NEUTRAL_LIGHT_COLORS)
  const [variantIndex, setVariantIndex] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const saveTimerRef = useRef<number | null>(null)
  const pendingRef = useRef<Partial<ThemeColors>>({})

  const variants = parseStoredVariants(theme?.color_variants)
  const hasMultipleVariants = variants.length > 1

  // Hydrate local state from the row whenever the theme changes or the user
  // switches variants. This also runs on first mount when the server data
  // first lands.
  useEffect(() => {
    if (!theme) return
    const storedIndex = typeof theme.selected_variant === 'number' ? theme.selected_variant : 0
    setVariantIndex(prev => (prev === 0 && storedIndex !== 0 ? storedIndex : prev))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme?.id])

  useEffect(() => {
    if (!theme) return
    const parsed = parseStoredVariants(theme.color_variants)
    const target = parsed[variantIndex] ?? parsed[0]
    setWorkingColors(readVariantColors(target))
    pendingRef.current = {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme?.id, variantIndex])

  // Fetch brand primary/secondary so the picker has real brand swatches,
  // matching the presets pattern the email editor uses.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('brands')
        .select('primary_color, secondary_color')
        .eq('id', brandId)
        .maybeSingle()
      if (cancelled) return
      const palette = [data?.primary_color, data?.secondary_color]
        .filter((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c))
      setBrandPalette(palette)
    })()
    return () => { cancelled = true }
  }, [brandId])

  const presets = Array.from(new Set([
    ...brandPalette,
    ...Object.values(workingColors).filter(v => /^#[0-9a-fA-F]{6}$/.test(v)),
    '#ffffff', '#f5f5f5', '#1a1a1a', '#0a0a0a',
  ]))

  const saveConfig = useCallback(async (payload: {
    colors?: Partial<ThemeColors>
    selected_variant?: number
  }) => {
    if (!theme) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/store/${theme.id}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      pendingRef.current = {}
      setJustSaved(true)
      onSaved()
      setTimeout(() => setJustSaved(false), 1600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [brandId, theme, onSaved])

  function scheduleSave() {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      const batch = pendingRef.current
      if (Object.keys(batch).length === 0) return
      saveConfig({ colors: batch })
    }, 500)
  }

  function updateSlot(key: keyof ThemeColors, value: string) {
    setWorkingColors(prev => ({ ...prev, [key]: value }))
    pendingRef.current = { ...pendingRef.current, [key]: value }
    scheduleSave()
  }

  async function saveAllNow() {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    await saveConfig({ colors: { ...workingColors } })
  }

  async function switchVariant(index: number) {
    // Flush any pending per-field changes on the current variant first so we
    // don't lose edits when the local state is replaced.
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    if (Object.keys(pendingRef.current).length > 0) {
      await saveConfig({ colors: pendingRef.current })
    }
    setVariantIndex(index)
    saveConfig({ selected_variant: index })
  }

  if (!theme) return null

  return (
    <Card title="Theme colors" subtitle="Edit the 9 color slots for the selected variant. Changes auto-save and take effect on the next Deploy.">
      {hasMultipleVariants && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] }}>
          {variants.map((v, i) => {
            const active = i === variantIndex
            return (
              <button
                key={`${v.name || 'variant'}-${i}`}
                onClick={() => switchVariant(i)}
                style={{
                  fontFamily: font.mono,
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.bold,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '8px 14px',
                  borderRadius: radius.pill,
                  border: active ? `1.5px solid ${colors.ink}` : '1px solid var(--border)',
                  background: active ? colors.ink : colors.paper,
                  color: active ? colors.accent : colors.ink,
                  cursor: 'pointer',
                }}
              >
                {v.name || `Variant ${i + 1}`}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[4] }}>
        {THEME_COLOR_KEYS.map(key => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[3],
              padding: '10px 12px',
              borderRadius: radius.md,
              border: '1px solid var(--border)',
              background: colors.paper,
            }}
          >
            <ColorPickerPopover
              value={workingColors[key]}
              onChange={hex => updateSlot(key, hex)}
              presets={presets}
              triggerSize={36}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: fontSize.xs,
                fontWeight: fontWeight.bold,
                color: colors.ink,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {THEME_COLOR_LABELS[key]}
              </div>
              <div style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>
                {workingColors[key].toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
        <Button onClick={saveAllNow} disabled={saving}>
          {saving ? 'Saving…' : 'Save colors'}
        </Button>
        {justSaved && (
          <span style={{ color: '#00a86b', fontSize: fontSize.caption, fontWeight: fontWeight.bold }}>
            Saved
          </span>
        )}
        {error && (
          <span style={{ color: '#b91c1c', fontSize: fontSize.caption }}>{error}</span>
        )}
      </div>
    </Card>
  )
}
