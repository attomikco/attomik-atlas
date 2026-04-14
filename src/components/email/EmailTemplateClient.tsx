'use client'
import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react'
import { colors } from '@/lib/design-tokens'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { buildMasterEmail, DEFAULT_MASTER_CONFIG, deriveEmailColorsFromBrand, type MasterEmailConfig, type EmailColors } from '@/lib/email-master-template'
import EmailActions from './EmailActions'
import ColorPickerPopover from '@/components/ui/ColorPickerPopover'

type TemplateType = 'master' | 'welcome' | 'abandoned_cart' | 'post_purchase' | 'newsletter' | 'promotion' | 'custom'
type TemplateStatus = 'draft' | 'ready'
type EmailTemplateRow = {
  id: string
  brand_id: string
  name: string
  type: TemplateType
  brief: string | null
  email_config: MasterEmailConfig | null
  status: TemplateStatus
  klaviyo_template_id: string | null
  created_at: string
  updated_at: string
}

const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  master: 'Master Brand Email',
  welcome: 'Welcome Series',
  abandoned_cart: 'Abandoned Cart',
  post_purchase: 'Post-Purchase',
  newsletter: 'Newsletter',
  promotion: 'Promotion',
  custom: 'Custom',
}

// Template status badge — single source of truth for the three states shown
// everywhere the active template (or a switcher row) renders: draft, ready
// without a Klaviyo push yet, and ready with a live Klaviyo template id.
type TemplateStatusBadge = { color: string; label: string; dotSymbol: string }
function getTemplateStatusBadge(
  t: { status: TemplateStatus; klaviyo_template_id: string | null } | null | undefined
): TemplateStatusBadge {
  if (t && t.status === 'ready' && t.klaviyo_template_id) {
    return { color: '#22c55e', label: 'Live', dotSymbol: '●' }
  }
  if (t && t.status === 'ready') {
    return { color: '#f59e0b', label: 'Ready', dotSymbol: '●' }
  }
  return { color: '#c0c0c0', label: 'Draft', dotSymbol: '○' }
}

const TEMPLATE_BRIEF_PLACEHOLDERS: Record<TemplateType, string> = {
  master: 'The default brand email — used when no other template fits.',
  welcome: 'First email in a welcome series. Introduce the brand, what we stand for, and give a small first-order incentive.',
  abandoned_cart: 'Remind the shopper they left something behind. Lead with the product, lean on urgency or a small nudge.',
  post_purchase: 'Thank the customer and help them get the most out of what they bought. Include product care or how-to if relevant.',
  newsletter: 'Monthly newsletter. Mix of new arrivals, a story block, and a social CTA.',
  promotion: 'Limited-time offer or sale. Lead with the discount, back it up with product and social proof.',
  custom: 'Describe what this email is for. The AI will pick the right blocks and write the copy.',
}

interface Brand {
  id: string; name: string; website: string | null; logo_url: string | null
  primary_color: string | null; accent_color: string | null; secondary_color?: string | null
  bg_base?: string | null
  text_on_dark?: string | null; text_on_base?: string | null; text_on_accent?: string | null
  font_primary: string | null; font_heading: any; font_body?: any
  products: any[] | null; notes: string | null
}

