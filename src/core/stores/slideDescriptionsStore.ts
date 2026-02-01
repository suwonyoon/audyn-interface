import { create } from 'zustand'
import type { Slide, TextElement, ShapeElement } from '@core/types'

export interface SlideDescription {
  slideId: string
  slideIndex: number      // Position for fallback matching
  contentHash: string     // Content fingerprint for change detection
  text: string            // Extracted/editable text content
  visualElements: string  // User-filled description of images/shapes
  script: string          // Speaker notes / script
}

interface SlideDescriptionsState {
  // Map of slideId -> SlideDescription
  descriptions: Map<string, SlideDescription>

  // Actions
  initializeFromSlides: (slides: Slide[]) => void
  updateDescription: (slideId: string, field: keyof Omit<SlideDescription, 'slideId' | 'slideIndex' | 'contentHash'>, value: string) => void
  updateContentHash: (slideId: string, slide: Slide) => void
  getDescription: (slideId: string) => SlideDescription | undefined
  hasSlideChanged: (slideId: string, slide: Slide) => boolean
  clearDescriptions: () => void
}

/**
 * Generate a content hash from a slide for change detection
 * Uses background, element count/types, and text content
 */
function generateSlideContentHash(slide: Slide): string {
  const parts: string[] = []

  // Background
  if (slide.background) {
    parts.push(`bg:${slide.background.type}:${slide.background.color || ''}`)
  }

  // Elements summary (count by type)
  const elementCounts = { text: 0, shape: 0, image: 0 }
  for (const el of slide.elements) {
    if (el.type in elementCounts) {
      elementCounts[el.type as keyof typeof elementCounts]++
    }
  }
  parts.push(`elements:${elementCounts.text}t${elementCounts.shape}s${elementCounts.image}i`)

  // Text content (simplified)
  const textContent = extractAllTextFromSlide(slide)
  parts.push(`text:${textContent.slice(0, 500)}`)

  // Notes
  if (slide.notes) {
    parts.push(`notes:${slide.notes.slice(0, 200)}`)
  }

  // Simple hash: base64 encode the combined string
  const combined = parts.join('|')
  // Using btoa for simplicity, truncate to reasonable length
  try {
    return btoa(encodeURIComponent(combined)).slice(0, 64)
  } catch {
    // Fallback if encoding fails
    return combined.slice(0, 64)
  }
}

/**
 * Check if a description has user-edited content worth preserving
 */
function hasUserEditedContent(desc: SlideDescription): boolean {
  return desc.visualElements.trim().length > 0 || desc.script.trim().length > 0
}

/**
 * Extract all text content from a slide
 */
function extractAllTextFromSlide(slide: Slide): string {
  const textParts: string[] = []

  // Sort elements by Y position (top to bottom), then X (left to right)
  const sortedElements = [...slide.elements].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 20) return a.y - b.y
    return a.x - b.x
  })

  for (const element of sortedElements) {
    if (element.type === 'text') {
      const textElement = element as TextElement
      const text = textElement.content
        .flatMap(c => c.paragraphs)
        .flatMap(p => p.runs)
        .map(r => r.text)
        .join('')
        .trim()
      if (text) {
        textParts.push(text)
      }
    } else if (element.type === 'shape') {
      const shapeElement = element as ShapeElement
      if (shapeElement.text) {
        const text = shapeElement.text
          .flatMap(c => c.paragraphs)
          .flatMap(p => p.runs)
          .map(r => r.text)
          .join('')
          .trim()
        if (text) {
          textParts.push(text)
        }
      }
    }
  }

  return textParts.join('\n')
}

export const useSlideDescriptionsStore = create<SlideDescriptionsState>((set, get) => ({
  descriptions: new Map(),

  initializeFromSlides: (slides) => {
    const existingDescriptions = get().descriptions
    const newDescriptions = new Map<string, SlideDescription>()

    // Build lookup maps from existing descriptions
    const byId = new Map<string, SlideDescription>()
    const byHash = new Map<string, SlideDescription[]>()
    const byIndex = new Map<number, SlideDescription>()

    for (const desc of existingDescriptions.values()) {
      byId.set(desc.slideId, desc)
      byIndex.set(desc.slideIndex, desc)
      if (desc.contentHash) {
        const existing = byHash.get(desc.contentHash) || []
        existing.push(desc)
        byHash.set(desc.contentHash, existing)
      }
    }

    // Track which existing descriptions have been matched
    const matchedExisting = new Set<string>()

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const currentHash = generateSlideContentHash(slide)
      let matchedDesc: SlideDescription | undefined

      // 1. Try matching by existing ID (same session, slide not refreshed)
      const byIdMatch = byId.get(slide.id)
      if (byIdMatch && !matchedExisting.has(byIdMatch.slideId)) {
        matchedDesc = byIdMatch
        matchedExisting.add(byIdMatch.slideId)
      }

      // 2. Try matching by content hash (content unchanged, ID changed after refresh)
      if (!matchedDesc) {
        const hashMatches = byHash.get(currentHash) || []
        for (const candidate of hashMatches) {
          if (!matchedExisting.has(candidate.slideId) && hasUserEditedContent(candidate)) {
            matchedDesc = candidate
            matchedExisting.add(candidate.slideId)
            break
          }
        }
      }

      // 3. Fall back to index match (content changed, position stable)
      if (!matchedDesc) {
        const indexMatch = byIndex.get(i)
        if (indexMatch && !matchedExisting.has(indexMatch.slideId) && hasUserEditedContent(indexMatch)) {
          matchedDesc = indexMatch
          matchedExisting.add(indexMatch.slideId)
        }
      }

      // Create the new description entry
      if (matchedDesc && hasUserEditedContent(matchedDesc)) {
        // Preserve user content, update metadata and re-extract text
        newDescriptions.set(slide.id, {
          slideId: slide.id,
          slideIndex: i,
          contentHash: currentHash,
          text: extractAllTextFromSlide(slide), // Always re-extract text
          visualElements: matchedDesc.visualElements, // Preserve user content
          script: matchedDesc.script, // Preserve user content
        })
      } else {
        // Create new description from slide content
        newDescriptions.set(slide.id, {
          slideId: slide.id,
          slideIndex: i,
          contentHash: currentHash,
          text: extractAllTextFromSlide(slide),
          visualElements: '', // Empty for user to fill
          script: slide.notes || '',
        })
      }
    }

    set({ descriptions: newDescriptions })
  },

  updateDescription: (slideId, field, value) => {
    const { descriptions } = get()
    const existing = descriptions.get(slideId)

    if (existing) {
      const updated = new Map(descriptions)
      updated.set(slideId, { ...existing, [field]: value })
      set({ descriptions: updated })
    }
  },

  updateContentHash: (slideId, slide) => {
    const { descriptions } = get()
    const existing = descriptions.get(slideId)

    if (existing) {
      const updated = new Map(descriptions)
      updated.set(slideId, {
        ...existing,
        contentHash: generateSlideContentHash(slide),
      })
      set({ descriptions: updated })
    }
  },

  getDescription: (slideId) => {
    return get().descriptions.get(slideId)
  },

  hasSlideChanged: (slideId, slide) => {
    const desc = get().descriptions.get(slideId)
    if (!desc || !desc.contentHash) return false

    // Only show changed indicator if user has edited content
    if (!hasUserEditedContent(desc)) return false

    const currentHash = generateSlideContentHash(slide)
    return desc.contentHash !== currentHash
  },

  clearDescriptions: () => {
    set({ descriptions: new Map() })
  },
}))
