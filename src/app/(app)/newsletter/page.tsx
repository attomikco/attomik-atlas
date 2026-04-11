'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import EmailTemplateClient from '@/components/email/EmailTemplateClient'
import { bucketBrandImages, getBusinessType, getContentImages, pickSlotImages } from '@/lib/brand-images'
import type { BrandImage } from '@/types'

export default function EmailPage() {
  const { activeBrandId, activeCampaign } = useBrand()
  const [brand, setBrand] = useState<any>(null)
  const [initialConfig, setInitialConfig] = useState<any>(null)
  const [emails, setEmails] = useState<any[]>([])
  const [lifestyleImages, setLifestyleImages] = useState<string[]>([])
  const [productImages, setProductImages] = useState<string[]>([])
  const [allImages, setAllImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBrandId) return
    setLoading(true)
    const supabase = createClient()

    Promise.all([
      supabase.from('brands')
        .select('id, name, website, logo_url, primary_color, accent_color, secondary_color, bg_base, text_on_dark, text_on_base, text_on_accent, font_primary, font_heading, font_body, products, notes')
        .eq('id', activeBrandId).single(),
      supabase.from('brand_images').select('id, storage_path, tag, width, height')
        .eq('brand_id', activeBrandId).order('created_at'),
      supabase.from('generated_content').select('*, campaign:campaigns(id, name, goal)')
        .eq('brand_id', activeBrandId).eq('type', 'email').order('created_at', { ascending: false }),
    ]).then(([brandRes, imagesRes, emailsRes]) => {
      const b = brandRes.data
      if (!b) { setLoading(false); return }

      let emailConfig: any = null
      let logoLight: string | null = null
      try {
        const notes = b.notes ? JSON.parse(b.notes) : {}
        emailConfig = notes.email_config || null
        logoLight = notes.logo_url_light || null
      } catch {}
      const font_heading = typeof b.font_heading === 'string' ? JSON.parse(b.font_heading) : b.font_heading
      const font_body = typeof b.font_body === 'string' ? JSON.parse(b.font_body) : b.font_body
      setBrand({
        ...b,
        font_heading: font_heading || null,
        font_body: font_body || null,
        logo_url_light: logoLight,
      })
      // Campaign mode: pre-fill copy fields from active campaign
      if (activeCampaign) {
        emailConfig = {
          ...(emailConfig || {}),
          heroHeadline: activeCampaign.key_message || emailConfig?.heroHeadline,
          calloutHeadline: activeCampaign.offer || emailConfig?.calloutHeadline,
          heroCta: activeCampaign.goal === 'new_product_launch' ? 'Shop Now'
            : activeCampaign.goal === 'limited_offer___sale' ? 'Claim Offer'
            : activeCampaign.goal === 'brand_awareness' ? 'Learn More'
            : emailConfig?.heroCta || 'Shop Now',
        }
      }
      // If no saved email config, try to load content from the latest generated email
      if (!emailConfig) {
        const latestEmail = emailsRes.data?.[0]
        if (latestEmail) {
          try {
            const parsed = JSON.parse(latestEmail.content)
            if (parsed.config) emailConfig = parsed.config
          } catch {}
        }
      }

      setEmails(emailsRes.data ?? [])

      const rows = (imagesRes.data || []) as BrandImage[]
      const toUrl = (img: BrandImage) => {
        const cleanPath = img.storage_path.replace(/^brand-images\//, '')
        return supabase.storage.from('brand-images').getPublicUrl(cleanPath).data.publicUrl
      }
      // Smart bucketing — Shopify vs non-Shopify logic is handled by the helper
      const { productImages: bucketProduct, lifestyleImages: bucketLifestyle } =
        bucketBrandImages(rows, getBusinessType(b))

      // Pre-pick orientation-aware hero + product images (same rules the
      // Creative Studio uses per template). Inject as defaults only — user's
      // manual imageAssignments always win.
      const [heroPick, productPick] = pickSlotImages(rows, getBusinessType(b), ['hero', 'product'])
      if (emailConfig) {
        emailConfig = {
          ...emailConfig,
          imageAssignments: {
            hero: emailConfig.imageAssignments?.hero || (heroPick ? toUrl(heroPick) : ''),
            product: emailConfig.imageAssignments?.product || (productPick ? toUrl(productPick) : ''),
            ...emailConfig.imageAssignments,
          },
        }
      } else {
        emailConfig = {
          imageAssignments: {
            hero: heroPick ? toUrl(heroPick) : '',
            product: productPick ? toUrl(productPick) : '',
          },
        }
      }
      setInitialConfig(emailConfig)

      setProductImages(bucketProduct.map(toUrl))
      setLifestyleImages(bucketLifestyle.map(toUrl))
      setAllImages(getContentImages(rows).map(toUrl))
      setLoading(false)
    })
  }, [activeBrandId, activeCampaign])

  if (loading || !brand) return null

  return <EmailTemplateClient brand={brand} initialConfig={initialConfig} emails={emails} allImages={allImages} lifestyleImages={lifestyleImages} productImages={productImages} campaignId={activeCampaign?.id || null} />
}
