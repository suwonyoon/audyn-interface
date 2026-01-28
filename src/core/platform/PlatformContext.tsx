import { createContext, useContext, type ReactNode } from 'react'

/**
 * Platform adapter interface - abstracts platform-specific operations
 */
export interface PlatformAdapter {
  /** Platform identifier */
  platform: 'web' | 'office'

  /** Whether the platform supports canvas editing */
  supportsCanvasEditing: boolean

  /** Whether the platform supports file upload */
  supportsFileUpload: boolean

  /** Load presentation from the platform's document source */
  loadDocument: () => Promise<ArrayBuffer | null>

  /** Navigate to a specific slide (platform-specific implementation) */
  navigateToSlide: (slideIndex: number) => Promise<void>

  /** Get the current document name */
  getDocumentName: () => Promise<string>

  /** Refresh/reload the document (for Office add-in after user edits) */
  refreshDocument: () => Promise<ArrayBuffer | null>
}

const PlatformContext = createContext<PlatformAdapter | null>(null)

export interface PlatformProviderProps {
  adapter: PlatformAdapter
  children: ReactNode
}

export function PlatformProvider({ adapter, children }: PlatformProviderProps) {
  return (
    <PlatformContext.Provider value={adapter}>
      {children}
    </PlatformContext.Provider>
  )
}

export function usePlatform(): PlatformAdapter {
  const context = useContext(PlatformContext)
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider')
  }
  return context
}

export function usePlatformOptional(): PlatformAdapter | null {
  return useContext(PlatformContext)
}
