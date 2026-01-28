import { useEffect } from 'react'
import { usePresentationStore, useHistoryStore } from '@core/stores'

export function useKeyboardShortcuts() {
  const {
    presentation,
    selectedElementIds,
    deleteSelectedElements,
    duplicateElement,
    currentSlideIndex,
    setCurrentSlide,
    setPresentation,
  } = usePresentationStore()

  const { pushState, undo, redo, canUndo, canRedo } = useHistoryStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0) {
          e.preventDefault()
          if (presentation) {
            pushState(presentation)
          }
          deleteSelectedElements()
        }
      }

      // Undo (Ctrl/Cmd + Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) {
          const prevState = undo()
          if (prevState) {
            setPresentation(prevState)
          }
        }
      }

      // Redo (Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedo()) {
          const nextState = redo()
          if (nextState) {
            setPresentation(nextState)
          }
        }
      }

      // Duplicate (Ctrl/Cmd + D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        if (selectedElementIds.length === 1 && presentation) {
          pushState(presentation)
          duplicateElement(selectedElementIds[0])
        }
      }

      // Navigate slides with arrow keys
      if (e.key === 'PageDown' || (e.key === 'ArrowDown' && e.altKey)) {
        e.preventDefault()
        if (presentation && currentSlideIndex < presentation.slides.length - 1) {
          setCurrentSlide(currentSlideIndex + 1)
        }
      }

      if (e.key === 'PageUp' || (e.key === 'ArrowUp' && e.altKey)) {
        e.preventDefault()
        if (currentSlideIndex > 0) {
          setCurrentSlide(currentSlideIndex - 1)
        }
      }

      // Select all (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        // Could implement select all elements on current slide
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    presentation,
    selectedElementIds,
    currentSlideIndex,
    deleteSelectedElements,
    duplicateElement,
    setCurrentSlide,
    setPresentation,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
  ])
}
