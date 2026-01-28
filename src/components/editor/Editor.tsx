import { usePresentationStore, useModeStore, useAnalysisStore } from '@core/stores'
import { EditorCanvas } from './EditorCanvas'
import { EditorToolbar } from './EditorToolbar'
import { WelcomeScreen } from './WelcomeScreen'
import { SlidePanel } from '../slides/SlidePanel'
import { PropertiesPanel } from '../properties/PropertiesPanel'
import { useKeyboardShortcuts } from '@core/hooks'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export function Editor() {
  const { presentation, isLoading, error } = usePresentationStore()
  const { goToAnalysis } = useModeStore()
  const { currentAnalysis, getUnresolvedCommentCount } = useAnalysisStore()

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!presentation) {
    return <WelcomeScreen />
  }

  const unresolvedCount = getUnresolvedCommentCount()
  const hasAnalysis = !!currentAnalysis

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Analysis Context Banner */}
      {hasAnalysis && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {unresolvedCount > 0 ? (
              <>
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">{unresolvedCount}</span> unresolved comment{unresolvedCount !== 1 ? 's' : ''} from analysis
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">All analysis comments resolved</span>
              </>
            )}
          </div>
          <button
            onClick={goToAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analysis
          </button>
        </div>
      )}

      {/* Top Toolbar */}
      <EditorToolbar />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Slide Thumbnails */}
        <SlidePanel />

        {/* Center: Canvas */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-200">
          <EditorCanvas />
        </div>

        {/* Right: Properties Panel */}
        <PropertiesPanel />
      </div>
    </div>
  )
}
