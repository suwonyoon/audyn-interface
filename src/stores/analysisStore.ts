import { create } from 'zustand'
import type {
  AnalysisResult,
  AnalysisComment,
  AnalysisProgress,
  Section,
  Agent,
  APIKeyConfig,
  ScoredAnalysisResult,
  EvaluationMetric,
  SlideEvaluation,
  SectionScores,
  SectionEvaluationResult,
  SectionTimelinePoint,
} from '@/types'
import type { Presentation } from '@/types'
import { runFullAnalysis, runScoredAnalysis } from '@/lib/api/analysisApi'

interface AnalysisState {
  // Current analysis result
  currentAnalysis: AnalysisResult | null

  // Scored analysis result (extends AnalysisResult)
  scoredResult: ScoredAnalysisResult | null

  // Analysis in progress
  isAnalyzing: boolean
  progress: AnalysisProgress | null
  abortController: AbortController | null

  // Error state
  error: string | null

  // View state
  selectedSectionId: string | null
  expandedSlideIds: string[]
  selectedCommentId: string | null

  // Actions
  startAnalysis: (
    presentation: Presentation,
    sections: Section[],
    agents: Agent[],
    apiConfig: APIKeyConfig
  ) => Promise<void>
  startScoredAnalysis: (
    presentation: Presentation,
    sections: Section[],
    agents: Agent[],
    agentMetrics: Record<string, EvaluationMetric[]>,
    apiConfig: APIKeyConfig
  ) => Promise<void>
  cancelAnalysis: () => void
  clearAnalysis: () => void

  // Comment management
  markCommentResolved: (commentId: string) => void
  markCommentUnresolved: (commentId: string) => void

  // View actions
  setSelectedSection: (sectionId: string | null) => void
  toggleSlideExpanded: (slideId: string) => void
  setSelectedComment: (commentId: string | null) => void

  // Queries
  getUnresolvedCommentCount: () => number
  getCommentsBySeverity: (severity: string) => AnalysisComment[]
  getScoreTimeline: () => SectionTimelinePoint[]
  getSectionScores: () => SectionScores[]
  getLowestScoringSlides: (n: number) => SlideEvaluation[]
  getSlideEvaluation: (slideId: string) => SlideEvaluation | null
  getSectionEvaluation: (sectionId: string) => SectionEvaluationResult | null
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  currentAnalysis: null,
  scoredResult: null,
  isAnalyzing: false,
  progress: null,
  abortController: null,
  error: null,
  selectedSectionId: null,
  expandedSlideIds: [],
  selectedCommentId: null,

