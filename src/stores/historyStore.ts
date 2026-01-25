import { create } from 'zustand'
import type { Presentation } from '@/types'

interface HistoryState {
  past: string[] // JSON snapshots
  future: string[]
  maxHistory: number

  pushState: (presentation: Presentation) => void
  undo: () => Presentation | null
  redo: () => Presentation | null
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  maxHistory: 50,

  pushState: (presentation) => {
    const { past, maxHistory } = get()
    const snapshot = JSON.stringify(presentation)

    // Don't push if it's the same as the last state
    if (past.length > 0 && past[past.length - 1] === snapshot) {
      return
    }

    const newPast = [...past, snapshot]
    if (newPast.length > maxHistory) {
      newPast.shift()
    }

    set({ past: newPast, future: [] })
  },

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null

    const newPast = [...past]
    const current = newPast.pop()!
    const previous = newPast[newPast.length - 1]

    if (!previous) return null

    set({
      past: newPast,
      future: [current, ...future],
    })

    return JSON.parse(previous)
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const newFuture = [...future]
    const next = newFuture.shift()!

    set({
      past: [...past, next],
      future: newFuture,
    })

    return JSON.parse(next)
  },

  canUndo: () => get().past.length > 1,
  canRedo: () => get().future.length > 0,

  clear: () => {
    set({ past: [], future: [] })
  },
}))
