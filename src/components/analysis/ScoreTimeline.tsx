import { useMemo, useState } from 'react'
import type { SectionTimelinePoint } from '@/types'

interface ScoreTimelineProps {
  data: SectionTimelinePoint[]
  selectedAgentId: string | null
  onSectionClick: (sectionId: string, agentId: string | null) => void
}

function getScoreColor(score: number): string {
  if (score <= 3) return '#ef4444' // red-500
  if (score <= 5) return '#eab308' // yellow-500
  return '#22c55e' // green-500
}

export function ScoreTimeline({ data, selectedAgentId, onSectionClick }: ScoreTimelineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    sectionIndex: number
    agentId: string | null
  } | null>(null)

  const chartDimensions = useMemo(() => {
    const width = 600
    const height = 260
    // Add more horizontal padding so edge sections aren't cut off
    const padding = { top: 30, right: 50, bottom: 55, left: 50 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    return { width, height, padding, chartWidth, chartHeight }
  }, [])

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
    const dotSpacing = agentCount > 1 ? 10 : 0

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
    <div className="p-4 bg-white rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Section Score Timeline</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            Avg: <span className="font-semibold text-gray-700">{avgScore.toFixed(1)}</span>
          </span>
          {lowestSection && (
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
      <div className="flex flex-wrap items-center gap-4 mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Agent Score (click to filter)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rotate-45 bg-gray-500" />
          <span className="text-xs text-gray-600">Section Average (click to show all)</span>
        </div>
        {selectedAgentId && (
          <div className="ml-auto flex items-center gap-2 px-2 py-1 bg-blue-50 rounded text-xs">
            <span className="text-blue-700">
              Filtering: {agents.find(a => a.id === selectedAgentId)?.name}
            </span>
            <button
              onClick={() => onSectionClick(data[0]?.sectionId || '', null)}
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              Clear
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
          {[1, 2, 3, 4, 5, 6, 7].map((score) => {
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
                <text x={-10} y={y + 4} textAnchor="end" className="text-xs fill-gray-400">
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

                return (
                  <g key={point.agentId}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? 8 : isSelected ? 7 : 5}
                      fill="#3b82f6"
                      stroke={isSelected ? '#1d4ed8' : 'white'}
                      strokeWidth={isSelected ? 3 : 2}
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
                          x={point.x - 70}
                          y={point.y - 50}
                          width="140"
                          height="40"
                          rx="6"
                          fill="#1f2937"
                          style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}
                        />
                        <text
                          x={point.x}
                          y={point.y - 32}
                          textAnchor="middle"
                          className="text-xs fill-white font-medium"
                        >
                          {point.agentName}
                        </text>
                        <text
                          x={point.x}
                          y={point.y - 18}
                          textAnchor="middle"
                          className="text-xs fill-gray-300"
                        >
                          Score: {point.score.toFixed(1)} / 7
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}

              {/* Average indicator (diamond) */}
              <polygon
                points={`${section.baseX},${section.avgY - 5} ${section.baseX + 5},${section.avgY} ${section.baseX},${section.avgY + 5} ${section.baseX - 5},${section.avgY}`}
                fill={getScoreColor(section.averageScore)}
                stroke="white"
                strokeWidth="2"
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

              {/* Average tooltip */}
              {hoveredPoint?.sectionIndex === sectionIdx &&
                hoveredPoint?.agentId === null && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={section.baseX - 60}
                      y={section.avgY - 50}
                      width="120"
                      height="40"
                      rx="6"
                      fill="#1f2937"
                      style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}
                    />
                    <text
                      x={section.baseX}
                      y={section.avgY - 32}
                      textAnchor="middle"
                      className="text-xs fill-white font-medium"
                    >
                      {section.sectionName}
                    </text>
                    <text
                      x={section.baseX}
                      y={section.avgY - 18}
                      textAnchor="middle"
                      className="text-xs fill-gray-300"
                    >
                      Average: {section.averageScore.toFixed(1)} / 7
                    </text>
                  </g>
                )}

              {/* X-axis label (section name) */}
              <text
                x={section.baseX}
                y={chartHeight + 18}
                textAnchor="middle"
                className="text-xs fill-gray-700 font-medium"
              >
                {section.sectionName.length > 14
                  ? section.sectionName.substring(0, 12) + '...'
                  : section.sectionName}
              </text>
              <text
                x={section.baseX}
                y={chartHeight + 32}
                textAnchor="middle"
                className="text-xs fill-gray-400"
              >
                §{section.sectionIndex + 1}
              </text>
            </g>
          ))}

          {/* Y-axis label */}
          <text
            x={-chartHeight / 2}
            y={-35}
            textAnchor="middle"
            transform="rotate(-90)"
            className="text-xs fill-gray-400"
          >
            Score (1-7)
          </text>
        </g>
      </svg>
    </div>
  )
}
