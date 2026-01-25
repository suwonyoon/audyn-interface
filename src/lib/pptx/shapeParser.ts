import type { ShapeElement, TextElement, ShapeType, FillStyle, StrokeStyle, PlaceholderType, VerticalAlign } from '@/types'
import type { ThemeColors } from '@/types'
import { parseTextBody } from './textParser'
import { parseColor } from '@/lib/utils/colorConversion'
import { emuToPixels, parseRotation } from '@/lib/utils/emuConversion'
import { generateId } from '@/lib/utils/xmlUtils'

export function parseShape(
  shapeData: any,
  themeColors?: ThemeColors
): ShapeElement | TextElement | null {
  const nvSpPr = shapeData['p:nvSpPr']
  const spPr = shapeData['p:spPr']
  const txBody = shapeData['p:txBody']

  // Note: spPr can be empty string from self-closing XML tag, so only check nvSpPr
  if (!nvSpPr) return null

  // Check for placeholder first (needed before position check)
  const nvPr = nvSpPr['p:nvPr']
  const placeholder = nvPr?.['p:ph']
  const placeholderType = placeholder?.['@_type'] as PlaceholderType | undefined

  // Extract position and size
  const xfrm = spPr['a:xfrm']

  // Placeholder shapes may not have explicit position - they inherit from layout
  // Skip non-placeholder shapes without position, but keep placeholders with default position
  if (!xfrm && !placeholderType) return null

  const off = xfrm?.['a:off'] || {}
  const ext = xfrm?.['a:ext'] || {}

  // Default positions for common placeholder types (in pixels, approximate)
  const defaultPositions: Record<string, { x: number; y: number; width: number; height: number }> = {
    ctrTitle: { x: 50, y: 200, width: 860, height: 100 },
    title: { x: 50, y: 30, width: 860, height: 60 },
    subTitle: { x: 100, y: 320, width: 760, height: 60 },
    body: { x: 50, y: 120, width: 860, height: 400 },
  }
  const defaults = placeholderType ? defaultPositions[placeholderType] : undefined

  const x = off['@_x'] ? emuToPixels(parseInt(off['@_x'])) : (defaults?.x ?? 0)
  const y = off['@_y'] ? emuToPixels(parseInt(off['@_y'])) : (defaults?.y ?? 0)
  const width = ext['@_cx'] ? emuToPixels(parseInt(ext['@_cx'])) : (defaults?.width ?? 100)
  const height = ext['@_cy'] ? emuToPixels(parseInt(ext['@_cy'])) : (defaults?.height ?? 50)
  const rotation = parseRotation(xfrm?.['@_rot'])

  // Determine shape type
  const prstGeom = spPr['a:prstGeom']
  const shapeType = prstGeom?.['@_prst'] || 'rect'

  // Parse fill
  let fill = parseFill(spPr, themeColors)

  // Parse stroke
  const stroke = parseStroke(spPr, themeColors)

  // Parse text content if present
  const textContent = txBody ? parseTextBody(txBody, themeColors) : undefined

  // Parse text body properties (for vertical alignment)
  const bodyPr = txBody?.['a:bodyPr'] || {}
  const verticalAlign = parseVerticalAlign(bodyPr['@_anchor'])

  // Check if this has actual text content
  const hasActualText = textContent &&
    textContent.length > 0 &&
    textContent.some(tc =>
      tc.paragraphs.some(p =>
        p.runs.some(r => r.text && r.text.trim().length > 0)
      )
    )

  // Check for style references (shapes may inherit fill/stroke from theme)
  const styleElement = spPr['a:style'] || shapeData['p:style']
  const hasStyleReference = styleElement?.['a:fillRef'] || styleElement?.['a:lnRef']

  // If shape has style reference but no inline fill, use a default light fill for visibility
  if (fill.type === 'none' && hasStyleReference) {
    fill = { type: 'solid', color: '#E5E7EB', opacity: 0.8 }
  }

  // Skip empty placeholders like page numbers, dates, footers
  const isEmptyPlaceholder = placeholderType &&
    ['sldNum', 'dt', 'ftr'].includes(placeholderType) &&
    !hasActualText

  if (isEmptyPlaceholder) {
    return null // Skip empty page numbers, dates, footers
  }

  // Determine if this is a text box:
  // - Has placeholder type with actual content (title, body, etc.)
  // - OR has text content and is a basic rect shape (common text box pattern)
  // - OR has text content with no/minimal shape styling
  const isTextBox =
    (placeholderType && hasActualText) ||
    (hasActualText && shapeType === 'rect') ||
    (hasActualText && fill.type === 'none' && stroke.width === 0)

  if (isTextBox) {
    return {
      id: generateId(),
      type: 'text',
      x,
      y,
      width,
      height,
      rotation,
      locked: false,
      zIndex: 0,
      content: textContent || [],
      placeholder: placeholderType,
      textBoxProps: {
        verticalAlign,
        padding: { top: 5, right: 5, bottom: 5, left: 5 },
        autoFit: 'none',
        wordWrap: true,
        columns: 1,
      },
    }
  }

  // Skip shapes with no fill, no stroke, no text, no style reference, AND no placeholder type
  // Placeholder shapes are structural elements that should be kept even if visually empty
  if (fill.type === 'none' && stroke.width === 0 && !hasActualText && !hasStyleReference && !placeholderType) {
    return null
  }

  return {
    id: generateId(),
    type: 'shape',
    x,
    y,
    width,
    height,
    rotation,
    locked: false,
    zIndex: 0,
    shapeType: mapPrstGeomToShapeType(shapeType),
    fill,
    stroke,
    text: textContent,
  }
}

