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
  SectionSignature,
  SectionChangeStatus,
  Slide,
} from '@core/types'
import type { Presentation } from '@core/types'
import { runFullAnalysis, runScoredAnalysis, runScoredAnalysisForAgentSections } from '@core/lib/api/analysisApi'
import {
  generateAllSectionSignatures,
  determineSectionChangeStatus,
  getSlidesForSection,
} from '@core/lib/utils/signatureUtils'

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

  // Change tracking - signatures from last analysis
  analysisSignatures: Map<string, SectionSignature>
  // Store sections used during analysis for signature computation
  lastAnalyzedSections: Section[]

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
  reanalyzeFromSection: (
    fromSectionIndex: number,
    presentation: Presentation,
    sections: Section[],
    agents: Agent[],
    agentMetrics: Record<string, EvaluationMetric[]>,
    apiConfig: APIKeyConfig
  ) => Promise<void>
  reanalyzeSingleSection: (
    sectionIndex: number,
    presentation: Presentation,
    sections: Section[],
    agents: Agent[],
    agentMetrics: Record<string, EvaluationMetric[]>,
    apiConfig: APIKeyConfig
  ) => Promise<void>
  reanalyzeResolvedComments: (
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

  // Signature management
  setAnalysisSignatures: (signatures: Map<string, SectionSignature>) => void
  getSectionChangeStatus: (sectionId: string, currentSlides: Slide[]) => SectionChangeStatus

  // Queries
  getResolvedCommentCount: () => number
  getResolvedCommentsBySection: () => Map<string, Set<string>>
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
  analysisSignatures: new Map(),
  lastAnalyzedSections: [],

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

      // Compute and store signatures for change tracking
      const signatures = generateAllSectionSignatures(sections, presentation.slides)

      set({
        currentAnalysis: result,
        scoredResult: result,
        isAnalyzing: false,
        progress: null,
        abortController: null,
        selectedSectionId: result.sections[0]?.sectionId || null,
        analysisSignatures: signatures,
        lastAnalyzedSections: sections,
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

  reanalyzeFromSection: async (fromSectionIndex, presentation, sections, agents, agentMetrics, apiConfig) => {
    const { currentAnalysis, scoredResult, analysisSignatures } = get()

    if (!currentAnalysis || !scoredResult) {
      // No existing analysis, just run full analysis
      await get().startScoredAnalysis(presentation, sections, agents, agentMetrics, apiConfig)
      return
    }

    const abortController = new AbortController()

    // Sort sections by afterSlideIndex
    const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)

    // Sections to re-analyze (from fromSectionIndex onwards)
    const sectionsToReanalyze = sortedSections.slice(fromSectionIndex)

    if (sectionsToReanalyze.length === 0) {
      return // Nothing to re-analyze
    }

    set({
      isAnalyzing: true,
      error: null,
      abortController,
      progress: {
        currentStep: `Re-analyzing from section ${fromSectionIndex + 1}...`,
        currentSlideIndex: 0,
        currentAgentId: '',
        totalSlides: presentation.slides.length,
        totalAgents: agents.length,
        percentComplete: 0,
      },
    })

    try {
      // Run analysis only for the sections from fromSectionIndex onwards
      const partialResult = await runScoredAnalysis(
        presentation,
        sectionsToReanalyze,
        agents,
        agentMetrics,
        apiConfig,
        (progress) => {
          set({ progress })
        },
        abortController.signal
      )

      // Preserve existing results for sections before fromSectionIndex
      const preservedSectionAnalyses = currentAnalysis.sections.slice(0, fromSectionIndex)
      const preservedSectionEvaluations = scoredResult.sectionEvaluations?.slice(0, fromSectionIndex) || []

      // Merge results: preserved + new
      const mergedSectionAnalyses = [...preservedSectionAnalyses, ...partialResult.sections]
      const mergedSectionEvaluations = [...preservedSectionEvaluations, ...(partialResult.sectionEvaluations || [])]

      // Update section indices in merged evaluations
      for (let i = 0; i < mergedSectionEvaluations.length; i++) {
        mergedSectionEvaluations[i] = {
          ...mergedSectionEvaluations[i],
          sectionIndex: i,
        }
      }

      // Recalculate overall score from all sections
      const overallScore =
        mergedSectionEvaluations.length > 0
          ? mergedSectionEvaluations.reduce((sum, s) => sum + s.averageScore, 0) / mergedSectionEvaluations.length
          : 0

      // Recalculate total comment count
      const totalComments = mergedSectionAnalyses.reduce((sum, s) => s.commentCount.total + sum, 0)
      const overallSummary =
        totalComments === 0
          ? `Analysis complete. Overall score: ${overallScore.toFixed(1)}/7`
          : `Analysis complete. Found ${totalComments} item${totalComments > 1 ? 's' : ''} for review. Overall score: ${overallScore.toFixed(1)}/7`

      const mergedResult: ScoredAnalysisResult = {
        ...scoredResult,
        sections: mergedSectionAnalyses,
        sectionEvaluations: mergedSectionEvaluations,
        overallSummary,
        overallScore,
        analyzedAt: new Date(),
      }

      // Update signatures only for re-analyzed sections
      const newSignatures = new Map(analysisSignatures)
      for (const section of sectionsToReanalyze) {
        const sectionIndex = sortedSections.findIndex((s) => s.id === section.id)
        const sectionSlides = getSlidesForSection(sectionIndex, sortedSections, presentation.slides)
        // Compute proper signature for this section
        const properSignatures = generateAllSectionSignatures([section], sectionSlides)
        const properSig = properSignatures.get(section.id)
        if (properSig) {
          newSignatures.set(section.id, properSig)
        }
      }

      set({
        currentAnalysis: mergedResult,
        scoredResult: mergedResult,
        isAnalyzing: false,
        progress: null,
        abortController: null,
        analysisSignatures: newSignatures,
        lastAnalyzedSections: sections,
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: 'Re-analysis cancelled',
        })
      } else {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: (error as Error).message || 'Re-analysis failed',
        })
      }
    }
  },

  reanalyzeSingleSection: async (sectionIndex, presentation, sections, agents, agentMetrics, apiConfig) => {
    const { currentAnalysis, scoredResult, analysisSignatures } = get()

    if (!currentAnalysis || !scoredResult) {
      // No existing analysis, just run full analysis
      await get().startScoredAnalysis(presentation, sections, agents, agentMetrics, apiConfig)
      return
    }

    const abortController = new AbortController()

    // Sort sections by afterSlideIndex
    const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)

    // The single section to re-analyze
    const sectionToReanalyze = sortedSections[sectionIndex]

    if (!sectionToReanalyze) {
      return // Invalid section index
    }

    set({
      isAnalyzing: true,
      error: null,
      abortController,
      progress: {
        currentStep: `Re-analyzing section "${sectionToReanalyze.name}"...`,
        currentSlideIndex: 0,
        currentAgentId: '',
        totalSlides: presentation.slides.length,
        totalAgents: agents.length,
        percentComplete: 0,
      },
    })

    try {
      // Run analysis only for this single section
      const partialResult = await runScoredAnalysis(
        presentation,
        [sectionToReanalyze],
        agents,
        agentMetrics,
        apiConfig,
        (progress) => {
          set({ progress })
        },
        abortController.signal
      )

      // Build merged results: preserve all sections except the one we re-analyzed
      const mergedSectionAnalyses = [...currentAnalysis.sections]
      const mergedSectionEvaluations = [...(scoredResult.sectionEvaluations || [])]

      // Replace the section at sectionIndex with new result
      if (partialResult.sections[0]) {
        mergedSectionAnalyses[sectionIndex] = partialResult.sections[0]
      }
      if (partialResult.sectionEvaluations?.[0]) {
        mergedSectionEvaluations[sectionIndex] = {
          ...partialResult.sectionEvaluations[0],
          sectionIndex: sectionIndex, // Preserve original index
        }
      }

      // Recalculate overall score from all sections
      const overallScore =
        mergedSectionEvaluations.length > 0
          ? mergedSectionEvaluations.reduce((sum, s) => sum + s.averageScore, 0) / mergedSectionEvaluations.length
          : 0

      // Recalculate total comment count
      const totalComments = mergedSectionAnalyses.reduce((sum, s) => s.commentCount.total + sum, 0)
      const overallSummary =
        totalComments === 0
          ? `Analysis complete. Overall score: ${overallScore.toFixed(1)}/7`
          : `Analysis complete. Found ${totalComments} item${totalComments > 1 ? 's' : ''} for review. Overall score: ${overallScore.toFixed(1)}/7`

      const mergedResult: ScoredAnalysisResult = {
        ...scoredResult,
        sections: mergedSectionAnalyses,
        sectionEvaluations: mergedSectionEvaluations,
        overallSummary,
        overallScore,
        analyzedAt: new Date(),
      }

      // Update signature only for the re-analyzed section
      const newSignatures = new Map(analysisSignatures)
      const sectionSlides = getSlidesForSection(sectionIndex, sortedSections, presentation.slides)
      const properSignatures = generateAllSectionSignatures([sectionToReanalyze], sectionSlides)
      const properSig = properSignatures.get(sectionToReanalyze.id)
      if (properSig) {
        newSignatures.set(sectionToReanalyze.id, properSig)
      }

      set({
        currentAnalysis: mergedResult,
        scoredResult: mergedResult,
        isAnalyzing: false,
        progress: null,
        abortController: null,
        analysisSignatures: newSignatures,
        lastAnalyzedSections: sections,
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: 'Re-analysis cancelled',
        })
      } else {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: (error as Error).message || 'Re-analysis failed',
        })
      }
    }
  },

  reanalyzeResolvedComments: async (presentation, sections, agents, agentMetrics, apiConfig) => {
    const { currentAnalysis, scoredResult, analysisSignatures } = get()

    if (!currentAnalysis || !scoredResult) {
      // No existing analysis, nothing to re-analyze
      return
    }

    // 1. Get all resolved comments and group by (sectionId, agentId)
    const resolvedBySection = new Map<string, Set<string>>()
    for (const section of currentAnalysis.sections) {
      for (const slide of section.slides) {
        for (const comment of slide.comments) {
          if (comment.resolved) {
            if (!resolvedBySection.has(section.sectionId)) {
              resolvedBySection.set(section.sectionId, new Set())
            }
            resolvedBySection.get(section.sectionId)!.add(comment.agentId)
          }
        }
      }
    }

    if (resolvedBySection.size === 0) {
      // No resolved comments to re-analyze
      return
    }

    const abortController = new AbortController()

    // Sort sections by afterSlideIndex
    const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)

    // Build the list of (section, agents) pairs to re-analyze
    const sectionsToReanalyze: { section: Section; sectionIndex: number; agentIds: string[] }[] = []
    for (const [sectionId, agentIds] of resolvedBySection) {
      const sectionIndex = sortedSections.findIndex((s) => s.id === sectionId)
      if (sectionIndex !== -1) {
        sectionsToReanalyze.push({
          section: sortedSections[sectionIndex],
          sectionIndex,
          agentIds: Array.from(agentIds),
        })
      }
    }

    const totalPairs = sectionsToReanalyze.reduce((sum, s) => sum + s.agentIds.length, 0)

    set({
      isAnalyzing: true,
      error: null,
      abortController,
      progress: {
        currentStep: `Re-analyzing ${totalPairs} addressed comment${totalPairs > 1 ? 's' : ''}...`,
        currentSlideIndex: 0,
        currentAgentId: '',
        totalSlides: presentation.slides.length,
        totalAgents: agents.length,
        percentComplete: 0,
      },
    })

    try {
      // Run targeted analysis for only the (section, agent) pairs with resolved comments
      const partialResult = await runScoredAnalysisForAgentSections(
        presentation,
        sortedSections,
        agents,
        agentMetrics,
        sectionsToReanalyze,
        apiConfig,
        (progress) => {
          set({ progress })
        },
        abortController.signal
      )

      // Merge results: update only the affected (section, agent) evaluations
      const mergedSectionAnalyses = [...currentAnalysis.sections]
      const mergedSectionEvaluations = [...(scoredResult.sectionEvaluations || [])]

      // Process each section that was re-analyzed
      for (const { sectionIndex, agentIds } of sectionsToReanalyze) {
        const newSectionResult = partialResult.sectionEvaluations?.find(
          (e) => e.sectionId === sortedSections[sectionIndex].id
        )

        if (newSectionResult && mergedSectionEvaluations[sectionIndex]) {
          // Update only the agent evaluations that were re-analyzed
          const existingEval = mergedSectionEvaluations[sectionIndex]
          const updatedAgentEvaluations = [...existingEval.agentEvaluations]

          for (const agentId of agentIds) {
            const newAgentEval = newSectionResult.agentEvaluations.find((e) => e.agentId === agentId)
            if (newAgentEval) {
              const existingIdx = updatedAgentEvaluations.findIndex((e) => e.agentId === agentId)
              if (existingIdx !== -1) {
                updatedAgentEvaluations[existingIdx] = newAgentEval
              }
            }
          }

          // Recalculate section average
          const newAverageScore =
            updatedAgentEvaluations.length > 0
              ? updatedAgentEvaluations.reduce((sum, e) => sum + e.weightedTotal, 0) / updatedAgentEvaluations.length
              : 0

          mergedSectionEvaluations[sectionIndex] = {
            ...existingEval,
            agentEvaluations: updatedAgentEvaluations,
            averageScore: newAverageScore,
          }
        }

        // Update section analysis comments - replace comments from re-analyzed agents only
        const newSectionAnalysis = partialResult.sections.find(
          (s) => s.sectionId === sortedSections[sectionIndex].id
        )
        if (newSectionAnalysis && mergedSectionAnalyses[sectionIndex]) {
          const existingSection = mergedSectionAnalyses[sectionIndex]
          const updatedSlides = existingSection.slides.map((slide) => {
            // Remove old comments from re-analyzed agents, add new ones
            const preservedComments = slide.comments.filter(
              (c) => !agentIds.includes(c.agentId)
            )
            const newSlide = newSectionAnalysis.slides.find((s) => s.slideId === slide.slideId)
            const newComments = newSlide?.comments.filter((c) => agentIds.includes(c.agentId)) || []

            return {
              ...slide,
              comments: [...preservedComments, ...newComments],
            }
          })

          // Recalculate comment counts
          let total = 0
          const byAgent: Record<string, number> = {}
          const bySeverity: Record<string, number> = {}

          for (const slide of updatedSlides) {
            for (const comment of slide.comments) {
              total++
              byAgent[comment.agentName] = (byAgent[comment.agentName] || 0) + 1
              bySeverity[comment.severity] = (bySeverity[comment.severity] || 0) + 1
            }
          }

          mergedSectionAnalyses[sectionIndex] = {
            ...existingSection,
            slides: updatedSlides,
            commentCount: { total, byAgent, bySeverity },
          }
        }
      }

      // Recalculate overall score
      const overallScore =
        mergedSectionEvaluations.length > 0
          ? mergedSectionEvaluations.reduce((sum, s) => sum + s.averageScore, 0) / mergedSectionEvaluations.length
          : 0

      const totalComments = mergedSectionAnalyses.reduce((sum, s) => s.commentCount.total + sum, 0)
      const overallSummary =
        totalComments === 0
          ? `Analysis complete. Overall score: ${overallScore.toFixed(1)}/7`
          : `Analysis complete. Found ${totalComments} item${totalComments > 1 ? 's' : ''} for review. Overall score: ${overallScore.toFixed(1)}/7`

      const mergedResult: ScoredAnalysisResult = {
        ...scoredResult,
        sections: mergedSectionAnalyses,
        sectionEvaluations: mergedSectionEvaluations,
        overallSummary,
        overallScore,
        analyzedAt: new Date(),
      }

      // Update signatures for re-analyzed sections
      const newSignatures = new Map(analysisSignatures)
      for (const { section, sectionIndex } of sectionsToReanalyze) {
        const sectionSlides = getSlidesForSection(sectionIndex, sortedSections, presentation.slides)
        const properSignatures = generateAllSectionSignatures([section], sectionSlides)
        const properSig = properSignatures.get(section.id)
        if (properSig) {
          newSignatures.set(section.id, properSig)
        }
      }

      set({
        currentAnalysis: mergedResult,
        scoredResult: mergedResult,
        isAnalyzing: false,
        progress: null,
        abortController: null,
        analysisSignatures: newSignatures,
        lastAnalyzedSections: sections,
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: 'Re-analysis cancelled',
        })
      } else {
        set({
          isAnalyzing: false,
          progress: null,
          abortController: null,
          error: (error as Error).message || 'Re-analysis failed',
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
      analysisSignatures: new Map(),
      lastAnalyzedSections: [],
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

  setAnalysisSignatures: (signatures) => {
    set({ analysisSignatures: signatures })
  },

  getSectionChangeStatus: (sectionId, currentSlides) => {
    const { analysisSignatures, lastAnalyzedSections } = get()

    console.log('[Store] getSectionChangeStatus called for:', sectionId)
    console.log('  analysisSignatures size:', analysisSignatures.size)
    console.log('  lastAnalyzedSections count:', lastAnalyzedSections.length)

    // If no previous analysis, everything is "new"
    if (analysisSignatures.size === 0 || lastAnalyzedSections.length === 0) {
      console.log('  → Returning "new" (no previous analysis)')
      return 'new'
    }

    const storedSignature = analysisSignatures.get(sectionId)
    if (!storedSignature) {
      console.log('  → Returning "new" (no stored signature)')
      return 'new'
    }

    // Find the section index
    const sortedSections = [...lastAnalyzedSections].sort(
      (a, b) => a.afterSlideIndex - b.afterSlideIndex
    )
    const sectionIndex = sortedSections.findIndex((s) => s.id === sectionId)
    if (sectionIndex === -1) {
      console.log('  → Returning "new" (section not found in lastAnalyzedSections)')
      return 'new'
    }

    // Get the slides that belong to this section
    const sectionSlides = getSlidesForSection(sectionIndex, sortedSections, currentSlides)
    console.log('  sectionSlides count:', sectionSlides.length)

    return determineSectionChangeStatus(sectionId, storedSignature, sectionSlides)
  },

  getResolvedCommentCount: () => {
    const { currentAnalysis } = get()
    if (!currentAnalysis) return 0

    let count = 0
    for (const section of currentAnalysis.sections) {
      for (const slide of section.slides) {
        count += slide.comments.filter((c) => c.resolved).length
      }
    }
    return count
  },

  getResolvedCommentsBySection: () => {
    const { currentAnalysis } = get()
    const result = new Map<string, Set<string>>()
    if (!currentAnalysis) return result

    for (const section of currentAnalysis.sections) {
      for (const slide of section.slides) {
        for (const comment of slide.comments) {
          if (comment.resolved) {
            if (!result.has(section.sectionId)) {
              result.set(section.sectionId, new Set())
            }
            result.get(section.sectionId)!.add(comment.agentId)
          }
        }
      }
    }
    return result
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
