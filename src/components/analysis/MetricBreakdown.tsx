import { useState, useRef, useEffect } from 'react'
import type { MetricScore } from '@core/types'
import { ChevronDown, ChevronRight, Quote } from 'lucide-react'

interface MetricBreakdownProps {
  metricScores: MetricScore[]
}

function getScoreColor(score: number): { bg: string; text: string; fill: string; border: string } {
  if (score <= 3) {
    return {
      bg: 'bg-score-critical-light',
      text: 'text-score-critical',
      fill: '#EF4444',
      border: 'border-score-critical/30',
    }
  } else if (score <= 5) {
    return {
      bg: 'bg-score-caution-light',
      text: 'text-score-caution',
      fill: '#F59E0B',
      border: 'border-score-caution/30',
    }
  } else {
    return {
      bg: 'bg-score-success-light',
      text: 'text-score-success',
      fill: '#22C55E',
      border: 'border-score-success/30',
    }
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
      <div className="card p-6 text-center text-ink-500 text-sm">
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
          <MetricCard
            key={metric.metricId}
            metric={metric}
            isExpanded={isExpanded}
            colors={colors}
            percentage={percentage}
            onToggle={() => toggleMetric(metric.metricId)}
          />
        )
      })}
    </div>
  )
}

interface MetricCardProps {
  metric: MetricScore
  isExpanded: boolean
  colors: ReturnType<typeof getScoreColor>
  percentage: number
  onToggle: () => void
}

function MetricCard({ metric, isExpanded, colors, percentage, onToggle }: MetricCardProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isExpanded, metric])

  return (
    <div
      className={`
        card overflow-hidden transition-all duration-200 ease-smooth
        border-l-4 ${isExpanded ? 'shadow-card-hover' : ''}
      `}
      style={{ borderLeftColor: colors.fill }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-ink-50 transition-colors duration-150"
      >
        <div className="flex-shrink-0 text-ink-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-ink-800 truncate pr-2">
              {metric.metricName}
            </span>
            <span className={`score-value ${colors.text} flex-shrink-0`}>
              {metric.score.toFixed(1)}/7
            </span>
          </div>

          {/* Thick progress bar */}
          <div className="metric-bar-thick">
            <div
              className="h-full rounded-full transition-all duration-500 ease-smooth"
              style={{
                width: `${percentage}%`,
                backgroundColor: colors.fill,
              }}
            />
          </div>
        </div>
      </button>

      {/* Expandable content with smooth animation */}
      <div
        className="overflow-hidden transition-all duration-300 ease-smooth"
        style={{ height: isExpanded ? contentHeight : 0 }}
      >
        <div ref={contentRef} className="px-4 pb-4 pt-2 border-t border-ink-100">
          {/* Reasoning / Analysis */}
          {metric.reasoning && (
            <div className="mb-4">
              <h4 className="label text-[10px] mb-2">Analysis</h4>
              <p className="text-sm text-ink-700 leading-relaxed">{metric.reasoning}</p>
            </div>
          )}

          {/* Content anchors / Evidence quotes */}
          {metric.contentAnchors.length > 0 && (
            <div>
              <h4 className="label text-[10px] mb-2">Evidence from Slide</h4>
              <div className="space-y-2">
                {metric.contentAnchors.map((anchor, i) => (
                  <div
                    key={i}
                    className="evidence-quote py-2"
                  >
                    <div className="flex items-start gap-2">
                      <Quote className="w-3 h-3 text-ink-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-ink-600">"{anchor}"</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!metric.reasoning && metric.contentAnchors.length === 0 && (
            <p className="text-sm text-ink-400 italic">
              No detailed analysis available for this metric.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface CompactMetricBreakdownProps {
  metricScores: MetricScore[]
}

export function CompactMetricBreakdown({ metricScores }: CompactMetricBreakdownProps) {
  if (metricScores.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3">
      {metricScores.map((metric) => {
        const colors = getScoreColor(metric.score)
        const percentage = (metric.score / 7) * 100

        return (
          <div
            key={metric.metricId}
            className={`
              p-3 rounded-lg border transition-all duration-150 ease-smooth
              hover:shadow-card ${colors.bg} ${colors.border}
            `}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span
                className="text-ink-700 font-medium truncate max-w-[100px]"
                title={metric.metricName}
              >
                {metric.metricName}
              </span>
              <span className={`score-value text-sm ${colors.text}`}>
                {metric.score.toFixed(1)}
              </span>
            </div>
            <div className="metric-bar">
              <div
                className="h-full rounded-full transition-all duration-500 ease-smooth"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: colors.fill,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Inline metric display for tight spaces
interface InlineMetricProps {
  metric: MetricScore
}

export function InlineMetric({ metric }: InlineMetricProps) {
  const colors = getScoreColor(metric.score)

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: colors.fill }}
      />
      <span className="text-xs text-ink-600 truncate">{metric.metricName}</span>
      <span className={`score-value text-xs ${colors.text}`}>
        {metric.score.toFixed(1)}
      </span>
    </div>
  )
}
