import { useRef, useEffect } from 'react'
import type { SectionAnalysis } from '@core/types'

export type SectionChangeStatus = 'unchanged' | 'changed' | 'new'

interface SectionBlockSelectorProps {
  sections: SectionAnalysis[]
  selectedSectionId: string | null
  onSelectSection: (sectionId: string) => void
  sectionChangeStatus?: Map<string, SectionChangeStatus>
  sectionScores?: Map<string, number>
}

function getScoreColor(score: number): { bg: string; text: string; fill: string } {
  if (score <= 3) return { bg: 'bg-score-critical-light', text: 'text-score-critical', fill: '#EF4444' }
  if (score <= 5) return { bg: 'bg-score-caution-light', text: 'text-score-caution', fill: '#F59E0B' }
  return { bg: 'bg-score-success-light', text: 'text-score-success', fill: '#22C55E' }
}

export function SectionBlockSelector({
  sections,
  selectedSectionId,
  onSelectSection,
  sectionChangeStatus,
  sectionScores,
}: SectionBlockSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Scroll selected section into view
  useEffect(() => {
    if (selectedRef.current && containerRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [selectedSectionId])

  if (sections.length === 0) {
    return null
  }

  return (
    <div className="relative">
      {/* Fade edges for scroll indication */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-ink-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-ink-50 to-transparent z-10 pointer-events-none" />

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-thin"
        style={{ scrollbarWidth: 'thin' }}
      >
        {sections.map((section, index) => {
          const isSelected = section.sectionId === selectedSectionId
          const changeStatus = sectionChangeStatus?.get(section.sectionId)
          const score = sectionScores?.get(section.sectionId)

          const scoreColors = score !== undefined ? getScoreColor(score) : null

          // Determine if there's a change indicator
          const hasChange = changeStatus === 'changed' || changeStatus === 'new'

          return (
            <button
              key={section.sectionId}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelectSection(section.sectionId)}
              className={`
                relative flex-shrink-0 flex items-center gap-2
                rounded-full px-4 py-2 transition-all duration-200 ease-smooth
                ${isSelected
                  ? 'bg-audyn-600 text-white shadow-glow-blue'
                  : 'bg-white border border-ink-200 text-ink-700 hover:border-ink-300 hover:shadow-card'
                }
                ${hasChange && !isSelected ? 'ring-2 ring-offset-1 ring-score-caution' : ''}
              `}
            >
              {/* Section number */}
              <span
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold
                  ${isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-ink-100 text-ink-500'
                  }
                `}
              >
                {index + 1}
              </span>

              {/* Section name */}
              <span
                className={`text-sm font-medium truncate max-w-[80px] ${isSelected ? 'text-white' : 'text-ink-700'}`}
                title={section.sectionName}
              >
                {section.sectionName.length > 10
                  ? section.sectionName.substring(0, 8) + '...'
                  : section.sectionName}
              </span>

              {/* Score badge */}
              {scoreColors && score !== undefined && (
                <span
                  className={`
                    score-value text-[11px] px-1.5 py-0.5 rounded-full
                    ${isSelected
                      ? 'bg-white/20 text-white'
                      : `${scoreColors.bg} ${scoreColors.text}`
                    }
                  `}
                >
                  {score.toFixed(1)}
                </span>
              )}

              {/* Comment count (if no score) */}
              {!score && section.commentCount.total > 0 && (
                <span
                  className={`
                    text-[10px] px-1.5 py-0.5 rounded-full
                    ${isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-ink-100 text-ink-500'
                    }
                  `}
                >
                  {section.commentCount.total}
                </span>
              )}

              {/* Change indicator dot with pulse */}
              {hasChange && (
                <span
                  className={`
                    absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full
                    ${changeStatus === 'changed' ? 'bg-score-caution' : 'bg-audyn-500'}
                    ${!isSelected ? 'animate-pulse-glow' : ''}
                  `}
                  title={changeStatus === 'changed' ? 'Changed since last analysis' : 'New section'}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
