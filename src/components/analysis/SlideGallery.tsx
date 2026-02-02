import { useState } from 'react'
import type { Slide, SlideAnalysis, AnalysisComment } from '@core/types'
import { usePlatformOptional } from '@core/platform'
import {
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  ExternalLink,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'

interface SlideGalleryProps {
  slides: SlideAnalysis[]
  presentationSlides: Slide[]
  onGoToSlide: (slideIndex: number) => void
  onResolveComment: (commentId: string) => void
  onUnresolveComment: (commentId: string) => void
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-score-critical-light',
    borderColor: 'border-score-critical/30',
    accentColor: '#EF4444',
    textColor: 'text-score-critical',
    badgeColor: 'bg-score-critical',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-score-caution-light',
    borderColor: 'border-score-caution/30',
    accentColor: '#F59E0B',
    textColor: 'text-score-caution',
    badgeColor: 'bg-score-caution',
  },
  suggestion: {
    icon: Lightbulb,
    bgColor: 'bg-audyn-50',
    borderColor: 'border-audyn-200',
    accentColor: '#3B82F6',
    textColor: 'text-audyn-600',
    badgeColor: 'bg-audyn-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-ink-50',
    borderColor: 'border-ink-200',
    accentColor: '#78716C',
    textColor: 'text-ink-600',
    badgeColor: 'bg-ink-500',
  },
}

