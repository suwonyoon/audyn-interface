import pptxgen from 'pptxgenjs'
import type { ImageElement } from '@/types'
import { pixelsToInches } from '@/lib/utils/emuConversion'

export async function exportImageElement(slide: pptxgen.Slide, element: ImageElement) {
  // Skip images with invalid dimensions or no source
  if (element.width <= 0 || element.height <= 0) return
  if (!element.src) return

  const x = pixelsToInches(element.x)
  const y = pixelsToInches(element.y)
  const w = pixelsToInches(element.width)
  const h = pixelsToInches(element.height)

  // Ensure dimensions are valid
  if (w <= 0 || h <= 0) return

  const imageOptions: pptxgen.ImageProps = {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: Math.max(0.1, w),
    h: Math.max(0.1, h),
    rotate: element.rotation || 0,
  }

  // Check if src is a valid data URL
  if (element.src.startsWith('data:image/')) {
    // Validate base64 data
    const base64Match = element.src.match(/^data:image\/[a-z]+;base64,(.+)$/i)
    if (base64Match && base64Match[1]) {
      imageOptions.data = element.src
    } else {
      console.warn('Invalid image data URL format')
      return
    }
  } else if (element.src.startsWith('http://') || element.src.startsWith('https://')) {
    // External URL
    imageOptions.path = element.src
  } else {
    // Unknown format, skip
    console.warn('Unknown image source format:', element.src.substring(0, 50))
    return
  }

  try {
    slide.addImage(imageOptions)
  } catch (error) {
    console.error('Failed to export image:', error)
  }
}
