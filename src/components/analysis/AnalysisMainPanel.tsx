import { useState, useMemo } from 'react'
import { useAnalysisStore, useModeStore, usePresentationStore } from '@core/stores'
import { usePlatformOptional } from '@core/platform'
import { BarChart3, User, Users } from 'lucide-react'
import { ScoreDisplay } from './ScoreDisplay'
import { ScoreTimeline } from './ScoreTimeline'
import { SlideGallery } from './SlideGallery'
import { CompactMetricBreakdown } from './MetricBreakdown'
import { SectionBlockSelector } from './SectionBlockSelector'
import type { SlideAnalysis, AgentSectionEvaluation } from '@core/types'

interface AnalysisMainPanelProps {
  isCompact?: boolean
}

export function AnalysisMainPanel({ isCompact = false }: AnalysisMainPanelProps) {
  const platform = usePlatformOptional()
  const isOffice = platform?.platform === 'office'

  const { goToEdit } = useModeStore()
  const { presentation, setCurrentSlide } = usePresentationStore()
  const {
    currentAnalysis,
    scoredResult,
    selectedSectionId,
    setSelectedSection,
    markCommentResolved,
    markCommentUnresolved,
    getScoreTimeline,
    getSectionEvaluation,
    getSectionChangeStatus,
  } = useAnalysisStore()

  // Track which agent is selected (null = show aggregated/all)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const scoreTimeline = getScoreTimeline()

  // Compute section scores and change statuses for the block selector
  const sectionScores = useMemo(() => {
    if (!scoredResult?.sectionEvaluations) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const sectionEval of scoredResult.sectionEvaluations) {
      map.set(sectionEval.sectionId, sectionEval.averageScore)
    }
    return map
  }, [scoredResult])

  const sectionChangeStatus = useMemo(() => {
    if (!currentAnalysis || !presentation) return new Map()
    const map = new Map()
    for (const section of currentAnalysis.sections) {
      const status = getSectionChangeStatus(section.sectionId, presentation.slides)
      map.set(section.sectionId, status)
    }
    return map
  }, [currentAnalysis, presentation, getSectionChangeStatus])

  if (!currentAnalysis) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">No analysis results yet.</p>
      </div>
    )
  }

  const selectedSection =
    currentAnalysis.sections.find((s) => s.sectionId === selectedSectionId) ||
    currentAnalysis.sections[0]

  if (!selectedSection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">No sections found.</p>
      </div>
    )
  }

  const handleGoToSlide = async (slideIndex: number) => {
    if (isOffice && platform) {
      // Office add-in: Navigate PowerPoint to the slide
      try {
        await platform.navigateToSlide(slideIndex)
      } catch (err) {
        console.error('Failed to navigate to slide:', err)
      }
    } else {
      // Web platform: Go to editor mode
      setCurrentSlide(slideIndex)
      goToEdit()
    }
  }

  const handleSectionClick = (sectionId: string, agentId: string | null) => {
    setSelectedSection(sectionId)
    setSelectedAgentId(agentId)
  }

  // Get section evaluation for displaying agent scores
  const sectionEval = getSectionEvaluation(selectedSection.sectionId)

  // Get the selected agent's evaluation (if filtering by agent)
  const selectedAgentEval = sectionEval?.agentEvaluations.find(
    (e) => e.agentId === selectedAgentId
  )

  // Filter slides to only show comments from selected agent
  const filteredSlides: SlideAnalysis[] = useMemo(() => {
    if (!selectedAgentId) {
      return selectedSection.slides
    }
    return selectedSection.slides.map((slide) => ({
      ...slide,
      comments: slide.comments.filter((c) => c.agentId === selectedAgentId),
    }))
  }, [selectedSection.slides, selectedAgentId])

  // Calculate filtered comment counts
  const filteredCommentCount = useMemo(() => {
    return filteredSlides.reduce((sum, s) => sum + s.comments.length, 0)
  }, [filteredSlides])

  return (
    <div className={`flex-1 overflow-y-auto ${isCompact ? 'p-3' : 'p-6'}`}>
      <div className={isCompact ? '' : 'max-w-4xl'}>
        {/* Section Block Selector (compact mode only) */}
        {isCompact && currentAnalysis.sections.length > 1 && (
          <div className="mb-3">
            <SectionBlockSelector
              sections={currentAnalysis.sections}
              selectedSectionId={selectedSectionId || currentAnalysis.sections[0]?.sectionId}
              onSelectSection={setSelectedSection}
              sectionChangeStatus={sectionChangeStatus}
              sectionScores={sectionScores}
            />
          </div>
        )}

        {/* Score Timeline (if scored) */}
        {scoredResult && scoreTimeline.length > 0 && (
          <div className={isCompact ? 'mb-3' : 'mb-6'}>
            <ScoreTimeline
              data={scoreTimeline}
              selectedAgentId={selectedAgentId}
              onSectionClick={handleSectionClick}
              compact={isCompact}
            />
          </div>
        )}

        {/* Section Summary */}
        <div className={`bg-white rounded-lg border shadow-sm ${isCompact ? 'p-4' : 'p-6'} mb-4`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h2 className={`font-semibold text-gray-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                  {selectedSection.sectionName}
                </h2>
                {selectedAgentId ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                    <User className="w-3 h-3" />
                    {selectedAgentEval?.agentName || 'Agent'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    <Users className="w-3 h-3" />
                    All Agents
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {selectedAgentId && selectedAgentEval?.sectionSummary
                  ? selectedAgentEval.sectionSummary
                  : selectedSection.summary}
              </p>
            </div>

            {/* Section Score */}
            {sectionEval && (
              <div className="flex-shrink-0 ml-4">
                <ScoreDisplay
                  score={
                    selectedAgentId && selectedAgentEval
                      ? selectedAgentEval.weightedTotal
                      : sectionEval.averageScore
                  }
                  size="sm"
                  showLabel={false}
                />
              </div>
            )}
          </div>

          {/* Agent Score Breakdown (only when showing all) */}
          {!selectedAgentId && sectionEval && sectionEval.agentEvaluations.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-medium text-gray-700">
                  Agent Scores for This Section
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectionEval.agentEvaluations.map((agentEval) => (
                  <button
                    key={agentEval.agentId}
                    onClick={() => setSelectedAgentId(agentEval.agentId)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white rounded border hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {agentEval.agentName}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        agentEval.weightedTotal >= 5
                          ? 'text-green-600'
                          : agentEval.weightedTotal >= 3
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {agentEval.weightedTotal.toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single Agent View - Show that agent's metrics */}
          {selectedAgentId && selectedAgentEval && selectedAgentEval.metricScores.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <h4 className="text-sm font-medium text-blue-800">
                    {selectedAgentEval.agentName}'s Assessment
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedAgentId(null)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Show all agents
                </button>
              </div>
              <CompactMetricBreakdown metricScores={selectedAgentEval.metricScores} />
            </div>
          )}

          {/* Aggregated Metrics (when showing all) */}
          {!selectedAgentId &&
            sectionEval &&
            sectionEval.agentEvaluations.length > 0 &&
            sectionEval.agentEvaluations[0].metricScores.length > 0 && (
              <div className="mb-4">
                <CompactMetricBreakdown
                  metricScores={aggregateMetricScores(sectionEval.agentEvaluations)}
                />
              </div>
            )}

          {/* Comment count summary */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-600">
              {filteredCommentCount} comment{filteredCommentCount !== 1 ? 's' : ''}
              {selectedAgentId && ' from this agent'}
            </span>
          </div>
        </div>

        {/* Slide Gallery View */}
        {filteredSlides.length > 0 && presentation && (
          <>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Slides in This Section
              {selectedAgentId && (
                <span className="ml-2 font-normal text-gray-500">
                  (showing {selectedAgentEval?.agentName}'s comments only)
                </span>
              )}
            </h3>
            <SlideGallery
              slides={filteredSlides}
              presentationSlides={presentation.slides}
              onGoToSlide={handleGoToSlide}
              onResolveComment={markCommentResolved}
              onUnresolveComment={markCommentUnresolved}
            />
          </>
        )}

        {selectedSection.slides.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No slides in this section.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Aggregate metric scores from multiple agent evaluations for display
 */
function aggregateMetricScores(agentEvaluations: AgentSectionEvaluation[]) {
  const metricMap = new Map<
    string,
    {
      metricId: string
      metricName: string
      scores: number[]
      reasonings: string[]
      contentAnchors: string[]
    }
  >()

  for (const agentEval of agentEvaluations) {
    for (const score of agentEval.metricScores) {
      if (!metricMap.has(score.metricId)) {
        metricMap.set(score.metricId, {
          metricId: score.metricId,
          metricName: score.metricName,
          scores: [],
          reasonings: [],
          contentAnchors: [],
        })
      }
      const entry = metricMap.get(score.metricId)!
      entry.scores.push(score.score)
      if (score.reasoning) entry.reasonings.push(score.reasoning)
      entry.contentAnchors.push(...score.contentAnchors)
    }
  }

  return Array.from(metricMap.values()).map((entry) => ({
    metricId: entry.metricId,
    metricName: entry.metricName,
    score: entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length,
    reasoning: entry.reasonings.join(' | '),
    contentAnchors: [...new Set(entry.contentAnchors)],
  }))
}
