import { useAnalysisStore, usePresentationStore } from '@core/stores'
import { Loader2, X } from 'lucide-react'

export function AnalysisProgress() {
  const { progress, cancelAnalysis } = useAnalysisStore()
  const { fileName } = usePresentationStore()

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - responsive for narrow task panes */}
      <div className="bg-white border-b px-3 py-2 tp:px-4 tp:py-3 flex flex-col tp:flex-row tp:items-center tp:justify-between gap-2 tp:gap-3">
        <div className="flex items-center gap-2 tp:gap-3 min-w-0">
          <div className="p-1.5 tp:p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <Loader2 className="w-4 h-4 tp:w-5 tp:h-5 text-blue-600 animate-spin" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm tp:text-lg font-semibold text-gray-900">Analyzing...</h1>
            <p className="text-xs tp:text-sm text-gray-500 truncate">{fileName}</p>
          </div>
        </div>
        <button
          onClick={cancelAnalysis}
          className="w-full tp:w-auto flex items-center justify-center gap-1.5 tp:gap-2 px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
          Cancel
        </button>
      </div>

      {/* Progress content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 tp:w-16 tp:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 tp:mb-6">
            <Loader2 className="w-6 h-6 tp:w-8 tp:h-8 text-blue-600 animate-spin" />
          </div>

          <h2 className="text-lg tp:text-xl font-semibold text-gray-900 mb-2">
            Analyzing Your Presentation
          </h2>

          <p className="text-xs tp:text-sm text-gray-600 mb-4 tp:mb-6">
            {progress?.currentStep || 'Starting analysis...'}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress?.percentComplete || 0}%` }}
            />
          </div>

          <p className="text-xs tp:text-sm text-gray-500">
            {progress?.percentComplete || 0}% complete
          </p>

          {progress && (
            <p className="text-xs text-gray-400 mt-3 tp:mt-4">
              Slide {progress.currentSlideIndex + 1} of {progress.totalSlides}
              {' '}&middot;{' '}
              {progress.totalAgents} agent{progress.totalAgents !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
