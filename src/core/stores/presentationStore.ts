import { create } from 'zustand'
import type { Presentation, Slide, SlideElement, SlideLayoutType } from '@core/types'
import { parsePPTX } from '@core/lib/pptx'
import { generateId } from '@core/lib/utils/xmlUtils'

interface PresentationState {
  // Data
  presentation: Presentation | null
  currentSlideIndex: number
  selectedElementIds: string[]

  // Status
  isLoading: boolean
  isDirty: boolean
  fileName: string
  error: string | null

  // Canvas sync
  commitCanvasChanges: (() => void) | null
  setCommitCanvasChanges: (fn: (() => void) | null) => void

  // Presentation Actions
  loadPresentation: (file: File) => Promise<void>
  loadPresentationFromBuffer: (buffer: ArrayBuffer, name?: string) => Promise<void>
  createNewPresentation: () => void
  setPresentation: (presentation: Presentation) => void

  // Slide Actions
  setCurrentSlide: (index: number) => void
  addSlide: (layoutType: SlideLayoutType, index?: number) => void
  deleteSlide: (index: number) => void
  duplicateSlide: (index: number) => void
  reorderSlides: (fromIndex: number, toIndex: number) => void
  updateSlideBackground: (index: number, color: string) => void

  // Element Actions
  addElement: (element: SlideElement) => void
  updateElement: (id: string, updates: Partial<SlideElement>) => void
  deleteElement: (id: string) => void
  deleteSelectedElements: () => void
  duplicateElement: (id: string) => void

  // Selection
  selectElement: (id: string, multi?: boolean) => void
  selectElements: (ids: string[]) => void
  deselectAll: () => void

  // Utility
  getCurrentSlide: () => Slide | null
  markDirty: () => void
  markClean: () => void
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  presentation: null,
  currentSlideIndex: 0,
  selectedElementIds: [],
  isLoading: false,
  isDirty: false,
  fileName: 'Untitled.pptx',
  error: null,
  commitCanvasChanges: null,

  setCommitCanvasChanges: (fn) => {
    set({ commitCanvasChanges: fn })
  },

  loadPresentation: async (file: File) => {
    set({ isLoading: true, error: null })
    try {
      const presentation = await parsePPTX(file)
      set({
        presentation,
        currentSlideIndex: 0,
        selectedElementIds: [],
        isLoading: false,
        isDirty: false,
        fileName: file.name,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load presentation',
      })
    }
  },

  loadPresentationFromBuffer: async (buffer: ArrayBuffer, name?: string) => {
    set({ isLoading: true, error: null })
    try {
      const presentation = await parsePPTX(buffer, { name: name || 'Presentation' })
      const fileName = name ? (name.endsWith('.pptx') ? name : `${name}.pptx`) : 'Presentation.pptx'
      set({
        presentation,
        currentSlideIndex: 0,
        selectedElementIds: [],
        isLoading: false,
        isDirty: false,
        fileName,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load presentation',
      })
    }
  },

  createNewPresentation: () => {
    const presentation: Presentation = {
      id: generateId(),
      name: 'Untitled',
      slides: [createBlankSlide(0)],
      theme: {
        name: 'Default',
        colors: {
          dk1: '#000000',
          lt1: '#FFFFFF',
          dk2: '#44546A',
          lt2: '#E7E6E6',
          accent1: '#4472C4',
          accent2: '#ED7D31',
          accent3: '#A5A5A5',
          accent4: '#FFC000',
          accent5: '#5B9BD5',
          accent6: '#70AD47',
          hlink: '#0563C1',
          folHlink: '#954F72',
        },
        fonts: { majorFont: 'Calibri', minorFont: 'Calibri' },
      },
      slideWidth: 960,
      slideHeight: 540,
      metadata: {
        author: '',
        title: 'Untitled Presentation',
        created: new Date(),
        modified: new Date(),
      },
    }
    set({
      presentation,
      currentSlideIndex: 0,
      selectedElementIds: [],
      isDirty: false,
      fileName: 'Untitled.pptx',
    })
  },

  setPresentation: (presentation) => {
    set({ presentation, currentSlideIndex: 0, selectedElementIds: [] })
  },

  setCurrentSlide: (index) => {
    const { presentation } = get()
    if (presentation && index >= 0 && index < presentation.slides.length) {
      set({ currentSlideIndex: index, selectedElementIds: [] })
    }
  },

  addSlide: (layoutType, index) => {
    const { presentation, currentSlideIndex } = get()
    if (!presentation) return

    const insertIndex = index ?? currentSlideIndex + 1
    const newSlide = createSlideFromLayout(layoutType, insertIndex)

    const newSlides = [...presentation.slides]
    newSlides.splice(insertIndex, 0, newSlide)

    // Update indices
    newSlides.forEach((slide, i) => {
      slide.index = i
    })

    set({
      presentation: { ...presentation, slides: newSlides },
      currentSlideIndex: insertIndex,
      isDirty: true,
    })
  },

