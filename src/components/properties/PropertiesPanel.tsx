import { usePresentationStore } from '@/stores'
import { TextProperties } from './TextProperties'
import { ShapeProperties } from './ShapeProperties'
import { SlideProperties } from './SlideProperties'

export function PropertiesPanel() {
  const { presentation, currentSlideIndex, selectedElementIds } = usePresentationStore()

  if (!presentation) return null

  const currentSlide = presentation.slides[currentSlideIndex]
  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementIds[0])

  return (
    <div className="w-64 bg-white border-l flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm text-gray-700">Properties</h3>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedElement ? (
          <div className="p-3">
            {selectedElement.type === 'text' && (
              <TextProperties element={selectedElement} />
            )}
            {selectedElement.type === 'shape' && (
              <ShapeProperties element={selectedElement} />
            )}
            {selectedElement.type === 'image' && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Image</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500">Width</label>
                    <p>{Math.round(selectedElement.width)}px</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Height</label>
                    <p>{Math.round(selectedElement.height)}px</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <SlideProperties slide={currentSlide} slideIndex={currentSlideIndex} />
        )}
      </div>
    </div>
  )
}
