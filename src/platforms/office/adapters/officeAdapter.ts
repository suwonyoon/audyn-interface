import type { PlatformAdapter } from '@core/platform'

/**
 * Office Add-in platform adapter using Office.js API
 */
export function createOfficeAdapter(): PlatformAdapter {
  return {
    platform: 'office',
    supportsCanvasEditing: false,
    supportsFileUpload: false,

    async loadDocument(): Promise<ArrayBuffer | null> {
      return getDocumentAsArrayBuffer()
    },

    async navigateToSlide(slideIndex: number): Promise<void> {
      await goToSlide(slideIndex)
    },

    async getDocumentName(): Promise<string> {
      return getActiveDocumentName()
    },

    async refreshDocument(): Promise<ArrayBuffer | null> {
      return getDocumentAsArrayBuffer()
    },
  }
}

/**
 * Get the active PowerPoint document as an ArrayBuffer
 */
async function getDocumentAsArrayBuffer(): Promise<ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    Office.context.document.getFileAsync(
      Office.FileType.Compressed,
      { sliceSize: 4194304 }, // 4MB slices
      async (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(new Error(result.error.message))
          return
        }

        const file = result.value
        const sliceCount = file.sliceCount
        const slices: Uint8Array[] = []

        try {
          for (let i = 0; i < sliceCount; i++) {
            const slice = await getSlice(file, i)
            slices.push(new Uint8Array(slice))
          }

          // Combine all slices into a single ArrayBuffer
          const totalLength = slices.reduce((sum, slice) => sum + slice.length, 0)
          const combined = new Uint8Array(totalLength)
          let offset = 0
          for (const slice of slices) {
            combined.set(slice, offset)
            offset += slice.length
          }

          file.closeAsync()
          resolve(combined.buffer)
        } catch (error) {
          file.closeAsync()
          reject(error)
        }
      }
    )
  })
}

/**
 * Get a single slice from the file
 */
function getSlice(file: Office.File, sliceIndex: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    file.getSliceAsync(sliceIndex, (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        reject(new Error(result.error.message))
        return
      }
      resolve(result.value.data as ArrayBuffer)
    })
  })
}

/**
 * Navigate to a specific slide in PowerPoint
 */
async function goToSlide(slideIndex: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // PowerPoint uses 1-based slide indices
    Office.context.document.goToByIdAsync(
      slideIndex + 1,
      Office.GoToType.Slide,
      (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(new Error(result.error.message))
          return
        }
        resolve()
      }
    )
  })
}

/**
 * Get the name of the active document
 */
function getActiveDocumentName(): string {
  // Office.js doesn't provide a direct way to get the document name
  // We'll use a placeholder and try to get it from the URL if available
  const url = Office.context.document.url
  if (url) {
    const parts = url.split('/')
    const fileName = parts[parts.length - 1]
    return decodeURIComponent(fileName).replace('.pptx', '')
  }
  return 'Presentation'
}

export type OfficeAdapter = ReturnType<typeof createOfficeAdapter>
