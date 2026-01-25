import { FabricImage } from 'fabric'
import type { ImageElement } from '@/types'
import { generateId } from '@/lib/utils/xmlUtils'

export async function createImageObject(element: ImageElement): Promise<FabricImage> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const fabricImage = new FabricImage(img, {
        left: element.x,
        top: element.y,
        angle: element.rotation,

        // Selection styling
        borderColor: '#2196F3',
        cornerColor: '#2196F3',
        cornerStyle: 'circle',
        cornerSize: 8,
        transparentCorners: false,
      })

      // Scale to match element dimensions
      const scaleX = element.width / img.width
      const scaleY = element.height / img.height
      fabricImage.scale(Math.min(scaleX, scaleY))

      // If we need exact dimensions, use scaleX and scaleY separately
      fabricImage.scaleX = scaleX
      fabricImage.scaleY = scaleY

      // Store element ID
      fabricImage.set('elementId' as keyof typeof fabricImage, element.id)
      fabricImage.set('elementType' as keyof typeof fabricImage, 'image')

      resolve(fabricImage)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    img.src = element.src
  })
}

export function fabricImageToElement(
  img: FabricImage,
  existingElement?: ImageElement
): ImageElement {
  const width = (img.width || 100) * (img.scaleX || 1)
  const height = (img.height || 100) * (img.scaleY || 1)

  return {
    id: existingElement?.id || generateId(),
    type: 'image',
    x: img.left || 0,
    y: img.top || 0,
    width,
    height,
    rotation: img.angle || 0,
    locked: img.lockMovementX || false,
    zIndex: existingElement?.zIndex || 0,
    src: existingElement?.src || '',
    originalSrc: existingElement?.originalSrc || '',
  }
}
