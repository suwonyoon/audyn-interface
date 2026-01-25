import { usePresentationStore } from '@/stores'
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

export function TextTools() {
  const { presentation, selectedElementIds, updateElement, currentSlideIndex } = usePresentationStore()

  if (!presentation) return null

  const currentSlide = presentation.slides[currentSlideIndex]
  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementIds[0])
  const isTextSelected = selectedElement?.type === 'text'

  const getTextProps = () => {
    if (!isTextSelected || selectedElement?.type !== 'text') return null
    const firstRun = selectedElement.content[0]?.paragraphs[0]?.runs[0]
    return {
      bold: firstRun?.bold || false,
      italic: firstRun?.italic || false,
      underline: firstRun?.underline || false,
      alignment: selectedElement.content[0]?.paragraphs[0]?.alignment || 'left',
    }
  }

  const textProps = getTextProps()

  const toggleBold = () => {
    if (!selectedElement || selectedElement.type !== 'text') return
    const newContent = JSON.parse(JSON.stringify(selectedElement.content))
    newContent[0].paragraphs[0].runs[0].bold = !textProps?.bold
    updateElement(selectedElement.id, { content: newContent })
  }

  const toggleItalic = () => {
    if (!selectedElement || selectedElement.type !== 'text') return
    const newContent = JSON.parse(JSON.stringify(selectedElement.content))
    newContent[0].paragraphs[0].runs[0].italic = !textProps?.italic
    updateElement(selectedElement.id, { content: newContent })
  }

  const toggleUnderline = () => {
    if (!selectedElement || selectedElement.type !== 'text') return
    const newContent = JSON.parse(JSON.stringify(selectedElement.content))
    newContent[0].paragraphs[0].runs[0].underline = !textProps?.underline
    updateElement(selectedElement.id, { content: newContent })
  }

  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedElement || selectedElement.type !== 'text') return
    const newContent = JSON.parse(JSON.stringify(selectedElement.content))
    newContent[0].paragraphs.forEach((p: any) => {
      p.alignment = alignment
    })
    updateElement(selectedElement.id, { content: newContent })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggleBold}
        disabled={!isTextSelected}
        className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          textProps?.bold ? 'bg-gray-200' : ''
        }`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={toggleItalic}
        disabled={!isTextSelected}
        className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          textProps?.italic ? 'bg-gray-200' : ''
        }`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={toggleUnderline}
        disabled={!isTextSelected}
        className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          textProps?.underline ? 'bg-gray-200' : ''
        }`}
        title="Underline"
      >
        <Underline className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <button
        onClick={() => setAlignment('left')}
        disabled={!isTextSelected}
        className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          textProps?.alignment === 'left' ? 'bg-gray-200' : ''
        }`}
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => setAlignment('center')}
        disabled={!isTextSelected}
        className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          textProps?.alignment === 'center' ? 'bg-gray-200' : ''
        }`}
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        onClick={() => setAlignment('right')}
        disabled={!isTextSelected}
        className={`p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          textProps?.alignment === 'right' ? 'bg-gray-200' : ''
        }`}
        title="Align Right"
      >
        <AlignRight className="w-4 h-4" />
      </button>
    </div>
  )
}
