import { useState } from 'react'
import { usePresentationStore } from '@core/stores'
import { usePlatform } from '@core/platform'
import { FileText, RefreshCw, AlertCircle } from 'lucide-react'

export function TaskPaneHome() {
  const { loadPresentationFromBuffer, isLoading, error } = usePresentationStore()
  const platform = usePlatform()
  const [loadError, setLoadError] = useState<string | null>(null)

  const handleLoadDocument = async () => {
    setLoadError(null)
    try {
      const buffer = await platform.loadDocument()
      if (buffer) {
        const name = await platform.getDocumentName()
        await loadPresentationFromBuffer(buffer, name)
      } else {
        setLoadError('No document is currently open in PowerPoint.')
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load document')
    }
  }

  const displayError = loadError || error

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Audyn</h1>
        <p className="text-gray-600 mb-6 text-sm">
          AI-powered presentation analysis
        </p>

        {displayError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 text-left">{displayError}</p>
          </div>
        )}

        <button
          onClick={handleLoadDocument}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Analyze This Presentation
            </>
          )}
        </button>

        <p className="mt-4 text-xs text-gray-500">
          Click to load and analyze the currently open presentation
        </p>
      </div>
    </div>
  )
}
