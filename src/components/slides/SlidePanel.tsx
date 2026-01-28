import { usePresentationStore } from '@core/stores'
import { SlideThumbnail } from './SlideThumbnail'
import { Plus, Copy, Trash2 } from 'lucide-react'
import type { SlideLayoutType } from '@core/types'

export function SlidePanel() {
  const {
    presentation,
    currentSlideIndex,
    setCurrentSlide,
    addSlide,
    deleteSlide,
    duplicateSlide,
  } = usePresentationStore()

  if (!presentation) return null

  const handleAddSlide = (layoutType: SlideLayoutType = 'blank') => {
    addSlide(layoutType)
  }

  const handleDeleteSlide = () => {
    if (presentation.slides.length > 1) {
      deleteSlide(currentSlideIndex)
    }
  }

  const handleDuplicateSlide = () => {
    duplicateSlide(currentSlideIndex)
  }

  return (
    <div className="w-56 bg-white border-r flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-medium text-sm text-gray-700">Slides</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDuplicateSlide}
            className="p-1 hover:bg-gray-100 rounded text-gray-600"
            title="Duplicate Slide"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteSlide}
            disabled={presentation.slides.length <= 1}
            className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete Slide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAddSlide('blank')}
            className="p-1 hover:bg-gray-100 rounded text-blue-600"
            title="Add Slide"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide List */}
      <div className="flex-1 overflow-auto p-2">
        {presentation.slides.map((slide, index) => (
          <SlideThumbnail
            key={slide.id}
            slide={slide}
            index={index}
            isActive={index === currentSlideIndex}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>

      {/* Add Slide Options */}
      <div className="p-2 border-t">
        <div className="text-xs text-gray-500 mb-2">Add slide:</div>
        <div className="flex gap-1">
          <button
            onClick={() => handleAddSlide('blank')}
            className="flex-1 p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Blank"
          >
            Blank
          </button>
          <button
            onClick={() => handleAddSlide('title')}
            className="flex-1 p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Title Slide"
          >
            Title
          </button>
          <button
            onClick={() => handleAddSlide('titleAndContent')}
            className="flex-1 p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="Title + Content"
          >
            Content
          </button>
        </div>
      </div>
    </div>
  )
}
