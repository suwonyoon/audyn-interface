import { Check } from 'lucide-react'
import type { PreparationStep } from '@core/types'

interface StepIndicatorProps {
  currentStep: PreparationStep
  onStepClick?: (step: PreparationStep) => void
  compact?: boolean
}

const steps: { id: PreparationStep; label: string; shortLabel: string }[] = [
  { id: 'slides-review', label: 'Review Slides', shortLabel: 'Slides' },
  { id: 'agent-config', label: 'Configure Agents', shortLabel: 'Agents' },
]

export function StepIndicator({ currentStep, onStepClick, compact = false }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <div className="flex items-center gap-1 tp:gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = step.id === currentStep
        const isClickable = onStepClick && index <= currentIndex

        return (
          <div key={step.id} className="flex items-center">
            {/* Step indicator */}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-1 tp:gap-2 px-2 tp:px-3 py-1 tp:py-1.5 rounded-full transition-colors ${
                isCurrent
                  ? 'bg-blue-100 text-blue-700'
                  : isCompleted
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-400'
              } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {/* Step number or check */}
              <span
                className={`flex items-center justify-center w-4 h-4 tp:w-5 tp:h-5 rounded-full text-xs font-medium ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-2.5 h-2.5 tp:w-3 tp:h-3" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="text-xs tp:text-sm font-medium">
                {compact ? step.shortLabel : step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`w-4 tp:w-8 h-0.5 mx-0.5 tp:mx-1 ${
                  index < currentIndex ? 'bg-green-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
