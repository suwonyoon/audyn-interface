import { Canvas, FabricObject, Textbox, FabricImage, Group } from 'fabric'
import type { Slide, SlideElement } from '@/types'
import { createTextObject, fabricTextToElement } from './textObject'
import { createShapeObject, fabricShapeToElement } from './shapeObject'
import { createImageObject, fabricImageToElement } from './imageObject'

export interface CanvasCallbacks {
  onSelectionChanged?: (elementIds: string[]) => void
  onObjectModified?: (elementId: string, updates: Partial<SlideElement>) => void
  onTextChanged?: (elementId: string, text: string) => void
}

export class SlideCanvas {
  private canvas: Canvas
  private slideWidth: number
  private slideHeight: number
  private scale: number = 1
  private callbacks: CanvasCallbacks = {}

  constructor(canvasElement: HTMLCanvasElement, width: number, height: number) {
    this.slideWidth = width
    this.slideHeight = height

    this.canvas = new Canvas(canvasElement, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Selection events
    this.canvas.on('selection:created', (e) => {
      const ids = e.selected?.map((obj) => obj.get('elementId' as keyof FabricObject) as string).filter(Boolean) || []
      this.callbacks.onSelectionChanged?.(ids)
    })

    this.canvas.on('selection:updated', (e) => {
      const ids = e.selected?.map((obj) => obj.get('elementId' as keyof FabricObject) as string).filter(Boolean) || []
      this.callbacks.onSelectionChanged?.(ids)
    })

    this.canvas.on('selection:cleared', () => {
      this.callbacks.onSelectionChanged?.([])
    })

    // Object modification events
    this.canvas.on('object:modified', (e) => {
      const obj = e.target
      if (!obj) return

      const elementId = obj.get('elementId' as keyof FabricObject) as string
      const elementType = obj.get('elementType' as keyof FabricObject) as string

      if (!elementId) return

      let updates: Partial<SlideElement>

      if (elementType === 'text') {
        // Handle both direct Textbox and Group (for vertically aligned text)
        let textbox: Textbox | undefined
        if (obj instanceof Group) {
          // Find the Textbox inside the Group
          textbox = obj.getObjects().find(o => o instanceof Textbox) as Textbox
        } else if (obj instanceof Textbox) {
          textbox = obj
        }

        if (textbox) {
          const textElement = fabricTextToElement(textbox)
          const { id, ...rest } = textElement
          // For Groups, preserve the group's position
          if (obj instanceof Group) {
            rest.x = obj.left || 0
            rest.y = obj.top || 0
            rest.rotation = obj.angle || 0
          }
          updates = rest
        } else {
          return
        }
      } else if (elementType === 'image') {
        const imageElement = fabricImageToElement(obj as FabricImage)
        const { id, ...rest } = imageElement
        updates = rest
      } else {
        const shapeElement = fabricShapeToElement(obj)
        const { id, ...rest } = shapeElement
        updates = rest
      }

      this.callbacks.onObjectModified?.(elementId, updates)
    })

    // Text editing events - capture when text editing exits to save changes
    this.canvas.on('text:editing:exited', (e) => {
      const obj = e.target as Textbox
      if (!obj) return

      // Get elementId from the object or its parent group (for vertically aligned text)
      let elementId = obj.get('elementId' as keyof FabricObject) as string
      if (!elementId && obj.group) {
        elementId = obj.group.get('elementId' as keyof FabricObject) as string
      }
      if (!elementId) return

      // Convert the textbox back to element data and trigger update
      const textElement = fabricTextToElement(obj)
      // Remove id to prevent overwriting the original element ID
      const { id, ...updates } = textElement
      this.callbacks.onObjectModified?.(elementId, updates)
    })

    // Also handle text:changed for real-time updates if needed
    this.canvas.on('text:changed', (e) => {
      const obj = e.target as Textbox
      const elementId = obj.get('elementId' as keyof FabricObject) as string
      if (elementId && obj.text !== undefined) {
        this.callbacks.onTextChanged?.(elementId, obj.text)
      }
    })
  }

  setCallbacks(callbacks: CanvasCallbacks) {
    this.callbacks = callbacks
  }

  async renderSlide(slide: Slide) {
    this.canvas.clear()

    // Set background
    this.renderBackground(slide.background)

    // Sort elements by zIndex and render
    const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex)

    for (const element of sortedElements) {
      await this.addElement(element)
    }

    this.canvas.renderAll()
  }

  private renderBackground(background: Slide['background']) {
    if (background.type === 'solid' && background.color) {
      this.canvas.backgroundColor = background.color
    } else if (background.type === 'gradient' && background.gradient) {
      // For simplicity, use the first color of the gradient
      const firstColor = background.gradient.stops[0]?.color || '#ffffff'
      this.canvas.backgroundColor = firstColor
    } else {
      this.canvas.backgroundColor = '#ffffff'
    }
  }

