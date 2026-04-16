import sharp from 'sharp'

// Server-side mirror of the client upload resize in BrandImageLibrary.tsx.
// Caps longest edge at 1600px; re-encodes photographic content as JPEG q85
// flattened onto white, or PNG (max compression) when we need to preserve an
// alpha channel. Kept in one file so the scrape pipeline, the manual
// BrandImageLibrary upload flow, and the one-time backfill admin route can
// never drift from each other.
export const MAX_UPLOAD_EDGE = 1600
export const JPEG_QUALITY = 85

export interface ResizedBuffer {
  buffer: Buffer
  mimeType: string
  ext: string
  width: number
  height: number
}

export async function resizeBufferForUpload(
  buffer: Buffer,
  keepAlpha: boolean,
): Promise<ResizedBuffer> {
  const base = sharp(buffer).resize({
    width: MAX_UPLOAD_EDGE,
    height: MAX_UPLOAD_EDGE,
    fit: 'inside',
    withoutEnlargement: true,
  })

  if (keepAlpha) {
    const out = await base.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
    return {
      buffer: out.data,
      mimeType: 'image/png',
      ext: 'png',
      width: out.info.width,
      height: out.info.height,
    }
  }

  const out = await base
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: JPEG_QUALITY, progressive: true })
    .toBuffer({ resolveWithObject: true })
  return {
    buffer: out.data,
    mimeType: 'image/jpeg',
    ext: 'jpg',
    width: out.info.width,
    height: out.info.height,
  }
}

// Replace the trailing extension of a storage path. Used by the scrape
// pipeline when the resize step converts PNG → JPEG; the storage object name
// needs a matching extension so downstream consumers that parse the URL tail
// (and the Brand Hub library display) stay consistent with the stored bytes.
export function swapExtension(path: string, newExt: string): string {
  const slashIdx = path.lastIndexOf('/')
  const dotIdx = path.lastIndexOf('.')
  if (dotIdx <= slashIdx) return `${path}.${newExt}`
  const tail = path.slice(dotIdx + 1)
  if (tail.length === 0 || tail.length > 5) return `${path}.${newExt}`
  return `${path.slice(0, dotIdx)}.${newExt}`
}
