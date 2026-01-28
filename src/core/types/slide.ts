import type { SlideElement } from './element'

export interface Slide {
  id: string
  index: number
  layoutId: string
  elements: SlideElement[]
  background: SlideBackground
  notes: string
  thumbnail?: string
}

export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image' | 'none'
  color?: string
  gradient?: GradientDef
  imageUrl?: string
}

export interface GradientDef {
  type: 'linear' | 'radial'
  angle: number
  stops: Array<{ offset: number; color: string }>
}

export type SlideLayoutType =
  | 'blank'
  | 'title'
  | 'titleAndContent'
  | 'sectionHeader'
  | 'twoContent'
  | 'comparison'
  | 'titleOnly'
  | 'contentWithCaption'
