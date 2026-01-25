import { XMLParser } from 'fast-xml-parser'
import type { Slide, SlideElement, SlideBackground } from '@/types'
import type { ThemeColors } from '@/types'
import { parseShape } from './shapeParser'
import { parseImage, type MediaMap } from './imageParser'
import { parseColor } from '@/lib/utils/colorConversion'
import { ensureArray, generateId } from '@/lib/utils/xmlUtils'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
})

export async function parseSlide(
  slideXml: string,
  slideRels: Map<string, string>,
  mediaMap: MediaMap,
  themeColors: ThemeColors,
  slideIndex: number,
  notes: string = ''
): Promise<Slide> {
  const data = xmlParser.parse(slideXml)
  const slideData = data['p:sld']
  const cSld = slideData['p:cSld']
  const spTree = cSld['p:spTree']

  const elements: SlideElement[] = []

  // Parse shapes (includes text boxes)
  const shapes = ensureArray(spTree['p:sp'])
  for (const shape of shapes) {
    const element = parseShape(shape, themeColors)
    if (element) {
      element.zIndex = elements.length
      elements.push(element)
    }
  }

  // Parse pictures
  const pictures = ensureArray(spTree['p:pic'])
  for (const pic of pictures) {
    const element = parseImage(pic, slideRels, mediaMap)
    if (element) {
      element.zIndex = elements.length
      elements.push(element)
    }
  }

  // Parse group shapes (recursive)
  const groups = ensureArray(spTree['p:grpSp'])
  for (const grp of groups) {
    const groupElements = parseGroupShape(grp, slideRels, mediaMap, themeColors)
    for (const element of groupElements) {
      element.zIndex = elements.length
      elements.push(element)
    }
  }

  // Parse background
  const background = parseBackground(cSld['p:bg'], themeColors)

  // Extract layout ID if present
  const layoutId = extractLayoutId(slideRels)

  return {
    id: generateId(),
    index: slideIndex,
    layoutId,
    elements,
    background,
    notes,
  }
}

function parseGroupShape(
  grpData: any,
  slideRels: Map<string, string>,
  mediaMap: MediaMap,
  themeColors: ThemeColors
): SlideElement[] {
  const elements: SlideElement[] = []

  // Parse shapes within the group
  const shapes = ensureArray(grpData['p:sp'])
  for (const shape of shapes) {
    const element = parseShape(shape, themeColors)
    if (element) elements.push(element)
  }

  // Parse pictures within the group
  const pictures = ensureArray(grpData['p:pic'])
  for (const pic of pictures) {
    const element = parseImage(pic, slideRels, mediaMap)
    if (element) elements.push(element)
  }

  // Recursively parse nested groups
  const nestedGroups = ensureArray(grpData['p:grpSp'])
  for (const nestedGrp of nestedGroups) {
    const nestedElements = parseGroupShape(nestedGrp, slideRels, mediaMap, themeColors)
    elements.push(...nestedElements)
  }

  return elements
}

function parseBackground(bgData: any, themeColors: ThemeColors): SlideBackground {
  if (!bgData) {
    return { type: 'solid', color: '#FFFFFF' }
  }

  const bgPr = bgData['p:bgPr']
  if (!bgPr) {
    return { type: 'solid', color: '#FFFFFF' }
  }

  // Solid fill
  if (bgPr['a:solidFill']) {
    const color = parseColor(bgPr['a:solidFill'], themeColors)
    return { type: 'solid', color }
  }

  // Gradient fill
  if (bgPr['a:gradFill']) {
    const gradFill = bgPr['a:gradFill']
    const gsLst = gradFill['a:gsLst']?.['a:gs'] || []
    const stops = Array.isArray(gsLst) ? gsLst : [gsLst]

    return {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 0,
        stops: stops.map((gs: any) => ({
          offset: parseInt(gs['@_pos'] || '0') / 100000,
          color: parseColor(gs, themeColors),
        })),
      },
    }
  }

  // Image fill
  if (bgPr['a:blipFill']) {
    // Would need to extract image from blip reference
    return { type: 'solid', color: '#FFFFFF' }
  }

  return { type: 'solid', color: '#FFFFFF' }
}

function extractLayoutId(slideRels: Map<string, string>): string {
  for (const [, target] of slideRels) {
    if (target.includes('slideLayout')) {
      const match = target.match(/slideLayout(\d+)/)
      if (match) return match[1]
    }
  }
  return '1'
}
