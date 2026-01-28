import { useState, useRef } from 'react'
import { usePresentationStore } from '@core/stores'
import { generateId } from '@core/lib/utils/xmlUtils'
import type { TextElement, ShapeElement, ImageElement } from '@core/types'
import { Plus, Type, Square, Image, ChevronDown } from 'lucide-react'

export function InsertMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addElement, presentation } = usePresentationStore()

  const handleAddTextBox = () => {
    const textElement: TextElement = {
      id: generateId(),
      type: 'text',
      x: 100,
      y: 100,
      width: 300,
      height: 100,
      rotation: 0,
      locked: false,
      zIndex: 999,
      content: [
        {
          paragraphs: [
            {
              runs: [
                {
                  text: 'Type here',
                  bold: false,
                  italic: false,
                  underline: false,
                  strikethrough: false,
                  fontFamily: 'Arial',
                  fontSize: 18,
                  color: '#000000',
                },
              ],
              alignment: 'left',
              lineHeight: 1.2,
              spaceBefore: 0,
              spaceAfter: 0,
              indentLevel: 0,
            },
          ],
        },
      ],
      textBoxProps: {
        verticalAlign: 'top',
        padding: { top: 5, right: 5, bottom: 5, left: 5 },
        autoFit: 'none',
        wordWrap: true,
        columns: 1,
      },
    }
    addElement(textElement)
    setIsOpen(false)
  }

  const handleAddShape = (shapeType: ShapeElement['shapeType']) => {
    const shapeElement: ShapeElement = {
      id: generateId(),
      type: 'shape',
      x: 100,
      y: 100,
      width: 150,
      height: 150,
      rotation: 0,
      locked: false,
      zIndex: 999,
      shapeType,
      fill: { type: 'solid', color: '#4472C4', opacity: 1 },
      stroke: { color: '#2F5496', width: 2, dashStyle: 'solid', opacity: 1 },
    }
    addElement(shapeElement)
    setIsOpen(false)
  }

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string

      // Create image to get dimensions
      const img = new window.Image()
      img.onload = () => {
        // Scale down if too large
        let width = img.width
        let height = img.height
        const maxSize = 400

        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height)
          width *= scale
          height *= scale
        }

        const imageElement: ImageElement = {
          id: generateId(),
          type: 'image',
          x: 100,
          y: 100,
          width,
          height,
          rotation: 0,
          locked: false,
          zIndex: 999,
          src,
          originalSrc: file.name,
        }
        addElement(imageElement)
      }
      img.src = src
    }
    reader.readAsDataURL(file)

    setIsOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!presentation) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
      >
        <Plus className="w-4 h-4" />
        Insert
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
            <div className="py-1">
              <button
                onClick={handleAddTextBox}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Type className="w-4 h-4" />
                Text Box
              </button>

              <div className="border-t my-1" />

              <div className="px-4 py-1 text-xs text-gray-500 uppercase">Shapes</div>
              <button
                onClick={() => handleAddShape('rect')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Square className="w-4 h-4" />
                Rectangle
              </button>
              <button
                onClick={() => handleAddShape('ellipse')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="w-4 h-4 border-2 border-current rounded-full" />
                Ellipse
              </button>
              <button
                onClick={() => handleAddShape('triangle')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-current" />
                Triangle
              </button>
              <button
                onClick={() => handleAddShape('star5')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="text-lg">★</span>
                Star
              </button>
              <button
                onClick={() => handleAddShape('arrow')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span className="text-lg">→</span>
                Arrow
              </button>

              <div className="border-t my-1" />

              <button
                onClick={handleImageUpload}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Image className="w-4 h-4" />
                Image
              </button>
            </div>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />
    </div>
  )
}
