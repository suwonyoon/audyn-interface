import type { Slide, Section, SlideSignature, SectionSignature } from '@core/types'

/**
 * Simple hash function for creating content signatures
 * Uses a simple djb2-style hash for string content
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  // Convert to base36 for a shorter string representation
  return Math.abs(hash).toString(36)
}

/**
 * Extract slide content for hashing
 * Includes all relevant content that would affect analysis results
 *
 * IMPORTANT: Does NOT include slide.id or element.id since these are regenerated
 * on each parse. Instead uses index and position-based identification.
 */
function extractSlideContentForHash(slide: Slide): string {
  const parts: string[] = []

  // Use only slide index (not ID) since ID is regenerated on each parse
  parts.push(`idx:${slide.index}`)

  // Background
  parts.push(`bg:${slide.background.type}:${slide.background.color || ''}`)

  // Elements - sort by ROUNDED position (x, y, then type) for deterministic ordering
  // since element IDs change on each parse and floating point positions may vary slightly
  const sortedElements = [...slide.elements].sort((a, b) => {
    // Round to avoid floating point precision issues
    const aY = Math.round(a.y)
    const bY = Math.round(b.y)
    const aX = Math.round(a.x)
    const bX = Math.round(b.x)

    // Sort by y position first (top to bottom)
    if (aY !== bY) return aY - bY
    // Then by x position (left to right)
    if (aX !== bX) return aX - bX
    // Then by type
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    // Finally by size to disambiguate overlapping elements of same type
    const aSize = Math.round(a.width) * Math.round(a.height)
    const bSize = Math.round(b.width) * Math.round(b.height)
    return aSize - bSize
  })

  for (const element of sortedElements) {
    // Use type and rounded position (to avoid floating point differences)
    const roundedX = Math.round(element.x)
    const roundedY = Math.round(element.y)
    const roundedW = Math.round(element.width)
    const roundedH = Math.round(element.height)
    parts.push(`el:${element.type}:${roundedX}:${roundedY}:${roundedW}:${roundedH}`)

    if (element.type === 'text') {
      // Extract all text content from the nested structure
      const textElement = element as import('@core/types').TextElement
      const textContent = textElement.content
        .flatMap((c) => c.paragraphs)
        .flatMap((p) => p.runs)
        .map((r) => r.text)
        .join('')
      parts.push(`txt:${textContent}`)
      // Debug: log text extraction
      console.log('[Signature] Text element:', {
        contentCount: textElement.content?.length,
        extractedText: textContent.substring(0, 50) + (textContent.length > 50 ? '...' : ''),
      })
    } else if (element.type === 'shape') {
      const shapeElement = element as import('@core/types').ShapeElement
      parts.push(`shape:${shapeElement.shapeType}`)
      // Extract shape text if present
      if (shapeElement.text) {
        const shapeText = shapeElement.text
          .flatMap((c) => c.paragraphs)
          .flatMap((p) => p.runs)
          .map((r) => r.text)
          .join('')
        parts.push(`shapetxt:${shapeText}`)
        // Debug: log shape text extraction
        console.log('[Signature] Shape text:', {
          textContentCount: shapeElement.text?.length,
          extractedText: shapeText.substring(0, 50) + (shapeText.length > 50 ? '...' : ''),
        })
      }
    } else if (element.type === 'image') {
      const imageElement = element as import('@core/types').ImageElement
      // For images, use a hash of the src to handle large base64 strings
      // and avoid minor encoding differences
      parts.push(`img:${hashString(imageElement.src).substring(0, 16)}`)
    }
  }

  // Notes
  if (slide.notes) {
    parts.push(`notes:${slide.notes}`)
  }

  return parts.join('|')
}

/**
 * Generate a signature for a single slide
 */
export function generateSlideSignature(slide: Slide): SlideSignature {
  const content = extractSlideContentForHash(slide)
  const hash = hashString(content)

  // Debug: log the content being hashed (truncated for readability)
  console.log(`[Signature] Slide ${slide.index} content:`, content.substring(0, 200) + (content.length > 200 ? '...' : ''))
  console.log(`[Signature] Slide ${slide.index} hash:`, hash)

  return {
    slideId: slide.id,
    slideIndex: slide.index,
    contentHash: hash,
  }
}

/**
 * Generate a signature for a section (aggregate of its slides)
 */
export function generateSectionSignature(
  sectionId: string,
  slides: Slide[]
): SectionSignature {
  const slideSignatures = slides.map((slide) => generateSlideSignature(slide))

  // Combine all slide hashes into a single section hash
  const combinedHash = hashString(
    slideSignatures.map((s) => s.contentHash).join(':')
  )

  return {
    sectionId,
    hash: combinedHash,
    slideCount: slides.length,
    slideSignatures,
    lastAnalyzed: new Date(),
  }
}

/**
 * Get slides belonging to a section
 */
export function getSlidesForSection(
  sectionIndex: number,
  sections: Section[],
  slides: Slide[]
): Slide[] {
  const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)
  const section = sortedSections[sectionIndex]
  const nextSection = sortedSections[sectionIndex + 1]

  const startIndex = section.afterSlideIndex + 1
  const endIndex = nextSection ? nextSection.afterSlideIndex : slides.length - 1

  const result: Slide[] = []
  for (let i = startIndex; i <= endIndex && i < slides.length; i++) {
    result.push(slides[i])
  }

  return result
}

/**
 * Generate signatures for all sections
 */
export function generateAllSectionSignatures(
  sections: Section[],
  slides: Slide[]
): Map<string, SectionSignature> {
  const signatureMap = new Map<string, SectionSignature>()
  const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)

  for (let i = 0; i < sortedSections.length; i++) {
    const section = sortedSections[i]
    const sectionSlides = getSlidesForSection(i, sortedSections, slides)
    const signature = generateSectionSignature(section.id, sectionSlides)
    signatureMap.set(section.id, signature)
  }

  return signatureMap
}

/**
 * Check if a section's signature has changed
 */
export function hasSignatureChanged(
  oldSignature: SectionSignature | undefined,
  newSignature: SectionSignature
): boolean {
  if (!oldSignature) {
    return true // No previous signature means it's new
  }

  // Check if hash changed or slide count changed
  return oldSignature.hash !== newSignature.hash ||
         oldSignature.slideCount !== newSignature.slideCount
}

/**
 * Compare current slides against stored signatures to determine change status
 */
export function determineSectionChangeStatus(
  sectionId: string,
  storedSignature: SectionSignature | undefined,
  currentSlides: Slide[]
): 'unchanged' | 'changed' | 'new' {
  if (!storedSignature) {
    console.log('[Signature] No stored signature for section:', sectionId, '→ new')
    return 'new'
  }

  const currentSignature = generateSectionSignature(sectionId, currentSlides)

  // Debug logging
  console.log('[Signature] Comparing section:', sectionId)
  console.log('  Stored:', { hash: storedSignature.hash, slideCount: storedSignature.slideCount })
  console.log('  Current:', { hash: currentSignature.hash, slideCount: currentSignature.slideCount })

  if (hasSignatureChanged(storedSignature, currentSignature)) {
    console.log('  Result: CHANGED')
    return 'changed'
  }

  console.log('  Result: unchanged')
  return 'unchanged'
}
