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

function getScoreColor(score: number): { bg: string; text: string } {
  if (score <= 3) return { bg: 'bg-red-100', text: 'text-red-700' }
  if (score <= 5) return { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  return { bg: 'bg-green-100', text: 'text-green-700' }
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
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      style={{ scrollbarWidth: 'thin' }}
    >
      {sections.map((section, index) => {
        const isSelected = section.sectionId === selectedSectionId
        const changeStatus = sectionChangeStatus?.get(section.sectionId)
        const score = sectionScores?.get(section.sectionId)

        // Determine border color based on change status
        let borderClass = 'border-gray-200'
        let leftBorderClass = ''
        if (changeStatus === 'changed') {
          leftBorderClass = 'border-l-4 border-l-yellow-400'
        } else if (changeStatus === 'new') {
          leftBorderClass = 'border-l-4 border-l-blue-400'
        }

        const scoreColors = score !== undefined ? getScoreColor(score) : null

        return (
          <button
            key={section.sectionId}
            ref={isSelected ? selectedRef : null}
            onClick={() => onSelectSection(section.sectionId)}
            className={`
              flex-shrink-0 flex flex-col items-start p-2 rounded-lg border transition-all
              min-w-[70px] max-w-[90px]
              ${leftBorderClass}
              ${isSelected
                ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
                : `bg-white ${borderClass} hover:border-gray-300 hover:bg-gray-50`
              }
            `}
          >
            {/* Section number */}
            <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
              §{index + 1}
            </span>

            {/* Section name (truncated) */}
            <span
              className={`text-xs font-medium truncate w-full text-left ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}
              title={section.sectionName}
            >
              {section.sectionName.length > 10
                ? section.sectionName.substring(0, 8) + '...'
                : section.sectionName}
            </span>

            {/* Score badge or comment count */}
            <div className="flex items-center gap-1 mt-1">
              {scoreColors && score !== undefined ? (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${scoreColors.bg} ${scoreColors.text}`}>
                  {score.toFixed(1)}
                </span>
              ) : (
                <span className="text-[10px] text-gray-500">
                  {section.commentCount.total} comment{section.commentCount.total !== 1 ? 's' : ''}
                </span>
              )}

              {/* Change indicator dot */}
              {changeStatus === 'changed' && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Changed since last analysis" />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
