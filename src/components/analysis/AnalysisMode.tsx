import { useEffect } from 'react'
import {
  useModeStore,
  usePresentationStore,
  useSectionsStore,
  useAgentsStore,
  useAnalysisStore,
} from '@/stores'
import { AnalysisProgress } from './AnalysisProgress'
import { AnalysisSidebar } from './AnalysisSidebar'
import { AnalysisMainPanel } from './AnalysisMainPanel'
import { ArrowLeft, Edit, RefreshCw, BarChart3, AlertCircle } from 'lucide-react'

export function AnalysisMode() {
  const { goToPreparation, goToEdit } = useModeStore()
  const { presentation, fileName } = usePresentationStore()
  const { sections } = useSectionsStore()
  const { getEnabledAgents, apiKeyConfig, agentMetrics } = useAgentsStore()
  const {
    currentAnalysis,
    isAnalyzing,
    error,
    startScoredAnalysis,
    clearAnalysis,
    getUnresolvedCommentCount,
  } = useAnalysisStore()

  const enabledAgents = getEnabledAgents()

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

  const handleReanalyze = () => {
    if (presentation && apiKeyConfig) {
      clearAnalysis()
      startScoredAnalysis(presentation, sections, enabledAgents, enabledAgentMetrics, apiKeyConfig)
    }
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
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Analysis Error</h1>
              <p className="text-sm text-gray-500">{fileName}</p>
            </div>
          </div>
          <button
            onClick={goToPreparation}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Setup
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={goToPreparation}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Change Settings
              </button>
              <button
                onClick={handleReanalyze}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <BarChart3 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Analysis Results</h1>
            <p className="text-sm text-gray-500">{fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreparation}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Setup
          </button>
          <button
            onClick={handleReanalyze}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Re-analyze
          </button>
          <button
            onClick={goToEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit Presentation
            {unresolvedCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500 rounded-full">
                {unresolvedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Section Navigation */}
        <AnalysisSidebar />

        {/* Center: Analysis Details */}
        <AnalysisMainPanel />
      </div>
    </div>
  )
}
