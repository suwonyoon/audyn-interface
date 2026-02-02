import { useAnalysisStore } from '@core/stores'
import { AlertCircle, AlertTriangle, Info, Lightbulb, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ScoreDisplay, ScoreBadge } from './ScoreDisplay'

// Score color utilities
function getScoreColor(score: number): string {
  if (score <= 3) return '#EF4444'
  if (score <= 5) return '#F59E0B'
  return '#22C55E'
}

function getScoreLabel(score: number): string {
  if (score <= 2) return 'Critical'
  if (score <= 3) return 'Poor'
  if (score <= 4) return 'Fair'
  if (score <= 5) return 'Good'
  if (score <= 6) return 'Very Good'
  return 'Excellent'
}

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

  // Determine trend icon
  const TrendIcon = scoredResult
    ? scoredResult.overallScore >= 5.5
      ? TrendingUp
      : scoredResult.overallScore < 4
        ? TrendingDown
        : Minus
    : Minus

  const trendColor = scoredResult
    ? scoredResult.overallScore >= 5.5
      ? 'text-score-success'
      : scoredResult.overallScore < 4
        ? 'text-score-critical'
        : 'text-ink-400'
    : 'text-ink-400'

  return (
    <div className="w-72 bg-white border-r border-ink-200 flex flex-col">
      {/* Overall Score Header */}
      <div className="p-5 border-b border-ink-100">
        {scoredResult && (
          <div className="mb-4">
            {/* Score gauge with gradient background */}
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-audyn-50 via-white to-ink-50 border border-ink-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="label text-[10px]">Overall Score</span>
                  <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                </div>
                <span className="text-[10px] text-ink-400">
                  {getScoreLabel(scoredResult.overallScore)}
                </span>
              </div>
              <div className="flex justify-center">
                <ScoreDisplay
                  score={scoredResult.overallScore}
                  size="md"
                  showLabel={false}
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold text-ink-800">Sections</h2>
          <p className="text-xs text-ink-500 mt-1 leading-relaxed">
            {currentAnalysis.overallSummary}
          </p>
        </div>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {currentAnalysis.sections.map((section) => {
            const isSelected = selectedSectionId === section.sectionId
            const hasErrors = (section.commentCount.bySeverity?.error || 0) > 0
            const hasWarnings = (section.commentCount.bySeverity?.warning || 0) > 0
            const sectionScore = sectionScoreMap.get(section.sectionId)

            // Determine border color based on score
            const borderColor = sectionScore
              ? getScoreColor(sectionScore.averageScore)
              : '#E7E5E4'

            return (
              <button
                key={section.sectionId}
                onClick={() => setSelectedSection(section.sectionId)}
                className={`
                  w-full p-3 text-left transition-all duration-200 ease-smooth
                  rounded-r-lg border-l-4
                  ${isSelected
                    ? 'bg-audyn-50 shadow-card translate-x-1'
                    : 'bg-white hover:bg-ink-50 hover:translate-x-1 hover:shadow-card'
                  }
                `}
                style={{
                  borderLeftColor: isSelected ? '#2563EB' : borderColor,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`font-medium text-sm ${isSelected ? 'text-audyn-900' : 'text-ink-800'}`}>
                    {section.sectionName}
                  </span>
                  <div className="flex items-center gap-2">
                    {sectionScore && (
                      <ScoreBadge score={sectionScore.averageScore} size="sm" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-500">
                    {section.slides.length} slide{section.slides.length !== 1 ? 's' : ''}
                  </span>

                  {/* Comment count with severity indicator */}
                  {section.commentCount.total > 0 && (
                    <div className="flex items-center gap-1">
                      {hasErrors && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-score-critical-light text-score-critical">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {section.commentCount.bySeverity?.error || 0}
                        </span>
                      )}
                      {hasWarnings && !hasErrors && (
                        <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-score-caution-light text-score-caution">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {section.commentCount.bySeverity?.warning || 0}
                        </span>
                      )}
                      {!hasErrors && !hasWarnings && section.commentCount.total > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-100 text-ink-600">
                          {section.commentCount.total}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Stats - Dark footer for visual anchor */}
      <div className="p-4 bg-ink-900 text-white">
        <h3 className="text-xs font-semibold text-ink-300 uppercase tracking-wider mb-3">
          Summary
        </h3>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-ink-400">Total Comments</span>
            <span className="score-value text-base text-white">{totalComments}</span>
          </div>

          {/* Severity breakdown */}
          <div className="pt-2 border-t border-ink-700 space-y-2">
            {(totalBySeverity.error || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm text-ink-400">
                  <span className="w-5 h-5 rounded-full bg-score-critical/20 flex items-center justify-center">
                    <AlertCircle className="w-3 h-3 text-score-critical" />
                  </span>
                  Errors
                </span>
                <span className="score-value text-sm text-score-critical">{totalBySeverity.error}</span>
              </div>
            )}
            {(totalBySeverity.warning || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm text-ink-400">
                  <span className="w-5 h-5 rounded-full bg-score-caution/20 flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-score-caution" />
                  </span>
                  Warnings
                </span>
                <span className="score-value text-sm text-score-caution">{totalBySeverity.warning}</span>
              </div>
            )}
            {(totalBySeverity.suggestion || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm text-ink-400">
                  <span className="w-5 h-5 rounded-full bg-audyn-500/20 flex items-center justify-center">
                    <Lightbulb className="w-3 h-3 text-audyn-400" />
                  </span>
                  Suggestions
                </span>
                <span className="score-value text-sm text-audyn-400">{totalBySeverity.suggestion}</span>
              </div>
            )}
            {(totalBySeverity.info || 0) > 0 && (
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-sm text-ink-400">
                  <span className="w-5 h-5 rounded-full bg-ink-600 flex items-center justify-center">
                    <Info className="w-3 h-3 text-ink-400" />
                  </span>
                  Info
                </span>
                <span className="score-value text-sm text-ink-400">{totalBySeverity.info}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
