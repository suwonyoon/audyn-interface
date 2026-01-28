import { useState } from 'react'
import { usePresentationStore, useSectionsStore } from '@core/stores'
import { Plus, X, GripVertical, Image as ImageIcon, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import type { Slide, TextElement, ShapeElement } from '@core/types'

// Extract text content from a slide for preview
function getSlidePreviewText(slide: Slide): { title: string; subtitle: string } {
  let title = ''
  let subtitle = ''

  // Sort elements by Y position to get top-to-bottom order
  const sortedElements = [...slide.elements].sort((a, b) => a.y - b.y)

  for (const element of sortedElements) {
    let text = ''

    if (element.type === 'text') {
      text = (element as TextElement).content
        .flatMap(c => c.paragraphs)
        .flatMap(p => p.runs)
        .map(r => r.text)
        .join(' ')
        .trim()
    } else if (element.type === 'shape' && (element as ShapeElement).text) {
      text = (element as ShapeElement).text!
        .flatMap(c => c.paragraphs)
        .flatMap(p => p.runs)
        .map(r => r.text)
        .join(' ')
        .trim()
    }

    if (text && !title) {
      title = text
    } else if (text && !subtitle) {
      subtitle = text
      break // We have both title and subtitle
    }
  }

  return { title, subtitle }
}

// Check if slide has images
function hasImages(slide: Slide): boolean {
  return slide.elements.some(e => e.type === 'image')
}

export function SlideSectionPanel() {
  const { presentation } = usePresentationStore()
  const { sections, addSection, removeSection, updateSectionName } = useSectionsStore()
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  if (!presentation) return null

  // Find the section that starts at a given afterSlideIndex
  const getSectionAt = (afterSlideIndex: number) => {
    return sections.find(s => s.afterSlideIndex === afterSlideIndex)
  }

  const toggleNotes = (slideId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slideId)) {
        newSet.delete(slideId)
      } else {
        newSet.add(slideId)
      }
      return newSet
    })
  }

  return (
    <div className="flex-1 bg-white flex flex-col">
      <div className="p-2 tp:p-4 border-b">
        <div>
          <h2 className="text-xs tp:text-sm font-semibold text-gray-700">Slides & Sections</h2>
          <p className="text-xs text-gray-500 mt-1 hidden tp:block">
            Review your slides and click between them to create section dividers.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 tp:p-4">
        <div className="space-y-1">
          {presentation.slides.map((slide, index) => {
            const { title, subtitle } = getSlidePreviewText(slide)
            const slideHasImages = hasImages(slide)

            return (
              <div key={slide.id}>
                {/* Section divider before first slide or after previous slide */}
                <SectionDivider
                  section={getSectionAt(index - 1)}
                  isFirst={index === 0}
                  onAdd={() => addSection(index - 1)}
                  onRemove={(sectionId) => removeSection(sectionId)}
                  onRename={(sectionId, name) => updateSectionName(sectionId, name)}
                />

                {/* Slide thumbnail with text preview */}
                <div className="p-1.5 tp:p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex gap-2 tp:gap-3">
                    {/* Slide number */}
                    <div className="flex-shrink-0 w-6 tp:w-8 text-xs tp:text-sm text-gray-400 font-medium pt-1 text-right">
                      {index + 1}
                    </div>

                    {/* Mini slide visual */}
                    <div
                      className="flex-shrink-0 w-16 h-10 tp:w-24 tp:h-16 rounded border border-gray-200 overflow-hidden relative"
                      style={{ backgroundColor: slide.background?.color || '#ffffff' }}
                    >
                      {/* Show mini representation of content */}
                      <div className="absolute inset-0 p-1">
                        {slide.elements.slice(0, 4).map((element) => {
                          const left = (element.x / presentation.slideWidth) * 100
                          const top = (element.y / presentation.slideHeight) * 100
                          const width = (element.width / presentation.slideWidth) * 100
                          const height = (element.height / presentation.slideHeight) * 100

                          if (element.type === 'text') {
                            return (
                              <div
                                key={element.id}
                                className="absolute bg-gray-300/60 rounded-[1px]"
                                style={{
                                  left: `${left}%`,
                                  top: `${top}%`,
                                  width: `${Math.min(width, 80)}%`,
                                  height: `${Math.min(height, 20)}%`,
                                  minHeight: '2px',
                                }}
                              />
                            )
                          }
                          if (element.type === 'shape') {
                            return (
                              <div
                                key={element.id}
                                className="absolute rounded-[1px]"
                                style={{
                                  left: `${left}%`,
                                  top: `${top}%`,
                                  width: `${width}%`,
                                  height: `${height}%`,
                                  backgroundColor: (element as ShapeElement).fill?.color || '#d1d5db',
                                }}
                              />
                            )
                          }
                          if (element.type === 'image') {
                            return (
                              <div
                                key={element.id}
                                className="absolute bg-gray-400/60 rounded-[1px]"
                                style={{
                                  left: `${left}%`,
                                  top: `${top}%`,
                                  width: `${width}%`,
                                  height: `${height}%`,
                                }}
                              />
                            )
                          }
                          return null
                        })}
                      </div>
                    </div>

                    {/* Text content preview */}
                    <div className="flex-1 min-w-0 py-0.5">
                      {title ? (
                        <>
                          <p className="text-xs tp:text-sm font-medium text-gray-900 truncate leading-tight">
                            {title}
                          </p>
                          {subtitle && (
                            <p className="text-xs text-gray-500 truncate leading-tight mt-0.5 hidden tp:block">
                              {subtitle}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs tp:text-sm text-gray-400 italic">
                          {slideHasImages ? (
                            <span className="flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
                              Image slide
                            </span>
                          ) : (
                            'Empty slide'
                          )}
                        </p>
                      )}
                      {/* Speaker notes toggle */}
                      {slide.notes && (
                        <button
                          onClick={() => toggleNotes(slide.id)}
                          className="mt-1 tp:mt-1.5 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          {expandedNotes.has(slide.id) ? (
                            <ChevronDown className="w-3 h-3 tp:w-3.5 tp:h-3.5" />
                          ) : (
                            <ChevronRight className="w-3 h-3 tp:w-3.5 tp:h-3.5" />
                          )}
                          <FileText className="w-3 h-3 tp:w-3.5 tp:h-3.5" />
                          <span className="hidden tp:inline">Speaker Notes</span>
                          <span className="tp:hidden">Notes</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded notes */}
                  {slide.notes && expandedNotes.has(slide.id) && (
                    <div className="mt-2 ml-6 tp:ml-11 p-2 tp:p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-800 whitespace-pre-wrap leading-relaxed">
                        {slide.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Final section divider area after last slide (for adding section at end) */}
          {presentation.slides.length > 0 && (
            <SectionDivider
              section={getSectionAt(presentation.slides.length - 1)}
              isFirst={false}
              onAdd={() => addSection(presentation.slides.length - 1)}
              onRemove={(sectionId) => removeSection(sectionId)}
              onRename={(sectionId, name) => updateSectionName(sectionId, name)}
              isLast
            />
          )}
        </div>
      </div>

      {/* Section count */}
      <div className="p-2 tp:p-4 border-t bg-gray-50">
        <div className="text-xs tp:text-sm text-gray-600">
          <span className="font-medium">{sections.length}</span> section{sections.length !== 1 ? 's' : ''}
          {' '}&middot;{' '}
          <span className="font-medium">{presentation.slides.length}</span> slides
        </div>
      </div>
    </div>
  )
}

interface SectionDividerProps {
  section: ReturnType<typeof useSectionsStore.getState>['sections'][0] | undefined
  isFirst: boolean
  isLast?: boolean
  onAdd: () => void
  onRemove: (sectionId: string) => void
  onRename: (sectionId: string, name: string) => void
}

function SectionDivider({
  section,
  isFirst,
  isLast,
  onAdd,
  onRemove,
  onRename,
}: SectionDividerProps) {
  if (section) {
    // Show section header
    return (
      <div className="py-1.5 tp:py-2">
        <div className="flex items-center gap-1.5 tp:gap-2 p-1.5 tp:p-2 bg-blue-50 rounded-lg border border-blue-200">
          <GripVertical className="w-3 h-3 text-blue-400 flex-shrink-0" />
          <input
            type="text"
            value={section.name}
            onChange={(e) => onRename(section.id, e.target.value)}
            className="flex-1 min-w-0 text-xs tp:text-sm font-medium text-blue-700 bg-transparent border-none focus:outline-none focus:ring-0"
          />
          {!isFirst && (
            <button
              onClick={() => onRemove(section.id)}
              className="p-1 text-blue-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Remove section"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Show clickable area to add section (not shown before first slide if there's already a section there)
  if (isFirst) return null
  if (isLast) return null

  return (
    <div className="h-5 tp:h-6 flex items-center group">
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center py-1 rounded hover:bg-blue-50 transition-colors"
      >
        <div className="flex-1 border-t border-transparent group-hover:border-blue-300 border-dashed" />
        <span className="px-1.5 tp:px-2 flex items-center gap-1 text-xs text-transparent group-hover:text-blue-500">
          <Plus className="w-3 h-3" />
          <span className="hidden tp:inline">Add Section</span>
          <span className="tp:hidden">Add</span>
        </span>
        <div className="flex-1 border-t border-transparent group-hover:border-blue-300 border-dashed" />
      </button>
    </div>
  )
}