  startAnalysis: async (presentation, sections, agents, apiConfig) => {
    const abortController = new AbortController()

    set({
      isAnalyzing: true,
      error: null,
      abortController,
      progress: {
        currentStep: 'Initializing...',
        currentSlideIndex: 0,
        currentAgentId: '',
        totalSlides: presentation.slides.length,
        totalAgents: agents.length,
        percentComplete: 0,
      },
    })

    try {
      const result = await runFullAnalysis(
        presentation,
        sections,
        agents,
        apiConfig,
        (progress) => {
          set({ progress })
        },
        abortController.signal
      )

      set({
        currentAnalysis: result,
        isAnalyzing: false,
        progress: null,
        abortController: null,
        selectedSectionId: result.sections[0]?.sectionId || null,
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: 'Analysis cancelled',
        })
      } else {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: (error as Error).message || 'Analysis failed',
        })
      }
    }
  },

  startScoredAnalysis: async (presentation, sections, agents, agentMetrics, apiConfig) => {
    const abortController = new AbortController()

    set({
      isAnalyzing: true,
      error: null,
      abortController,
      progress: {
        currentStep: 'Initializing scored analysis...',
        currentSlideIndex: 0,
        currentAgentId: '',
        totalSlides: presentation.slides.length,
        totalAgents: agents.length,
        percentComplete: 0,
      },
    })

    try {
      const result = await runScoredAnalysis(
        presentation,
        sections,
        agents,
        agentMetrics,
        apiConfig,
        (progress) => {
          set({ progress })
        },
        abortController.signal
      )

      set({
        currentAnalysis: result,
        scoredResult: result,
        isAnalyzing: false,
        progress: null,
        abortController: null,
        selectedSectionId: result.sections[0]?.sectionId || null,
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: 'Scored analysis cancelled',
        })
      } else {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: (error as Error).message || 'Scored analysis failed',
        })
      }
    }
  },

  cancelAnalysis: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
    }
    set({
      isAnalyzing: false,
      progress: null,
      abortController: null,
    })
  },

  clearAnalysis: () => {
    set({
      currentAnalysis: null,
      scoredResult: null,
      error: null,
      selectedSectionId: null,
      expandedSlideIds: [],
      selectedCommentId: null,
    })
  },

  markCommentResolved: (commentId) => {
    const { currentAnalysis } = get()
    if (!currentAnalysis) return

    const updatedSections = currentAnalysis.sections.map((section) => ({
      ...section,
      slides: section.slides.map((slide) => ({
        ...slide,
        comments: slide.comments.map((comment) =>
          comment.id === commentId ? { ...comment, resolved: true } : comment
        ),
      })),
    }))

    set({
      currentAnalysis: {
        ...currentAnalysis,
        sections: updatedSections,
      },
    })
  },

  markCommentUnresolved: (commentId) => {
    const { currentAnalysis } = get()
    if (!currentAnalysis) return

    const updatedSections = currentAnalysis.sections.map((section) => ({
      ...section,
      slides: section.slides.map((slide) => ({
        ...slide,
        comments: slide.comments.map((comment) =>
          comment.id === commentId ? { ...comment, resolved: false } : comment
        ),
      })),
    }))

    set({
      currentAnalysis: {
        ...currentAnalysis,
        sections: updatedSections,
      },
    })
  },

  setSelectedSection: (sectionId) => {
    set({ selectedSectionId: sectionId })
  },

  toggleSlideExpanded: (slideId) => {
    const { expandedSlideIds } = get()
    if (expandedSlideIds.includes(slideId)) {
      set({ expandedSlideIds: expandedSlideIds.filter((id) => id !== slideId) })
    } else {
      set({ expandedSlideIds: [...expandedSlideIds, slideId] })
    }
  },

  setSelectedComment: (commentId) => {
    set({ selectedCommentId: commentId })
  },

  getUnresolvedCommentCount: () => {
    const { currentAnalysis } = get()
    if (!currentAnalysis) return 0

    let count = 0
    for (const section of currentAnalysis.sections) {
      for (const slide of section.slides) {
        count += slide.comments.filter((c) => !c.resolved).length
      }
    }
    return count
  },

  getCommentsBySeverity: (severity) => {
    const { currentAnalysis } = get()
    if (!currentAnalysis) return []

    const comments: AnalysisComment[] = []
    for (const section of currentAnalysis.sections) {
      for (const slide of section.slides) {
        comments.push(...slide.comments.filter((c) => c.severity === severity))
      }
    }
    return comments
  },

  getScoreTimeline: () => {
    const { scoredResult } = get()
    if (!scoredResult || !scoredResult.sectionEvaluations) return []

    // Agent color palette
    const agentColors = [
      '#3b82f6', // blue
      '#22c55e', // green
      '#f97316', // orange
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f59e0b', // amber
      '#ef4444', // red
    ]

    // Build agent color map
    const agentColorMap: Record<string, string> = {}
    const allAgentIds = new Set<string>()
    for (const section of scoredResult.sectionEvaluations) {
      for (const agentEval of section.agentEvaluations) {
        allAgentIds.add(agentEval.agentId)
      }
    }
    Array.from(allAgentIds).forEach((agentId, index) => {
      agentColorMap[agentId] = agentColors[index % agentColors.length]
    })

    return scoredResult.sectionEvaluations.map((section) => ({
      sectionIndex: section.sectionIndex,
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      agentScores: section.agentEvaluations.map((agentEval) => ({
        agentId: agentEval.agentId,
        agentName: agentEval.agentName,
        score: agentEval.weightedTotal,
        color: agentColorMap[agentEval.agentId],
      })),
      averageScore: section.averageScore,
    }))
  },

  getSectionScores: () => {
    const { scoredResult } = get()
    if (!scoredResult) return []
    return scoredResult.sectionScores
  },

  getLowestScoringSlides: (n) => {
    const { scoredResult } = get()
    if (!scoredResult) return []

    return [...scoredResult.slideEvaluations]
      .sort((a, b) => a.weightedTotal - b.weightedTotal)
      .slice(0, n)
  },

  getSlideEvaluation: (slideId) => {
    const { scoredResult } = get()
    if (!scoredResult) return null
    return scoredResult.slideEvaluations.find((e) => e.slideId === slideId) || null
  },

  getSectionEvaluation: (sectionId) => {
    const { scoredResult } = get()
    if (!scoredResult || !scoredResult.sectionEvaluations) return null
    return scoredResult.sectionEvaluations.find((e) => e.sectionId === sectionId) || null
  },
}))
