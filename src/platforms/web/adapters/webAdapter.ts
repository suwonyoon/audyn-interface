import type { PlatformAdapter } from '@core/platform'

/**
 * Web platform adapter using browser File API
 */
export function createWebAdapter(): PlatformAdapter {
  let currentFile: File | null = null

  return {
    platform: 'web',
    supportsCanvasEditing: true,
    supportsFileUpload: true,

    async loadDocument(): Promise<ArrayBuffer | null> {
      // Web platform uses file picker, not automatic loading
      // This is handled by WelcomeScreen component
      return null
    },

    async navigateToSlide(slideIndex: number): Promise<void> {
      // Web platform uses internal state management
      // This is handled by usePresentationStore.setCurrentSlide
      const { usePresentationStore } = await import('@core/stores')
      usePresentationStore.getState().setCurrentSlide(slideIndex)
    },

    async getDocumentName(): Promise<string> {
      return currentFile?.name || 'Untitled.pptx'
    },

    async refreshDocument(): Promise<ArrayBuffer | null> {
      // Web platform doesn't support refresh - user needs to re-upload
      return null
    },

    // Web-specific: store the file reference
    setCurrentFile(file: File) {
      currentFile = file
    },
  } as PlatformAdapter & { setCurrentFile: (file: File) => void }
}

export type WebAdapter = ReturnType<typeof createWebAdapter>
