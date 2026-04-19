export function normalizeUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`
}

export function upgradeImageUrl(url: string): string {
  if (!url) return url
  try {
    const u = new URL(url)
    if (u.hostname.includes('shopify') || u.hostname.includes('shopifycdn')) {
      u.searchParams.delete('width'); u.searchParams.delete('height'); u.searchParams.delete('crop'); u.searchParams.delete('w'); u.searchParams.delete('h')
      u.pathname = u.pathname.replace(/_(?:pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|\d+x\d*|\d*x\d+)\./g, '.')
      return u.toString()
    }
    u.searchParams.delete('width'); u.searchParams.delete('height'); u.searchParams.delete('w'); u.searchParams.delete('h')
    u.searchParams.delete('size'); u.searchParams.delete('resize'); u.searchParams.delete('fit'); u.searchParams.delete('crop')
    u.searchParams.delete('quality'); u.searchParams.delete('q'); u.searchParams.delete('auto'); u.searchParams.delete('fm'); u.searchParams.delete('ixlib')
    u.pathname = u.pathname.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1')
    return u.toString()
  } catch { return url }
}
