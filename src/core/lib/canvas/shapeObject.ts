import { Rect, Ellipse, Triangle, Path, Line, FabricObject, Group, Textbox } from 'fabric'
import type { ShapeElement, ShapeType } from '@core/types'
import { generateId } from '@core/lib/utils/xmlUtils'

export function createShapeObject(element: ShapeElement): FabricObject {
  // Check if shape has text content
  const hasText = element.text &&
    element.text.length > 0 &&
    element.text.some(tc =>
      tc.paragraphs.some(p =>
        p.runs.some(r => r.text && r.text.trim().length > 0)
      )
    )

  const shapeObj = createBasicShape(element)

  // If shape has text, create a group with shape and text
  if (hasText && shapeObj) {
    const textContent = element.text!
      .flatMap(c => c.paragraphs)
      .map(p => p.runs.map(r => r.text).join(''))
      .join('\n')

    const firstRun = element.text![0]?.paragraphs[0]?.runs[0]

    const textObj = new Textbox(textContent, {
      left: 0,
      top: 0,
      width: element.width - 10,
      fontSize: firstRun?.fontSize || 14,
      fontFamily: firstRun?.fontFamily || 'Arial',
      fill: firstRun?.color || '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    })

    const group = new Group([shapeObj, textObj], {
      left: element.x,
      top: element.y,
      angle: element.rotation,
      borderColor: '#2196F3',
      cornerColor: '#2196F3',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
    })

    group.set('elementId' as keyof typeof group, element.id)
    group.set('elementType' as keyof typeof group, 'shape')
    group.set('shapeType' as keyof typeof group, element.shapeType)

    return group
  }

  // Store element ID on basic shape
  shapeObj.set('elementId' as keyof typeof shapeObj, element.id)
  shapeObj.set('elementType' as keyof typeof shapeObj, 'shape')
  shapeObj.set('shapeType' as keyof typeof shapeObj, element.shapeType)

  return shapeObj
}

function createBasicShape(element: ShapeElement): FabricObject {
  const baseOptions = {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    angle: element.rotation,
    fill: getFillStyle(element.fill),
    stroke: element.stroke.color,
    strokeWidth: element.stroke.width,
    strokeDashArray: getStrokeDashArray(element.stroke.dashStyle),

    // Selection styling
    borderColor: '#2196F3',
    cornerColor: '#2196F3',
    cornerStyle: 'circle' as const,
    cornerSize: 8,
    transparentCorners: false,
  }

  let fabricObject: FabricObject

  switch (element.shapeType) {
    case 'rect':
      fabricObject = new Rect({
        ...baseOptions,
        rx: 0,
        ry: 0,
      })
      break

    case 'roundRect':
      fabricObject = new Rect({
        ...baseOptions,
        rx: 10,
        ry: 10,
      })
      break

    case 'ellipse':
      fabricObject = new Ellipse({
        ...baseOptions,
        rx: element.width / 2,
        ry: element.height / 2,
        left: element.x,
        top: element.y,
      })
      break

    case 'triangle':
      fabricObject = new Triangle({
        ...baseOptions,
      })
      break

    case 'diamond':
    case 'pentagon':
    case 'hexagon':
    case 'star5':
    case 'star6':
    case 'arrow':
    case 'chevron':
      // Use SVG path for complex shapes
      const pathData = getShapePath(element.shapeType, element.width, element.height)
      fabricObject = new Path(pathData, {
        ...baseOptions,
        left: element.x,
        top: element.y,
      })
      break

    case 'line':
      fabricObject = new Line([0, 0, element.width, 0], {
        left: element.x,
        top: element.y,
        stroke: element.stroke.color,
        strokeWidth: element.stroke.width,
        angle: element.rotation,
        borderColor: '#2196F3',
        cornerColor: '#2196F3',
      })
      break

    default:
      fabricObject = new Rect(baseOptions)
  }

  return fabricObject
}

function getFillStyle(fill: ShapeElement['fill']): string | undefined {
  if (fill.type === 'none') return undefined
  if (fill.type === 'solid') return fill.color
  return fill.color || '#cccccc'
}

function getStrokeDashArray(dashStyle: string): number[] | undefined {
  switch (dashStyle) {
    case 'dashed':
      return [10, 5]
    case 'dotted':
      return [2, 4]
    default:
      return undefined
  }
}

function getShapePath(type: ShapeType, w: number, h: number): string {
  switch (type) {
    case 'diamond':
      return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`

    case 'pentagon':
      return generatePolygonPath(5, w, h)

    case 'hexagon':
      return generatePolygonPath(6, w, h)

    case 'star5':
      return generateStarPath(5, w, h)

    case 'star6':
      return generateStarPath(6, w, h)

    case 'arrow':
      return `M 0 ${h * 0.3} L ${w * 0.6} ${h * 0.3} L ${w * 0.6} 0 L ${w} ${h / 2} L ${w * 0.6} ${h} L ${w * 0.6} ${h * 0.7} L 0 ${h * 0.7} Z`

    case 'chevron':
      return `M 0 0 L ${w * 0.8} 0 L ${w} ${h / 2} L ${w * 0.8} ${h} L 0 ${h} L ${w * 0.2} ${h / 2} Z`

    default:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
  }
}

function generatePolygonPath(sides: number, w: number, h: number): string {
  const cx = w / 2
  const cy = h / 2
  const radius = Math.min(cx, cy)
  let path = ''

  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  }

  return path + ' Z'
}

function generateStarPath(points: number, w: number, h: number): string {
  const cx = w / 2
  const cy = h / 2
  const outerRadius = Math.min(cx, cy)
  const innerRadius = outerRadius * 0.4
  let path = ''

  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  }

  return path + ' Z'
}

export function fabricShapeToElement(
  obj: FabricObject,
  existingElement?: ShapeElement
): ShapeElement {
  const shapeType = (obj.get('shapeType' as keyof typeof obj) as ShapeType) || 'rect'

  return {
    id: existingElement?.id || generateId(),
    type: 'shape',
    x: obj.left || 0,
    y: obj.top || 0,
    width: obj.width || 100,
    height: obj.height || 100,
    rotation: obj.angle || 0,
    locked: obj.lockMovementX || false,
    zIndex: existingElement?.zIndex || 0,
    shapeType,
    fill: {
      type: obj.fill ? 'solid' : 'none',
      color: (obj.fill as string) || '#cccccc',
      opacity: 1,
    },
    stroke: {
      color: (obj.stroke as string) || '#000000',
      width: obj.strokeWidth || 1,
      dashStyle: 'solid',
      opacity: 1,
    },
    text: existingElement?.text,
  }
}
