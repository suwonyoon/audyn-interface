import { useState } from 'react'
import { usePresentationStore } from '@core/stores'
import { FileMenu } from '../toolbar/FileMenu'
import { InsertMenu } from '../toolbar/InsertMenu'
import { TextTools } from '../toolbar/TextTools'
import { ShapeTools } from '../toolbar/ShapeTools'
import { exportToPPTX, downloadPPTX } from '@core/lib/export'
import { Save, Download, Check } from 'lucide-react'

export function EditorToolbar() {
  const { presentation, fileName, isDirty, commitCanvasChanges, markClean } = usePresentationStore()
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = () => {
    if (!presentation || isSaving) return

    setIsSaving(true)
    try {
      // Commit all pending canvas changes to the store
      commitCanvasChanges?.()
      markClean()
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    if (!presentation || isExporting) return

    setIsExporting(true)
    try {
      // Commit all pending canvas changes first
      commitCanvasChanges?.()

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 50))

      // Get fresh presentation state after commit
      const currentPresentation = usePresentationStore.getState().presentation
      if (!currentPresentation) return

      const blob = await exportToPPTX(currentPresentation)
      downloadPPTX(blob, fileName)
      markClean()
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export presentation')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="bg-white border-b shadow-sm">
      {/* Menu Bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b">
        <FileMenu />
        <InsertMenu />

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={!presentation || isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save changes to memory"
        >
          {showSaved ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Saved</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </>
          )}
        </button>

        <button
          onClick={handleExport}
          disabled={!presentation || isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
          title="Export and download as .pptx"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export'}
        </button>

        <span className="text-sm text-gray-600 ml-3">
          {fileName}
          {isDirty && <span className="text-orange-500"> *</span>}
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2">
        <TextTools />
        <div className="w-px h-6 bg-gray-300" />
        <ShapeTools />
      </div>
    </div>
  )
}
