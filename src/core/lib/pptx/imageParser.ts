import type { ImageElement } from '@core/types'
import { emuToPixels, parseRotation } from '@core/lib/utils/emuConversion'
import { generateId } from '@core/lib/utils/xmlUtils'
import JSZip from 'jszip'

export type MediaMap = Map<string, string> // rId -> base64 data URL

export async function extractMedia(zip: JSZip): Promise<MediaMap> {
  const mediaMap = new Map<string, string>()

  const mediaFolder = zip.folder('ppt/media')
  if (!mediaFolder) return mediaMap

  const mediaFiles = Object.keys(zip.files).filter(path => path.startsWith('ppt/media/'))

  for (const filePath of mediaFiles) {
    const file = zip.file(filePath)
    if (file) {
      const data = await file.async('base64')
      const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
      const mimeType = getMimeType(ext)
      const dataUrl = `data:${mimeType};base64,${data}`

      // Store by filename (will be matched with relationships)
      const fileName = filePath.split('/').pop()!
      mediaMap.set(fileName, dataUrl)
    }
  }

  return mediaMap
}

export function parseImage(
  picData: any,
  relationships: Map<string, string>,
  mediaMap: MediaMap
): ImageElement | null {
  const nvPicPr = picData['p:nvPicPr']
  const blipFill = picData['p:blipFill']
  const spPr = picData['p:spPr']

  if (!nvPicPr || !blipFill || !spPr) return null

  // Get image reference
  const blip = blipFill['a:blip']
  if (!blip) return null

  const rEmbed = blip['@_r:embed']
  if (!rEmbed) return null

  // Get actual file path from relationships
  const targetPath = relationships.get(rEmbed)
  if (!targetPath) return null

  // Get the filename
  const fileName = targetPath.split('/').pop()!
  const imageSrc = mediaMap.get(fileName)
  if (!imageSrc) return null

  // Extract position and size
  const xfrm = spPr['a:xfrm']
  if (!xfrm) return null

  const off = xfrm['a:off'] || {}
  const ext = xfrm['a:ext'] || {}

  const x = emuToPixels(parseInt(off['@_x'] || '0'))
  const y = emuToPixels(parseInt(off['@_y'] || '0'))
  const width = emuToPixels(parseInt(ext['@_cx'] || '0'))
  const height = emuToPixels(parseInt(ext['@_cy'] || '0'))
  const rotation = parseRotation(xfrm['@_rot'])

  return {
    id: generateId(),
    type: 'image',
    x,
    y,
    width,
    height,
    rotation,
    locked: false,
    zIndex: 0,
    src: imageSrc,
    originalSrc: targetPath,
  }
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
  }
  return mimeTypes[ext] || 'image/png'
}
