import type { Slide } from './slide'
import type { Theme } from './theme'

export interface Presentation {
  id: string
  name: string
  slides: Slide[]
  theme: Theme
  slideWidth: number
  slideHeight: number
  metadata: PresentationMetadata
}

export interface PresentationMetadata {
  author: string
  title: string
  created: Date
  modified: Date
}
