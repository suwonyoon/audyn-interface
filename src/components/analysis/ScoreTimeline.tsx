import { useMemo, useState } from 'react'
import type { SectionTimelinePoint } from '@core/types'

interface ScoreTimelineProps {
  data: SectionTimelinePoint[]
  selectedAgentId: string | null
  onSectionClick: (sectionId: string, agentId: string | null) => void
  compact?: boolean
}

function getScoreColor(score: number): string {
  if (score <= 3) return '#ef4444' // red-500
  if (score <= 5) return '#eab308' // yellow-500
  return '#22c55e' // green-500
}

export function ScoreTimeline({ data, selectedAgentId, onSectionClick, compact = false }: ScoreTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    sectionIndex: number
    agentId: string | null
  } | null>(null)

  const chartDimensions = useMemo(() => {
    if (compact) {
      const width = 320
      const height = 150
      const padding = { top: 15, right: 25, bottom: 40, left: 30 }
      const chartWidth = width - padding.left - padding.right
      const chartHeight = height - padding.top - padding.bottom
      return { width, height, padding, chartWidth, chartHeight }
    }
    const width = 600
    const height = 260
    // Add more horizontal padding so edge sections aren't cut off
    const padding = { top: 30, right: 50, bottom: 55, left: 50 }
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

  const { sectionPoints, averageLine } = useMemo(() => {
    if (data.length === 0) {
      return { sectionPoints: [], averageLine: '' }
    }

    const { chartWidth, chartHeight } = chartDimensions
    const minScore = 1
    const maxScore = 7
    const scoreRange = maxScore - minScore

    const agentCount = agents.length
    const dotSpacing = agentCount > 1 ? (compact ? 6 : 10) : 0

    // Add padding so points aren't at exact edges
    const edgePadding = data.length > 1 ? chartWidth * 0.05 : 0
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
          y: Math.max(4, Math.min(chartHeight - 4, y)),
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

    return { sectionPoints, averageLine }
  }, [data, chartDimensions, agents])

  const { padding, chartHeight, chartWidth } = chartDimensions

  if (data.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
        No score data available
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${compact ? 'p-2' : 'p-4'}`}>
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <h3 className={`font-semibold text-gray-700 ${compact ? 'text-xs' : 'text-sm'}`}>
          {compact ? 'Score Timeline' : 'Section Score Timeline'}
        </h3>
        <div className={`flex items-center gap-4 text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
          <span>
            Avg: <span className="font-semibold text-gray-700">{avgScore.toFixed(1)}</span>
          </span>
          {!compact && lowestSection && (
            <span>
              Lowest: <span className="text-gray-600">{lowestSection.sectionName}</span> (
              <span className="font-semibold text-red-600">
                {lowestSection.averageScore.toFixed(1)}
              </span>
              )
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className={`flex flex-wrap items-center border-b border-gray-100 ${compact ? 'gap-2 mb-2 pb-2' : 'gap-4 mb-3 pb-3'}`}>
        <div className="flex items-center gap-1">
          <div className={`rounded-full bg-blue-500 ${compact ? 'w-2 h-2' : 'w-3 h-3'}`} />
          <span className={`text-gray-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {compact ? 'Agent' : 'Agent Score (click to filter)'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`rotate-45 bg-gray-500 ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
          <span className={`text-gray-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {compact ? 'Avg' : 'Section Average (click to show all)'}
          </span>
        </div>
        {selectedAgentId && (
          <div className={`ml-auto flex items-center gap-1 bg-blue-50 rounded ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}>
            <span className="text-blue-700">
              {compact ? agents.find(a => a.id === selectedAgentId)?.name : `Filtering: ${agents.find(a => a.id === selectedAgentId)?.name}`}
            </span>
            <button
              onClick={() => onSectionClick(data[0]?.sectionId || '', null)}
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${chartDimensions.width} ${chartDimensions.height}`}
        className="w-full h-auto"
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id="avgGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6b7280" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Background gradient bands for score zones */}
          <rect x={0} y={0} width={chartWidth} height={chartHeight * (2/6)} fill="#fee2e2" opacity="0.3" />
          <rect x={0} y={chartHeight * (2/6)} width={chartWidth} height={chartHeight * (2/6)} fill="#fef3c7" opacity="0.3" />
          <rect x={0} y={chartHeight * (4/6)} width={chartWidth} height={chartHeight * (2/6)} fill="#dcfce7" opacity="0.3" />

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
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text x={compact ? -6 : -10} y={y + 4} textAnchor="end" className={`fill-gray-400 ${compact ? 'text-[8px]' : 'text-xs'}`}>
                  {score}
                </text>
              </g>
            )
          })}

          {/* Area fill under average line */}
          {sectionPoints.length > 1 && (
            <path
              d={`${averageLine} L ${sectionPoints[sectionPoints.length - 1].baseX} ${chartHeight} L ${sectionPoints[0].baseX} ${chartHeight} Z`}
              fill="url(#avgGradient)"
            />
          )}

          {/* Average line connecting sections */}
          <path
            d={averageLine}
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />

          {/* Section data */}
          {sectionPoints.map((section, sectionIdx) => (
            <g key={section.sectionId}>
              {/* Agent dots - all blue */}
              {section.agentPoints.map((point) => {
                const isHovered =
                  hoveredPoint?.sectionIndex === sectionIdx &&
                  hoveredPoint?.agentId === point.agentId
                const isSelected = selectedAgentId === point.agentId

                // Compact mode: smaller dot sizes
                const baseRadius = compact ? 4 : 5
                const hoverRadius = compact ? 6 : 8
                const selectedRadius = compact ? 5 : 7
                const strokeWidth = compact ? (isSelected ? 2 : 1.5) : (isSelected ? 3 : 2)

                return (
                  <g key={point.agentId}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? hoverRadius : isSelected ? selectedRadius : baseRadius}
                      fill="#3b82f6"
                      stroke={isSelected ? '#1d4ed8' : 'white'}
                      strokeWidth={strokeWidth}
                      className="cursor-pointer transition-all duration-150"
                      style={{ filter: isHovered ? 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4))' : undefined }}
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
                    {isHovered && (
                      <g style={{ pointerEvents: 'none' }}>
                        <rect
                          x={point.x - (compact ? 50 : 70)}
                          y={point.y - (compact ? 38 : 50)}
                          width={compact ? 100 : 140}
                          height={compact ? 30 : 40}
                          rx={compact ? 4 : 6}
                          fill="#1f2937"
                          style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}
                        />
                        <text
                          x={point.x}
                          y={point.y - (compact ? 24 : 32)}
                          textAnchor="middle"
                          className={`fill-white font-medium ${compact ? 'text-[9px]' : 'text-xs'}`}
                        >
                          {compact ? (point.agentName.length > 12 ? point.agentName.substring(0, 10) + '..' : point.agentName) : point.agentName}
                        </text>
                        <text
                          x={point.x}
                          y={point.y - (compact ? 13 : 18)}
                          textAnchor="middle"
                          className={`fill-gray-300 ${compact ? 'text-[8px]' : 'text-xs'}`}
                        >
                          Score: {point.score.toFixed(1)} / 7
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

              {/* Average indicator (diamond) */}
              {(() => {
                const diamondSize = compact ? 4 : 5
                return (
                  <polygon
                    points={`${section.baseX},${section.avgY - diamondSize} ${section.baseX + diamondSize},${section.avgY} ${section.baseX},${section.avgY + diamondSize} ${section.baseX - diamondSize},${section.avgY}`}
                    fill={getScoreColor(section.averageScore)}
                    stroke="white"
                    strokeWidth={compact ? 1.5 : 2}
                    className="cursor-pointer transition-all duration-150"
                    style={{
                      filter: (hoveredPoint?.sectionIndex === sectionIdx && hoveredPoint?.agentId === null)
                        ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        : undefined
                    }}
                    onMouseEnter={() =>
                      setHoveredPoint({ sectionIndex: sectionIdx, agentId: null })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    onClick={() => onSectionClick(section.sectionId, null)}
                  />
                )
              })()}

              {/* Average tooltip */}
              {hoveredPoint?.sectionIndex === sectionIdx &&
                hoveredPoint?.agentId === null && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={section.baseX - (compact ? 45 : 60)}
                      y={section.avgY - (compact ? 38 : 50)}
                      width={compact ? 90 : 120}
                      height={compact ? 30 : 40}
                      rx={compact ? 4 : 6}
                      fill="#1f2937"
                      style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}
                    />
                    <text
                      x={section.baseX}
                      y={section.avgY - (compact ? 24 : 32)}
                      textAnchor="middle"
                      className={`fill-white font-medium ${compact ? 'text-[9px]' : 'text-xs'}`}
                    >
                      {compact ? (section.sectionName.length > 10 ? section.sectionName.substring(0, 8) + '..' : section.sectionName) : section.sectionName}
                    </text>
                    <text
                      x={section.baseX}
                      y={section.avgY - (compact ? 13 : 18)}
                      textAnchor="middle"
                      className={`fill-gray-300 ${compact ? 'text-[8px]' : 'text-xs'}`}
                    >
                      {compact ? `Avg: ${section.averageScore.toFixed(1)}` : `Average: ${section.averageScore.toFixed(1)} / 7`}
                    </text>
                  </g>
                )}

              {/* X-axis label (section name) */}
              <text
                x={section.baseX}
                y={chartHeight + (compact ? 12 : 18)}
                textAnchor="middle"
                className={`fill-gray-700 font-medium ${compact ? 'text-[9px]' : 'text-xs'}`}
              >
                {(() => {
                  const maxLen = compact ? 12 : 16
                  const truncLen = compact ? 10 : 14
                  return section.sectionName.length > maxLen
                    ? section.sectionName.substring(0, truncLen) + '...'
                    : section.sectionName
                })()}
              </text>
              <text
                x={section.baseX}
                y={chartHeight + (compact ? 22 : 32)}
                textAnchor="middle"
                className={`fill-gray-400 ${compact ? 'text-[8px]' : 'text-xs'}`}
              >
                §{section.sectionIndex + 1}
              </text>
            </g>
          ))}

          {/* Y-axis label */}
          {!compact && (
            <text
              x={-chartHeight / 2}
              y={-35}
              textAnchor="middle"
              transform="rotate(-90)"
              className="text-xs fill-gray-400"
            >
              Score (1-7)
            </text>
          )}
        </g>
      </svg>
    </div>
  )
}
