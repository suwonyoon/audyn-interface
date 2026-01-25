import { Textbox, Group, Rect } from 'fabric'
import type { TextElement } from '@/types'
import { generateId } from '@/lib/utils/xmlUtils'

export function createTextObject(element: TextElement): Textbox | Group {
  // Get text content - skip empty text boxes
  const fullText = element.content
    .flatMap((c) => c.paragraphs)
    .map((p) => p.runs.map((r) => r.text).join(''))
    .join('\n')
    .trim()

  // If no actual text content, return an invisible placeholder
  if (!fullText) {
    const emptyTextbox = new Textbox('', {
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      visible: false, // Hide empty text boxes
    })
    emptyTextbox.set('elementId' as keyof typeof emptyTextbox, element.id)
    emptyTextbox.set('elementType' as keyof typeof emptyTextbox, 'text')
    return emptyTextbox
  }

  // Get primary formatting from first run
  const firstParagraph = element.content[0]?.paragraphs[0]
  const firstRun = firstParagraph?.runs[0]
  const verticalAlign = element.textBoxProps?.verticalAlign || 'top'

  const textbox = new Textbox(fullText, {
    left: 0,
    top: 0,
    width: element.width,
    angle: 0,

    // Text properties
    fontFamily: firstRun?.fontFamily || 'Arial',
    fontSize: firstRun?.fontSize || 18,
    fill: firstRun?.color || '#000000',
    fontWeight: firstRun?.bold ? 'bold' : 'normal',
    fontStyle: firstRun?.italic ? 'italic' : 'normal',
    underline: firstRun?.underline || false,
    linethrough: firstRun?.strikethrough || false,

    // Text box properties
    textAlign: firstParagraph?.alignment || 'left',
    splitByGrapheme: true,

    // Editing properties
    editable: true,
    lockScalingFlip: true,
  })

  // Calculate vertical position based on alignment
  const textHeight = textbox.height || 0
  const containerHeight = element.height
  let textTop = 0

  switch (verticalAlign) {
    case 'middle':
      textTop = (containerHeight - textHeight) / 2
      break
    case 'bottom':
      textTop = containerHeight - textHeight
      break
    case 'top':
    default:
      textTop = 0
  }

  // If vertical alignment is needed, use a group with a bounding box
  if (verticalAlign !== 'top') {
    // Create invisible bounding rect to maintain element dimensions
    const boundingRect = new Rect({
      left: 0,
      top: 0,
      width: element.width,
      height: element.height,
      fill: 'transparent',
      stroke: 'transparent',
      selectable: false,
      evented: false,
    })

    textbox.set('top', textTop)

    const group = new Group([boundingRect, textbox], {
      left: element.x,
      top: element.y,
      angle: element.rotation,
      borderColor: '#2196F3',
      cornerColor: '#2196F3',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      subTargetCheck: true,
    })

    group.set('elementId' as keyof typeof group, element.id)
    group.set('elementType' as keyof typeof group, 'text')
    group.set('verticalAlign' as keyof typeof group, verticalAlign)

    return group
  }

  // Simple case: top alignment
  textbox.set('left', element.x)
  textbox.set('top', element.y)
  textbox.set('angle', element.rotation)
  textbox.set('borderColor', '#2196F3')
  textbox.set('cornerColor', '#2196F3')
  textbox.set('cornerStyle', 'circle')
  textbox.set('cornerSize', 8)
  textbox.set('transparentCorners', false)
  textbox.set('padding', 5)

  // Store element ID
  textbox.set('elementId' as keyof typeof textbox, element.id)
  textbox.set('elementType' as keyof typeof textbox, 'text')

  return textbox
}

export function fabricTextToElement(
  textbox: Textbox,
  existingElement?: TextElement
): TextElement {
  const text = textbox.text || ''

  return {
    id: existingElement?.id || generateId(),
    type: 'text',
    x: textbox.left || 0,
    y: textbox.top || 0,
    width: textbox.width || 200,
    height: textbox.height || 50,
    rotation: textbox.angle || 0,
    locked: textbox.lockMovementX || false,
    zIndex: existingElement?.zIndex || 0,
    content: [
      {
        paragraphs: [
          {
            runs: [
              {
                text,
                bold: textbox.fontWeight === 'bold',
                italic: textbox.fontStyle === 'italic',
                underline: textbox.underline || false,
                strikethrough: textbox.linethrough || false,
                fontFamily: (textbox.fontFamily as string) || 'Arial',
                fontSize: (textbox.fontSize as number) || 18,
                color: (textbox.fill as string) || '#000000',
              },
            ],
            alignment: (textbox.textAlign as 'left' | 'center' | 'right' | 'justify') || 'left',
            lineHeight: 1.2,
            spaceBefore: 0,
            spaceAfter: 0,
            indentLevel: 0,
          },
        ],
      },
    ],
    placeholder: existingElement?.placeholder,
    textBoxProps: existingElement?.textBoxProps || {
      verticalAlign: 'top',
      padding: { top: 5, right: 5, bottom: 5, left: 5 },
      autoFit: 'none',
      wordWrap: true,
      columns: 1,
    },
  }
}
