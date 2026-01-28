import { useEffect, useRef, useState, useCallback } from 'react'
import { usePresentationStore } from '@core/stores'
import { SlideCanvas } from '@core/lib/canvas'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'

export function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const slideCanvasRef = useRef<SlideCanvas | null>(null)

  const {
    presentation,
    currentSlideIndex,
    updateElement,
    selectElements,
    deselectAll,
    setCommitCanvasChanges,
  } = usePresentationStore()

  const [zoom, setZoom] = useState(1)

  const currentSlide = presentation?.slides[currentSlideIndex]

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !presentation) return

    slideCanvasRef.current = new SlideCanvas(
      canvasRef.current,
      presentation.slideWidth,
      presentation.slideHeight
    )

    slideCanvasRef.current.setCallbacks({
      onSelectionChanged: (ids) => {
        if (ids.length === 0) {
          deselectAll()
        } else {
          selectElements(ids)
        }
      },
      onObjectModified: (elementId, updates) => {
        updateElement(elementId, updates)
      },
    })

    // Register commit function with the store
    setCommitCanvasChanges(() => {
      slideCanvasRef.current?.commitPendingChanges()
    })

    return () => {
      setCommitCanvasChanges(null)
      slideCanvasRef.current?.dispose()
      slideCanvasRef.current = null
    }
  }, [presentation?.id, setCommitCanvasChanges])

  // Render slide when it changes
  useEffect(() => {
    if (currentSlide && slideCanvasRef.current) {
      slideCanvasRef.current.renderSlide(currentSlide)
    }
  }, [currentSlide])

  // Calculate zoom to fit on mount and resize
  useEffect(() => {
    const calculateFitZoom = () => {
      if (!containerRef.current || !presentation) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const padding = 60
      const availableWidth = containerRect.width - padding * 2
      const availableHeight = containerRect.height - padding * 2

      const scaleX = availableWidth / presentation.slideWidth
      const scaleY = availableHeight / presentation.slideHeight
      const fitZoom = Math.min(scaleX, scaleY, 1)

      setZoom(fitZoom)
      slideCanvasRef.current?.setZoom(fitZoom)
    }

    calculateFitZoom()

    const resizeObserver = new ResizeObserver(calculateFitZoom)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [presentation?.slideWidth, presentation?.slideHeight])

  // Update zoom when changed
  useEffect(() => {
    slideCanvasRef.current?.setZoom(zoom)
  }, [zoom])

  const handleZoomIn = () => setZoom((z) => Math.min(2, z + 0.1))
  const handleZoomOut = () => setZoom((z) => Math.max(0.25, z - 0.1))
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !presentation) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const padding = 60
    const availableWidth = containerRect.width - padding * 2
    const availableHeight = containerRect.height - padding * 2

    const scaleX = availableWidth / presentation.slideWidth
    const scaleY = availableHeight / presentation.slideHeight
    const fitZoom = Math.min(scaleX, scaleY, 1)

    setZoom(fitZoom)
  }, [presentation])

  if (!presentation) return null

  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-white rounded-lg shadow px-2 py-1 z-10">
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-gray-100 rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button
          onClick={handleFitToScreen}
          className="p-1 hover:bg-gray-100 rounded"
          title="Fit to Screen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas Container */}
      <div
        className="shadow-2xl"
        style={{
          width: presentation.slideWidth * zoom,
          height: presentation.slideHeight * zoom,
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