const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '9px 11px', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' as const }

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14, marginTop: 8 }}>
      <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#000' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{subtitle}</div>}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={on}
      style={{
        width: 34, height: 20, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
        background: on ? '#000' : '#e0e0e0', position: 'relative', transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 16 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ── Accordion context — lets each BlockRow coordinate a single-open
// behavior through the shared state held by the parent component. The
// provider is mounted once around the content section below. ───────────
type BlockAccordionValue = {
  openId: string | null
  setOpenId: (id: string | null) => void
}
const BlockAccordionContext = createContext<BlockAccordionValue>({
  openId: null,
  setOpenId: () => {},
})

function BlockRow({ id, label, isOn, onToggle, children, alwaysOn = false }: {
  id: string
  label: string
  isOn?: boolean
  onToggle?: () => void
  children?: React.ReactNode
  alwaysOn?: boolean
}) {
  const active = alwaysOn || !!isOn
  const { openId, setOpenId } = useContext(BlockAccordionContext)
  const isOpen = openId === id
  const toggleOpen = () => setOpenId(isOpen ? null : id)
  const onHeaderKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleOpen()
    }
  }
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={toggleOpen}
        onKeyDown={onHeaderKey}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          background: active ? '#e6e6e6' : '#fafafa',
          borderRadius: 8,
          border: active ? `1px solid ${colors.borderStrong}` : `1px solid ${colors.border}`,
          transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
          opacity: active ? 1 : 0.6,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{
          fontFamily: 'Barlow, sans-serif', fontSize: 15, fontWeight: 900,
          letterSpacing: '0.01em', textTransform: 'uppercase',
          color: active ? colors.ink : '#888',
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!alwaysOn && onToggle && (
            <span onClick={e => e.stopPropagation()} style={{ display: 'flex' }}>
              <Toggle on={!!isOn} onChange={onToggle} />
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: active ? colors.ink : '#888',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateRows: isOpen ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.2s ease',
      }}>
        <div style={{ minHeight: 0, overflow: 'hidden' }}>
          {children && (
            <div style={{
              marginTop: 10, paddingLeft: 14, paddingRight: 2, paddingBottom: 6,
              borderLeft: `2px solid ${colors.border}`,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Color math — shared between derive logic and the primaryBg re-derivation in updateEmailColor
function getLum(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)) / 255
}
function darkenHex(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - Math.round(2.55 * pct))
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(2.55 * pct))
  const b = Math.max(0, (n & 0xff) - Math.round(2.55 * pct))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
function lightenHex(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (n >> 16) + Math.round(2.55 * pct))
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(2.55 * pct))
  const b = Math.min(255, (n & 0xff) + Math.round(2.55 * pct))
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
function altFromPrimary(primary: string): { altPrimaryBg: string; altPrimaryText: string } {
  const lum = getLum(primary)
  const altPrimaryBg = lum < 0.15 ? lightenHex(primary, 15) : lum < 0.35 ? darkenHex(primary, 10) : darkenHex(primary, 20)
  const altPrimaryText = lum < 0.5 ? '#ffffff' : '#000000'
  return { altPrimaryBg, altPrimaryText }
}

function ImagePicker({ images, value, onPick }: { images: string[]; value?: string; onPick: (url: string) => void }) {
  if (!images.length) {
    return <div style={{ fontSize: 11, color: 'var(--muted)', padding: 12, textAlign: 'center', border: '1px dashed #e0e0e0', borderRadius: 8 }}>No brand images. Upload some in Brand Hub.</div>
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
      {images.map((url, i) => {
        const selected = value === url
        return (
          <button key={i} onClick={() => onPick(url)} style={{
            aspectRatio: '1', overflow: 'hidden', padding: 0, cursor: 'pointer',
            border: selected ? '2px solid #00a86b' : '1.5px solid #e0e0e0',
            borderRadius: 6, background: '#fafafa',
          }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        )
      })}
    </div>
  )
}

export default function EmailTemplateClient({ brand, initialConfig, emails, allImages = [], lifestyleImages = [], productImages = [], campaignId = null }: {
  brand: Brand
  initialConfig: MasterEmailConfig | null
  emails: any[]
  allImages?: string[]
  lifestyleImages?: string[]
  productImages?: string[]
  campaignId?: string | null
}) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'Template' | 'History'>('Template')
  // Single-open accordion state for the content block sidebar. `null` = all
  // collapsed; any other value = the one block id currently expanded.
  const [openBlockId, setOpenBlockId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(600)
  const [copied, setCopied] = useState(false)

  // ── Multi-template state ────────────────────────────────────────────
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([])
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newTemplateModalOpen, setNewTemplateModalOpen] = useState(false)
  const [klaviyoPushing, setKlaviyoPushing] = useState(false)
  const [klaviyoMessage, setKlaviyoMessage] = useState<
    | { type: 'ok'; text: string }
    | { type: 'err'; text: string }
    | { type: 'missing_key'; context: 'push' | 'ready' }
    | null
  >(null)
  const activeTemplate = templates.find(t => t.id === activeTemplateId) || null

  // Normalize any incoming MasterEmailConfig against DEFAULT_MASTER_CONFIG so
  // every string/array field is defined. Saved configs from before a field
  // existed would otherwise flip a controlled <input value={config.x}> from
  // '' to undefined when the saved config gets loaded, triggering React's
  // "changing a controlled input to be uncontrolled" warning. Called from the
  // useState initializer and from every setConfig(row.email_config) site.
  function normalizeConfig(incoming: Partial<MasterEmailConfig> | null | undefined): MasterEmailConfig {
    const merged: MasterEmailConfig = { ...DEFAULT_MASTER_CONFIG, ...(incoming || {}) }
    if (!Array.isArray(merged.enabledBlocks)) merged.enabledBlocks = [...DEFAULT_MASTER_CONFIG.enabledBlocks]
    if (!merged.imageAssignments || typeof merged.imageAssignments !== 'object') merged.imageAssignments = {}
    if (!Array.isArray(merged.testimonials)) merged.testimonials = [...DEFAULT_MASTER_CONFIG.testimonials]
    if (!Array.isArray(merged.faqItems)) merged.faqItems = [...DEFAULT_MASTER_CONFIG.faqItems]
    if (!Array.isArray(merged.products)) merged.products = []
    if (!Array.isArray(merged.igImages) || merged.igImages.length !== 6) merged.igImages = ['', '', '', '', '', '']
    // Legacy migration — the old default light background was #f8f7f4 (cream).
    // Treat that saved value as unset so the new white default takes over.
    if (merged.emailColors?.neutralBg && merged.emailColors.neutralBg.toLowerCase() === '#f8f7f4') {
      merged.emailColors = { ...merged.emailColors, neutralBg: '#ffffff' }
    }
    return merged
  }

  const [config, setConfig] = useState<MasterEmailConfig>(() => {
    const base: MasterEmailConfig = { ...DEFAULT_MASTER_CONFIG }
    base.heroHeadline = `Welcome to ${brand.name}`
    base.heroCta = 'Shop Now'
    base.heroCtaUrl = brand.website || ''
    base.footerTagline = `Crafted with care — ${brand.name}`
    const p0 = brand.products?.[0]
    if (p0) {
      base.productName = p0.name || p0.title || ''
      base.productBody1 = p0.description || ''
      base.productCtaUrl = brand.website || ''
    }
    return normalizeConfig({ ...base, ...(initialConfig || {}) })
  })

  // Auto-populate IG grid from the brand image library on first load. If the
  // user never manually set any IG images, fill the 6 slots from `allImages`
  // (most recent first since the page query orders by created_at). This runs
  // once per brand change — if the user then clears/edits slots manually, we
  // don't clobber their edits.
  const igAutofillAppliedRef = useRef<string | null>(null)
  useEffect(() => {
    if (igAutofillAppliedRef.current === brand.id) return
    const anyIgSet = config.igImages.some(url => !!url)
    if (anyIgSet) {
      igAutofillAppliedRef.current = brand.id
      return
    }
    if (allImages.length === 0) return
    const seeded = [0, 1, 2, 3, 4, 5].map(i => allImages[i] || '')
    update({ igImages: seeded })
    igAutofillAppliedRef.current = brand.id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id, allImages])

  const previewHtml = buildMasterEmail(brand, config, productImages, lifestyleImages)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    const el = iframeRef.current
    if (!el) return
    const doc = el.contentDocument
    if (doc) { doc.open(); doc.write(previewHtml); doc.close() }
  })

  function update(partial: Partial<MasterEmailConfig>) {
    setConfig(prev => ({ ...prev, ...partial }))
    setIsDirty(true)
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // saveConfig is a useCallback that closes over `config`, so a fresh copy
  // exists on every render. A setTimeout scheduled in one render and fired
  // later would otherwise call the stale copy and PATCH the pre-change
  // config — losing color picks, block toggles, and any other non-blur
  // mutation that routes through scheduleAutoSave. Keep a ref pointed at
  // the latest saveConfig so the deferred call always gets the current one.
  const saveConfigRef = useRef<() => Promise<void>>(() => Promise.resolve())
  function scheduleAutoSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { saveConfigRef.current() }, 500)
  }
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }, [])

  // Backfill any keys missing from a legacy saved config (e.g. older configs
  // saved before secondaryBg/secondaryText were added to EmailColors).
  const currentEmailColors: EmailColors = {
    ...deriveEmailColorsFromBrand(brand),
    ...(config.emailColors || {}),
  }

  function updateEmailColor(key: keyof EmailColors, value: string) {
    const next: EmailColors = { ...currentEmailColors, [key]: value }
    if (key === 'primaryBg') {
      // Re-derive dark variant when primary changes so dark-bg blocks follow
      const { altPrimaryBg, altPrimaryText } = altFromPrimary(value)
      next.altPrimaryBg = altPrimaryBg
      next.altPrimaryText = altPrimaryText
    }
    update({ emailColors: next })
    scheduleAutoSave()
  }

  function deriveColorsFromBrand(): EmailColors {
    const primary = brand.primary_color || '#154734'
    const accent = brand.accent_color || '#BFA46D'
    const secondary = brand.secondary_color || '#E9E3D8'
    const primaryText = getLum(primary) < 0.5 ? '#ffffff' : '#000000'
    const secondaryText = (brand as Brand & { text_on_base?: string | null }).text_on_base
      || (getLum(secondary) < 0.5 ? '#ffffff' : '#000000')
    const accentText = (brand as Brand & { text_on_accent?: string | null }).text_on_accent
      || (getLum(accent) > 0.5 ? '#000000' : '#ffffff')
    const lightBg = (brand as Brand & { bg_base?: string | null }).bg_base || '#ffffff'
    const { altPrimaryBg, altPrimaryText } = altFromPrimary(primary)
    return {
      primaryBg: primary,
      primaryText,
      altPrimaryBg,
      altPrimaryText,
      secondaryBg: secondary,
      secondaryText,
      accentColor: accent,
      accentText,
      accentButtonText: accentText,
      neutralBg: lightBg,
      neutralText: '#111111',
      buttonBg: primary,
      buttonText: primaryText,
      altButtonBg: accent,
      altButtonText: accentText,
      headlineColor: primaryText,
    }
  }

  function resetEmailColors() {
    update({ emailColors: deriveColorsFromBrand() })
    scheduleAutoSave()
  }

  function toggleBlock(id: string) {
    setConfig(prev => {
      const set = new Set(prev.enabledBlocks || [])
      if (set.has(id)) set.delete(id); else set.add(id)
      return { ...prev, enabledBlocks: Array.from(set) }
    })
    setIsDirty(true)
    scheduleAutoSave()
  }

  function updateImage(key: 'hero' | 'product', url: string) {
    setConfig(prev => ({ ...prev, imageAssignments: { ...(prev.imageAssignments || {}), [key]: url } }))
    setIsDirty(true)
    scheduleAutoSave()
  }

  async function generateWithAI() {
    setGenerating(true)
    try {
      const res = await fetch('/api/email/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brand.id, campaignId }),
      })
      const data = await res.json()
      if (data.config) {
        const { emailColors: _ignore, enabledBlocks: _ignoreBlocks, ...aiContent } = data.config
        update(aiContent)
        setTimeout(() => saveConfig(), 100)
      }
    } catch (e) {
      console.error('AI generation failed:', e)
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate AI content on first visit when the brand has no saved email
  // config. Without this the page would render with generic placeholders like
  // "Exclusive Offer / 15% Off / SAVE15" until the user manually clicked
  // "Generate with AI". Runs once per brand.
  const autoGenTriedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (autoGenTriedRef.current.has(brand.id)) return
    autoGenTriedRef.current.add(brand.id)
    if (initialConfig == null) {
      generateWithAI()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id])

  // saveConfig writes to the active email_template row via the PATCH API
  // (which also mirrors master-type templates to brands.notes.email_config for
  // the public preview page). Until a template exists we fall back to the old
  // brand.notes write path so first-load saves don't drop the user's edits.
  const saveConfig = useCallback(async () => {
    setSaving(true)
    if (activeTemplateId) {
      try {
        const res = await fetch(`/api/email-templates/${activeTemplateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_config: config }),
        })
        // Parse defensively — an empty 500 body from the route would otherwise
        // throw "SyntaxError: Unexpected end of JSON input" from inside a
        // setTimeout scheduled by scheduleAutoSave, which has no meaningful
        // stack frame to debug from.
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          console.error('[saveConfig] template patch failed:', res.status, data?.error || res.statusText)
        } else if (data?.template) {
          setTemplates(prev => prev.map(t => t.id === activeTemplateId ? data.template : t))
        }
      } catch (e) {
        console.error('[saveConfig] template patch failed:', e)
      }
    } else {
      const existingNotes = (() => { try { return brand.notes ? JSON.parse(brand.notes) : {} } catch { return {} } })()
      await supabase.from('brands').update({
        notes: JSON.stringify({ ...existingNotes, email_config: config }),
      }).eq('id', brand.id)
    }
    setSaving(false)
    setIsDirty(false)
  }, [activeTemplateId, config, brand.id, brand.notes, supabase])

  // Point the ref used by scheduleAutoSave at the latest saveConfig after
  // every render so timeouts scheduled before a state change still fire
  // against the fresh closure.
  useEffect(() => { saveConfigRef.current = saveConfig }, [saveConfig])

  // Load templates on mount. If none exist, auto-create a master template
  // seeded from the current config (which was itself derived from
  // brand.notes.email_config by the parent page).
  useEffect(() => {
    let cancelled = false
    async function loadTemplates() {
      try {
        const res = await fetch(`/api/email-templates?brandId=${brand.id}`)
        const data = await res.json()
        if (cancelled) return
        const rows = (data.templates || []) as EmailTemplateRow[]
        if (rows.length === 0) {
          // Seed master template from the parent-provided initialConfig (or
          // the in-memory default we built at mount).
          const createRes = await fetch('/api/email-templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brand_id: brand.id,
              name: 'Master Brand Email',
              type: 'master',
              email_config: initialConfig || config,
            }),
          })
          const createData = await createRes.json()
          if (!cancelled && createData.template) {
            setTemplates([createData.template])
            setActiveTemplateId(createData.template.id)
            if (createData.template.email_config) setConfig(normalizeConfig(createData.template.email_config))
          }
        } else {
          setTemplates(rows)
          // Prefer master template as the default active row.
          const master = rows.find(r => r.type === 'master') || rows[0]
          setActiveTemplateId(master.id)
          if (master.email_config) setConfig(normalizeConfig(master.email_config))
        }
      } catch (e) {
        console.error('[loadTemplates]', e)
      } finally {
        if (!cancelled) setTemplatesLoaded(true)
      }
    }
    loadTemplates()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id])

  // Switch to a different template — loads its saved config into the editor.
  function switchTemplate(id: string) {
    const row = templates.find(t => t.id === id)
    if (!row) return
    setActiveTemplateId(id)
    setSwitcherOpen(false)
    if (row.email_config) setConfig(normalizeConfig(row.email_config))
    setIsDirty(false)
  }

  // Rename the active template (inline edit in the switcher header).
  async function renameActiveTemplate(next: string) {
    const trimmed = next.trim()
    if (!activeTemplateId || !trimmed) return
    setEditingName(false)
    setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, name: trimmed } : t))
    try {
      await fetch(`/api/email-templates/${activeTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
    } catch (e) {
      console.error('[renameActiveTemplate]', e)
    }
  }

  async function markActiveTemplateReady() {
    if (!activeTemplateId) return

    // Pre-flight: refuse to mark ready unless the brand has a Klaviyo API key.
    // The existing auto-push branch for "missing key" only fires if the PATCH
    // already succeeded — by then the template is ready without anywhere to
    // push it. Blocking up front keeps the ready state meaningful: "ready"
    // implies "pushed (or about to be pushed) to Klaviyo".
    const parsedNotes = (() => {
      try { return brand.notes ? JSON.parse(brand.notes) : null }
      catch { return null }
    })() as { klaviyo_api_key?: string } | null
    const hasKlaviyoKey = typeof parsedNotes?.klaviyo_api_key === 'string'
      && parsedNotes.klaviyo_api_key.trim().length > 0
    if (!hasKlaviyoKey) {
      setKlaviyoMessage({ type: 'missing_key', context: 'ready' })
      return
    }

    // Persist any in-flight edits first so the server push uses the latest
    // saved config, not a stale copy.
    if (isDirty) await saveConfig()
    try {
      const res = await fetch(`/api/email-templates/${activeTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      })
      const data = await res.json()
      if (!data.template) return
      setTemplates(prev => prev.map(t => t.id === activeTemplateId ? data.template : t))

      // Auto-push to Klaviyo. Three outcomes:
      //   1. Missing API key → silent skip (template still marked ready)
      //   2. Push succeeds → confirmation toast
      //   3. Push fails → subtle warning; template stays ready
      try {
        const pushRes = await fetch(`/api/email-templates/${activeTemplateId}/klaviyo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const pushData = await pushRes.json().catch(() => null)
        if (pushData?.success) {
          if (pushData.templateId) {
            setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, klaviyo_template_id: pushData.templateId } : t))
          }
          setKlaviyoMessage({ type: 'ok', text: 'Marked ready · Pushed to Klaviyo' })
          setTimeout(() => setKlaviyoMessage(null), 4000)
        } else if (typeof pushData?.error === 'string' && pushData.error.startsWith('No Klaviyo API key')) {
          // Silent skip — user hasn't connected Klaviyo yet. Marking as ready
          // is still the right outcome; nothing to warn about.
        } else {
          // Surface the actual server-side error (Klaviyo response body, key
          // failure, etc.) instead of the generic "try pushing manually"
          // message — this prints to the browser console so you can debug
          // without tailing the dev server terminal.
          const serverError = pushData?.error || `${pushRes.status} ${pushRes.statusText}`
          console.error('[mark-as-ready] Klaviyo push failed:', serverError, pushData)
          setKlaviyoMessage({
            type: 'err',
            text: `Klaviyo push failed: ${serverError}`,
          })
          setTimeout(() => setKlaviyoMessage(null), 10000)
        }
      } catch {
        setKlaviyoMessage({ type: 'err', text: 'Marked as ready but Klaviyo push failed — try pushing manually.' })
        setTimeout(() => setKlaviyoMessage(null), 6000)
      }
    } catch (e) {
      console.error('[markActiveTemplateReady]', e)
    }
  }

  async function deleteTemplate(id: string, name: string) {
    // Master templates are refused by the API, but also guard here so the
    // button never surfaces an error for them.
    const target = templates.find(t => t.id === id)
    if (!target || target.type === 'master') return
    const ok = window.confirm(
      `Delete "${name}"?\n\nIf this template was pushed to Klaviyo, the Klaviyo template will also be deleted.`
    )
    if (!ok) return
    try {
      const res = await fetch(`/api/email-templates/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setKlaviyoMessage({ type: 'err', text: data.error || 'Delete failed' })
        setTimeout(() => setKlaviyoMessage(null), 6000)
        return
      }
      // If the deleted template was active, switch back to the master first
      // so the config state transitions before the row disappears.
      if (id === activeTemplateId) {
        const master = templates.find(t => t.type === 'master' && t.id !== id)
        if (master) {
          setActiveTemplateId(master.id)
          if (master.email_config) setConfig(normalizeConfig(master.email_config))
          setIsDirty(false)
        }
      }
      setTemplates(prev => prev.filter(t => t.id !== id))
      setSwitcherOpen(false)
    } catch (e) {
      console.error('[deleteTemplate]', e)
      setKlaviyoMessage({ type: 'err', text: 'Delete failed' })
      setTimeout(() => setKlaviyoMessage(null), 6000)
    }
  }

  async function setTemplateToDraft() {
    if (!activeTemplateId) return
    try {
      const res = await fetch(`/api/email-templates/${activeTemplateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      const data = await res.json()
      if (data.template) {
        setTemplates(prev => prev.map(t => t.id === activeTemplateId ? data.template : t))
      }
    } catch (e) {
      console.error('[setTemplateToDraft]', e)
    }
  }

  async function pushActiveTemplateToKlaviyo() {
    if (!activeTemplateId || klaviyoPushing) return
    setKlaviyoPushing(true)
    setKlaviyoMessage(null)
    // Save any pending edits first so the server re-render picks up the
    // latest config when it pushes.
    if (isDirty) await saveConfig()
    try {
      const res = await fetch(`/api/email-templates/${activeTemplateId}/klaviyo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.success) {
        setKlaviyoMessage({ type: 'ok', text: 'Pushed to Klaviyo' })
        if (data.templateId) {
          setTemplates(prev => prev.map(t => t.id === activeTemplateId ? { ...t, klaviyo_template_id: data.templateId } : t))
        }
        setTimeout(() => setKlaviyoMessage(null), 4000)
      } else if (typeof data.error === 'string' && data.error.startsWith('No Klaviyo API key')) {
        setKlaviyoMessage({ type: 'missing_key', context: 'push' })
        // Leave the missing-key message visible — the user needs the link to
        // take action, not a 4-second flash.
      } else {
        setKlaviyoMessage({ type: 'err', text: data.error || 'Push failed' })
        setTimeout(() => setKlaviyoMessage(null), 4000)
      }
    } catch {
      setKlaviyoMessage({ type: 'err', text: 'Push failed' })
      setTimeout(() => setKlaviyoMessage(null), 4000)
    } finally {
      setKlaviyoPushing(false)
    }
  }

  function copyHtml() {
    navigator.clipboard.writeText(previewHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isBlockOn = (id: string) => (config.enabledBlocks || []).includes(id)

  const scrapedColors: string[] = (() => {
    try {
      const n = brand.notes ? JSON.parse(brand.notes) : {}
      return Array.isArray(n.scraped_colors) ? n.scraped_colors : []
    } catch { return [] }
  })()

  const colorPresets: string[] = [
    brand.primary_color,
    brand.secondary_color,
    brand.accent_color,
    brand.bg_base,
    brand.text_on_dark,
    brand.text_on_base,
    brand.text_on_accent,
    ...scrapedColors,
    '#000000',
    '#ffffff',
    '#f5f5f5',
    '#1a1a1a',
  ].filter((c): c is string => typeof c === 'string' && c.length > 0)

  const emailColorFields: Array<{ key: keyof EmailColors; label: string }> = [
    { key: 'primaryBg', label: 'Primary' },
    { key: 'primaryText', label: 'Text on Primary' },
    { key: 'secondaryBg', label: 'Secondary' },
    { key: 'secondaryText', label: 'Text on Secondary' },
    { key: 'accentColor', label: 'Accent' },
    { key: 'accentButtonText', label: 'Text on Accent' },
    { key: 'neutralBg', label: 'Light Background' },
    { key: 'neutralText', label: 'Text on Light BG' },
    { key: 'buttonBg', label: 'Button BG' },
    { key: 'buttonText', label: 'Text on Button' },
  ]

  const isLocked = activeTemplate?.status === 'ready'
  const activeBadge = getTemplateStatusBadge(activeTemplate)

  const templatePanel = (
    <div style={{ paddingBottom: 80 }}>
      {/* Template switcher */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <FieldLabel>Template</FieldLabel>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: '#fafafa',
          border: '1.5px solid #e0e0e0', borderRadius: 10,
        }}>
          {/* Status dot */}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: activeBadge.color,
            flexShrink: 0,
          }} />
          {/* Name (click to edit) */}
          {editingName ? (
            <input
              autoFocus
              defaultValue={activeTemplate?.name || ''}
              onBlur={e => renameActiveTemplate(e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') renameActiveTemplate(e.currentTarget.value)
                if (e.key === 'Escape') setEditingName(false)
              }}
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
            />
          ) : (
            <button
              onClick={() => activeTemplate && setEditingName(true)}
              style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {activeTemplate?.name || (templatesLoaded ? 'Untitled' : 'Loading…')}
            </button>
          )}
          {/* Dropdown arrow */}
          <button
            onClick={() => setSwitcherOpen(v => !v)}
            aria-label="Switch template"
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#666', fontSize: 12, lineHeight: 1 }}
          >
            ▾
          </button>
        </div>

        {switcherOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 30, overflow: 'hidden',
          }}>
            {templates.map(t => {
              const badge = getTemplateStatusBadge(t)
              const canDelete = t.type !== 'master'
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    background: t.id === activeTemplateId ? '#f5f5f5' : '#fff',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <button
                    onClick={() => switchTemplate(t.id)}
                    style={{
                      flex: 1, textAlign: 'left', padding: '10px 12px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: badge.color,
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{TEMPLATE_TYPE_LABELS[t.type] || t.type}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 800, color: badge.color,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      flexShrink: 0,
                    }}>
                      {badge.dotSymbol} {badge.label}
                    </div>
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); deleteTemplate(t.id, t.name) }}
                      title="Delete template"
                      aria-label={`Delete ${t.name}`}
                      style={{
                        padding: '0 14px', background: 'none', border: 'none',
                        borderLeft: '1px solid #f0f0f0', cursor: 'pointer',
                        color: '#999', fontSize: 18, lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              )
            })}
            <button
              onClick={() => { setSwitcherOpen(false); setNewTemplateModalOpen(true) }}
              style={{
                width: '100%', textAlign: 'left', padding: '12px',
                background: '#000', color: '#00ff97',
                border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 800, fontFamily: 'Barlow, sans-serif',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}
            >
              + New Template
            </button>
          </div>
        )}
      </div>

      {/* Locked banner — only rendered when the active template is 'ready'.
          Stays outside the fieldset below so the Edit button remains clickable. */}
      {isLocked && (
        <div style={{
          marginBottom: 20, padding: '12px 14px',
          background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3412', flex: 1 }}>
            This template is live.
          </div>
          <button
            type="button"
            onClick={setTemplateToDraft}
            style={{
              background: '#000', color: '#fff',
              border: 'none', borderRadius: 999,
              padding: '6px 14px', fontSize: 11, fontWeight: 800,
              fontFamily: 'Barlow, sans-serif', letterSpacing: '0.06em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>
      )}

      <fieldset disabled={isLocked} style={{
        border: 'none', padding: 0, margin: 0, minInlineSize: 'auto',
        ...(isLocked ? { pointerEvents: 'none', opacity: 0.55 } : null),
      }}>
      {/* AI Generate */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={generateWithAI} disabled={generating}
          style={{
            width: '100%', padding: '12px', background: generating ? '#333' : '#000',
            color: '#00ff97', fontFamily: 'Barlow, sans-serif', fontWeight: 800,
            fontSize: 13, borderRadius: 999, border: 'none', cursor: generating ? 'wait' : 'pointer',
            letterSpacing: '0.04em', textTransform: 'uppercase', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {generating && <div style={{ width: 14, height: 14, border: '2px solid rgba(0,255,151,0.3)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
          {generating ? 'Generating...' : campaignId ? 'Generate from Campaign Brief' : 'Generate from Brand Hub'}
        </button>
        <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
          {campaignId ? 'AI will use campaign brief + brand voice' : 'AI will use brand hub data + products'}
        </div>
      </div>

      {/* Settings */}
      <SectionHeader title="Settings" subtitle="Subject line & preview" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        <Field label="Subject Line">
          <input value={config.subjectLine} onChange={e => update({ subjectLine: e.target.value })} onBlur={saveConfig}
            placeholder="e.g. Welcome to [Brand] — Here's 10% Off" style={inputStyle} />
        </Field>
        <Field label="Preview Text">
          <input value={config.previewText} onChange={e => update({ previewText: e.target.value })} onBlur={saveConfig}
            placeholder="Short text shown after the subject in inbox" style={inputStyle} />
        </Field>
      </div>

      {/* Colors */}
      <SectionHeader title="Colors" subtitle="Template palette" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {emailColorFields.map(({ key, label }) => {
          const value = currentEmailColors[key]
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ColorPickerPopover
                value={value}
                onChange={v => updateEmailColor(key, v)}
                presets={colorPresets}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 1 }}>{label}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#999' }}>{value.toUpperCase()}</div>
              </div>
            </div>
          )
        })}
        <button onClick={resetEmailColors}
          style={{ marginTop: 4, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
          Reset to Brand Hub colors
        </button>
      </div>

      {/* Content */}
      <SectionHeader title="Content" subtitle="13 blocks + shell" />

      <BlockAccordionContext.Provider value={{ openId: openBlockId, setOpenId: setOpenBlockId }}>
      <BlockRow id="announcement" label="Announcement Bar" alwaysOn>
        <Field label="Text">
          <input value={config.announcementText} onChange={e => update({ announcementText: e.target.value })} onBlur={saveConfig}
            placeholder="Free Shipping On Orders Over $50" style={inputStyle} />
        </Field>
      </BlockRow>

      <BlockRow id="hero-image" label="Hero Image" isOn={isBlockOn('01a')} onToggle={() => toggleBlock('01a')}>
        <ImagePicker images={allImages} value={config.imageAssignments?.hero} onPick={url => updateImage('hero', url)} />
      </BlockRow>

      <BlockRow id="hero-text" label="Hero Text" isOn={isBlockOn('01b')} onToggle={() => toggleBlock('01b')}>
        <Field label="Eyebrow"><input value={config.heroEyebrow} onChange={e => update({ heroEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.heroHeadline} onChange={e => update({ heroHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Body"><textarea value={config.heroBody} onChange={e => update({ heroBody: e.target.value })} onBlur={saveConfig} rows={3} style={textareaStyle} /></Field>
      </BlockRow>

      <BlockRow id="cta-button" label="CTA Button" isOn={isBlockOn('01c')} onToggle={() => toggleBlock('01c')}>
        <Field label="Button Text"><input value={config.heroCta} onChange={e => update({ heroCta: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Button URL"><input value={config.heroCtaUrl} onChange={e => update({ heroCtaUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
      </BlockRow>

      <BlockRow id="promo" label="Promo Code" isOn={isBlockOn('02')} onToggle={() => toggleBlock('02')}>
        <Field label="Eyebrow"><input value={config.promoEyebrow} onChange={e => update({ promoEyebrow: e.target.value })} onBlur={saveConfig} placeholder="Exclusive Offer" style={inputStyle} /></Field>
        <Field label="Discount"><input value={config.promoDiscount} onChange={e => update({ promoDiscount: e.target.value })} onBlur={saveConfig} placeholder="15% Off" style={inputStyle} /></Field>
        <Field label="Subtitle"><input value={config.promoSubtitle} onChange={e => update({ promoSubtitle: e.target.value })} onBlur={saveConfig} placeholder="Your First Order" style={inputStyle} /></Field>
        <Field label="Code"><input value={config.promoCode} onChange={e => update({ promoCode: e.target.value })} onBlur={saveConfig} placeholder="SAVE15" style={inputStyle} /></Field>
        <Field label="Expiry Note"><input value={config.promoExpiry} onChange={e => update({ promoExpiry: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA Text"><input value={config.promoCta} onChange={e => update({ promoCta: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA URL"><input value={config.promoCtaUrl} onChange={e => update({ promoCtaUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
      </BlockRow>

      <BlockRow id="pillars" label="3-Pillar Feature" isOn={isBlockOn('03')} onToggle={() => toggleBlock('03')}>
        <Field label="Eyebrow"><input value={config.pillarsEyebrow} onChange={e => update({ pillarsEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.pillarsHeadline} onChange={e => update({ pillarsHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        {[1, 2, 3].map(n => {
          const iKey = `pillar${n}Icon`
          const lKey = `pillar${n}Label`
          const bKey = `pillar${n}Body`
          const c = config as any
          return (
            <div key={n} style={{ padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>Pillar {n}</div>
              <input value={c[iKey] || ''} onChange={e => update({ [iKey]: e.target.value } as any)} onBlur={saveConfig} placeholder="Icon (e.g. ✦)" style={inputStyle} />
              <input value={c[lKey] || ''} onChange={e => update({ [lKey]: e.target.value } as any)} onBlur={saveConfig} placeholder="Label" style={inputStyle} />
              <input value={c[bKey] || ''} onChange={e => update({ [bKey]: e.target.value } as any)} onBlur={saveConfig} placeholder="Body" style={inputStyle} />
            </div>
          )
        })}
      </BlockRow>

      <BlockRow id="story" label="Story / Nostalgia" isOn={isBlockOn('04')} onToggle={() => toggleBlock('04')}>
        <Field label="Eyebrow"><input value={config.storyEyebrow} onChange={e => update({ storyEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.storyHeadline} onChange={e => update({ storyHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Body"><textarea value={config.storyBody} onChange={e => update({ storyBody: e.target.value })} onBlur={saveConfig} rows={3} style={textareaStyle} /></Field>
        <Field label="Quote"><input value={config.storyQuote} onChange={e => update({ storyQuote: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Quote Attribution"><input value={config.storyQuoteAttribution} onChange={e => update({ storyQuoteAttribution: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Closing"><textarea value={config.storyClosing} onChange={e => update({ storyClosing: e.target.value })} onBlur={saveConfig} rows={2} style={textareaStyle} /></Field>
      </BlockRow>

      <BlockRow id="product" label="Product Feature" isOn={isBlockOn('05')} onToggle={() => toggleBlock('05')}>
        <Field label="Product Image">
          <ImagePicker images={allImages} value={config.imageAssignments?.product} onPick={url => updateImage('product', url)} />
        </Field>
        <Field label="Badge"><input value={config.productBadge} onChange={e => update({ productBadge: e.target.value })} onBlur={saveConfig} placeholder="Best Seller" style={inputStyle} /></Field>
        <Field label="Name"><input value={config.productName} onChange={e => update({ productName: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Body 1"><textarea value={config.productBody1} onChange={e => update({ productBody1: e.target.value })} onBlur={saveConfig} rows={2} style={textareaStyle} /></Field>
        <Field label="Body 2"><textarea value={config.productBody2} onChange={e => update({ productBody2: e.target.value })} onBlur={saveConfig} rows={2} style={textareaStyle} /></Field>
        <Field label="CTA Text"><input value={config.productCta} onChange={e => update({ productCta: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA URL"><input value={config.productCtaUrl} onChange={e => update({ productCtaUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
      </BlockRow>

      <BlockRow id="callout" label="Callout Card" isOn={isBlockOn('11')} onToggle={() => toggleBlock('11')}>
        <Field label="Eyebrow"><input value={config.calloutEyebrow} onChange={e => update({ calloutEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.calloutHeadline} onChange={e => update({ calloutHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Body"><textarea value={config.calloutBody} onChange={e => update({ calloutBody: e.target.value })} onBlur={saveConfig} rows={2} style={textareaStyle} /></Field>
        <Field label="CTA Text"><input value={config.calloutCta} onChange={e => update({ calloutCta: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA URL"><input value={config.calloutCtaUrl} onChange={e => update({ calloutCtaUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
      </BlockRow>

      <BlockRow id="howto" label="How-To / 3 Steps" isOn={isBlockOn('06')} onToggle={() => toggleBlock('06')}>
        <Field label="Eyebrow"><input value={config.howToEyebrow} onChange={e => update({ howToEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.howToHeadline} onChange={e => update({ howToHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Subheadline"><input value={config.howToSubheadline} onChange={e => update({ howToSubheadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        {[1, 2, 3].map(n => {
          const lKey = `step${n}Label`
          const bKey = `step${n}Body`
          const c = config as any
          return (
            <div key={n} style={{ padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>Step {n}</div>
              <input value={c[lKey] || ''} onChange={e => update({ [lKey]: e.target.value } as any)} onBlur={saveConfig} placeholder="Label" style={inputStyle} />
              <input value={c[bKey] || ''} onChange={e => update({ [bKey]: e.target.value } as any)} onBlur={saveConfig} placeholder="Body" style={inputStyle} />
            </div>
          )
        })}
        <Field label="Note"><input value={config.howToNote} onChange={e => update({ howToNote: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA Text"><input value={config.howToCta} onChange={e => update({ howToCta: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA URL"><input value={config.howToCtaUrl} onChange={e => update({ howToCtaUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
      </BlockRow>

      <BlockRow id="testimonials" label="Testimonials" isOn={isBlockOn('07')} onToggle={() => toggleBlock('07')}>
        <Field label="Eyebrow"><input value={config.testimonialsEyebrow} onChange={e => update({ testimonialsEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.testimonialsHeadline} onChange={e => update({ testimonialsHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        {config.testimonials.map((t, i) => (
          <div key={i} style={{ padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>Testimonial {i + 1}</div>
            <textarea value={t.quote} onChange={e => { const u = [...config.testimonials]; u[i] = { ...u[i], quote: e.target.value }; update({ testimonials: u }) }} onBlur={saveConfig} placeholder="Quote" rows={2} style={textareaStyle} />
            <input value={t.author} onChange={e => { const u = [...config.testimonials]; u[i] = { ...u[i], author: e.target.value }; update({ testimonials: u }) }} onBlur={saveConfig} placeholder="Author" style={inputStyle} />
          </div>
        ))}
      </BlockRow>

      {/* Hide block 08 entirely when there are no products to display — neither
          in config.products nor in the Supabase-hosted productImages pool. */}
      {(config.products.length > 0 || productImages.length > 0) && (
        <BlockRow id="youll-also-love" label="You'll Also Love" isOn={isBlockOn('08')} onToggle={() => toggleBlock('08')}>
          <Field label="Eyebrow"><input value={config.youllAlsoLoveEyebrow} onChange={e => update({ youllAlsoLoveEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
          <Field label="Headline"><input value={config.youllAlsoLoveHeadline} onChange={e => update({ youllAlsoLoveHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
          <Field label="Subheadline"><input value={config.youllAlsoLoveSubheadline} onChange={e => update({ youllAlsoLoveSubheadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
          {config.products.map((p, i) => (
            <div key={i} style={{ padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>Product {i + 1}</div>
              <input value={p.name} onChange={e => { const u = [...config.products]; u[i] = { ...u[i], name: e.target.value }; update({ products: u }) }} onBlur={saveConfig} placeholder="Name" style={inputStyle} />
              <input value={p.description} onChange={e => { const u = [...config.products]; u[i] = { ...u[i], description: e.target.value }; update({ products: u }) }} onBlur={saveConfig} placeholder="Description" style={inputStyle} />
              <input value={p.imageUrl} onChange={e => { const u = [...config.products]; u[i] = { ...u[i], imageUrl: e.target.value }; update({ products: u }) }} onBlur={saveConfig} placeholder="Image URL (leave blank to auto-fill from brand library)" style={inputStyle} />
              <input value={p.url} onChange={e => { const u = [...config.products]; u[i] = { ...u[i], url: e.target.value }; update({ products: u }) }} onBlur={saveConfig} placeholder="Link URL" style={inputStyle} />
            </div>
          ))}
          <button onClick={() => update({ products: [...config.products, { name: '', description: '', imageUrl: '', url: '' }] })}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', width: '100%' }}>
            + Add product
          </button>
        </BlockRow>
      )}

      <BlockRow id="faq" label="FAQ" isOn={isBlockOn('12')} onToggle={() => toggleBlock('12')}>
        <Field label="Eyebrow"><input value={config.faqEyebrow} onChange={e => update({ faqEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.faqHeadline} onChange={e => update({ faqHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        {config.faqItems.map((f, i) => (
          <div key={i} style={{ padding: 10, background: '#fafafa', borderRadius: 8, border: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>FAQ {i + 1}</div>
            <input value={f.question} onChange={e => { const u = [...config.faqItems]; u[i] = { ...u[i], question: e.target.value }; update({ faqItems: u }) }} onBlur={saveConfig} placeholder="Question" style={inputStyle} />
            <textarea value={f.answer} onChange={e => { const u = [...config.faqItems]; u[i] = { ...u[i], answer: e.target.value }; update({ faqItems: u }) }} onBlur={saveConfig} placeholder="Answer" rows={2} style={textareaStyle} />
          </div>
        ))}
        <button onClick={() => update({ faqItems: [...config.faqItems, { question: '', answer: '' }] })}
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', width: '100%' }}>
          + Add FAQ
        </button>
        <Field label="CTA Text"><input value={config.faqCta} onChange={e => update({ faqCta: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA URL"><input value={config.faqCtaUrl} onChange={e => update({ faqCtaUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
      </BlockRow>

      <BlockRow id="instagram" label="Instagram Grid" isOn={isBlockOn('09')} onToggle={() => toggleBlock('09')}>
        <Field label="Eyebrow"><input value={config.igEyebrow} onChange={e => update({ igEyebrow: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Headline"><input value={config.igHeadline} onChange={e => update({ igHeadline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Handle"><input value={config.igHandle} onChange={e => update({ igHandle: e.target.value })} onBlur={saveConfig} placeholder="@handle" style={inputStyle} /></Field>
        <Field label="Instagram URL"><input value={config.igUrl} onChange={e => update({ igUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="CTA Text"><input value={config.igCta} onChange={e => update({ igCta: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Images (6)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 4 }}>Slot {i + 1}</div>
                <ImagePicker
                  images={allImages}
                  value={config.igImages[i] || undefined}
                  onPick={url => {
                    const u = [...config.igImages]
                    u[i] = url
                    update({ igImages: u })
                    scheduleAutoSave()
                  }}
                />
              </div>
            ))}
          </div>
        </Field>
      </BlockRow>

      <BlockRow id="footer" label="Footer" alwaysOn>
        <Field label="Tagline"><input value={config.footerTagline} onChange={e => update({ footerTagline: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Instagram URL"><input value={config.instagramUrl} onChange={e => update({ instagramUrl: e.target.value })} onBlur={saveConfig} style={inputStyle} /></Field>
        <Field label="Privacy Policy URL"><input value={config.privacyPolicyUrl} onChange={e => update({ privacyPolicyUrl: e.target.value })} onBlur={saveConfig} placeholder={`${brand.website || ''}/policies/privacy-policy`} style={inputStyle} /></Field>
        <Field label="Refund Policy URL"><input value={config.refundPolicyUrl} onChange={e => update({ refundPolicyUrl: e.target.value })} onBlur={saveConfig} placeholder={`${brand.website || ''}/policies/refund-policy`} style={inputStyle} /></Field>
        <Field label="Terms of Service URL"><input value={config.termsOfServiceUrl} onChange={e => update({ termsOfServiceUrl: e.target.value })} onBlur={saveConfig} placeholder={`${brand.website || ''}/policies/terms-of-service`} style={inputStyle} /></Field>
      </BlockRow>
      </BlockAccordionContext.Provider>
      </fieldset>
    </div>
  )

  // ── History tab — Edit action on a template card ──
  // Loads the template into the editor and flips back to the Template tab.
  function editTemplateFromHistory(id: string) {
    switchTemplate(id)
    setActiveTab('Template')
  }

  // ── History tab — download rendered HTML for a template ──
  // Built client-side from the template's saved email_config using the same
  // buildMasterEmail pipeline the preview iframe uses. Keeps download parity
  // with the campaign email "↓ HTML" action.
  function downloadTemplateHtml(t: EmailTemplateRow) {
    if (!t.email_config) return
    const html = buildMasterEmail(
      brand,
      normalizeConfig(t.email_config),
      productImages,
      lifestyleImages
    )
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(t.name || 'template').replace(/[^a-z0-9-_ ]+/gi, '-')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Sort templates by updated_at desc for the History list without mutating
  // the switcher's stable order.
  const historyTemplates = [...templates].sort((a, b) => {
    const ta = a.updated_at || a.created_at || ''
    const tb = b.updated_at || b.created_at || ''
    return tb.localeCompare(ta)
  })

  // Small action-pill style shared across the History cards.
  const historyPillBase: React.CSSProperties = {
    fontSize: 11, fontWeight: 700,
    padding: '6px 12px', borderRadius: 999,
    border: '1px solid var(--border)',
    background: '#fff', color: '#000',
    textDecoration: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 4,
  }

  const historyPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* ── Section 1 — Email Templates ── */}
      <section>
        <div style={{
          fontFamily: 'Barlow, sans-serif', fontWeight: 900,
          fontSize: 13, color: '#000',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          marginBottom: 12,
        }}>
          Email Templates
        </div>
        {historyTemplates.length === 0 ? (
          <div style={{
            fontSize: 12, color: 'var(--muted)', padding: '14px 16px',
            border: '1px dashed var(--border)', borderRadius: 8,
          }}>
            No templates yet. Create your first template in the Template tab.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historyTemplates.map(t => {
              const badge = getTemplateStatusBadge(t)
              const klaviyoUrl = t.klaviyo_template_id
                ? `https://www.klaviyo.com/template/${t.klaviyo_template_id}/edit`
                : null
              return (
                <div key={t.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16,
                  background: '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 800, color: '#000',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.name || 'Untitled'}
                      </div>
                      <div style={{
                        marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '3px 8px', borderRadius: 999,
                          background: '#f0f0f0', color: '#000',
                        }}>
                          {TEMPLATE_TYPE_LABELS[t.type] || t.type}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: badge.color,
                        }}>
                          {badge.dotSymbol} {badge.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {new Date(t.updated_at || t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => editTemplateFromHistory(t.id)}
                      style={historyPillBase}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTemplateHtml(t)}
                      style={historyPillBase}
                    >
                      ↓ HTML
                    </button>
                    {klaviyoUrl ? (
                      <a
                        href={klaviyoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          ...historyPillBase,
                          background: '#00ff97',
                          borderColor: '#00ff97',
                        }}
                      >
                        Klaviyo →
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Push to Klaviyo first"
                        style={{
                          ...historyPillBase,
                          color: 'var(--muted)',
                          cursor: 'not-allowed',
                          opacity: 0.7,
                        }}
                      >
                        Push to Klaviyo first
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Section 2 — Campaign Emails ── */}
      <section>
        <div style={{
          fontFamily: 'Barlow, sans-serif', fontWeight: 900,
          fontSize: 13, color: '#000',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          marginBottom: 12,
        }}>
          Campaign Emails
        </div>
        {!emails?.length ? (
          <div style={{
            fontSize: 12, color: 'var(--muted)', padding: '14px 16px',
            border: '1px dashed var(--border)', borderRadius: 8,
          }}>
            No campaign emails generated yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {emails.map((e: any, i: number) => {
              let subject = ''
              let hasHtml = false
              try {
                const p = JSON.parse(e.content)
                subject = p.config?.subjectLine || p.subject || ''
                hasHtml = !!p.html
              } catch {}
              const campaignName = e.campaign?.name || 'Email'
              const primary = subject || campaignName
              const secondary = subject ? campaignName : ''
              return (
                <div key={e.id} style={{ padding: '12px 0', borderBottom: i < emails.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {primary}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                    {secondary && <>{secondary} · </>}
                    {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {e.campaign?.id && <Link href={`/preview/${e.campaign.id}`} style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textDecoration: 'none', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 999 }}>View</Link>}
                    {hasHtml && e.campaign?.id && <EmailActions campaignId={e.campaign.id} content={e.content} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <>
    {newTemplateModalOpen && (
      <NewTemplateModal
        brandId={brand.id}
        onClose={() => setNewTemplateModalOpen(false)}
        onCreated={row => {
          setTemplates(prev => [...prev, row])
          setActiveTemplateId(row.id)
          if (row.email_config) setConfig(normalizeConfig(row.email_config))
          setIsDirty(false)
          setNewTemplateModalOpen(false)
        }}
      />
    )}
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 72px)', padding: '24px 32px', alignItems: 'flex-start' }}>
      <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', paddingRight: 8, position: 'relative', height: 'calc(100vh - 120px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase' }}>Email</div>
          <button
            type="button"
            onClick={() => setNewTemplateModalOpen(true)}
            style={{ fontSize: 11, fontWeight: 700, color: '#000', background: '#00ff97', padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
          >
            + New
          </button>
        </div>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {(['Template', 'History'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '10px 20px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: activeTab === tab ? '2px solid #000' : '2px solid transparent', background: 'none', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? '#000' : 'var(--muted)', cursor: 'pointer' }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Template' ? templatePanel : historyPanel}

        {activeTab === 'Template' && (
          <div style={{
            position: 'sticky', bottom: 0, background: '#fff',
            borderTop: '1px solid var(--border)',
            padding: '12px 0 8px',
            display: 'flex', flexDirection: 'column', gap: 8, zIndex: 5,
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyHtml}
                style={{ flex: 1, padding: '11px', background: '#fff', color: '#000', fontWeight: 700, fontSize: 12, borderRadius: 999, border: '1px solid var(--border)', cursor: 'pointer' }}>
                {copied ? '✓ Copied' : 'Copy HTML'}
              </button>
              <button onClick={saveConfig} disabled={saving || !isDirty}
                style={{
                  flex: 1, padding: '11px',
                  background: isDirty ? '#000' : '#e0e0e0',
                  color: isDirty ? '#00ff97' : '#999',
                  fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 12,
                  borderRadius: 999, border: 'none',
                  cursor: isDirty && !saving ? 'pointer' : 'default',
                }}>
                {saving ? 'Saving...' : isDirty ? 'Save template' : 'Saved'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={markActiveTemplateReady}
                disabled={!activeTemplateId || isLocked}
                style={{
                  flex: 1, padding: '10px', background: '#fff',
                  color: isLocked ? activeBadge.color : '#000',
                  fontWeight: 700, fontSize: 11, borderRadius: 999,
                  border: `1px solid ${isLocked ? activeBadge.color : 'var(--border)'}`,
                  cursor: isLocked ? 'default' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
              >
                {isLocked
                  ? (activeTemplate?.klaviyo_template_id ? '✓ Live in Klaviyo' : '✓ Ready')
                  : 'Mark as ready'}
              </button>
              <button
                onClick={pushActiveTemplateToKlaviyo}
                disabled={!activeTemplateId || klaviyoPushing}
                title="Push the active template to Klaviyo"
                style={{
                  flex: 1, padding: '10px',
                  background: klaviyoMessage?.type === 'ok' ? '#00ff97' : '#f0f0f0',
                  color: klaviyoMessage?.type === 'ok' ? '#000' : '#333',
                  fontWeight: 700, fontSize: 11, borderRadius: 999, border: 'none',
                  cursor: klaviyoPushing ? 'wait' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
              >
                {klaviyoPushing ? '...' : klaviyoMessage?.type === 'ok' ? '✓ Klaviyo' : 'Push to Klaviyo'}
              </button>
            </div>
            {klaviyoMessage?.type === 'err' && (
              <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center' }}>{klaviyoMessage.text}</div>
            )}
            {klaviyoMessage?.type === 'missing_key' && klaviyoMessage.context === 'push' && (
              <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center' }}>
                <Link
                  href={`/brand-setup/${brand.id}`}
                  style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 700 }}
                >
                  Add your Klaviyo API key in Brand Hub → Integrations
                </Link>
              </div>
            )}
            {klaviyoMessage?.type === 'missing_key' && klaviyoMessage.context === 'ready' && (
              <div style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', lineHeight: 1.4 }}>
                No Klaviyo API key connected. Add it in{' '}
                <Link
                  href={`/brand-setup/${brand.id}`}
                  style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 700 }}
                >
                  Brand Hub → Integrations
                </Link>
                {' '}before marking as ready.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, background: '#e0e0e0', borderRadius: 16, overflow: 'hidden', position: 'sticky', top: 24, height: 'calc(100vh - 120px)' }}>
        {generating && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Barlow, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Generating email...</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Pulling from your Brand Hub</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 8 }}>
          <button onClick={() => setPreviewWidth(600)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 600 ? '#000' : '#fff', color: previewWidth === 600 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Desktop</button>
          <button onClick={() => setPreviewWidth(375)} style={{ padding: '4px 10px', borderRadius: 6, background: previewWidth === 375 ? '#000' : '#fff', color: previewWidth === 375 ? '#fff' : '#666', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Mobile</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', height: '100%', overflowY: 'auto' }}>
          <iframe ref={iframeRef} style={{ width: previewWidth, height: 'calc(100vh - 140px)', border: 'none', background: '#fff', borderRadius: 0 }} title="Email preview" />
        </div>
      </div>
    </div>
    </>
  )
}

// ── New Template modal ────────────────────────────────────────────────
function NewTemplateModal({ brandId, onClose, onCreated }: {
  brandId: string
  onClose: () => void
  onCreated: (row: EmailTemplateRow) => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<TemplateType>('welcome')
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim() || !brief.trim()) {
      setError('Name and brief are required')
      return
    }
    setBusy(true)
    setError('')
    try {
      // 1. Create the template row
      const createRes = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brandId, name: name.trim(), type, brief: brief.trim() }),
      })
      const createData = await createRes.json()
      if (!createData.template) {
        setError(createData.error || 'Create failed')
        setBusy(false)
        return
      }
      // 2. Ask the AI to fill it in from the brief
      const genRes = await fetch(`/api/email-templates/${createData.template.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim() }),
      })
      const genData = await genRes.json()
      onCreated(genData.template || createData.template)
    } catch (e) {
      console.error('[NewTemplateModal]', e)
      setError('Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 28, width: 520, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <div style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: '#000' }}>
          New Template
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>Template Name</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome Email 1" style={inputStyle} disabled={busy} />
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(TEMPLATE_TYPE_LABELS) as TemplateType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                disabled={busy}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  background: type === t ? '#000' : '#fff',
                  color: type === t ? '#00ff97' : '#444',
                  border: `1.5px solid ${type === t ? '#000' : '#e0e0e0'}`,
                  fontSize: 12, fontWeight: 700, cursor: busy ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {TEMPLATE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>Brief</div>
          <textarea
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={5}
            placeholder={TEMPLATE_BRIEF_PLACEHOLDERS[type]}
            disabled={busy}
            style={textareaStyle}
          />
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            Describe what this email is for. The AI will pick the right blocks and write the copy.
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: '#ef4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ flex: 1, padding: '12px', background: '#fff', color: '#000', fontWeight: 700, fontSize: 13, borderRadius: 999, border: '1.5px solid #e0e0e0', cursor: busy ? 'default' : 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{
              flex: 2, padding: '12px',
              background: busy ? '#333' : '#000', color: '#00ff97',
              fontFamily: 'Barlow, sans-serif', fontWeight: 800, fontSize: 13,
              borderRadius: 999, border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {busy && <div style={{ width: 14, height: 14, border: '2px solid rgba(0,255,151,0.3)', borderTopColor: '#00ff97', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
            {busy ? 'Building your template...' : 'Generate Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