  deleteSlide: (index) => {
    const { presentation, currentSlideIndex } = get()
    if (!presentation || presentation.slides.length <= 1) return

    const newSlides = presentation.slides.filter((_, i) => i !== index)
    newSlides.forEach((slide, i) => {
      slide.index = i
    })

    const newCurrentIndex = Math.min(currentSlideIndex, newSlides.length - 1)

    set({
      presentation: { ...presentation, slides: newSlides },
      currentSlideIndex: newCurrentIndex,
      isDirty: true,
    })
  },

  duplicateSlide: (index) => {
    const { presentation } = get()
    if (!presentation) return

    const slideToDuplicate = presentation.slides[index]
    const duplicatedSlide: Slide = {
      ...JSON.parse(JSON.stringify(slideToDuplicate)),
      id: generateId(),
      index: index + 1,
    }

    // Generate new IDs for all elements
    duplicatedSlide.elements = duplicatedSlide.elements.map((el) => ({
      ...el,
      id: generateId(),
    }))

    const newSlides = [...presentation.slides]
    newSlides.splice(index + 1, 0, duplicatedSlide)
    newSlides.forEach((slide, i) => {
      slide.index = i
    })

    set({
      presentation: { ...presentation, slides: newSlides },
      currentSlideIndex: index + 1,
      isDirty: true,
    })
  },

  reorderSlides: (fromIndex, toIndex) => {
    const { presentation } = get()
    if (!presentation) return

    const newSlides = [...presentation.slides]
    const [movedSlide] = newSlides.splice(fromIndex, 1)
    newSlides.splice(toIndex, 0, movedSlide)
    newSlides.forEach((slide, i) => {
      slide.index = i
    })

    set({
      presentation: { ...presentation, slides: newSlides },
      currentSlideIndex: toIndex,
      isDirty: true,
    })
  },

  updateSlideBackground: (index, color) => {
    const { presentation } = get()
    if (!presentation) return

    const newSlides = [...presentation.slides]
    newSlides[index] = {
      ...newSlides[index],
      background: { type: 'solid', color },
    }

    set({
      presentation: { ...presentation, slides: newSlides },
      isDirty: true,
    })
  },

  addElement: (element) => {
    const { presentation, currentSlideIndex } = get()
    if (!presentation) return

    const newSlides = [...presentation.slides]
    const currentSlide = { ...newSlides[currentSlideIndex] }
    currentSlide.elements = [...currentSlide.elements, element]
    newSlides[currentSlideIndex] = currentSlide

    set({
      presentation: { ...presentation, slides: newSlides },
      selectedElementIds: [element.id],
      isDirty: true,
    })
  },

  updateElement: (id, updates) => {
    const { presentation, currentSlideIndex } = get()
    if (!presentation) return

    const newSlides = [...presentation.slides]
    const currentSlide = { ...newSlides[currentSlideIndex] }
    currentSlide.elements = currentSlide.elements.map((el) =>
      el.id === id ? ({ ...el, ...updates } as SlideElement) : el
    )
    newSlides[currentSlideIndex] = currentSlide

    set({
      presentation: { ...presentation, slides: newSlides },
      isDirty: true,
    })
  },

  deleteElement: (id) => {
    const { presentation, currentSlideIndex, selectedElementIds } = get()
    if (!presentation) return

    const newSlides = [...presentation.slides]
    const currentSlide = { ...newSlides[currentSlideIndex] }
    currentSlide.elements = currentSlide.elements.filter((el) => el.id !== id)
    newSlides[currentSlideIndex] = currentSlide

    set({
      presentation: { ...presentation, slides: newSlides },
      selectedElementIds: selectedElementIds.filter((eid) => eid !== id),
      isDirty: true,
    })
  },

  deleteSelectedElements: () => {
    const { presentation, currentSlideIndex, selectedElementIds } = get()
    if (!presentation || selectedElementIds.length === 0) return

    const newSlides = [...presentation.slides]
    const currentSlide = { ...newSlides[currentSlideIndex] }
    currentSlide.elements = currentSlide.elements.filter(
      (el) => !selectedElementIds.includes(el.id)
    )
    newSlides[currentSlideIndex] = currentSlide

    set({
      presentation: { ...presentation, slides: newSlides },
      selectedElementIds: [],
      isDirty: true,
    })
  },

  duplicateElement: (id) => {
    const { presentation, currentSlideIndex } = get()
    if (!presentation) return

    const currentSlide = presentation.slides[currentSlideIndex]
    const elementToDuplicate = currentSlide.elements.find((el) => el.id === id)
    if (!elementToDuplicate) return

    const duplicatedElement: SlideElement = {
      ...JSON.parse(JSON.stringify(elementToDuplicate)),
      id: generateId(),
      x: elementToDuplicate.x + 20,
      y: elementToDuplicate.y + 20,
    }

    const newSlides = [...presentation.slides]
    const newCurrentSlide = { ...newSlides[currentSlideIndex] }
    newCurrentSlide.elements = [...newCurrentSlide.elements, duplicatedElement]
    newSlides[currentSlideIndex] = newCurrentSlide

    set({
      presentation: { ...presentation, slides: newSlides },
      selectedElementIds: [duplicatedElement.id],
      isDirty: true,
    })
  },

