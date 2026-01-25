import { create } from 'zustand'
import type { AppMode, PreparationStep } from '@/types'

interface ModeState {
  // Current application mode
  currentMode: AppMode
  previousMode: AppMode | null

  // Preparation stage step
  preparationStep: PreparationStep

  // Navigation actions
  setMode: (mode: AppMode) => void
  goToPreparation: () => void
  goToAnalysis: () => void
  goToEdit: () => void
  goBack: () => void

  // Preparation step navigation
  setPreparationStep: (step: PreparationStep) => void
  goToNextPreparationStep: () => void
  goToPreviousPreparationStep: () => void

  // Reset
  reset: () => void
}

export const useModeStore = create<ModeState>((set, get) => ({
  currentMode: 'preparation',
  previousMode: null,
  preparationStep: 'slides-review',

  setMode: (mode) => {
    const { currentMode } = get()
    set({
      currentMode: mode,
      previousMode: currentMode,
    })
  },

  goToPreparation: () => {
    const { currentMode } = get()
    set({
      currentMode: 'preparation',
      previousMode: currentMode,
      preparationStep: 'slides-review',
    })
  },

  goToAnalysis: () => {
    const { currentMode } = get()
    set({
      currentMode: 'analysis',
      previousMode: currentMode,
    })
  },

  goToEdit: () => {
    const { currentMode } = get()
    set({
      currentMode: 'edit',
      previousMode: currentMode,
    })
  },

  goBack: () => {
    const { previousMode } = get()
    if (previousMode) {
      set({
        currentMode: previousMode,
        previousMode: null,
      })
    }
  },

  setPreparationStep: (step) => {
    set({ preparationStep: step })
  },

  goToNextPreparationStep: () => {
    const { preparationStep } = get()
    if (preparationStep === 'slides-review') {
      set({ preparationStep: 'agent-config' })
    }
  },

  goToPreviousPreparationStep: () => {
    const { preparationStep } = get()
    if (preparationStep === 'agent-config') {
      set({ preparationStep: 'slides-review' })
    }
  },

  reset: () => {
    set({
      currentMode: 'preparation',
      previousMode: null,
      preparationStep: 'slides-review',
    })
  },
}))
