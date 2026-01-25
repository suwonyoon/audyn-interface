import type { MetricScore } from '@/types'

interface ScoreDisplayProps {
  score: number
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  metricScores?: MetricScore[]
}

function getScoreColor(score: number): { bg: string; text: string; ring: string } {
  if (score <= 3) {
    return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200' }
  } else if (score <= 5) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-200' }
  } else {
    return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-200' }
  }
}

function getScoreLabel(score: number): string {
  if (score <= 2) return 'Poor'
  if (score <= 3) return 'Below Average'
  if (score <= 4) return 'Average'
  if (score <= 5) return 'Good'
  if (score <= 6) return 'Very Good'
  return 'Excellent'
}

export function ScoreDisplay({
  score,
  maxScore = 7,
  size = 'md',
  showLabel = true,
  metricScores,
}: ScoreDisplayProps) {
  const colors = getScoreColor(score)
  const label = getScoreLabel(score)
  const percentage = (score / maxScore) * 100

  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-24 h-24', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'w-32 h-32', text: 'text-4xl', label: 'text-base' },
  }

  const classes = sizeClasses[size]

  return (
    <div className="flex flex-col items-center">
      {/* Circular score display */}
      <div
        className={`${classes.container} relative flex items-center justify-center rounded-full ${colors.bg} ring-4 ${colors.ring}`}
      >
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${percentage * 2.83} 283`}
            className={colors.text}
            strokeLinecap="round"
          />
        </svg>
        <span className={`${classes.text} font-bold ${colors.text}`}>
          {score.toFixed(1)}
        </span>
      </div>

      {/* Score label */}
      {showLabel && (
        <div className="mt-2 text-center">
          <p className={`${classes.label} font-medium ${colors.text}`}>{label}</p>
          <p className="text-xs text-gray-500">out of {maxScore}</p>
        </div>
      )}

      {/* Metric breakdown bars */}
      {metricScores && metricScores.length > 0 && (
        <div className="mt-4 w-full space-y-2">
          {metricScores.map((metric) => (
            <MetricBar key={metric.metricId} metric={metric} maxScore={maxScore} />
          ))}
        </div>
      )}
    </div>
  )
}

interface MetricBarProps {
  metric: MetricScore
  maxScore: number
}

function MetricBar({ metric, maxScore }: MetricBarProps) {
  const percentage = (metric.score / maxScore) * 100
  const colors = getScoreColor(metric.score)

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600 truncate max-w-[150px]">{metric.metricName}</span>
        <span className={`font-medium ${colors.text}`}>{metric.score.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bg.replace('100', '400')}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface ScoreBadgeProps {
  score: number
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const colors = getScoreColor(score)

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {score.toFixed(1)}
    </span>
  )
}
