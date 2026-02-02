import { useAnalysisStore, usePresentationStore } from '@core/stores'
import { X, FileText } from 'lucide-react'

export function AnalysisProgress() {
  const { progress, cancelAnalysis } = useAnalysisStore()
  const { fileName } = usePresentationStore()

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-ink-50 via-white to-audyn-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-ink-100 px-4 py-3 tp:px-5 tp:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Animated document icon */}
          <div className="relative w-10 h-10 tp:w-12 tp:h-12 flex-shrink-0">
            <div className="absolute inset-0 bg-audyn-100 rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <FileText className="w-5 h-5 tp:w-6 tp:h-6 text-audyn-600" />
            </div>
            {/* Scanning line animation */}
            <div className="scan-line rounded-xl" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm tp:text-base font-semibold text-ink-800">
              Analyzing<span className="animated-ellipsis"></span>
            </h1>
            <p className="text-xs tp:text-sm text-ink-500 truncate">{fileName}</p>
          </div>
        </div>

        <button
          onClick={cancelAnalysis}
          className="flex items-center gap-1.5 px-3 py-1.5 tp:px-4 tp:py-2 text-xs tp:text-sm text-ink-600 bg-ink-100 hover:bg-ink-200 rounded-lg transition-colors duration-150"
        >
          <X className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
          <span className="hidden tp:inline">Cancel</span>
        </button>
      </div>

      {/* Progress content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          {/* Animated illustration */}
          <div className="relative w-24 h-24 tp:w-32 tp:h-32 mx-auto mb-6 tp:mb-8">
            {/* Outer ring - slow spin */}
            <div className="absolute inset-0 rounded-full border-4 border-ink-100" />
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-audyn-500 animate-spin-slow"
            />

            {/* Inner circle with document */}
            <div className="absolute inset-4 tp:inset-6 rounded-full bg-gradient-to-br from-audyn-50 to-white flex items-center justify-center shadow-card">
              <div className="relative">
                <FileText className="w-8 h-8 tp:w-10 tp:h-10 text-audyn-600" />
                {/* Mini scanning line on icon */}
                <div className="absolute inset-0 overflow-hidden rounded">
                  <div className="scan-line" />
                </div>
              </div>
            </div>

          </div>

          {/* Status text */}
          <h2 className="text-lg tp:text-xl font-semibold text-ink-800 mb-2">
            Analyzing Your Presentation
          </h2>
          <p className="text-sm tp:text-base text-ink-600 mb-6 tp:mb-8">
            {progress?.currentStep || 'Starting analysis...'}
          </p>

          {/* Progress bar with shimmer */}
          <div className="progress-bar h-3 tp:h-4 mb-3">
            <div
              className="progress-bar-fill bg-audyn-500"
              style={{ width: `${progress?.percentComplete || 0}%` }}
            />
            <div className="progress-bar-shimmer" />
          </div>

          {/* Percentage */}
          <div className="flex items-center justify-between text-sm mb-4">
            <span className="text-ink-500">Progress</span>
            <span className="score-value text-audyn-600">
              {progress?.percentComplete || 0}%
            </span>
          </div>

          {/* Stats row */}
          {progress && (
            <div className="flex items-center justify-center gap-6 pt-4 border-t border-ink-100">
              <div className="text-center">
                <p className="score-value text-lg text-ink-800">
                  {(progress.currentSectionIndex ?? 0) + 1}
                </p>
                <p className="text-xs text-ink-500">
                  of {progress.totalSections ?? 1} sections
                </p>
              </div>
              <div className="w-px h-8 bg-ink-200" />
              <div className="text-center">
                <p className="score-value text-lg text-ink-800">
                  {progress.totalAgents}
                </p>
                <p className="text-xs text-ink-500">
                  agent{progress.totalAgents !== 1 ? 's' : ''} active
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer tip */}
      <div className="p-4 text-center">
        <p className="text-xs text-ink-400">
          Analysis may take a moment depending on presentation size
        </p>
      </div>
    </div>
  )
}
