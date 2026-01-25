import type { TextContent, TextBoxProperties } from './text'
import type { ShapeType, FillStyle, StrokeStyle } from './shape'

export type ElementType = 'text' | 'shape' | 'image' | 'table'

export interface BaseElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  locked: boolean
  zIndex: number
}

export interface TextElement extends BaseElement {
  type: 'text'
  content: TextContent[]
  placeholder?: PlaceholderType
  textBoxProps: TextBoxProperties
}

export interface ShapeElement extends BaseElement {
  type: 'shape'
  shapeType: ShapeType
  fill: FillStyle
  stroke: StrokeStyle
  text?: TextContent[]
}

export interface ImageElement extends BaseElement {
  type: 'image'
  src: string
  originalSrc: string
  cropArea?: CropArea
}

export interface TableElement extends BaseElement {
  type: 'table'
  rows: number
  cols: number
  cells: TableCell[][]
}

export interface TableCell {
  text: string
  rowSpan: number
  colSpan: number
}

export interface CropArea {
  top: number
  left: number
  width: number
  height: number
}

export type PlaceholderType =
  | 'title'
  | 'ctrTitle'
  | 'subTitle'
  | 'body'
  | 'dt'
  | 'ftr'
  | 'sldNum'

export type SlideElement = TextElement | ShapeElement | ImageElement | TableElement
