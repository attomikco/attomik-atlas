'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBrand } from '@/lib/brand-context'
import EmailTemplateClient from '@/components/email/EmailTemplateClient'

export default function EmailPage() {
  const { activeBrandId, activeCampaign } = useBrand()
  const [brand, setBrand] = useState<any>(null)
  const [initialConfig, setInitialConfig] = useState<any>(null)
  const [emails, setEmails] = useState<any[]>([])
  const [lifestyleImages, setLifestyleImages] = useState<string[]>([])
  const [productImages, setProductImages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeBrandId) return
    setLoading(true)
    const supabase = createClient()

    Promise.all([
      supabase.from('brands')
        .select('id, name, website, logo_url, primary_color, accent_color, secondary_color, font_primary, font_heading, font_body, products, notes')
        .eq('id', activeBrandId).single(),
      supabase.from('brand_images').select('storage_path, tag')
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
      setBrand({ ...b, logo_url_light: logoLight })
      // Campaign mode: pre-fill copy fields from active campaign
      if (activeCampaign) {
        emailConfig = {
          ...(emailConfig || {}),
          heroHeadline: activeCampaign.key_message || emailConfig?.heroHeadline,
          ctaBannerHeadline: activeCampaign.offer || emailConfig?.ctaBannerHeadline,
          heroCta: activeCampaign.goal === 'new_product_launch' ? 'Shop Now'
            : activeCampaign.goal === 'limited_offer___sale' ? 'Claim Offer'
            : activeCampaign.goal === 'brand_awareness' ? 'Learn More'
            : emailConfig?.heroCta || 'Shop Now',
        }
      }
      setInitialConfig(emailConfig)

      setEmails(emailsRes.data ?? [])

      const lifestyle: string[] = []
      const product: string[] = []
      for (const img of imagesRes.data || []) {
        const cleanPath = img.storage_path.replace(/^brand-images\//, '')
        const { data: urlData } = supabase.storage.from('brand-images').getPublicUrl(cleanPath)
        if (img.tag === 'lifestyle' || img.tag === 'background') lifestyle.push(urlData.publicUrl)
        else if (img.tag === 'product') product.push(urlData.publicUrl)
      }
      setLifestyleImages(lifestyle)
      setProductImages(product)
      setLoading(false)
    })
  }, [activeBrandId, activeCampaign])

  if (loading || !brand) return null

  return <EmailTemplateClient brand={brand} initialConfig={initialConfig} emails={emails} lifestyleImages={lifestyleImages} productImages={productImages} campaignId={activeCampaign?.id || null} />
}
