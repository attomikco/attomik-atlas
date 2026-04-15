import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STORE_FIELDS, groupStoreFieldsByPage, readAtPath } from '@/lib/store-fields'
import StoreCopyEditorClient from './StoreCopyEditorClient'

// Server component — loads the store_themes row, resolves initial values
// for every STORE_FIELDS entry from the stored JSONs, and hands the data
// to the client editor. RLS on store_themes already enforces brand-member
// access (see CLAUDE.md "TEAM MEMBERSHIP & INVITES" and the `store_themes`
// table policy), so a non-member's select simply returns no row and lands
// us on notFound().

export default async function StoreCopyEditorPage({
  params,
}: {
  params: Promise<{ themeId: string }>
}) {
  const { themeId } = await params
  const supabase = await createClient()

  const { data: theme, error: themeErr } = await supabase
    .from('store_themes')
    .select('id, brand_id, name, index_json, product_json, footer_group_json, about_json, shopify_theme_id, shopify_theme_name, last_deploy_status, last_deploy_error, last_deployed_at')
    .eq('id', themeId)
    .maybeSingle()

  if (themeErr || !theme) {
    notFound()
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, notes')
    .eq('id', theme.brand_id)
    .maybeSingle()

  if (!brand) {
    notFound()
  }

  // Resolve shop URL for building preview links on the client.
  const notes = (() => {
    if (!brand.notes) return {}
    if (typeof brand.notes === 'object') return brand.notes as Record<string, unknown>
    if (typeof brand.notes === 'string') {
      try { return JSON.parse(brand.notes) as Record<string, unknown> } catch { return {} }
    }
    return {}
  })()
  const shopifyStoreUrl = typeof notes.shopify_store_url === 'string' ? notes.shopify_store_url : null

  // Pre-resolve every field's current value from the stored JSONs. We do
  // this on the server so the client never has to ship the full theme
  // JSON blobs (those can be 50-200KB each).
  const sources: Record<string, unknown> = {
    index_json: theme.index_json,
    product_json: theme.product_json,
    footer_group_json: theme.footer_group_json,
    about_json: theme.about_json,
  }
  const initialValues: Record<string, string> = {}
  for (const field of STORE_FIELDS) {
    const source = sources[field.source]
    initialValues[field.placeholder] = readAtPath(source, field.path) ?? ''
  }

  return (
    <StoreCopyEditorClient
      brand={{ id: brand.id, name: brand.name }}
      theme={{
        id: theme.id,
        brand_id: theme.brand_id,
        name: theme.name,
        shopify_theme_id: theme.shopify_theme_id,
        shopify_theme_name: theme.shopify_theme_name,
        last_deploy_status: theme.last_deploy_status,
        last_deploy_error: theme.last_deploy_error,
        last_deployed_at: theme.last_deployed_at,
      }}
      shopifyStoreUrl={shopifyStoreUrl}
      groupedByPage={groupStoreFieldsByPage()}
      initialValues={initialValues}
    />
  )
}