  async addElement(element: SlideElement): Promise<FabricObject | null> {
    let fabricObject: FabricObject | null = null

    try {
      switch (element.type) {
        case 'text':
          fabricObject = createTextObject(element)
          break
        case 'shape':
          fabricObject = createShapeObject(element)
          break
        case 'image':
          fabricObject = await createImageObject(element)
          break
      }

      if (fabricObject) {
        this.canvas.add(fabricObject)
      }
    } catch (error) {
      console.error('Failed to add element:', error)
    }

    return fabricObject
  }

  updateElement(elementId: string, updates: Partial<SlideElement>) {
    const obj = this.findObjectById(elementId)
    if (!obj) return

    if (updates.x !== undefined) obj.set('left', updates.x)
    if (updates.y !== undefined) obj.set('top', updates.y)
    if (updates.rotation !== undefined) obj.set('angle', updates.rotation)

    // Handle width/height based on object type
    if (updates.width !== undefined || updates.height !== undefined) {
      if (obj instanceof FabricImage) {
        const scaleX = (updates.width || obj.width || 100) / (obj.width || 100)
        const scaleY = (updates.height || obj.height || 100) / (obj.height || 100)
        obj.set({ scaleX, scaleY })
      } else {
        if (updates.width !== undefined) obj.set('width', updates.width)
        if (updates.height !== undefined) obj.set('height', updates.height)
      }
    }

    this.canvas.renderAll()
  }

  removeElement(elementId: string) {
    const obj = this.findObjectById(elementId)
    if (obj) {
      this.canvas.remove(obj)
      this.canvas.renderAll()
    }
  }

  private findObjectById(elementId: string): FabricObject | undefined {
    return this.canvas.getObjects().find(
      (obj) => obj.get('elementId' as keyof FabricObject) === elementId
    )
  }

  selectElement(elementId: string) {
    const obj = this.findObjectById(elementId)
    if (obj) {
      this.canvas.setActiveObject(obj)
      this.canvas.renderAll()
    }
  }

  selectElements(elementIds: string[]) {
    const objects = elementIds
      .map((id) => this.findObjectById(id))
      .filter((obj): obj is FabricObject => obj !== undefined)

    if (objects.length > 0) {
      if (objects.length === 1) {
        this.canvas.setActiveObject(objects[0])
      } else {
        // Create active selection for multiple objects
        const selection = new (require('fabric').ActiveSelection)(objects, {
          canvas: this.canvas,
        })
        this.canvas.setActiveObject(selection)
      }
      this.canvas.renderAll()
    }
  }

  deselectAll() {
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
  }

  deleteSelected(): string[] {
    const activeObjects = this.canvas.getActiveObjects()
    const deletedIds: string[] = []

    activeObjects.forEach((obj) => {
      const elementId = obj.get('elementId' as keyof FabricObject) as string
      if (elementId) deletedIds.push(elementId)
      this.canvas.remove(obj)
    })

    this.canvas.discardActiveObject()
    this.canvas.renderAll()

    return deletedIds
  }

  toDataURL(options?: { multiplier?: number }): string {
    return this.canvas.toDataURL({
      format: 'png',
      quality: 0.8,
      multiplier: options?.multiplier || 0.25,
    })
  }

  setZoom(scale: number) {
    this.scale = scale
    this.canvas.setZoom(scale)
    this.canvas.setDimensions({
      width: this.slideWidth * scale,
      height: this.slideHeight * scale,
    })
  }

  getZoom(): number {
    return this.scale
  }

  getCanvas(): Canvas {
    return this.canvas
  }

  /**
   * Commits all pending changes by exiting text editing mode and
   * triggering updates for all objects on the canvas
   */
  commitPendingChanges() {
    // Exit any active text editing
    const activeObject = this.canvas.getActiveObject()
    if (activeObject && activeObject instanceof Textbox && (activeObject as any).isEditing) {
      (activeObject as any).exitEditing()
    }

    // Deselect to ensure all modifications are finalized
    this.canvas.discardActiveObject()
    this.canvas.renderAll()

    // Trigger update for all objects to ensure store is in sync
    const objects = this.canvas.getObjects()
    for (const obj of objects) {
      const elementId = obj.get('elementId' as keyof FabricObject) as string
      const elementType = obj.get('elementType' as keyof FabricObject) as string

      if (!elementId) continue

      let updates: Partial<SlideElement>

      if (elementType === 'text') {
        let textbox: Textbox | undefined
        if (obj instanceof Group) {
          textbox = obj.getObjects().find(o => o instanceof Textbox) as Textbox
        } else if (obj instanceof Textbox) {
          textbox = obj
        }

        if (textbox) {
          const textElement = fabricTextToElement(textbox)
          const { id, ...rest } = textElement
          if (obj instanceof Group) {
            rest.x = obj.left || 0
            rest.y = obj.top || 0
            rest.rotation = obj.angle || 0
          }
          updates = rest
        } else {
          continue
        }
      } else if (elementType === 'image') {
        const imageElement = fabricImageToElement(obj as FabricImage)
        const { id, ...rest } = imageElement
        updates = rest
      } else {
        const shapeElement = fabricShapeToElement(obj)
        const { id, ...rest } = shapeElement
        updates = rest
      }

      this.callbacks.onObjectModified?.(elementId, updates)
    }
  }

  dispose() {
    this.canvas.dispose()
  }
}
