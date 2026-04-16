/**
 * Canvas-based logo brightness detection.
 *
 * Used by <LogoImage> to decide whether a brand logo is already "light enough"
 * to sit on a dark background without the usual `filter: brightness(0) invert(1)`
 * treatment. Light logos (e.g. pink La Monjita) get inverted into the wrong
 * hue by the filter; detecting brightness lets us skip the filter for those.
 *
 * The canvas read requires CORS-enabled image responses. Supabase public
 * buckets serve the right headers; third-party CDNs (Shopify, Wix, etc.)
 * may not. When the canvas taints, we fall back to `false` (dark) so the
 * existing filter-on-dark-bg behavior kicks in — matches current defaults.
 */

const cache = new Map<string, boolean>()
const inflight = new Map<string, Promise<boolean>>()

// Average luminance threshold above which a logo is considered "light".
// 128 matches the existing isLight() hex check used elsewhere in the app.
const LIGHT_THRESHOLD = 128

// Ignore near-transparent pixels when averaging — avoids padding/background
// on logos with transparent backgrounds skewing the result toward "dark".
const ALPHA_CUTOFF = 32

// Downscale the image before sampling. 40x40 = 1600 pixels is plenty for an
// average, and the GPU does the resize for free during drawImage.
const SAMPLE_SIZE = 40

export async function detectLogoBrightness(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!url) return false

  const cached = cache.get(url)
  if (cached !== undefined) return cached

  const existing = inflight.get(url)
  if (existing) return existing

  const promise = runDetection(url)
  inflight.set(url, promise)
  try {
    const result = await promise
    cache.set(url, result)
    return result
  } finally {
    inflight.delete(url)
  }
}

export function getCachedLogoBrightness(url: string): boolean | undefined {
  return cache.get(url)
}

async function runDetection(url: string): Promise<boolean> {
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = SAMPLE_SIZE
    canvas.height = SAMPLE_SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return false
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    let totalLum = 0
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a < ALPHA_CUTOFF) continue
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      totalLum += (r * 299 + g * 587 + b * 114) / 1000
      count++
    }
    if (count === 0) return false
    return totalLum / count > LIGHT_THRESHOLD
  } catch {
    return false
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('logo image failed to load'))
    img.src = url
  })
}
