import { useMemo, useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { SectionTimelinePoint } from '@core/types'

interface ScoreTimelineProps {
  data: SectionTimelinePoint[]
  selectedAgentId: string | null
  onSectionClick: (sectionId: string, agentId: string | null) => void
  compact?: boolean
}

// Score color utilities
function getScoreColor(score: number): string {
  if (score <= 3) return '#EF4444' // critical red
  if (score <= 5) return '#F59E0B' // caution amber
  return '#22C55E' // success green
}

function getScoreColorClass(score: number): { bg: string; text: string; glow: string } {
  if (score <= 3) return { bg: 'bg-score-critical-light', text: 'text-score-critical', glow: 'shadow-glow-red' }
  if (score <= 5) return { bg: 'bg-score-caution-light', text: 'text-score-caution', glow: 'shadow-glow-amber' }
  return { bg: 'bg-score-success-light', text: 'text-score-success', glow: 'shadow-glow-green' }
}

// Calculate tooltip position, avoiding cutoff at edges
function getTooltipPosition(
  x: number,
  y: number,
  tooltipWidth: number,
  tooltipHeight: number,
  chartWidth: number,
  padding: { left: number; right: number; top: number }
): { tooltipX: number; tooltipY: number; arrowDirection: 'down' | 'up' } {
  // Default: above and centered
  let tooltipX = x - tooltipWidth / 2
  let tooltipY = y - tooltipHeight - 10 // 10px gap for arrow
  let arrowDirection: 'down' | 'up' = 'down'

  // Check horizontal bounds
  const minX = -padding.left + 4
  const maxX = chartWidth + padding.right - tooltipWidth - 4

  if (tooltipX < minX) {
    tooltipX = minX
  } else if (tooltipX > maxX) {
    tooltipX = maxX
  }

  // Check vertical bounds - if too close to top, show below instead
  if (tooltipY < -padding.top + 4) {
    tooltipY = y + 16 // Show below the point
    arrowDirection = 'up'
  }

  return { tooltipX, tooltipY, arrowDirection }
}

export function ScoreTimeline({ data, selectedAgentId, onSectionClick, compact = false }: ScoreTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    sectionIndex: number
    agentId: string | null
  } | null>(null)

  // Toggle for showing agent score dots
  const [showAgentDots, setShowAgentDots] = useState(() => {
    // Load preference from localStorage
    const stored = localStorage.getItem('audyn-show-agent-dots')
    return stored !== null ? stored === 'true' : true
  })

  // Persist toggle preference
  useEffect(() => {
    localStorage.setItem('audyn-show-agent-dots', String(showAgentDots))
  }, [showAgentDots])

  // Animation state
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const chartDimensions = useMemo(() => {
    if (compact) {
      const width = 340
      const height = 160
      const padding = { top: 20, right: 30, bottom: 45, left: 35 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom
      return { width, height, padding, chartWidth, chartHeight }
    }
    const width = 640
    const height = 280
    const padding = { top: 35, right: 55, bottom: 60, left: 55 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    return { width, height, padding, chartWidth, chartHeight }
  }, [compact])

  const { avgScore, lowestSection, agents } = useMemo(() => {
    if (data.length === 0) {
      return { avgScore: 0, lowestSection: null, agents: [] }
    }

    const avgScore =
      data.reduce((sum, d) => sum + d.averageScore, 0) / data.length

    const lowestSection = data.reduce(
      (min, d) => (d.averageScore < min.averageScore ? d : min),
      data[0]
    )

    // Extract unique agents
    const agentMap = new Map<string, { id: string; name: string }>()
    for (const section of data) {
      for (const agentScore of section.agentScores) {
        if (!agentMap.has(agentScore.agentId)) {
          agentMap.set(agentScore.agentId, {
            id: agentScore.agentId,
            name: agentScore.agentName,
          })
        }
      }
    }
    const agents = Array.from(agentMap.values())

    return { avgScore, lowestSection, agents }
  }, [data])

  const { sectionPoints, averageLine, lineLength } = useMemo(() => {
    if (data.length === 0) {
      return { sectionPoints: [], averageLine: '', lineLength: 0 }
    }

    const { chartWidth, chartHeight } = chartDimensions
    const minScore = 1
    const maxScore = 7
    const scoreRange = maxScore - minScore

    const agentCount = agents.length
    const dotSpacing = agentCount > 1 ? (compact ? 8 : 12) : 0

    // Add padding so points aren't at exact edges
    const edgePadding = data.length > 1 ? chartWidth * 0.06 : 0
    const usableWidth = chartWidth - edgePadding * 2

    const sectionPoints = data.map((section, i) => {
      // Position with edge padding
      const baseX = data.length === 1
        ? chartWidth / 2
        : edgePadding + (i / (data.length - 1)) * usableWidth

      // Position agent dots with vertical offset to avoid overlap
      const agentPoints = section.agentScores.map((agentScore, agentIndex) => {
        const verticalOffset = (agentIndex - (agentCount - 1) / 2) * dotSpacing
        const y =
          chartHeight -
          ((agentScore.score - minScore) / scoreRange) * chartHeight +
          verticalOffset

        return {
          x: baseX,
          y: Math.max(6, Math.min(chartHeight - 6, y)),
          score: agentScore.score,
          agentId: agentScore.agentId,
          agentName: agentScore.agentName,
        }
      })

      // Average point position (for the connecting line)
      const avgY =
        chartHeight -
        ((section.averageScore - minScore) / scoreRange) * chartHeight

      return {
        sectionIndex: section.sectionIndex,
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        baseX,
        avgY,
        averageScore: section.averageScore,
        agentPoints,
      }
    })

    // Build line connecting section averages
    const averageLine = sectionPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.baseX} ${p.avgY}`)
      .join(' ')

    // Calculate approximate line length for animation
    let lineLength = 0
    for (let i = 1; i < sectionPoints.length; i++) {
      const dx = sectionPoints[i].baseX - sectionPoints[i-1].baseX
      const dy = sectionPoints[i].avgY - sectionPoints[i-1].avgY
      lineLength += Math.sqrt(dx * dx + dy * dy)
    }

    return { sectionPoints, averageLine, lineLength }
  }, [data, chartDimensions, agents, compact])

  const { padding, chartHeight, chartWidth } = chartDimensions

  if (data.length === 0) {
    return (
      <div className="card p-6 text-center text-ink-500">
        No score data available
      </div>
    )
  }

  const avgScoreColors = getScoreColorClass(avgScore)

  return (
    <div className={`card ${compact ? 'p-3' : 'p-5'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${compact ? 'mb-3' : 'mb-4'}`}>
        <div>
          <h3 className={`font-semibold text-ink-800 ${compact ? 'text-sm' : 'text-base'}`}>
            Score Timeline
          </h3>
          {!compact && (
            <p className="text-xs text-ink-500 mt-0.5">Performance across sections</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Average score badge */}
          <div className={`flex items-center gap-2 ${avgScoreColors.bg} rounded-full ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}>
            <span className={`label ${compact ? 'text-[9px]' : 'text-[10px]'}`}>Avg</span>
            <span className={`score-value ${avgScoreColors.text} ${compact ? 'text-sm' : 'text-base'}`}>
              {avgScore.toFixed(1)}
            </span>
          </div>
          {!compact && lowestSection && lowestSection.averageScore < avgScore && (
            <div className="text-xs text-ink-500">
              Lowest: <span className="font-medium text-ink-700">{lowestSection.sectionName}</span>
              <span className="text-score-critical font-mono ml-1">({lowestSection.averageScore.toFixed(1)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className={`flex flex-wrap items-center border-b border-ink-100 ${compact ? 'gap-3 mb-3 pb-2' : 'gap-4 mb-4 pb-3'}`}>
        {/* Agent indicator - pill shaped with toggle */}
        <button
          onClick={() => setShowAgentDots(!showAgentDots)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-colors ${
            showAgentDots
              ? 'bg-audyn-50 hover:bg-audyn-100'
              : 'bg-ink-100 hover:bg-ink-200'
          }`}
          title={showAgentDots ? 'Hide agent scores' : 'Show agent scores'}
        >
          {showAgentDots ? (
            <Eye className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          ) : (
            <EyeOff className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-ink-400`} />
          )}
          <div className={`rounded-full ${showAgentDots ? 'bg-audyn-500' : 'bg-ink-300'} ${compact ? 'w-3 h-2' : 'w-4 h-2.5'}`} />
          <span className={`${showAgentDots ? 'text-ink-600' : 'text-ink-400'} ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Agent Score
          </span>
        </button>
        {/* Section average - hexagon */}
        <div className="flex items-center gap-1.5">
          <svg className={compact ? 'w-3 h-3' : 'w-4 h-4'} viewBox="0 0 16 16">
            <polygon
              points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5"
              fill="#78716C"
            />
          </svg>
          <span className={`text-ink-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Section Avg
          </span>
        </div>
        {selectedAgentId && (
          <div className={`ml-auto flex items-center gap-1.5 bg-audyn-50 rounded-full ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}>
            <span className="text-audyn-700 font-medium">
              {agents.find(a => a.id === selectedAgentId)?.name}
            </span>
            <button
              onClick={() => onSectionClick(data[0]?.sectionId || '', null)}
              className="text-audyn-500 hover:text-audyn-700 font-bold ml-0.5"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
        className="w-full h-auto"
      >
        <defs>
          {/* Gradient for area fill under line */}
          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#78716C" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#78716C" stopOpacity="0" />
          </linearGradient>

          {/* Gradient for the flow line based on position */}
          <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
            {sectionPoints.map((p, i) => (
              <stop
                key={i}
                offset={`${(i / Math.max(sectionPoints.length - 1, 1)) * 100}%`}
                stopColor={getScoreColor(p.averageScore)}
              />
            ))}
          </linearGradient>

          {/* Subtle noise texture for zone backgrounds */}
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
            <feColorMatrix type="saturate" values="0"/>
            <feBlend in="SourceGraphic" in2="noise" mode="soft-light"/>
          </filter>

          {/* Glow filter for hovered points */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Score zone backgrounds with gradient overlays */}
          {/* Critical zone (1-3) */}
          <rect
            x={0}
            y={chartHeight * (4/6)}
            width={chartWidth}
            height={chartHeight * (2/6)}
            fill="url(#score-gradient-red)"
            className="fill-score-critical-light"
            opacity="0.4"
            rx="2"
          />
          {/* Caution zone (3-5) */}
          <rect
            x={0}
            y={chartHeight * (2/6)}
            width={chartWidth}
            height={chartHeight * (2/6)}
            fill="url(#score-gradient-amber)"
            className="fill-score-caution-light"
            opacity="0.35"
            rx="2"
          />
          {/* Success zone (5-7) */}
          <rect
            x={0}
            y={0}
            width={chartWidth}
            height={chartHeight * (2/6)}
            fill="url(#score-gradient-green)"
            className="fill-score-success-light"
            opacity="0.35"
            rx="2"
          />

          {/* Y-axis grid lines */}
          {(compact ? [1, 4, 7] : [1, 2, 3, 4, 5, 6, 7]).map((score) => {
            const y = chartHeight - ((score - 1) / 6) * chartHeight
            return (
              <g key={score}>
                <line
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#E7E5E4"
                  strokeWidth="1"
                  strokeDasharray={score === 4 ? "none" : "4 4"}
                />
                <text
                  x={compact ? -8 : -12}
                  y={y + 4}
                  textAnchor="end"
                  className={`fill-ink-400 font-mono ${compact ? 'text-[9px]' : 'text-[11px]'}`}
                >
                  {score}
                </text>
              </g>
            )
          })}

          {/* Area fill under average line */}
          {sectionPoints.length > 1 && (
            <path
              d={`${averageLine} L ${sectionPoints[sectionPoints.length - 1].baseX} ${chartHeight} L ${sectionPoints[0].baseX} ${chartHeight} Z`}
              fill="url(#areaGradient)"
              className={isAnimated ? 'animate-fade-in' : 'opacity-0'}
            />
          )}

          {/* Flow line connecting sections - gradient stroke, animated draw */}
          <path
            d={averageLine}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth={compact ? 2.5 : 3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: lineLength || 1000,
              strokeDashoffset: isAnimated ? 0 : lineLength || 1000,
              transition: 'stroke-dashoffset 800ms ease-out',
            }}
          />

          {/* Section data points */}
          {sectionPoints.map((section, sectionIdx) => {
            const pointDelay = 200 + sectionIdx * 100 // Stagger pop-in

            return (
              <g key={section.sectionId}>
                {/* Agent score pills - pill shaped markers */}
                {showAgentDots && section.agentPoints.map((point, pointIdx) => {
                  const isHovered =
                    hoveredPoint?.sectionIndex === sectionIdx &&
                    hoveredPoint?.agentId === point.agentId
                  const isSelected = selectedAgentId === point.agentId

                  const pillWidth = compact ? 10 : 14
                  const pillHeight = compact ? 6 : 8

                  return (
                    <g
                      key={point.agentId}
                      style={{
                        opacity: isAnimated ? 1 : 0,
                        transform: isAnimated ? 'scale(1)' : 'scale(0)',
                        transformOrigin: `${point.x}px ${point.y}px`,
                        transition: `all 300ms cubic-bezier(0.34, 1.56, 0.64, 1) ${pointDelay + pointIdx * 50}ms`,
                      }}
                    >
                      {/* Pill-shaped agent marker */}
                      <rect
                        x={point.x - pillWidth / 2}
                        y={point.y - pillHeight / 2}
                        width={pillWidth}
                        height={pillHeight}
                        rx={pillHeight / 2}
                        fill={getScoreColor(point.score)}
                        stroke={isSelected ? '#1D4ED8' : 'white'}
                        strokeWidth={isSelected ? 2 : 1.5}
                        className="cursor-pointer"
                        style={{
                          filter: isHovered ? 'url(#glow)' : undefined,
                          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                          transformOrigin: `${point.x}px ${point.y}px`,
                          transition: 'transform 150ms ease-out',
                        }}
                        onMouseEnter={() =>
                          setHoveredPoint({
                            sectionIndex: sectionIdx,
                            agentId: point.agentId,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                        onClick={() => onSectionClick(section.sectionId, point.agentId)}
                      />

                      {/* Tooltip */}
                      {isHovered && (() => {
                        const tooltipWidth = 150
                        const tooltipHeight = 48
                        const { tooltipX, tooltipY, arrowDirection } = getTooltipPosition(
                          point.x, point.y, tooltipWidth, tooltipHeight, chartWidth, padding
                        )
                        return (
                          <g style={{ pointerEvents: 'none' }}>
                            {/* Tooltip background */}
                            <rect
                              x={tooltipX}
                              y={tooltipY}
                              width={tooltipWidth}
                              height={tooltipHeight}
                              rx={8}
                              fill="#1C1917"
                              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }}
                            />
                            {/* Arrow pointing to the point */}
                            {arrowDirection === 'down' ? (
                              <polygon
                                points={`${point.x - 6},${tooltipY + tooltipHeight} ${point.x + 6},${tooltipY + tooltipHeight} ${point.x},${tooltipY + tooltipHeight + 6}`}
                                fill="#1C1917"
                              />
                            ) : (
                              <polygon
                                points={`${point.x - 6},${tooltipY} ${point.x + 6},${tooltipY} ${point.x},${tooltipY - 6}`}
                                fill="#1C1917"
                              />
                            )}
                            {/* Agent name */}
                            <text
                              x={tooltipX + tooltipWidth / 2}
                              y={tooltipY + 20}
                              textAnchor="middle"
                              className="fill-white font-medium text-xs"
                            >
                              {point.agentName.length > 18 ? point.agentName.substring(0, 16) + '...' : point.agentName}
                            </text>
                            {/* Score */}
                            <text
                              x={tooltipX + tooltipWidth / 2}
                              y={tooltipY + 38}
                              textAnchor="middle"
                              className="fill-ink-300 font-mono text-sm"
                            >
                              {point.score.toFixed(1)} / 7
                            </text>
                          </g>
                        )
                      })()}
                    </g>
                  )
                })}

                {/* Section average hexagon marker */}
                {(() => {
                  const isHovered = hoveredPoint?.sectionIndex === sectionIdx && hoveredPoint?.agentId === null
                  const size = compact ? 7 : 9
                  const hexPoints = [
                    [section.baseX, section.avgY - size],
                    [section.baseX + size * 0.866, section.avgY - size * 0.5],
                    [section.baseX + size * 0.866, section.avgY + size * 0.5],
                    [section.baseX, section.avgY + size],
                    [section.baseX - size * 0.866, section.avgY + size * 0.5],
                    [section.baseX - size * 0.866, section.avgY - size * 0.5],
                  ].map(p => p.join(',')).join(' ')

                  return (
                    <g
                      style={{
                        opacity: isAnimated ? 1 : 0,
                        transform: isAnimated ? 'scale(1)' : 'scale(0)',
                        transformOrigin: `${section.baseX}px ${section.avgY}px`,
                        transition: `all 300ms cubic-bezier(0.34, 1.56, 0.64, 1) ${pointDelay}ms`,
                      }}
                    >
                      <polygon
                        points={hexPoints}
                        fill={getScoreColor(section.averageScore)}
                        stroke="white"
                        strokeWidth={compact ? 1.5 : 2}
                        className="cursor-pointer"
                        style={{
                          filter: isHovered ? 'url(#glow)' : undefined,
                          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                          transformOrigin: `${section.baseX}px ${section.avgY}px`,
                          transition: 'transform 150ms ease-out',
                        }}
                        onMouseEnter={() =>
                          setHoveredPoint({ sectionIndex: sectionIdx, agentId: null })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                        onClick={() => onSectionClick(section.sectionId, null)}
                      />

                      {/* Average tooltip */}
                      {isHovered && (() => {
                        const tooltipWidth = 140
                        const tooltipHeight = 52
                        const { tooltipX, tooltipY, arrowDirection } = getTooltipPosition(
                          section.baseX, section.avgY, tooltipWidth, tooltipHeight, chartWidth, padding
                        )
                        return (
                          <g style={{ pointerEvents: 'none' }}>
                            <rect
                              x={tooltipX}
                              y={tooltipY}
                              width={tooltipWidth}
                              height={tooltipHeight}
                              rx={8}
                              fill="#1C1917"
                              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }}
                            />
                            {arrowDirection === 'down' ? (
                              <polygon
                                points={`${section.baseX - 6},${tooltipY + tooltipHeight} ${section.baseX + 6},${tooltipY + tooltipHeight} ${section.baseX},${tooltipY + tooltipHeight + 6}`}
                                fill="#1C1917"
                              />
                            ) : (
                              <polygon
                                points={`${section.baseX - 6},${tooltipY} ${section.baseX + 6},${tooltipY} ${section.baseX},${tooltipY - 6}`}
                                fill="#1C1917"
                              />
                            )}
                            <text
                              x={tooltipX + tooltipWidth / 2}
                              y={tooltipY + 20}
                              textAnchor="middle"
                              className="fill-white font-medium text-xs"
                            >
                              {section.sectionName.length > 16 ? section.sectionName.substring(0, 14) + '...' : section.sectionName}
                            </text>
                            <text
                              x={tooltipX + tooltipWidth / 2}
                              y={tooltipY + 40}
                              textAnchor="middle"
                              className="fill-ink-300 font-mono text-sm"
                            >
                              Avg: {section.averageScore.toFixed(1)} / 7
                            </text>
                          </g>
                        )
                      })()}
                    </g>
                  )
                })()}

                {/* X-axis labels */}
                <g className={isAnimated ? 'animate-fade-in' : 'opacity-0'} style={{ animationDelay: `${pointDelay + 200}ms` }}>
                  <text
                    x={section.baseX}
                    y={chartHeight + (compact ? 14 : 20)}
                    textAnchor="middle"
                    className={`fill-ink-700 font-medium ${compact ? 'text-[9px]' : 'text-xs'}`}
                  >
                    {(() => {
                      const maxLen = compact ? 10 : 14
                      const truncLen = compact ? 8 : 12
                      return section.sectionName.length > maxLen
                        ? section.sectionName.substring(0, truncLen) + '...'
                        : section.sectionName
                    })()}
                  </text>
                  <text
                    x={section.baseX}
                    y={chartHeight + (compact ? 25 : 34)}
                    textAnchor="middle"
                    className={`fill-ink-400 font-mono ${compact ? 'text-[8px]' : 'text-[10px]'}`}
                  >
                    {section.sectionIndex + 1}
                  </text>
                </g>
              </g>
            )
          })}

          {/* Y-axis label */}
          {!compact && (
            <text
              x={-chartHeight / 2}
              y={-40}
              textAnchor="middle"
              transform="rotate(-90)"
              className="text-[11px] fill-ink-400 font-medium"
            >
              Score (1-7)
            </text>
          )}
        </g>
      </svg>

      {/* Score zone legend (non-compact only) */}
      {!compact && (
        <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-ink-100">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-score-critical-light border border-score-critical/30" />
            <span className="text-[10px] text-ink-500">1-3 Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-score-caution-light border border-score-caution/30" />
            <span className="text-[10px] text-ink-500">3-5 Needs Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-score-success-light border border-score-success/30" />
            <span className="text-[10px] text-ink-500">5-7 Good</span>
          </div>
        </div>
      )}
    </div>
  )
}
