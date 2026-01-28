import { useCallback, useState } from 'react'
import { usePresentationStore } from '@core/stores'
import { Upload, FilePlus } from 'lucide-react'

export function WelcomeScreen() {
  const { loadPresentation, createNewPresentation } = usePresentationStore()
  const [isDragging, setIsDragging] = useState(false)

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (file.name.endsWith('.pptx')) {
        await loadPresentation(file)
      } else {
        alert('Please upload a .pptx file')
      }
    },
    [loadPresentation]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Audyn</h1>
        <p className="text-gray-600 mb-8">Upload and edit your presentations with AI-powered analysis</p>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Drag and drop a .pptx file here</p>
          <p className="text-gray-400 text-sm mb-4">or</p>

          <label className="inline-block">
            <span className="px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
              Browse Files
            </span>
            <input
              type="file"
              accept=".pptx"
              onChange={handleInputChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="w-full h-px bg-gray-300"></div>
          <span className="text-gray-400 text-sm">or</span>
          <div className="w-full h-px bg-gray-300"></div>
        </div>

        <button
          onClick={createNewPresentation}
          className="mt-6 flex items-center gap-2 mx-auto px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FilePlus className="w-5 h-5" />
          Create New Presentation
        </button>
      </div>
    </div>
  )
}
