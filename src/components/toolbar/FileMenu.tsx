import { useState, useRef } from 'react'
import { usePresentationStore } from '@/stores'
import { exportToPPTX, downloadPPTX } from '@/lib/export'
import { FileIcon, Upload, Download, FilePlus, ChevronDown } from 'lucide-react'

export function FileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { presentation, loadPresentation, createNewPresentation, fileName } = usePresentationStore()

  const handleUpload = () => {
    fileInputRef.current?.click()
    setIsOpen(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await loadPresentation(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExport = async () => {
    if (!presentation) return
    setIsOpen(false)

    try {
      const blob = await exportToPPTX(presentation)
      downloadPPTX(blob, fileName)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export presentation')
    }
  }

  const handleNew = () => {
    createNewPresentation()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
      >
        <FileIcon className="w-4 h-4" />
        File
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
            <div className="py-1">
              <button
                onClick={handleNew}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <FilePlus className="w-4 h-4" />
                New Presentation
              </button>
              <button
                onClick={handleUpload}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Upload className="w-4 h-4" />
                Open File...
              </button>
              <div className="border-t my-1" />
              <button
                onClick={handleExport}
                disabled={!presentation}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export as PPTX
              </button>
            </div>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
