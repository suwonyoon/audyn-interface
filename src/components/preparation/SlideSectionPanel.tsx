import { useState, useEffect } from 'react'
import { usePresentationStore, useSectionsStore, useSlideDescriptionsStore, useAgentsStore } from '@core/stores'
import { Plus, X, GripVertical, Image as ImageIcon, FileText, ChevronDown, ChevronRight, Edit3, Sparkles, Loader2 } from 'lucide-react'
import type { Slide, TextElement, ShapeElement } from '@core/types'
import { renderSlideToImage, generateVisualDescription } from '@core/lib/api/visionApi'
import { usePlatformOptional } from '@core/platform'

// Extract text content from a slide for preview (title/subtitle only)
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

// Check if slide has shapes (non-text shapes)
function hasShapes(slide: Slide): boolean {
  return slide.elements.some(e => e.type === 'shape')
}

export function SlideSectionPanel() {
  const { presentation } = usePresentationStore()
  const { sections, addSection, removeSection, updateSectionName } = useSectionsStore()
  const { initializeFromSlides, updateDescription, updateContentHash, getDescription, hasSlideChanged } = useSlideDescriptionsStore()
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const platform = usePlatformOptional()

  const handleSlideClick = async (slideIndex: number) => {
    if (platform) {
      try {
        await platform.navigateToSlide(slideIndex)
      } catch (err) {
        console.error('Failed to navigate to slide:', err)
      }
    }
  }

  // Initialize slide descriptions when presentation loads
  useEffect(() => {
    if (presentation) {
      initializeFromSlides(presentation.slides)
    }
  }, [presentation, initializeFromSlides])

  if (!presentation) return null

  // Find the section that starts at a given afterSlideIndex
  const getSectionAt = (afterSlideIndex: number) => {
    return sections.find(s => s.afterSlideIndex === afterSlideIndex)
  }

  const toggleDescription = (slideId: string) => {
    setExpandedDescriptions(prev => {
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
            const slideChanged = hasSlideChanged(slide.id, slide)

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
                    {/* Slide number with change indicator */}
                    <div className="flex-shrink-0 w-6 tp:w-8 text-xs tp:text-sm text-gray-400 font-medium pt-1 text-right relative">
                      {index + 1}
                      {slideChanged && (
                        <span
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-400"
                          title="Slide content changed since description was written"
                        />
                      )}
                    </div>

                    {/* Mini slide visual - clickable for navigation */}
                    <div
                      onClick={() => handleSlideClick(index)}
                      className={`flex-shrink-0 w-16 h-10 tp:w-24 tp:h-16 rounded border border-gray-200 overflow-hidden relative ${
                        platform ? 'cursor-pointer hover:ring-2 hover:ring-blue-300 hover:border-blue-300 transition-all' : ''
                      }`}
                      style={{ backgroundColor: slide.background?.color || '#ffffff' }}
                      title={platform ? 'Click to navigate to this slide' : undefined}
                      role={platform ? 'button' : undefined}
                      tabIndex={platform ? 0 : undefined}
                      onKeyDown={platform ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleSlideClick(index) } : undefined}
                    >
                      {/* Show mini representation of content - pointer-events-none to allow clicks through */}
                      <div className="absolute inset-0 p-1 pointer-events-none">
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
                      {/* Edit description toggle */}
                      <button
                        onClick={() => toggleDescription(slide.id)}
                        className="mt-1 tp:mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {expandedDescriptions.has(slide.id) ? (
                          <ChevronDown className="w-3 h-3 tp:w-3.5 tp:h-3.5" />
                        ) : (
                          <ChevronRight className="w-3 h-3 tp:w-3.5 tp:h-3.5" />
                        )}
                        <Edit3 className="w-3 h-3 tp:w-3.5 tp:h-3.5" />
                        <span className="hidden tp:inline">Edit Description</span>
                        <span className="tp:hidden">Edit</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded slide description editor */}
                  {expandedDescriptions.has(slide.id) && (
                    <SlideDescriptionEditor
                      slideId={slide.id}
                      slide={slide}
                      slideWidth={presentation.slideWidth}
                      slideHeight={presentation.slideHeight}
                      description={getDescription(slide.id)}
                      onUpdate={updateDescription}
                      onUpdateContentHash={updateContentHash}
                      hasVisualElements={slideHasImages || hasShapes(slide)}
                      hasChangedIndicator={slideChanged}
                    />
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

interface SlideDescriptionEditorProps {
  slideId: string
  slide: Slide
  slideWidth: number
  slideHeight: number
  description: ReturnType<typeof useSlideDescriptionsStore.getState>['descriptions'] extends Map<string, infer T> ? T | undefined : never
  onUpdate: (slideId: string, field: 'text' | 'visualElements' | 'script', value: string) => void
  onUpdateContentHash: (slideId: string, slide: Slide) => void
  hasVisualElements: boolean
  hasChangedIndicator: boolean
}

function SlideDescriptionEditor({
  slideId,
  slide,
  slideWidth,
  slideHeight,
  description,
  onUpdate,
  onUpdateContentHash,
  hasVisualElements,
  hasChangedIndicator,
}: SlideDescriptionEditorProps) {
  const { apiKeyConfig } = useAgentsStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Handler that updates content and clears change indicator
  const handleUpdate = (field: 'text' | 'visualElements' | 'script', value: string) => {
    onUpdate(slideId, field, value)
    // If there's a change indicator and user is editing content, update the hash
    if (hasChangedIndicator && (field === 'visualElements' || field === 'script')) {
      onUpdateContentHash(slideId, slide)
    }
  }

  const handleGenerateVisualDescription = async () => {
    if (!apiKeyConfig) {
      setGenerateError('Please configure an OpenAI API key in the Agents step first.')
      return
    }

    if (apiKeyConfig.provider !== 'openai') {
      setGenerateError('Visual description requires OpenAI API. Please switch to OpenAI provider.')
      return
    }

    setIsGenerating(true)
    setGenerateError(null)

    try {
      // Render slide to image
      const imageBase64 = await renderSlideToImage(slide, slideWidth, slideHeight, 0.5)

      // Generate description using vision API
      const visualDescription = await generateVisualDescription(
        imageBase64,
        apiKeyConfig,
        description?.text
      )

      // Update the visual elements field and clear change indicator
      handleUpdate('visualElements', visualDescription)
    } catch (err) {
      console.error('Failed to generate visual description:', err)
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate description')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!description) return null

  return (
    <div className="mt-2 ml-6 tp:ml-11 space-y-3">
      {/* Text Content */}
      <div className="p-2 tp:p-3 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Text Content
        </label>
        <textarea
          value={description.text}
          onChange={(e) => handleUpdate('text', e.target.value)}
          placeholder="Extracted text from slide..."
          rows={3}
          className="w-full px-2 py-1.5 text-xs tp:text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
        />
      </div>

      {/* Visual Elements (Images/Shapes) */}
      <div className="p-2 tp:p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-purple-700">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              Images / Shapes
              {hasVisualElements && (
                <span className="text-purple-500 font-normal hidden tp:inline">(has visuals)</span>
              )}
            </span>
          </label>
          <button
            onClick={handleGenerateVisualDescription}
            disabled={isGenerating || !apiKeyConfig}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
              isGenerating || !apiKeyConfig
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            title={!apiKeyConfig ? 'Configure OpenAI API key first' : 'Generate description using AI'}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden tp:inline">Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                <span className="hidden tp:inline">AI Generate</span>
                <span className="tp:hidden">AI</span>
              </>
            )}
          </button>
        </div>
        {generateError && (
          <p className="text-xs text-red-600 mb-1">{generateError}</p>
        )}
        <textarea
          value={description.visualElements}
          onChange={(e) => handleUpdate('visualElements', e.target.value)}
          placeholder="Describe the images, charts, diagrams, or shapes on this slide..."
          rows={2}
          className="w-full px-2 py-1.5 text-xs tp:text-sm border border-purple-200 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none bg-white"
        />
      </div>

      {/* Script / Speaker Notes */}
      <div className="p-2 tp:p-3 bg-amber-50 rounded-lg border border-amber-200">
        <label className="block text-xs font-medium text-amber-700 mb-1">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Script / Speaker Notes
          </span>
        </label>
        <textarea
          value={description.script}
          onChange={(e) => handleUpdate('script', e.target.value)}
          placeholder="Speaker notes or script for this slide..."
          rows={3}
          className="w-full px-2 py-1.5 text-xs tp:text-sm border border-amber-200 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none bg-white"
        />
      </div>
    </div>
  )
}
