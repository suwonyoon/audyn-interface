import { usePresentationStore } from '@core/stores'
import type { Slide } from '@core/types'

interface SlidePropertiesProps {
  slide: Slide
  slideIndex: number
}

const BACKGROUND_COLORS = [
  '#FFFFFF', '#F8F9FA', '#E9ECEF', '#DEE2E6',
  '#4472C4', '#ED7D31', '#70AD47', '#FFC000',
  '#000000', '#1F2937', '#374151', '#4B5563',
]

export function SlideProperties({ slide, slideIndex }: SlidePropertiesProps) {
  const { updateSlideBackground } = usePresentationStore()

  const handleBackgroundChange = (color: string) => {
    updateSlideBackground(slideIndex, color)
  }

  return (
    <div className="p-3 space-y-4">
      <div>
        <p className="font-medium text-sm mb-2">Slide {slideIndex + 1}</p>
        <p className="text-xs text-gray-500">
          {slide.elements.length} element{slide.elements.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-2">Background Color</label>
        <div className="grid grid-cols-4 gap-2">
          {BACKGROUND_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleBackgroundChange(color)}
              className={`w-8 h-8 rounded border-2 transition-all ${
                slide.background.color === color
                  ? 'border-blue-500 scale-110'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={slide.background.color || '#ffffff'}
            onChange={(e) => handleBackgroundChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <span className="text-xs text-gray-600">Custom color</span>
        </div>
      </div>

      <div className="pt-2 border-t">
        <label className="block text-xs text-gray-500 mb-1">Layout</label>
        <p className="text-sm text-gray-700 capitalize">{slide.layoutId}</p>
      </div>
    </div>
  )
}