export function SlideGallery({
  slides,
  presentationSlides,
  onGoToSlide,
  onResolveComment,
  onUnresolveComment,
}: SlideGalleryProps) {
  const platform = usePlatformOptional()
  const isOffice = platform?.platform === 'office'

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    slides[0]?.slideId || null
  )

  const selectedSlide = slides.find((s) => s.slideId === selectedSlideId)

  return (
    <div className="space-y-4">
      {/* Slide Thumbnail Gallery - Contact Sheet Style */}
      <div className={`grid gap-3 ${
        isOffice
          ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
      }`}>
        {slides.map((slideAnalysis) => {
          const slide = presentationSlides.find(
            (s) => s.id === slideAnalysis.slideId
          )
          if (!slide) return null

          const commentCount = slideAnalysis.comments.length
          const unresolvedCount = slideAnalysis.comments.filter(
            (c) => !c.resolved
          ).length
          const isSelected = selectedSlideId === slideAnalysis.slideId

          return (
            <SlideThumbnailCard
              key={slideAnalysis.slideId}
              slide={slide}
              slideIndex={slideAnalysis.slideIndex}
              commentCount={commentCount}
              unresolvedCount={unresolvedCount}
              isSelected={isSelected}
              onClick={() => setSelectedSlideId(slideAnalysis.slideId)}
              onGoToSlide={() => onGoToSlide(slideAnalysis.slideIndex)}
            />
          )
        })}
      </div>

      {/* Selected Slide Comments Panel */}
      {selectedSlide && (
        <div className="card overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-ink-100 bg-gradient-to-r from-ink-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-audyn-100 flex items-center justify-center">
                <span className="score-value text-sm text-audyn-700">
                  {selectedSlide.slideIndex + 1}
                </span>
              </div>
              <div>
                <span className="font-medium text-ink-800">
                  Slide {selectedSlide.slideIndex + 1}
                </span>
                <span className="text-sm text-ink-500 ml-2">
                  {selectedSlide.comments.length} comment{selectedSlide.comments.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <button
              onClick={() => onGoToSlide(selectedSlide.slideIndex)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-audyn-600 hover:text-audyn-700 hover:bg-audyn-50 rounded-lg transition-colors duration-150"
            >
              <span className="font-medium">{isOffice ? 'Go to Slide' : 'Edit Slide'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Comments list */}
          {selectedSlide.comments.length > 0 ? (
            <div className="p-4 space-y-3">
              {selectedSlide.comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onResolve={() => onResolveComment(comment.id)}
                  onUnresolve={() => onUnresolveComment(comment.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-ink-400" />
              </div>
              <p className="text-ink-500 font-medium">No comments for this slide</p>
              <p className="text-ink-400 text-sm mt-1">This slide passed all checks</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SlideThumbnailCardProps {
  slide: Slide
  slideIndex: number
  commentCount: number
  unresolvedCount: number
  isSelected: boolean
  onClick: () => void
  onGoToSlide: () => void
}

function SlideThumbnailCard({
  slide,
  slideIndex,
  commentCount,
  unresolvedCount,
  isSelected,
  onClick,
}: SlideThumbnailCardProps) {
  const backgroundColor = slide.background.color || '#ffffff'

  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer rounded-xl overflow-hidden transition-all duration-200 ease-smooth
        thumbnail thumbnail-hover
        ${isSelected
          ? 'glow-ring-blue'
          : 'border-2 border-transparent hover:border-ink-200'
        }
      `}
    >
      {/* Thumbnail Preview */}
      <div
        className="aspect-video relative overflow-hidden"
        style={{ backgroundColor }}
      >
        {/* Inner shadow overlay */}
        <div className="absolute inset-0 shadow-inner-subtle pointer-events-none" />

        {/* Simplified slide preview */}
        <div className="absolute inset-0 p-1.5">
          {slide.elements.slice(0, 5).map((element) => {
            const scale = 0.12
            const left = element.x * scale
            const top = element.y * scale
            const width = Math.max(element.width * scale, 4)
            const height = Math.max(element.height * scale, 4)

            if (element.type === 'text') {
              return (
                <div
                  key={element.id}
                  className="absolute bg-ink-400/40 rounded-sm"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${Math.min(height, 8)}px`,
                  }}
                />
              )
            }

            if (element.type === 'shape') {
              return (
                <div
                  key={element.id}
                  className="absolute rounded-sm opacity-70"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    backgroundColor: element.fill.color || '#D6D3D1',
                  }}
                />
              )
            }

            if (element.type === 'image') {
              return (
                <div
                  key={element.id}
                  className="absolute bg-ink-300/60 rounded-sm"
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                />
              )
            }

            return null
          })}
        </div>

        {/* Comment count badge - pill shaped, overlapping corner */}
        {commentCount > 0 && (
          <div
            className={`
              absolute -top-1 -right-1 min-w-[24px] h-6 px-2
              rounded-full flex items-center justify-center
              text-xs font-semibold text-white shadow-lifted
              ${unresolvedCount > 0 ? 'bg-score-caution' : 'bg-score-success'}
            `}
          >
            {commentCount}
          </div>
        )}

        {/* Bottom bar with gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between px-2 pb-1.5">
          <span className="text-[10px] font-medium text-white/90">
            Slide {slideIndex + 1}
          </span>
          {isSelected && (
            <ChevronRight className="w-3 h-3 text-white/80" />
          )}
        </div>
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: AnalysisComment
  onResolve: () => void
  onUnresolve: () => void
}

function CommentItem({ comment, onResolve, onUnresolve }: CommentItemProps) {
  const config = severityConfig[comment.severity]
  const Icon = config.icon

  return (
    <div
      className={`
        relative rounded-xl border overflow-hidden transition-all duration-200 ease-smooth
        ${comment.resolved
          ? 'bg-ink-50 border-ink-200 opacity-60'
          : `${config.bgColor} ${config.borderColor}`
        }
      `}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: comment.resolved ? '#D6D3D1' : config.accentColor }}
      />

      <div className="p-4 pl-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                comment.resolved ? 'text-ink-400' : config.textColor
              }`}
            />
            <span
              className={`font-medium text-sm ${
                comment.resolved ? 'text-ink-500 line-through' : 'text-ink-800'
              }`}
            >
              {comment.title}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Agent name badge */}
            <span className="text-[10px] text-ink-500 bg-white/60 px-2 py-0.5 rounded-full">
              {comment.agentName}
            </span>

            {/* Resolve button */}
            <button
              onClick={comment.resolved ? onUnresolve : onResolve}
              className={`
                w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150
                ${comment.resolved
                  ? 'bg-score-success text-white hover:bg-score-success-dark'
                  : 'bg-white/80 text-ink-400 hover:text-score-success hover:bg-score-success-light'
                }
              `}
              title={comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        <p
          className={`text-sm leading-relaxed ${
            comment.resolved ? 'text-ink-400' : 'text-ink-600'
          }`}
        >
          {comment.description}
        </p>

        {/* Suggestion */}
        {comment.suggestion && !comment.resolved && (
          <div className="mt-3 p-2.5 bg-white/60 rounded-lg border border-audyn-100">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-audyn-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-audyn-700">
                {comment.suggestion}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
