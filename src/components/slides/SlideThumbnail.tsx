import type { Slide } from '@core/types'

interface SlideThumbnailProps {
  slide: Slide
  index: number
  isActive: boolean
  onClick: () => void
}

export function SlideThumbnail({ slide, index, isActive, onClick }: SlideThumbnailProps) {
  // Simple thumbnail representation
  const backgroundColor = slide.background.color || '#ffffff'

  return (
    <div
      onClick={onClick}
      className={`mb-2 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        isActive
          ? 'border-blue-500 shadow-md'
          : 'border-transparent hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-2 p-1">
        <span className="text-xs text-gray-500 w-4">{index + 1}</span>
        <div
          className="flex-1 aspect-video rounded border border-gray-200 relative overflow-hidden"
          style={{ backgroundColor }}
        >
          {/* Simplified slide preview */}
          <div className="absolute inset-0 p-1">
            {slide.elements.slice(0, 3).map((element) => {
              const scale = 0.15
              const left = element.x * scale
              const top = element.y * scale
              const width = Math.max(element.width * scale, 4)
              const height = Math.max(element.height * scale, 4)

              if (element.type === 'text') {
                return (
                  <div
                    key={element.id}
                    className="absolute bg-gray-300 rounded-sm"
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
                    className="absolute rounded-sm"
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
                    className="absolute bg-gray-400 rounded-sm"
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
        </div>
      </div>
    </div>
  )
}
