export interface TextContent {
  paragraphs: Paragraph[]
}

export interface Paragraph {
  runs: TextRun[]
  alignment: TextAlignment
  lineHeight: number
  spaceBefore: number
  spaceAfter: number
  bulletType?: BulletType
  indentLevel: number
}

export interface TextRun {
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  fontFamily: string
  fontSize: number
  color: string
  highlight?: string
  link?: string
}

export interface TextBoxProperties {
  verticalAlign: VerticalAlign
  padding: Padding
  autoFit: AutoFitType
  wordWrap: boolean
  columns: number
}

export interface Padding {
  top: number
  right: number
  bottom: number
  left: number
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify'
export type VerticalAlign = 'top' | 'middle' | 'bottom'
export type AutoFitType = 'none' | 'shrink' | 'resize'
export type BulletType = 'none' | 'bullet' | 'number'
