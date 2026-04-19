import type { BusinessType, Offering, Platform, Product } from '../types'

export type BusinessTypeResult = {
  businessType: BusinessType
  offerings: Offering[]
}

export function detectBusinessType(
  html: string,
  platform: Platform,
  products: Product[],
): BusinessTypeResult {
  let businessType: BusinessType = 'brand'
  let offerings: Offering[] = []

  // 1. Shopify — already handled, products.json works
  if (platform === 'shopify' && products.length > 0) {
    businessType = 'shopify'
    offerings = products.map(p => ({
      name: p.name,
      description: p.description || null,
      price: p.price || null,
      image: p.image || null,
      type: 'product' as const,
    }))
  }

  // 2. Non-Shopify ecommerce — check JSON-LD schema
  if (businessType === 'brand') {
    const jsonLdMatches = Array.from(html.matchAll(
      /<script[^>]+type=["\']application\/ld\+json["\'][^>]*>([\s\S]*?)<\/script>/gi
    ))
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1])
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'Product') {
            businessType = 'ecommerce'
            offerings.push({
              name: item.name || '',
              description: item.description || null,
              price: item.offers?.price ? `$${item.offers.price}` : null,
              image: item.image?.[0] || item.image || null,
              type: 'product',
            })
          }
          if (item['@type'] === 'ItemList') {
            const listItems = item.itemListElement || []
            for (const li of listItems) {
              if (li['@type'] === 'Product') {
                businessType = 'ecommerce'
                offerings.push({
                  name: li.name || '',
                  description: li.description || null,
                  price: null,
                  image: null,
                  type: 'product',
                })
              }
            }
          }
        }
      } catch {}
    }
  }

  // 3. SaaS — check for pricing page signals
  if (businessType === 'brand') {
    const hasPricing =
      /\/pricing|\/plans|\/subscription/i.test(html) ||
      /pricing|per month|per year|billed annually|\$\d+\/mo/i.test(html)

    const planMatches = Array.from(html.matchAll(
      /<(?:div|section|article)[^>]*(?:class|id)=[^>]*(?:plan|tier|pricing)[^>]*>[\s\S]{0,500}?<\/(?:div|section|article)>/gi
    ))

    const plans: Offering[] = []
    for (const match of planMatches) {
      const planHtml = match[0]
      const nameMatch = planHtml.match(/<h[1-4][^>]*>([^<]{2,40})<\/h[1-4]>/i)
      const priceMatch = planHtml.match(/\$(\d+(?:\.\d{2})?)/)
      if (nameMatch) {
        plans.push({
          name: nameMatch[1].trim(),
          description: null,
          price: priceMatch ? `$${priceMatch[1]}/mo` : null,
          image: null,
          type: 'plan',
        })
      }
    }

    if (hasPricing || plans.length >= 2) {
      businessType = 'saas'
      offerings = plans.slice(0, 4)
    }
  }

  // 4. Restaurant — check for menu signals
  if (businessType === 'brand') {
    const hasMenu =
      /menu|appetizer|entree|entrée|dessert|cuisine|dish|restaurant/i.test(html)
    const hasFood =
      /breakfast|lunch|dinner|brunch|pizza|burger|sushi|tacos/i.test(html)

    if (hasMenu && hasFood) {
      businessType = 'restaurant'
      const menuItems = Array.from(html.matchAll(
        /<(?:li|div)[^>]*>([A-Z][^<]{5,50})<\/(?:li|div)>/g
      ))
      const items: Offering[] = []
      for (const match of menuItems) {
        const text = match[1].trim()
        if (text.length > 5 && text.length < 60 &&
            !/menu|home|about|contact/i.test(text)) {
          items.push({
            name: text,
            description: null,
            price: null,
            image: null,
            type: 'menu_item',
          })
        }
      }
      offerings = items.slice(0, 6)
    }
  }

  // 5. Service business
  if (businessType === 'brand') {
    const serviceKeywords =
      /services|consulting|agency|coaching|therapy|legal|accounting|design|photography|real estate/i

    if (serviceKeywords.test(html)) {
      businessType = 'service'
      const serviceMatches = Array.from(html.matchAll(
        /<h[2-4][^>]*>([^<]{5,60})<\/h[2-4]>/gi
      ))
      const services: Offering[] = []
      for (const match of serviceMatches) {
        const text = match[1].trim()
        if (!/(home|about|contact|blog|news|faq)/i.test(text) &&
            text.length > 5) {
          services.push({
            name: text,
            description: null,
            price: null,
            image: null,
            type: 'service',
          })
        }
      }
      offerings = services.slice(0, 4)
    }
  }

  return { businessType, offerings }
}
