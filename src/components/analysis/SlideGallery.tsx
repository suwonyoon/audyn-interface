import { useState } from 'react'
import type { Slide, SlideAnalysis, AnalysisComment } from '@/types'
import {
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  ExternalLink,
  MessageSquare,
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
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    accentColor: 'bg-red-400',
    textColor: 'text-red-700',
    badgeColor: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    accentColor: 'bg-orange-400',
    textColor: 'text-orange-700',
    badgeColor: 'bg-orange-500',
  },
  suggestion: {
    icon: Lightbulb,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'bg-blue-400',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    accentColor: 'bg-gray-400',
    textColor: 'text-gray-700',
    badgeColor: 'bg-gray-500',
  },
}

export function SlideGallery({
  slides,
  presentationSlides,
  onGoToSlide,
  onResolveComment,
  onUnresolveComment,
}: SlideGalleryProps) {
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(
    slides[0]?.slideId || null
  )

  const selectedSlide = slides.find((s) => s.slideId === selectedSlideId)

  return (
    <div className="space-y-4">
      {/* Slide Thumbnail Gallery */}
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-6">
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
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                Slide {selectedSlide.slideIndex + 1}
              </span>
              <span className="text-sm text-gray-500">
                {selectedSlide.comments.length} comment
                {selectedSlide.comments.length !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => onGoToSlide(selectedSlide.slideIndex)}
              className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Edit Slide
            </button>
          </div>

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
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No comments for this slide</p>
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
      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 shadow-md'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Thumbnail Preview */}
      <div
        className="aspect-video relative overflow-hidden"
        style={{ backgroundColor }}
      >
        {/* Simplified slide preview */}
        <div className="absolute inset-0 p-1">
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
                  className="absolute bg-gray-300/60 rounded-sm"
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
                    backgroundColor: element.fill.color || '#cccccc',
                  }}
                />
              )
            }

            if (element.type === 'image') {
              return (
                <div
                  key={element.id}
                  className="absolute bg-gray-400/60 rounded-sm"
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

        {/* Comment count badge */}
        {commentCount > 0 && (
          <div
            className={`absolute top-1 right-1 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-medium text-white ${
              unresolvedCount > 0 ? 'bg-orange-500' : 'bg-green-500'
            }`}
          >
            {commentCount}
          </div>
        )}
      </div>

      {/* Slide number */}
      <div className="px-2 py-1.5 bg-gray-50 border-t">
        <span className="text-xs font-medium text-gray-600">
          Slide {slideIndex + 1}
        </span>
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
      className={`flex gap-3 p-3 rounded-lg border ${
        comment.resolved
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : `${config.bgColor} ${config.borderColor}`
      }`}
    >
      <div
        className={`w-1 rounded-full ${
          comment.resolved ? 'bg-gray-300' : config.accentColor
        }`}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon
              className={`w-4 h-4 ${
                comment.resolved ? 'text-gray-400' : config.textColor
              }`}
            />
            <span
              className={`text-sm font-medium ${
                comment.resolved ? 'text-gray-500 line-through' : 'text-gray-900'
              }`}
            >
              {comment.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{comment.agentName}</span>
            <button
              onClick={comment.resolved ? onUnresolve : onResolve}
              className={`p-1 rounded transition-colors ${
                comment.resolved
                  ? 'text-green-600 bg-green-100 hover:bg-green-200'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              }`}
              title={comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p
          className={`text-sm ${
            comment.resolved ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {comment.description}
        </p>
        {comment.suggestion && !comment.resolved && (
          <p className="text-sm text-blue-600 mt-2">
            <span className="font-medium">Suggestion:</span> {comment.suggestion}
          </p>
        )}
      </div>
    </div>
  )
}
