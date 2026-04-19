import type { Platform } from '../types'

export function detectPlatform(html: string): Platform {
  const isShopify = /Shopify\.shop|cdn\.shopify\.com|myshopify\.com/i.test(html)
  return isShopify ? 'shopify' : 'other'
}
