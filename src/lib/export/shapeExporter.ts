import pptxgen from 'pptxgenjs'
import type { ShapeElement, ShapeType } from '@/types'
import { pixelsToInches } from '@/lib/utils/emuConversion'

// Sanitize color to ensure it's a valid 6-digit hex
function sanitizeColor(color: string | undefined): string {
  if (!color) return '000000'
  const cleaned = color.replace('#', '').toUpperCase()
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned
  }
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return cleaned.split('').map(c => c + c).join('')
  }
  return '000000'
}

// Map our shape types to pptxgenjs shape names
const shapeTypeMap: Record<ShapeType, string> = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  triangle: 'triangle',
  diamond: 'diamond',
  pentagon: 'pentagon',
  hexagon: 'hexagon',
  star5: 'star5',
  star6: 'star6',
  arrow: 'rightArrow',
  chevron: 'chevron',
  callout: 'wedgeRoundRectCallout',
  line: 'line',
  curvedLine: 'curvedConnector3',
  connector: 'straightConnector1',
}

export function exportShapeElement(slide: pptxgen.Slide, element: ShapeElement) {
  // Skip shapes with invalid dimensions
  if (element.width <= 0 || element.height <= 0) return

  const shapeType = shapeTypeMap[element.shapeType] || 'rect'

  const x = pixelsToInches(element.x)
  const y = pixelsToInches(element.y)
  const w = pixelsToInches(element.width)
  const h = pixelsToInches(element.height)

  // Ensure dimensions are valid
  if (w <= 0 || h <= 0) return

  const shapeOptions: pptxgen.ShapeProps = {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: Math.max(0.1, w),
    h: Math.max(0.1, h),
    rotate: element.rotation || 0,
  }

  // Fill options
  if (element.fill.type === 'solid' && element.fill.color) {
    shapeOptions.fill = { color: sanitizeColor(element.fill.color) }
  } else if (element.fill.type === 'none') {
    shapeOptions.fill = { type: 'none' }
  } else {
    // Default fill for shapes without explicit fill
    shapeOptions.fill = { type: 'none' }
  }

  // Stroke options
  if (element.stroke && element.stroke.width > 0) {
    shapeOptions.line = {
      color: sanitizeColor(element.stroke.color),
      width: Math.max(0.5, element.stroke.width),
      dashType:
        element.stroke.dashStyle === 'dashed'
          ? 'dash'
          : element.stroke.dashStyle === 'dotted'
          ? 'sysDot'
          : 'solid',
    }
  } else {
    shapeOptions.line = { type: 'none' }
  }

  try {
    slide.addShape(shapeType as pptxgen.ShapeType, shapeOptions)
  } catch (error) {
    console.error('Failed to export shape:', error, element)
  }
}
