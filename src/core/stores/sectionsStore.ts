import { create } from 'zustand'
import type { Section } from '@core/types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

interface SectionsState {
  sections: Section[]

  // Actions
  addSection: (afterSlideIndex: number, name?: string) => void
  removeSection: (sectionId: string) => void
  updateSectionName: (sectionId: string, name: string) => void
  clearSections: () => void

  // Initialize with default section containing all slides
  initializeDefaultSection: () => void

  // Computed helpers
  getSectionForSlide: (slideIndex: number) => Section | null
  getSlidesInSection: (sectionId: string, totalSlides: number) => number[]
  hasSectionAfterSlide: (slideIndex: number) => boolean
}

export const useSectionsStore = create<SectionsState>((set, get) => ({
  sections: [],

  addSection: (afterSlideIndex, name) => {
    const { sections } = get()

    // Check if section already exists at this position
    const existingIndex = sections.findIndex(s => s.afterSlideIndex === afterSlideIndex)
    if (existingIndex !== -1) {
      // Remove existing section at this position (toggle behavior)
      set({
        sections: sections.filter((_, i) => i !== existingIndex),
      })
      return
    }

    // Create new section
    const sectionNumber = sections.length + 1
    const newSection: Section = {
      id: generateId(),
      name: name || `Section ${sectionNumber}`,
      afterSlideIndex,
    }

    // Insert and sort by afterSlideIndex
    const newSections = [...sections, newSection].sort(
      (a, b) => a.afterSlideIndex - b.afterSlideIndex
    )

    // Renumber sections
    newSections.forEach((section, index) => {
      if (!name && section.name.startsWith('Section ')) {
        section.name = `Section ${index + 1}`
      }
    })

    set({ sections: newSections })
  },

  removeSection: (sectionId) => {
    const { sections } = get()
    const newSections = sections.filter(s => s.id !== sectionId)

    // Renumber sections
    newSections.forEach((section, index) => {
      if (section.name.startsWith('Section ')) {
        section.name = `Section ${index + 1}`
      }
    })

    set({ sections: newSections })
  },

  updateSectionName: (sectionId, name) => {
    set({
      sections: get().sections.map(s =>
        s.id === sectionId ? { ...s, name } : s
      ),
    })
  },

  clearSections: () => {
    set({ sections: [] })
  },

  initializeDefaultSection: () => {
    // Create a single section starting at the beginning (all slides)
    set({
      sections: [
        {
          id: generateId(),
          name: 'Section 1',
          afterSlideIndex: -1, // -1 means starts before slide 0
        },
      ],
    })
  },

  getSectionForSlide: (slideIndex) => {
    const { sections } = get()
    if (sections.length === 0) return null

    // Find the section that this slide belongs to
    // A slide belongs to the section with the highest afterSlideIndex that is still <= slideIndex
    const sortedSections = [...sections].sort((a, b) => b.afterSlideIndex - a.afterSlideIndex)

    for (const section of sortedSections) {
      if (section.afterSlideIndex < slideIndex) {
        return section
      }
    }

    // If no section found, return the first section (afterSlideIndex = -1)
    return sections.find(s => s.afterSlideIndex === -1) || sections[0] || null
  },

  getSlidesInSection: (sectionId, totalSlides) => {
    const { sections } = get()
    const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)

    const sectionIndex = sortedSections.findIndex(s => s.id === sectionId)
    if (sectionIndex === -1) return []

    const section = sortedSections[sectionIndex]
    const nextSection = sortedSections[sectionIndex + 1]

    const startSlide = section.afterSlideIndex + 1
    const endSlide = nextSection ? nextSection.afterSlideIndex : totalSlides - 1

    const slides: number[] = []
    for (let i = startSlide; i <= endSlide; i++) {
      slides.push(i)
    }

    return slides
  },

  hasSectionAfterSlide: (slideIndex) => {
    const { sections } = get()
    return sections.some(s => s.afterSlideIndex === slideIndex)
  },
}))