function parseFill(spPr: any, themeColors?: ThemeColors): FillStyle {
  // Handle empty/undefined spPr
  if (!spPr || typeof spPr !== 'object') {
    return { type: 'none' }
  }

  // No fill
  if (spPr['a:noFill']) {
    return { type: 'none' }
  }

  // Solid fill
  if (spPr['a:solidFill']) {
    const color = parseColor(spPr['a:solidFill'], themeColors)
    return { type: 'solid', color, opacity: 1 }
  }

  // Gradient fill
  if (spPr['a:gradFill']) {
    const gradFill = spPr['a:gradFill']
    const gsLst = gradFill['a:gsLst']?.['a:gs'] || []
    const stops = Array.isArray(gsLst) ? gsLst : [gsLst]

    return {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 0,
        stops: stops.map((gs: any) => ({
          offset: parseInt(gs['@_pos'] || '0') / 100000,
          color: parseColor(gs, themeColors),
        })),
      },
    }
  }

  // Default to no fill
  return { type: 'none' }
}

function parseStroke(spPr: any, themeColors?: ThemeColors): StrokeStyle {
  // Handle empty/undefined spPr
  if (!spPr || typeof spPr !== 'object') {
    return { color: '#000000', width: 0, dashStyle: 'solid', opacity: 0 }
  }

  const ln = spPr['a:ln']

  if (!ln || ln['a:noFill']) {
    return { color: '#000000', width: 0, dashStyle: 'solid', opacity: 0 }
  }

  // Parse width (in EMU)
  const w = parseInt(ln['@_w'] || '0')
  const width = w > 0 ? Math.max(1, emuToPixels(w)) : 1

  // Parse color
  let color = '#000000'
  if (ln['a:solidFill']) {
    color = parseColor(ln['a:solidFill'], themeColors)
  }

  // Parse dash style
  const prstDash = ln['a:prstDash']?.['@_val']
  let dashStyle: 'solid' | 'dashed' | 'dotted' = 'solid'
  if (prstDash === 'dash' || prstDash === 'lgDash') dashStyle = 'dashed'
  if (prstDash === 'dot' || prstDash === 'sysDot') dashStyle = 'dotted'

  return { color, width, dashStyle, opacity: 1 }
}

function mapPrstGeomToShapeType(prstGeom: string): ShapeType {
  const mapping: Record<string, ShapeType> = {
    rect: 'rect',
    roundRect: 'roundRect',
    ellipse: 'ellipse',
    triangle: 'triangle',
    rtTriangle: 'triangle',
    diamond: 'diamond',
    pentagon: 'pentagon',
    hexagon: 'hexagon',
    star5: 'star5',
    star6: 'star6',
    rightArrow: 'arrow',
    leftArrow: 'arrow',
    upArrow: 'arrow',
    downArrow: 'arrow',
    chevron: 'chevron',
    wedgeRoundRectCallout: 'callout',
    wedgeRectCallout: 'callout',
    line: 'line',
    straightConnector1: 'connector',
    curvedConnector3: 'curvedLine',
  }
  return mapping[prstGeom] || 'rect'
}

function parseVerticalAlign(anchor: string | undefined): VerticalAlign {
  // PPTX anchor values: t (top), ctr (center/middle), b (bottom)
  switch (anchor) {
    case 'ctr':
      return 'middle'
    case 'b':
      return 'bottom'
    case 't':
    default:
      return 'top'
  }
}
