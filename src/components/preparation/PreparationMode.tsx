import { useEffect, useState } from 'react'
import { useModeStore, usePresentationStore, useSectionsStore, useAgentsStore } from '@/stores'
import { SlideSectionPanel } from './SlideSectionPanel'
import { AgentSelectionPanel } from './AgentSelectionPanel'
import { StepIndicator } from './StepIndicator'
import { ArrowRight, ArrowLeft, Settings, AlertCircle } from 'lucide-react'

export function PreparationMode() {
  const { goToAnalysis, preparationStep, setPreparationStep, goToNextPreparationStep, goToPreviousPreparationStep } = useModeStore()
  const { presentation, fileName } = usePresentationStore()
  const { sections, initializeDefaultSection } = useSectionsStore()
  const { getEnabledAgents, hasValidAPIKey } = useAgentsStore()

  const [validationError, setValidationError] = useState<string | null>(null)

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
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Prepare Analysis</h1>
              <p className="text-sm text-gray-500">{fileName}</p>
            </div>
          </div>
          <StepIndicator
            currentStep={preparationStep}
            onStepClick={setPreparationStep}
          />
        </div>
        <div className="flex items-center gap-4">
          {validationError && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {validationError}
            </div>
          )}
          {preparationStep === 'slides-review' ? (
            <button
              onClick={handleProceedToAgents}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Configure Agents
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={goToPreviousPreparationStep}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Slides
              </button>
              <div className="text-sm text-gray-500">
                {enabledAgents.length} agent{enabledAgents.length !== 1 ? 's' : ''} selected
              </div>
              <button
                onClick={handleStartAnalysis}
                disabled={!canStartAnalysis}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-colors ${
                  canStartAnalysis
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                Start Analysis
                <ArrowRight className="w-4 h-4" />
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
