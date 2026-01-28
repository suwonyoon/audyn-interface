import { useEffect, useState, useRef, useMemo } from 'react'
import {
  useModeStore,
  usePresentationStore,
  useSectionsStore,
  useAgentsStore,
  useAnalysisStore,
} from '@core/stores'
import { usePlatformOptional } from '@core/platform'
import { AnalysisProgress } from './AnalysisProgress'
import { AnalysisSidebar } from './AnalysisSidebar'
import { AnalysisMainPanel } from './AnalysisMainPanel'
import { ArrowLeft, Edit, RefreshCw, BarChart3, AlertCircle, FileText, ChevronDown } from 'lucide-react'

export function AnalysisMode() {
  const platform = usePlatformOptional()
  const isOffice = platform?.platform === 'office'

  const { goToPreparation, goToEdit } = useModeStore()
  const { presentation, fileName, loadPresentationFromBuffer } = usePresentationStore()
  const { sections } = useSectionsStore()
  const { getEnabledAgents, apiKeyConfig, agentMetrics } = useAgentsStore()
  const {
    currentAnalysis,
    isAnalyzing,
    error,
    startScoredAnalysis,
    reanalyzeFromSection,
    clearAnalysis,
    getUnresolvedCommentCount,
    getSectionChangeStatus,
  } = useAnalysisStore()

  const enabledAgents = getEnabledAgents()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reanalyzeMenuOpen, setReanalyzeMenuOpen] = useState(false)
  const reanalyzeMenuRef = useRef<HTMLDivElement>(null)

  // Handle document refresh for Office add-in
  const handleRefreshDocument = async () => {
    if (!platform || isRefreshing) return
    setIsRefreshing(true)
    console.log('[AnalysisMode] Refreshing document...')
    try {
      const buffer = await platform.refreshDocument()
      console.log('[AnalysisMode] Got buffer:', buffer ? `${buffer.byteLength} bytes` : 'null')
      if (buffer) {
        const name = await platform.getDocumentName()
        console.log('[AnalysisMode] Document name:', name)
        await loadPresentationFromBuffer(buffer, name)
        console.log('[AnalysisMode] Presentation loaded successfully')
        // Preserve analysis results - the change tracking system will
        // detect which sections changed via signature comparison
      }
    } catch (err) {
      console.error('Failed to refresh document:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Build metrics map for enabled agents
  const enabledAgentMetrics = enabledAgents.reduce(
    (acc, agent) => {
      acc[agent.id] = agentMetrics[agent.id] || []
      return acc
    },
    {} as Record<string, typeof agentMetrics[string]>
  )

  // Start analysis automatically when entering this mode without results
  useEffect(() => {
    if (presentation && !currentAnalysis && !isAnalyzing && !error && apiKeyConfig) {
      startScoredAnalysis(presentation, sections, enabledAgents, enabledAgentMetrics, apiKeyConfig)
    }
  }, []) // Only run on mount

  // Close re-analyze menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reanalyzeMenuRef.current && !reanalyzeMenuRef.current.contains(event.target as Node)) {
        setReanalyzeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Compute section change statuses
  const sectionChangeStatuses = useMemo(() => {
    if (!currentAnalysis || !presentation) return new Map()
    console.log('[AnalysisMode] Computing section change statuses...')
    console.log('  Presentation slides:', presentation.slides.length)
    console.log('  Sections:', sections.length)
    const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)
    const statuses = new Map<string, 'unchanged' | 'changed' | 'new'>()
    for (const section of sortedSections) {
      const status = getSectionChangeStatus(section.id, presentation.slides)
      statuses.set(section.id, status)
    }
    console.log('  Final statuses:', Object.fromEntries(statuses))
    return statuses
  }, [currentAnalysis, presentation, sections, getSectionChangeStatus])

  // Check if any sections have changed
  const hasChangedSections = useMemo(() => {
    for (const status of sectionChangeStatuses.values()) {
      if (status === 'changed') return true
    }
    return false
  }, [sectionChangeStatuses])

  const handleReanalyze = () => {
    if (presentation && apiKeyConfig) {
      clearAnalysis()
      startScoredAnalysis(presentation, sections, enabledAgents, enabledAgentMetrics, apiKeyConfig)
    }
    setReanalyzeMenuOpen(false)
  }

  const handleReanalyzeFromSection = (sectionIndex: number) => {
    if (presentation && apiKeyConfig) {
      reanalyzeFromSection(
        sectionIndex,
        presentation,
        sections,
        enabledAgents,
        enabledAgentMetrics,
        apiKeyConfig
      )
    }
    setReanalyzeMenuOpen(false)
  }

  if (!presentation) return null

  // Show progress while analyzing
  if (isAnalyzing) {
    return <AnalysisProgress />
  }

  // Show error state
  if (error && !currentAnalysis) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b px-3 py-2 tp:px-4 tp:py-3 flex flex-col tp:flex-row tp:items-center tp:justify-between gap-2 tp:gap-3">
          <div className="flex items-center gap-2 tp:gap-3 min-w-0">
            <div className="p-1.5 tp:p-2 bg-red-100 rounded-lg flex-shrink-0">
              <AlertCircle className="w-4 h-4 tp:w-5 tp:h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm tp:text-lg font-semibold text-gray-900">Analysis Error</h1>
              <p className="text-xs tp:text-sm text-gray-500 truncate">{fileName}</p>
            </div>
          </div>
          <button
            onClick={goToPreparation}
            className="w-full tp:w-auto flex items-center justify-center gap-1.5 tp:gap-2 px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
            <span className="hidden tp:inline">Back to Setup</span>
            <span className="tp:hidden">Back</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <AlertCircle className="w-10 h-10 tp:w-12 tp:h-12 text-red-500 mx-auto mb-3 tp:mb-4" />
            <h2 className="text-lg tp:text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h2>
            <p className="text-xs tp:text-sm text-gray-600 mb-4 tp:mb-6">{error}</p>
            <div className="flex flex-col tp:flex-row justify-center gap-2 tp:gap-4">
              <button
                onClick={goToPreparation}
                className="px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Change Settings
              </button>
              <button
                onClick={handleReanalyze}
                className="px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const unresolvedCount = getUnresolvedCommentCount()

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - stacked layout for narrow task panes */}
      <div className="bg-white border-b px-3 py-2 tp:px-4 tp:py-3 flex flex-col gap-2 tp:gap-3">
        {/* Row 1: Title */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 tp:gap-3 min-w-0">
            <div className="p-1.5 tp:p-2 bg-green-100 rounded-lg flex-shrink-0">
              <BarChart3 className="w-4 h-4 tp:w-5 tp:h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm tp:text-lg font-semibold text-gray-900">Analysis Results</h1>
              <p className="text-xs tp:text-sm text-gray-500 truncate">{fileName}</p>
            </div>
          </div>
        </div>

        {/* Row 2: Action buttons */}
        <div className="flex flex-wrap items-center gap-2 tp:gap-3">
          <button
            onClick={goToPreparation}
            className="flex items-center gap-1.5 tp:gap-2 px-2.5 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
            <span className="hidden tp:inline">Back to Setup</span>
            <span className="tp:hidden">Back</span>
          </button>
          {/* Re-analyze dropdown */}
          <div ref={reanalyzeMenuRef} className="relative">
            <button
              onClick={() => setReanalyzeMenuOpen(!reanalyzeMenuOpen)}
              className="flex items-center gap-1.5 tp:gap-2 px-2.5 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
              <span className="hidden tp:inline">Re-analyze</span>
              <span className="tp:hidden">Analyze</span>
              {hasChangedSections && (
                <span className="w-2 h-2 rounded-full bg-yellow-400" title="Some sections have changed" />
              )}
              <ChevronDown className={`w-3.5 h-3.5 tp:w-4 tp:h-4 transition-transform ${reanalyzeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {reanalyzeMenuOpen && (
              <div className="absolute left-0 tp:right-0 tp:left-auto top-full mt-1 w-56 tp:w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* Re-analyze everything option */}
                <button
                  onClick={handleReanalyze}
                  className="w-full flex items-center gap-2 px-3 tp:px-4 py-2 text-left text-xs tp:text-sm text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
                  Re-analyze Everything
                </button>

                {currentAnalysis && currentAnalysis.sections.length > 1 && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <div className="px-3 tp:px-4 py-1 text-xs font-medium text-gray-500">
                      Re-analyze from section...
                    </div>

                    {(() => {
                      const sortedSections = [...sections].sort((a, b) => a.afterSlideIndex - b.afterSlideIndex)
                      return sortedSections.map((section, index) => {
                        const changeStatus = sectionChangeStatuses.get(section.id)
                        const isChanged = changeStatus === 'changed'

                        return (
                          <button
                            key={section.id}
                            onClick={() => handleReanalyzeFromSection(index)}
                            className="w-full flex items-center gap-2 px-3 tp:px-4 py-2 text-left text-xs tp:text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {/* Change indicator */}
                            {isChanged ? (
                              <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" title="Changed since last analysis" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                            )}
                            <span className="truncate">
                              §{index + 1}: {section.name}
                            </span>
                            {index === 0 && (
                              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                                (all)
                              </span>
                            )}
                          </button>
                        )
                      })
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
          {isOffice ? (
            // Office add-in: Show refresh document button instead of edit
            <button
              onClick={handleRefreshDocument}
              disabled={isRefreshing}
              className="flex-1 tp:flex-none flex items-center justify-center gap-1.5 tp:gap-2 px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 tp:w-4 tp:h-4 animate-spin" />
                  <span className="hidden tp:inline">Refreshing...</span>
                  <span className="tp:hidden">...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
                  <span className="hidden tp:inline">Refresh Document</span>
                  <span className="tp:hidden">Refresh</span>
                </>
              )}
            </button>
          ) : (
            // Web platform: Show edit button
            <button
              onClick={goToEdit}
              className="flex-1 tp:flex-none flex items-center justify-center gap-1.5 tp:gap-2 px-3 tp:px-4 py-1.5 tp:py-2 text-xs tp:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
              <span className="hidden tp:inline">Edit Presentation</span>
              <span className="tp:hidden">Edit</span>
              {unresolvedCount > 0 && (
                <span className="ml-1 px-1.5 tp:px-2 py-0.5 text-xs bg-blue-500 rounded-full">
                  {unresolvedCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Section Navigation - hidden on narrow screens (Office task pane) */}
        {!isOffice && <AnalysisSidebar />}

        {/* Center: Analysis Details - full width on Office */}
        <AnalysisMainPanel isCompact={isOffice} />
      </div>
    </div>
  )
}
