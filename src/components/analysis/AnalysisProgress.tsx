import { useAnalysisStore, usePresentationStore } from '@/stores'
import { Loader2, X } from 'lucide-react'

export function AnalysisProgress() {
  const { progress, cancelAnalysis } = useAnalysisStore()
  const { fileName } = usePresentationStore()

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Analyzing...</h1>
            <p className="text-sm text-gray-500">{fileName}</p>
          </div>
        </div>
        <button
          onClick={cancelAnalysis}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>

      {/* Progress content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Analyzing Your Presentation
          </h2>

          <p className="text-gray-600 mb-6">
            {progress?.currentStep || 'Starting analysis...'}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress?.percentComplete || 0}%` }}
            />
          </div>

          <p className="text-sm text-gray-500">
            {progress?.percentComplete || 0}% complete
          </p>

          {progress && (
            <p className="text-xs text-gray-400 mt-4">
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