  selectElement: (id, multi = false) => {
    const { selectedElementIds } = get()
    if (multi) {
      if (selectedElementIds.includes(id)) {
        set({ selectedElementIds: selectedElementIds.filter((eid) => eid !== id) })
      } else {
        set({ selectedElementIds: [...selectedElementIds, id] })
      }
    } else {
      set({ selectedElementIds: [id] })
    }
  },

  selectElements: (ids) => {
    set({ selectedElementIds: ids })
  },

  deselectAll: () => {
    set({ selectedElementIds: [] })
  },

  getCurrentSlide: () => {
    const { presentation, currentSlideIndex } = get()
    return presentation?.slides[currentSlideIndex] || null
  },

  markDirty: () => {
    set({ isDirty: true })
  },

  markClean: () => {
    set({ isDirty: false })
  },
}))

function createBlankSlide(index: number): Slide {
  return {
    id: generateId(),
    index,
    layoutId: 'blank',
    elements: [],
    background: { type: 'solid', color: '#FFFFFF' },
    notes: '',
  }
}

function createSlideFromLayout(layoutType: SlideLayoutType, index: number): Slide {
  const slide = createBlankSlide(index)
  slide.layoutId = layoutType

  // Add placeholder elements based on layout
  switch (layoutType) {
    case 'title':
      slide.elements = [
        {
          id: generateId(),
          type: 'text',
          x: 80,
          y: 200,
          width: 800,
          height: 100,
          rotation: 0,
          locked: false,
          zIndex: 0,
          content: [{
            paragraphs: [{
              runs: [{ text: 'Click to add title', bold: true, italic: false, underline: false, strikethrough: false, fontFamily: 'Calibri', fontSize: 44, color: '#000000' }],
              alignment: 'center',
              lineHeight: 1.2,
              spaceBefore: 0,
              spaceAfter: 0,
              indentLevel: 0,
            }],
          }],
          placeholder: 'ctrTitle',
          textBoxProps: { verticalAlign: 'middle', padding: { top: 10, right: 10, bottom: 10, left: 10 }, autoFit: 'none', wordWrap: true, columns: 1 },
        },
        {
          id: generateId(),
          type: 'text',
          x: 160,
          y: 320,
          width: 640,
          height: 60,
          rotation: 0,
          locked: false,
          zIndex: 1,
          content: [{
            paragraphs: [{
              runs: [{ text: 'Click to add subtitle', bold: false, italic: false, underline: false, strikethrough: false, fontFamily: 'Calibri', fontSize: 24, color: '#666666' }],
              alignment: 'center',
              lineHeight: 1.2,
              spaceBefore: 0,
              spaceAfter: 0,
              indentLevel: 0,
            }],
          }],
          placeholder: 'subTitle',
          textBoxProps: { verticalAlign: 'top', padding: { top: 5, right: 5, bottom: 5, left: 5 }, autoFit: 'none', wordWrap: true, columns: 1 },
        },
      ]
      break

    case 'titleAndContent':
      slide.elements = [
        {
          id: generateId(),
          type: 'text',
          x: 40,
          y: 20,
          width: 880,
          height: 60,
          rotation: 0,
          locked: false,
          zIndex: 0,
          content: [{
            paragraphs: [{
              runs: [{ text: 'Click to add title', bold: true, italic: false, underline: false, strikethrough: false, fontFamily: 'Calibri', fontSize: 36, color: '#000000' }],
              alignment: 'left',
              lineHeight: 1.2,
              spaceBefore: 0,
              spaceAfter: 0,
              indentLevel: 0,
            }],
          }],
          placeholder: 'title',
          textBoxProps: { verticalAlign: 'bottom', padding: { top: 5, right: 5, bottom: 5, left: 5 }, autoFit: 'none', wordWrap: true, columns: 1 },
        },
        {
          id: generateId(),
          type: 'text',
          x: 40,
          y: 100,
          width: 880,
          height: 400,
          rotation: 0,
          locked: false,
          zIndex: 1,
          content: [{
            paragraphs: [{
              runs: [{ text: 'Click to add content', bold: false, italic: false, underline: false, strikethrough: false, fontFamily: 'Calibri', fontSize: 18, color: '#000000' }],
              alignment: 'left',
              lineHeight: 1.5,
              spaceBefore: 0,
              spaceAfter: 0,
              bulletType: 'bullet',
              indentLevel: 0,
            }],
          }],
          placeholder: 'body',
          textBoxProps: { verticalAlign: 'top', padding: { top: 10, right: 10, bottom: 10, left: 10 }, autoFit: 'none', wordWrap: true, columns: 1 },
        },
      ]
      break

    default:
      // Blank slide - no elements
      break
  }

  return slide
}
