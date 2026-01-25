import { usePresentationStore } from '@/stores'
import type { TextElement } from '@/types'

interface TextPropertiesProps {
  element: TextElement
}

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 44, 54, 72]
const FONTS = ['Arial', 'Calibri', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New']

export function TextProperties({ element }: TextPropertiesProps) {
  const { updateElement } = usePresentationStore()

  const firstRun = element.content[0]?.paragraphs[0]?.runs[0]

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontSize = parseInt(e.target.value)
    const newContent = JSON.parse(JSON.stringify(element.content))
    newContent[0].paragraphs.forEach((p: any) => {
      p.runs.forEach((r: any) => {
        r.fontSize = fontSize
      })
    })
    updateElement(element.id, { content: newContent })
  }

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fontFamily = e.target.value
    const newContent = JSON.parse(JSON.stringify(element.content))
    newContent[0].paragraphs.forEach((p: any) => {
      p.runs.forEach((r: any) => {
        r.fontFamily = fontFamily
      })
    })
    updateElement(element.id, { content: newContent })
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    const newContent = JSON.parse(JSON.stringify(element.content))
    newContent[0].paragraphs.forEach((p: any) => {
      p.runs.forEach((r: any) => {
        r.color = color
      })
    })
    updateElement(element.id, { content: newContent })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-sm mb-2">Text</p>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Font</label>
        <select
          value={firstRun?.fontFamily || 'Arial'}
          onChange={handleFontFamilyChange}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          {FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Size</label>
        <select
          value={firstRun?.fontSize || 18}
          onChange={handleFontSizeChange}
          className="w-full px-2 py-1 text-sm border rounded"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}pt
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={firstRun?.color || '#000000'}
            onChange={handleColorChange}
            className="w-8 h-8 rounded cursor-pointer"
          />
          <span className="text-sm text-gray-600">{firstRun?.color || '#000000'}</span>
        </div>
      </div>

      <div className="pt-2 border-t">
        <label className="block text-xs text-gray-500 mb-1">Position</label>
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
