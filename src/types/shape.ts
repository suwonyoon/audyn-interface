export type ShapeType =
  | 'rect'
  | 'roundRect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star5'
  | 'star6'
  | 'arrow'
  | 'chevron'
  | 'callout'
  | 'line'
  | 'curvedLine'
  | 'connector'

export interface FillStyle {
  type: 'none' | 'solid' | 'gradient' | 'pattern'
  color?: string
  opacity?: number
  gradient?: GradientFill
}

export interface GradientFill {
  type: 'linear' | 'radial'
  angle: number
  stops: Array<{ offset: number; color: string }>
}

export interface StrokeStyle {
  color: string
  width: number
  dashStyle: DashStyle
  opacity: number
}

export type DashStyle = 'solid' | 'dashed' | 'dotted'
