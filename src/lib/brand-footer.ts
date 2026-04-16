// Brand-global footer fields. Shared by the email renderer and the brand
// hub editor. Lives at brand.notes.footer (brand.notes is a TEXT column
// holding JSON — use readBrandFooter() to parse safely).

export interface BrandFooter {
  tagline: string
  instagramUrl: string
  privacyPolicyUrl: string
  refundPolicyUrl: string
  termsOfServiceUrl: string
  address: string
  unsubscribeText: string
  footerLinks: Array<{ label: string; url: string }>
}

export const DEFAULT_BRAND_FOOTER: BrandFooter = {
  tagline: '',
  instagramUrl: '',
  privacyPolicyUrl: '',
  refundPolicyUrl: '',
  termsOfServiceUrl: '',
  address: '',
  unsubscribeText: '',
  footerLinks: [],
}

// Normalize a partial/unknown object against the default, coercing each
// key defensively. Accepts the parsed brand.notes.footer (which may be
// undefined, null, or arbitrary JSON from older brands).
export function normalizeBrandFooter(raw: unknown): BrandFooter {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  const links = Array.isArray(r.footerLinks)
    ? (r.footerLinks as unknown[])
        .map(item => {
          if (!item || typeof item !== 'object') return null
          const it = item as Record<string, unknown>
          return { label: str(it.label), url: str(it.url) }
        })
        .filter((x): x is { label: string; url: string } => !!x)
    : []
  return {
    tagline: str(r.tagline),
    instagramUrl: str(r.instagramUrl),
    privacyPolicyUrl: str(r.privacyPolicyUrl),
    refundPolicyUrl: str(r.refundPolicyUrl),
    termsOfServiceUrl: str(r.termsOfServiceUrl),
    address: str(r.address),
    unsubscribeText: str(r.unsubscribeText),
    footerLinks: links,
  }
}

// Pull the footer out of brand.notes. `notes` is the TEXT column from the
// brands table — may be null, empty, or invalid JSON; all three yield the
// default footer.
export function readBrandFooter(notes: string | null | undefined): BrandFooter {
  if (!notes) return { ...DEFAULT_BRAND_FOOTER }
  try {
    const parsed = JSON.parse(notes) as { footer?: unknown }
    return normalizeBrandFooter(parsed?.footer)
  } catch {
    return { ...DEFAULT_BRAND_FOOTER }
  }
}
