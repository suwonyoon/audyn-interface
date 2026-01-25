import pptxgen from 'pptxgenjs'
import type { Slide, SlideElement } from '@/types'
import { exportTextElement } from './textExporter'
import { exportShapeElement } from './shapeExporter'
import { exportImageElement } from './imageExporter'

// Sanitize color to ensure it's a valid 6-digit hex
function sanitizeColor(color: string | undefined): string {
  if (!color) return 'FFFFFF'
  const cleaned = color.replace('#', '').toUpperCase()
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned
  }
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return cleaned.split('').map(c => c + c).join('')
  }
  return 'FFFFFF'
}

export async function exportSlide(pptxSlide: pptxgen.Slide, slide: Slide) {
  // Set slide background
  if (slide.background.type === 'solid' && slide.background.color) {
    pptxSlide.background = { color: sanitizeColor(slide.background.color) }
  }

  // Sort elements by zIndex and export
  const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex)

  for (const element of sortedElements) {
    await exportElement(pptxSlide, element)
  }

  // Add slide notes if present
  if (slide.notes) {
    pptxSlide.addNotes(slide.notes)
  }
}

async function exportElement(pptxSlide: pptxgen.Slide, element: SlideElement) {
  switch (element.type) {
    case 'text':
      exportTextElement(pptxSlide, element)
      break
    case 'shape':
      exportShapeElement(pptxSlide, element)
      break
    case 'image':
      await exportImageElement(pptxSlide, element)
      break
  }
}
