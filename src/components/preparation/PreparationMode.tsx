import { useEffect, useState } from 'react'
import { useModeStore, usePresentationStore, useSectionsStore, useAgentsStore } from '@core/stores'
import { usePlatformOptional } from '@core/platform'
import { SlideSectionPanel } from './SlideSectionPanel'
import { AgentSelectionPanel } from './AgentSelectionPanel'
import { StepIndicator } from './StepIndicator'
import { ArrowRight, ArrowLeft, Settings, AlertCircle, RefreshCw } from 'lucide-react'

export function PreparationMode() {
  const platform = usePlatformOptional()
  const isOffice = platform?.platform === 'office'

  const { goToAnalysis, preparationStep, setPreparationStep, goToNextPreparationStep, goToPreviousPreparationStep } = useModeStore()
  const { presentation, fileName, loadPresentationFromBuffer } = usePresentationStore()
  const { sections, initializeDefaultSection } = useSectionsStore()
  const { getEnabledAgents, hasValidAPIKey } = useAgentsStore()

  const [validationError, setValidationError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle document refresh for Office add-in
  const handleRefreshDocument = async () => {
    if (!platform || isRefreshing) return
    setIsRefreshing(true)
    try {
      const buffer = await platform.refreshDocument()
      if (buffer) {
        const name = await platform.getDocumentName()
        await loadPresentationFromBuffer(buffer, name)
      }
    } catch (err) {
      console.error('Failed to refresh document:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Initialize default section on first load
  useEffect(() => {
    if (presentation && sections.length === 0) {
      initializeDefaultSection()
    }
  }, [presentation, sections.length, initializeDefaultSection])

  if (!presentation) return null

  const enabledAgents = getEnabledAgents()
  const canStartAnalysis = enabledAgents.length > 0 && hasValidAPIKey() && sections.length > 0

  const handleStartAnalysis = () => {
    if (!canStartAnalysis) {
      if (enabledAgents.length === 0) {
        setValidationError('Please select at least one analysis agent.')
      } else if (!hasValidAPIKey()) {
        setValidationError('Please enter a valid API key.')
      } else if (sections.length === 0) {
        setValidationError('Please create at least one section.')
      }
      return
    }
    setValidationError(null)
    goToAnalysis()
  }

  const handleProceedToAgents = () => {
    if (sections.length === 0) {
      setValidationError('Please create at least one section.')
      return
    }
    setValidationError(null)
    goToNextPreparationStep()
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - stacked layout for narrow task panes */}
      <div className="bg-white border-b px-3 py-2 tp:px-4 tp:py-3 flex flex-col gap-2 tp:gap-3">
        {/* Row 1: Title and icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 tp:gap-3 min-w-0">
            <div className="p-1.5 tp:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Settings className="w-4 h-4 tp:w-5 tp:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm tp:text-lg font-semibold text-gray-900">Prepare Analysis</h1>
              <p className="text-xs tp:text-sm text-gray-500 truncate">{fileName}</p>
            </div>
          </div>
        </div>

        {/* Row 2: Step indicator */}
        <div className="flex justify-center">
          <StepIndicator
            currentStep={preparationStep}
            onStepClick={setPreparationStep}
            compact={isOffice}
          />
        </div>

        {/* Row 3: Validation error */}
        {validationError && (
          <div className="flex items-center gap-2 text-xs tp:text-sm text-red-600 bg-red-50 px-2 py-1.5 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 tp:w-4 tp:h-4 flex-shrink-0" />
            <span className="truncate">{validationError}</span>
          </div>
        )}

        {/* Row 4: Actions */}
        <div className="flex flex-wrap items-center gap-2 tp:gap-3">
          {preparationStep === 'slides-review' ? (
            <>
              {/* Refresh Document button (Office add-in) */}
              {isOffice && (
                <button
                  onClick={handleRefreshDocument}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 tp:gap-2 px-2.5 tp:px-4 py-1.5 tp:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 text-xs tp:text-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 tp:w-4 tp:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden tp:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                  <span className="tp:hidden">{isRefreshing ? '...' : 'Refresh'}</span>
                </button>
              )}
              <button
                onClick={handleProceedToAgents}
                className="flex-1 tp:flex-none flex items-center justify-center gap-1.5 tp:gap-2 px-3 tp:px-5 py-1.5 tp:py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-xs tp:text-sm"
              >
                <span className="hidden tp:inline">Configure Agents</span>
                <span className="tp:hidden">Agents</span>
                <ArrowRight className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={goToPreviousPreparationStep}
                className="flex items-center gap-1.5 tp:gap-2 px-2.5 tp:px-4 py-1.5 tp:py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-xs tp:text-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
                <span className="hidden tp:inline">Back to Slides</span>
                <span className="tp:hidden">Back</span>
              </button>
              <div className="text-xs tp:text-sm text-gray-500">
                {enabledAgents.length} agent{enabledAgents.length !== 1 ? 's' : ''}
              </div>
              <button
                onClick={handleStartAnalysis}
                disabled={!canStartAnalysis}
                className={`flex-1 tp:flex-none flex items-center justify-center gap-1.5 tp:gap-2 px-3 tp:px-5 py-1.5 tp:py-2 rounded-lg transition-colors text-xs tp:text-sm ${
                  canStartAnalysis
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="hidden tp:inline">Start Analysis</span>
                <span className="tp:hidden">Start</span>
                <ArrowRight className="w-3.5 h-3.5 tp:w-4 tp:h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {preparationStep === 'slides-review' ? (
          <SlideSectionPanel />
        ) : (
          <AgentSelectionPanel />
        )}
      </div>
    </div>
  )
}
