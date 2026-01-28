import { useState } from 'react'
import { usePresentationStore } from '@core/stores'
import { Palette, Trash2 } from 'lucide-react'

const COLORS = [
  '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47',
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#000000', '#FFFFFF', '#808080', '#C0C0C0',
]

export function ShapeTools() {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const { presentation, selectedElementIds, updateElement, deleteSelectedElements, currentSlideIndex } = usePresentationStore()

  if (!presentation) return null

  const currentSlide = presentation.slides[currentSlideIndex]
  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementIds[0])
  const isShapeSelected = selectedElement?.type === 'shape'

  const handleColorChange = (color: string) => {
    if (!selectedElement || selectedElement.type !== 'shape') return
    updateElement(selectedElement.id, {
      fill: { ...selectedElement.fill, color },
    })
    setShowColorPicker(false)
  }

  const handleDelete = () => {
    if (selectedElementIds.length > 0) {
      deleteSelectedElements()
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          disabled={!isShapeSelected}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title="Fill Color"
        >
          <Palette className="w-4 h-4" />
          {isShapeSelected && selectedElement?.type === 'shape' && (
            <div
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: selectedElement.fill.color || '#cccccc' }}
            />
          )}
        </button>

        {showColorPicker && isShapeSelected && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowColorPicker(false)} />
            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border z-20">
              <div className="grid grid-cols-4 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        onClick={handleDelete}
        disabled={selectedElementIds.length === 0}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-red-600"
        title="Delete Selected"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
