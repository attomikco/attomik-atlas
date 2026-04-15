import { NextRequest, NextResponse } from 'next/server'
import { authorizeBrandMember } from '@/lib/authorize-store'
import {
  THEME_COLOR_KEYS,
  colorsToThemeSettings,
  neutralColorsForVariant,
  sanitizePartialColors,
  type ThemeColors,
} from '@/lib/store-colors'

export const runtime = 'nodejs'

// PATCH /api/brands/[id]/store/[themeId]/config
// Body: { colors?: Partial<ThemeColors>, selected_variant?: number }
//
// Merges the incoming colors into the selected variant's `colors` object,
// regenerates that variant's `theme_settings` via colorsToThemeSettings, and
// returns the updated store_themes row. Legacy rows where the variant has
// no `colors` object get seeded from the neutral fallback so the first edit
// lands on a valid base.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; themeId: string }> }
) {
  const { id: brandId, themeId } = await params
  const { supabase, error, status } = await authorizeBrandMember(brandId)
  if (error) return NextResponse.json({ error }, { status })

  let body: { colors?: unknown; selected_variant?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const partial = sanitizePartialColors(body.colors)
  const nextVariantIndex = typeof body.selected_variant === 'number' ? body.selected_variant : null
  console.log('[store/config PATCH] incoming', {
    brandId,
    themeId,
    colors: partial,
    selected_variant: nextVariantIndex,
  })
  if (Object.keys(partial).length === 0 && nextVariantIndex === null) {
    return NextResponse.json({ error: 'Nothing to update — provide a valid `colors` object or `selected_variant` index' }, { status: 400 })
  }

  // Load the theme row — themeId is the store_themes row UUID, not the
  // Shopify theme ID. Scope to brand_id so cross-brand IDs cannot collide.
  const { data: storeTheme, error: themeErr } = await supabase
    .from('store_themes')
    .select('*')
    .eq('id', themeId)
    .eq('brand_id', brandId)
    .maybeSingle()
  if (themeErr || !storeTheme) {
    return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
  }

  // Pull the brand colors for the neutral-fallback seed (used only when a
  // legacy row's selected variant has no `colors` object yet).
  const { data: brandRow } = await supabase
    .from('brands')
    .select('primary_color, secondary_color')
    .eq('id', brandId)
    .maybeSingle()
  const primary = brandRow?.primary_color || '#000000'
  const secondary = brandRow?.secondary_color || '#2c2c2c'

  const variantsRaw: Array<Record<string, unknown>> = Array.isArray(storeTheme.color_variants) ? storeTheme.color_variants : []
  const currentIndex = typeof storeTheme.selected_variant === 'number' ? storeTheme.selected_variant : 0
  const targetIndex = nextVariantIndex !== null ? nextVariantIndex : currentIndex
  if (targetIndex < 0 || targetIndex >= variantsRaw.length) {
    return NextResponse.json({ error: `Invalid variant index ${targetIndex}` }, { status: 400 })
  }

  // Build the merged variant array: only the target variant's colors change.
  const updatedVariants = variantsRaw.map((variant, index) => {
    if (index !== targetIndex) return variant
    const v = (variant || {}) as {
      name?: string
      colors?: Partial<ThemeColors>
      theme_settings?: Record<string, string>
    }

    // Seed a base colors object. Preference order:
    // 1. The row's existing variant.colors (when present and complete).
    // 2. The neutral fallback for this variant name (for legacy rows).
    const fallbackVariantName = v.name as Parameters<typeof neutralColorsForVariant>[2]
    const seedFallback = neutralColorsForVariant(
      primary,
      secondary,
      fallbackVariantName === 'light' || fallbackVariantName === 'dark' ||
      fallbackVariantName === 'alt_light' || fallbackVariantName === 'alt_dark'
        ? fallbackVariantName
        : 'light'
    )
    const baseColors: ThemeColors = { ...seedFallback }
    if (v.colors && typeof v.colors === 'object') {
      for (const key of THEME_COLOR_KEYS) {
        const raw = (v.colors as Record<string, unknown>)[key]
        if (typeof raw === 'string') baseColors[key] = raw
      }
    }

    const mergedColors: ThemeColors = { ...baseColors, ...partial }
    const newThemeSettings = {
      ...(v.theme_settings || {}),
      ...colorsToThemeSettings(mergedColors),
    }
    return {
      ...v,
      colors: mergedColors,
      theme_settings: newThemeSettings,
    }
  })

  const updates: Record<string, unknown> = {
    color_variants: updatedVariants,
    updated_at: new Date().toISOString(),
  }
  if (nextVariantIndex !== null) {
    updates.selected_variant = nextVariantIndex
  }

  const { data: updated, error: updateErr } = await supabase
    .from('store_themes')
    .update(updates)
    .eq('id', themeId)
    .eq('brand_id', brandId)
    .select()
    .single()

  if (updateErr || !updated) {
    console.error('[store/config PATCH] update failed', { brandId, themeId, error: updateErr?.message })
    return NextResponse.json({ error: updateErr?.message || 'Update failed' }, { status: 500 })
  }

  // Log the exact colors block we persisted so we can confirm the DB write
  // from the server logs. Trimmed to the selected variant to keep the line
  // readable — color_variants can be 4 entries of ~1KB each.
  const persistedVariants: Array<Record<string, unknown>> = Array.isArray(updated.color_variants)
    ? updated.color_variants
    : []
  const persistedIndex = typeof updated.selected_variant === 'number' ? updated.selected_variant : 0
  const persistedVariant = persistedVariants[persistedIndex] || null
  console.log('[store/config PATCH] persisted', {
    brandId,
    themeId,
    selected_variant: updated.selected_variant,
    persisted_colors: persistedVariant ? (persistedVariant as { colors?: unknown }).colors : null,
  })

  return NextResponse.json({ ok: true, theme: updated })
}
