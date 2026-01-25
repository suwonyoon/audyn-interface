import { useState } from 'react'
import type { MetricScore } from '@/types'
import { ChevronDown, ChevronRight, Quote } from 'lucide-react'

interface MetricBreakdownProps {
  metricScores: MetricScore[]
}

function getScoreColor(score: number): { bg: string; text: string; bar: string } {
  if (score <= 3) {
    return { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-400' }
  } else if (score <= 5) {
    return { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-400' }
  } else {
    return { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-400' }
  }
}

export function MetricBreakdown({ metricScores }: MetricBreakdownProps) {
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set())

  const toggleMetric = (metricId: string) => {
    setExpandedMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(metricId)) {
        next.delete(metricId)
      } else {
        next.add(metricId)
      }
      return next
    })
  }

  if (metricScores.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
        No metric scores available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {metricScores.map((metric) => {
        const isExpanded = expandedMetrics.has(metric.metricId)
        const colors = getScoreColor(metric.score)
        const percentage = (metric.score / 7) * 100

        return (
          <div
            key={metric.metricId}
            className={`rounded-lg border overflow-hidden ${colors.bg} border-gray-200`}
          >
            {/* Header */}
            <button
              onClick={() => toggleMetric(metric.metricId)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/30 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 truncate">
                    {metric.metricName}
                  </span>
                  <span className={`font-bold ${colors.text}`}>
                    {metric.score.toFixed(1)}/7
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-200/50">
                {/* Reasoning */}
                {metric.reasoning && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Analysis
                    </h4>
                    <p className="text-sm text-gray-700">{metric.reasoning}</p>
                  </div>
                )}

                {/* Content anchors */}
                {metric.contentAnchors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Evidence from Slide
                    </h4>
                    <div className="space-y-2">
                      {metric.contentAnchors.map((anchor, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 bg-white/50 rounded-lg"
                        >
                          <Quote className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-600 italic">"{anchor}"</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!metric.reasoning && metric.contentAnchors.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No detailed analysis available for this metric.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface CompactMetricBreakdownProps {
  metricScores: MetricScore[]
}

export function CompactMetricBreakdown({ metricScores }: CompactMetricBreakdownProps) {
  if (metricScores.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2">
      {metricScores.map((metric) => {
        const colors = getScoreColor(metric.score)
        const percentage = (metric.score / 7) * 100

        return (
          <div key={metric.metricId} className="p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600 truncate max-w-[100px]" title={metric.metricName}>
                {metric.metricName}
              </span>
              <span className={`font-medium ${colors.text}`}>{metric.score.toFixed(1)}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.bar}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
