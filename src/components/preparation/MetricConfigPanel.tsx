import { useState } from 'react'
import { useAgentsStore, PRESET_METRICS } from '@/stores/agentsStore'
import type { EvaluationMetric } from '@/types'
import { X, Sliders, Check, AlertCircle } from 'lucide-react'

interface MetricConfigPanelProps {
  agentId: string
  agentName: string
  onClose: () => void
}

export function MetricConfigPanel({ agentId, agentName, onClose }: MetricConfigPanelProps) {
  const {
    getAgentMetrics,
    setAgentMetrics,
    validateAgentMetrics,
    normalizeMetricWeights,
  } = useAgentsStore()

  const [localMetrics, setLocalMetrics] = useState<EvaluationMetric[]>(() =>
    getAgentMetrics(agentId)
  )

  const isValid = Math.abs(localMetrics.reduce((sum, m) => sum + m.weight, 0) - 1.0) < 0.001

  const handleWeightChange = (metricId: string, newWeight: number) => {
    setLocalMetrics((prev) =>
      prev.map((m) => (m.id === metricId ? { ...m, weight: newWeight } : m))
    )
  }

  const handleNormalize = () => {
    const totalWeight = localMetrics.reduce((sum, m) => sum + m.weight, 0)
    if (totalWeight === 0) return

    setLocalMetrics((prev) =>
      prev.map((m) => ({
        ...m,
        weight: Math.round((m.weight / totalWeight) * 100) / 100,
      }))
    )
  }

  const handleLensChange = (metricId: string, newLens: string) => {
    setLocalMetrics((prev) =>
      prev.map((m) => (m.id === metricId ? { ...m, lens: newLens } : m))
    )
  }

  const handleSave = () => {
    setAgentMetrics(agentId, localMetrics)
    if (!validateAgentMetrics(agentId)) {
      normalizeMetricWeights(agentId)
    }
    onClose()
  }

  const handleReset = () => {
    setLocalMetrics([...PRESET_METRICS])
  }

  const totalWeight = localMetrics.reduce((sum, m) => sum + m.weight, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sliders className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Configure Metrics</h2>
              <p className="text-sm text-gray-500">{agentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-600 mb-4">
            Configure evaluation metrics and their weights. Weights must sum to 100%.
          </p>

          {/* Weight validation indicator */}
          <div
            className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
              isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isValid ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                Total weight: {(totalWeight * 100).toFixed(0)}%
                {!isValid && ' (must equal 100%)'}
              </span>
            </div>
            {!isValid && (
              <button
                onClick={handleNormalize}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Auto-normalize
              </button>
            )}
          </div>

          {/* Metrics list */}
          <div className="space-y-4">
            {localMetrics.map((metric) => (
              <div key={metric.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{metric.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {(metric.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Weight slider */}
                <div className="mb-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={metric.weight * 100}
                    onChange={(e) =>
                      handleWeightChange(metric.id, Number(e.target.value) / 100)
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Lens description */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Evaluation Lens
                  </label>
                  <textarea
                    value={metric.lens}
                    onChange={(e) => handleLensChange(metric.id, e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Describe what to evaluate for this metric..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
