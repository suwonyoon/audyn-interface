import { useEffect, useState } from 'react'
import type { MetricScore } from '@core/types'

interface ScoreDisplayProps {
  score: number
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  metricScores?: MetricScore[]
  animated?: boolean
}

function getScoreColor(score: number): { bg: string; text: string; fill: string; glow: string } {
  if (score <= 3) {
    return {
      bg: 'bg-score-critical-light',
      text: 'text-score-critical',
      fill: '#EF4444',
      glow: 'shadow-glow-red',
    }
  } else if (score <= 5) {
    return {
      bg: 'bg-score-caution-light',
      text: 'text-score-caution',
      fill: '#F59E0B',
      glow: 'shadow-glow-amber',
    }
  } else {
    return {
      bg: 'bg-score-success-light',
      text: 'text-score-success',
      fill: '#22C55E',
      glow: 'shadow-glow-green',
    }
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
  animated = true,
}: ScoreDisplayProps) {
  const colors = getScoreColor(score)
  const label = getScoreLabel(score)
  const percentage = (score / maxScore) * 100

  // Animation state
  const [animatedPercentage, setAnimatedPercentage] = useState(0)

  useEffect(() => {
    if (animated) {
      // Animate from 0 to actual percentage
      const timer = setTimeout(() => setAnimatedPercentage(percentage), 100)
      return () => clearTimeout(timer)
    } else {
      setAnimatedPercentage(percentage)
    }
  }, [percentage, animated])

  const sizeConfig = {
    sm: {
      width: 80,
      height: 48,
      strokeWidth: 6,
      fontSize: 'text-lg',
      labelSize: 'text-[10px]',
      radius: 32,
    },
    md: {
      width: 120,
      height: 72,
      strokeWidth: 8,
      fontSize: 'text-2xl',
      labelSize: 'text-xs',
      radius: 48,
    },
    lg: {
      width: 160,
      height: 96,
      strokeWidth: 10,
      fontSize: 'text-4xl',
      labelSize: 'text-sm',
      radius: 64,
    },
  }

  const config = sizeConfig[size]

  // Semi-circle arc calculations
  const centerX = config.width / 2
  const centerY = config.height - 4
  const radius = config.radius

  // Arc path for semi-circle (180 degrees)
  const startAngle = Math.PI // 180 degrees (left)
  const endAngle = 0 // 0 degrees (right)

  // Calculate the fill arc based on percentage
  const fillAngle = startAngle - (animatedPercentage / 100) * Math.PI

  // SVG arc path
  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = {
      x: cx + r * Math.cos(startAngle),
      y: cy - r * Math.sin(startAngle),
    }
    const end = {
      x: cx + r * Math.cos(endAngle),
      y: cy - r * Math.sin(endAngle),
    }
    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1

    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
  }

  const backgroundArc = describeArc(centerX, centerY, radius, startAngle, endAngle)
  const fillArc = describeArc(centerX, centerY, radius, startAngle, fillAngle)

  return (
    <div className="flex flex-col items-center">
      {/* Semi-circular arc gauge */}
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <svg
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
          className="overflow-visible"
        >
          <defs>
            {/* Gradient for the fill arc */}
            <linearGradient id={`arcGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.fill} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.fill} stopOpacity="1" />
            </linearGradient>
            {/* Drop shadow filter */}
            <filter id={`arcShadow-${size}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor={colors.fill} floodOpacity="0.3"/>
            </filter>
          </defs>

          {/* Background track */}
          <path
            d={backgroundArc}
            fill="none"
            stroke="#E7E5E4"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />

          {/* Filled arc */}
          <path
            d={fillArc}
            fill="none"
            stroke={`url(#arcGradient-${size})`}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `url(#arcShadow-${size})`,
              transition: animated ? 'all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            }}
          />

          {/* Tick marks at 0, 3.5, 7 positions */}
          {[0, 0.5, 1].map((pos, i) => {
            const angle = startAngle - pos * Math.PI
            const innerR = radius - config.strokeWidth / 2 - 4
            const outerR = radius - config.strokeWidth / 2 - 8
            const x1 = centerX + innerR * Math.cos(angle)
            const y1 = centerY - innerR * Math.sin(angle)
            const x2 = centerX + outerR * Math.cos(angle)
            const y2 = centerY - outerR * Math.sin(angle)

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#D6D3D1"
                strokeWidth={1}
              />
            )
          })}
        </svg>

        {/* Score value in center */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-1"
        >
          <span className={`score-value ${colors.text} ${config.fontSize} leading-none`}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Score label badge */}
      {showLabel && (
        <div className={`mt-1 px-3 py-1 rounded-full ${colors.bg}`}>
          <span className={`${config.labelSize} font-medium ${colors.text}`}>
            {label}
          </span>
        </div>
      )}

      {/* Metric breakdown bars */}
      {metricScores && metricScores.length > 0 && (
        <div className="mt-4 w-full space-y-2.5">
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
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-ink-600 truncate max-w-[150px] font-medium">{metric.metricName}</span>
        <span className={`score-value text-sm ${colors.text}`}>{metric.score.toFixed(1)}</span>
      </div>
      <div className="metric-bar-thick">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-smooth`}
          style={{
            width: `${percentage}%`,
            backgroundColor: colors.fill,
          }}
        />
      </div>
    </div>
  )
}

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md'
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const colors = getScoreColor(score)

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  }

  return (
    <span
      className={`score-badge ${sizeClasses[size]} ${colors.bg} ${colors.text}`}
    >
      {score.toFixed(1)}
    </span>
  )
}

// Compact inline score for use in lists
interface InlineScoreProps {
  score: number
  label?: string
}

export function InlineScore({ score, label }: InlineScoreProps) {
  const colors = getScoreColor(score)

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: colors.fill }} />
      <span className={`score-value text-sm ${colors.text}`}>
        {score.toFixed(1)}
      </span>
      {label && (
        <span className="text-xs text-ink-500">{label}</span>
      )}
    </div>
  )
}
