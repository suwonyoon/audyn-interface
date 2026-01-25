import { useAnalysisStore } from '@/stores'
import { AlertCircle, AlertTriangle, Info, Lightbulb, TrendingUp, TrendingDown } from 'lucide-react'
import { ScoreBadge } from './ScoreDisplay'

export function AnalysisSidebar() {
  const {
    currentAnalysis,
    scoredResult,
    selectedSectionId,
    setSelectedSection,
    getSectionScores,
  } = useAnalysisStore()

  if (!currentAnalysis) return null

  // Calculate totals
  const totalComments = currentAnalysis.sections.reduce(
    (sum, s) => sum + s.commentCount.total,
    0
  )
  const totalBySeverity: Record<string, number> = {}

  for (const section of currentAnalysis.sections) {
    for (const [severity, count] of Object.entries(section.commentCount.bySeverity || {})) {
      totalBySeverity[severity] = (totalBySeverity[severity] || 0) + count
    }
  }

  const sectionScores = getSectionScores()
  const sectionScoreMap = new Map(sectionScores.map((s) => [s.sectionId, s]))

  return (
    <div className="w-72 bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        {/* Overall Score Display */}
        {scoredResult && (
          <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">Overall Score</span>
              <div className="flex items-center gap-1">
                {scoredResult.overallScore >= 5 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                ) : scoredResult.overallScore < 4 ? (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                ) : null}
                <span
                  className={`text-lg font-bold ${
                    scoredResult.overallScore <= 3
                      ? 'text-red-600'
                      : scoredResult.overallScore <= 5
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                >
                  {scoredResult.overallScore.toFixed(1)}
                </span>
                <span className="text-xs text-gray-400">/7</span>
              </div>
            </div>
          </div>
        )}
        <h2 className="text-sm font-semibold text-gray-700">Sections</h2>
        <p className="text-xs text-gray-500 mt-1">{currentAnalysis.overallSummary}</p>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {currentAnalysis.sections.map((section) => {
            const isSelected = selectedSectionId === section.sectionId
            const hasErrors = (section.commentCount.bySeverity?.error || 0) > 0
            const hasWarnings = (section.commentCount.bySeverity?.warning || 0) > 0
            const sectionScore = sectionScoreMap.get(section.sectionId)

            return (
              <button
                key={section.sectionId}
                onClick={() => setSelectedSection(section.sectionId)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {section.sectionName}
                  </span>
                  <div className="flex items-center gap-2">
                    {sectionScore && (
                      <ScoreBadge score={sectionScore.averageScore} />
                    )}
                    {section.commentCount.total > 0 && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          hasErrors
                            ? 'bg-red-100 text-red-700'
                            : hasWarnings
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {section.commentCount.total}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {section.slides.length} slide{section.slides.length !== 1 ? 's' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-t bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Total Comments</span>
            <span className="font-medium">{totalComments}</span>
          </div>
          {(totalBySeverity.error || 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-gray-500">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                Errors
              </span>
              <span className="font-medium text-red-600">{totalBySeverity.error}</span>
            </div>
          )}
          {(totalBySeverity.warning || 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-gray-500">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                Warnings
              </span>
              <span className="font-medium text-orange-600">{totalBySeverity.warning}</span>
            </div>
          )}
          {(totalBySeverity.suggestion || 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                Suggestions
              </span>
              <span className="font-medium text-blue-600">{totalBySeverity.suggestion}</span>
            </div>
          )}
          {(totalBySeverity.info || 0) > 0 && (
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                Info
              </span>
              <span className="font-medium text-gray-600">{totalBySeverity.info}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
