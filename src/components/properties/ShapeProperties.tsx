import { usePresentationStore } from '@/stores'
import type { ShapeElement } from '@/types'

interface ShapePropertiesProps {
  element: ShapeElement
}

export function ShapeProperties({ element }: ShapePropertiesProps) {
  const { updateElement } = usePresentationStore()

  const handleFillColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateElement(element.id, {
      fill: { ...element.fill, type: 'solid', color: e.target.value },
    })
  }

  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateElement(element.id, {
      stroke: { ...element.stroke, color: e.target.value },
    })
  }

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateElement(element.id, {
      stroke: { ...element.stroke, width: parseInt(e.target.value) || 0 },
    })
  }

  const handleNoFill = () => {
    updateElement(element.id, {
      fill: { type: 'none' },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-sm mb-2">Shape: {element.shapeType}</p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Fill Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={element.fill.color || '#cccccc'}
            onChange={handleFillColorChange}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <span className="text-sm text-gray-600">{element.fill.color || 'None'}</span>
          <button
            onClick={handleNoFill}
            className="ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            No fill
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Stroke Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={element.stroke.color || '#000000'}
            onChange={handleStrokeColorChange}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <span className="text-sm text-gray-600">{element.stroke.color}</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Stroke Width</label>
        <input
          type="range"
          min="0"
          max="10"
          value={element.stroke.width}
          onChange={handleStrokeWidthChange}
          className="w-full"
        />
        <span className="text-sm text-gray-600">{element.stroke.width}px</span>
      </div>

      <div className="pt-2 border-t">
        <label className="block text-xs text-gray-500 mb-1">Position & Size</label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-gray-400">X:</span> {Math.round(element.x)}
          </div>
          <div>
            <span className="text-xs text-gray-400">Y:</span> {Math.round(element.y)}
          </div>
          <div>
            <span className="text-xs text-gray-400">W:</span> {Math.round(element.width)}
          </div>
          <div>
            <span className="text-xs text-gray-400">H:</span> {Math.round(element.height)}
          </div>
        </div>
      </div>
    </div>
  )
}
