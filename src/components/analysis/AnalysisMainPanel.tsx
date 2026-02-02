import { useState, useMemo } from 'react'
import { useAnalysisStore, useModeStore, usePresentationStore } from '@core/stores'
import { usePlatformOptional } from '@core/platform'
import { BarChart3, User, Users, ChevronRight } from 'lucide-react'
import { ScoreDisplay } from './ScoreDisplay'
import { ScoreTimeline } from './ScoreTimeline'
import { SlideGallery } from './SlideGallery'
import { CompactMetricBreakdown } from './MetricBreakdown'
import { SectionBlockSelector } from './SectionBlockSelector'
import type { SlideAnalysis, AgentSectionEvaluation } from '@core/types'

interface AnalysisMainPanelProps {
  isCompact?: boolean
}

// Score color utilities
function getScoreColor(score: number): { bg: string; text: string; fill: string } {
  if (score <= 3) {
    return { bg: 'bg-score-critical-light', text: 'text-score-critical', fill: '#EF4444' }
  } else if (score <= 5) {
    return { bg: 'bg-score-caution-light', text: 'text-score-caution', fill: '#F59E0B' }
  } else {
    return { bg: 'bg-score-success-light', text: 'text-score-success', fill: '#22C55E' }
  }
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
      <div className="flex-1 flex items-center justify-center bg-ink-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-ink-400" />
          </div>
          <p className="text-ink-500 font-medium">No analysis results yet</p>
          <p className="text-ink-400 text-sm mt-1">Run an analysis to see results</p>
        </div>
      </div>
    )
  }

  const selectedSection =
    currentAnalysis.sections.find((s) => s.sectionId === selectedSectionId) ||
    currentAnalysis.sections[0]

  if (!selectedSection) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ink-50">
        <p className="text-ink-500">No sections found.</p>
      </div>
    )
  }

  const handleGoToSlide = async (slideIndex: number) => {
    if (isOffice && platform) {
      try {
        await platform.navigateToSlide(slideIndex)
      } catch (err) {
        console.error('Failed to navigate to slide:', err)
      }
    } else {
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
    <div className={`flex-1 overflow-y-auto bg-ink-50 ${isCompact ? 'p-4' : 'p-6'}`}>
      <div className={isCompact ? '' : 'max-w-4xl mx-auto'}>
        {/* Section Block Selector (compact mode only) */}
        {isCompact && currentAnalysis.sections.length > 1 && (
          <div className="mb-4">
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
          <div className={isCompact ? 'mb-4' : 'mb-6'}>
            <ScoreTimeline
              data={scoreTimeline}
              selectedAgentId={selectedAgentId}
              onSectionClick={handleSectionClick}
              compact={isCompact}
            />
          </div>
        )}

        {/* Section Summary Card - Magazine Layout */}
        <div className={`card ${isCompact ? 'p-4' : 'p-6'} mb-6`}>
          {/* Section Header with Score */}
          <div className="flex items-start gap-6 mb-6">
            <div className="flex-1 min-w-0">
              {/* Breadcrumb / Label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="label text-[10px]">Section Analysis</span>
                <ChevronRight className="w-3 h-3 text-ink-300" />
                <span className="text-[10px] text-ink-500">
                  {currentAnalysis.sections.findIndex(s => s.sectionId === selectedSection.sectionId) + 1} of {currentAnalysis.sections.length}
                </span>
              </div>

              {/* Section Title */}
              <h2 className={`font-display font-semibold text-ink-900 ${isCompact ? 'text-lg' : 'text-xl'} mb-3`}>
                {selectedSection.sectionName}
              </h2>

              {/* Agent filter segmented control */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => setSelectedAgentId(null)}
                  className={`pill-button ${!selectedAgentId ? 'pill-button-active' : 'pill-button-inactive'}`}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5 inline" />
                  All Agents
                </button>
                {sectionEval?.agentEvaluations.map((agentEval) => (
                  <button
                    key={agentEval.agentId}
                    onClick={() => setSelectedAgentId(agentEval.agentId)}
                    className={`pill-button ${selectedAgentId === agentEval.agentId ? 'pill-button-active' : 'pill-button-inactive'}`}
                  >
                    <User className="w-3.5 h-3.5 mr-1.5 inline" />
                    {agentEval.agentName}
                  </button>
                ))}
              </div>

              {/* Summary text */}
              <p className="text-sm text-ink-600 leading-relaxed">
                {selectedAgentId && selectedAgentEval?.sectionSummary
                  ? selectedAgentEval.sectionSummary
                  : selectedSection.summary}
              </p>
            </div>

            {/* Section Score - Floating right */}
            {sectionEval && (
              <div className="flex-shrink-0">
                <ScoreDisplay
                  score={
                    selectedAgentId && selectedAgentEval
                      ? selectedAgentEval.weightedTotal
                      : sectionEval.averageScore
                  }
                  size={isCompact ? 'sm' : 'md'}
                  showLabel={!isCompact}
                />
              </div>
            )}
          </div>

          {/* Agent Score Breakdown - Token Style */}
          {!selectedAgentId && sectionEval && sectionEval.agentEvaluations.length > 1 && (
            <div className="mb-6 p-4 bg-ink-50 rounded-xl border border-ink-100">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-ink-400" />
                <h4 className="text-sm font-medium text-ink-700">Agent Scores</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectionEval.agentEvaluations.map((agentEval) => {
                  const colors = getScoreColor(agentEval.weightedTotal)
                  return (
                    <button
                      key={agentEval.agentId}
                      onClick={() => setSelectedAgentId(agentEval.agentId)}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-ink-200 hover:border-audyn-300 hover:shadow-card transition-all duration-150 ease-smooth group"
                    >
                      {/* Agent avatar placeholder */}
                      <div className="w-6 h-6 rounded-full bg-audyn-100 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-audyn-600" />
                      </div>
                      <span className="text-sm text-ink-700 font-medium group-hover:text-audyn-700">
                        {agentEval.agentName}
                      </span>
                      <span
                        className={`score-value text-sm px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                      >
                        {agentEval.weightedTotal.toFixed(1)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Single Agent View - Metric details */}
          {selectedAgentId && selectedAgentEval && selectedAgentEval.metricScores.length > 0 && (
            <div className="mb-6 p-4 bg-audyn-50 rounded-xl border border-audyn-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-audyn-500 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h4 className="text-sm font-medium text-audyn-800">
                    {selectedAgentEval.agentName}'s Assessment
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedAgentId(null)}
                  className="text-xs text-audyn-600 hover:text-audyn-800 font-medium"
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
              <div className="mb-6">
                <h4 className="text-sm font-medium text-ink-700 mb-3">Metric Breakdown</h4>
                <CompactMetricBreakdown
                  metricScores={aggregateMetricScores(sectionEval.agentEvaluations)}
                />
              </div>
            )}

          {/* Comment count footer */}
          <div className="flex items-center justify-between pt-4 border-t border-ink-100">
            <span className="text-sm text-ink-600">
              <span className="score-value">{filteredCommentCount}</span> comment{filteredCommentCount !== 1 ? 's' : ''}
              {selectedAgentId && <span className="text-ink-400 ml-1">from {selectedAgentEval?.agentName}</span>}
            </span>
            <span className="text-xs text-ink-400">
              {selectedSection.slides.length} slide{selectedSection.slides.length !== 1 ? 's' : ''} in section
            </span>
          </div>
        </div>

        {/* Slide Gallery View */}
        {filteredSlides.length > 0 && presentation && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink-700">
                Slides in This Section
              </h3>
              {selectedAgentId && (
                <span className="text-xs text-ink-500 bg-audyn-50 px-2 py-1 rounded-full">
                  Showing {selectedAgentEval?.agentName}'s comments
                </span>
              )}
            </div>
            <SlideGallery
              slides={filteredSlides}
              presentationSlides={presentation.slides}
              onGoToSlide={handleGoToSlide}
              onResolveComment={markCommentResolved}
              onUnresolveComment={markCommentUnresolved}
            />
          </div>
        )}

        {selectedSection.slides.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-ink-500">No slides in this section.</p>
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
