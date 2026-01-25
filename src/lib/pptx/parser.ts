import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import type { Presentation, Slide, Theme, ThemeColors, ThemeFonts } from '@/types'
import { parseSlide } from './slideParser'
import { extractMedia } from './imageParser'
import { parseNotesSlide } from './notesParser'
import { emuToPixels } from '@/lib/utils/emuConversion'
import { generateId, ensureArray } from '@/lib/utils/xmlUtils'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
})

export async function parsePPTX(file: File): Promise<Presentation> {
  const zip = await JSZip.loadAsync(file)

  // 1. Parse presentation.xml to get slide references and dimensions
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('string')
  if (!presentationXml) {
    throw new Error('Invalid PPTX file: missing presentation.xml')
  }
  const presentationData = xmlParser.parse(presentationXml)

  // 2. Parse presentation relationships
  const presentationRels = await parseRelationships(zip, 'ppt/_rels/presentation.xml.rels')

  // 3. Extract media files
  const mediaMap = await extractMedia(zip)

  // 4. Parse theme
  const theme = await parseTheme(zip, presentationRels)

  // 5. Get slide references in order
  const slideRefs = getSlideReferences(presentationData, presentationRels)

  // 6. Parse each slide
  const slides: Slide[] = []
  for (let i = 0; i < slideRefs.length; i++) {
    const slideRef = slideRefs[i]
    const slideXml = await zip.file(`ppt/slides/${slideRef.file}`)?.async('string')
    if (!slideXml) continue

    const slideRelsPath = `ppt/slides/_rels/${slideRef.file}.rels`
    const slideRels = await parseRelationships(zip, slideRelsPath)

    // Extract speaker notes if available
    let notes = ''
    const notesTarget = findNotesRelationship(slideRels)
    if (notesTarget) {
      const notesFileName = notesTarget.split('/').pop()
      const notesPath = `ppt/notesSlides/${notesFileName}`
      const notesXml = await zip.file(notesPath)?.async('string')
      if (notesXml) {
        notes = parseNotesSlide(notesXml)
      }
    }

    const slide = await parseSlide(slideXml, slideRels, mediaMap, theme.colors, i, notes)
    slides.push(slide)
  }

  // 7. Parse slide dimensions
  const { width, height } = parseSlideDimensions(presentationData)

  // 8. Parse metadata
  const metadata = await parseMetadata(zip)

  return {
    id: generateId(),
    name: file.name.replace('.pptx', ''),
    slides,
    theme,
    slideWidth: emuToPixels(width),
    slideHeight: emuToPixels(height),
    metadata,
  }
}

async function parseRelationships(zip: JSZip, relsPath: string): Promise<Map<string, string>> {
  const relsMap = new Map<string, string>()

  const relsXml = await zip.file(relsPath)?.async('string')
  if (!relsXml) return relsMap

  const relsData = xmlParser.parse(relsXml)
  const relationships = relsData['Relationships']?.['Relationship']
  if (!relationships) return relsMap

  const relsList = ensureArray(relationships)
  for (const rel of relsList) {
    const id = rel['@_Id']
    const target = rel['@_Target']
    if (id && target) {
      relsMap.set(id, target)
    }
  }

  return relsMap
}

/**
 * Find the notesSlide relationship target in a slide's relationships
 */
function findNotesRelationship(slideRels: Map<string, string>): string | undefined {
  for (const [, target] of slideRels) {
    if (target.includes('notesSlide')) {
      return target
    }
  }
  return undefined
}

interface SlideRef {
  rId: string
  file: string
}

function getSlideReferences(
  presentationData: any,
  presentationRels: Map<string, string>
): SlideRef[] {
  const presentation = presentationData['p:presentation']
  const sldIdLst = presentation['p:sldIdLst']
  if (!sldIdLst) return []

  const sldIds = ensureArray(sldIdLst['p:sldId'])
  const slideRefs: SlideRef[] = []

  for (const sldId of sldIds) {
    const rId = sldId['@_r:id']
    const target = presentationRels.get(rId)
    if (target) {
      const file = target.split('/').pop()!
      slideRefs.push({ rId, file })
    }
  }

  return slideRefs
}

async function parseTheme(zip: JSZip, presentationRels: Map<string, string>): Promise<Theme> {
  // Find theme reference
  let themePath = ''
  for (const [, target] of presentationRels) {
    if (target.includes('theme')) {
      themePath = `ppt/${target.replace('../', '')}`
      break
    }
  }

  const defaultTheme: Theme = {
    name: 'Default',
    colors: getDefaultThemeColors(),
    fonts: { majorFont: 'Calibri', minorFont: 'Calibri' },
  }

  if (!themePath) return defaultTheme

  const themeXml = await zip.file(themePath)?.async('string')
  if (!themeXml) return defaultTheme

  const themeData = xmlParser.parse(themeXml)
  const theme = themeData['a:theme']
  if (!theme) return defaultTheme

  const themeElements = theme['a:themeElements']
  if (!themeElements) return defaultTheme

  // Parse colors
  const clrScheme = themeElements['a:clrScheme']
  const colors = clrScheme ? parseThemeColors(clrScheme) : getDefaultThemeColors()

  // Parse fonts
  const fontScheme = themeElements['a:fontScheme']
  const fonts = fontScheme ? parseThemeFonts(fontScheme) : { majorFont: 'Calibri', minorFont: 'Calibri' }

  return {
    name: theme['@_name'] || 'Theme',
    colors,
    fonts,
  }
}

function parseThemeColors(clrScheme: any): ThemeColors {
  const extractColor = (node: any): string => {
    if (!node) return '#000000'
    if (node['a:srgbClr']) return `#${node['a:srgbClr']['@_val']}`
    if (node['a:sysClr']) return `#${node['a:sysClr']['@_lastClr'] || '000000'}`
    return '#000000'
  }

  return {
    dk1: extractColor(clrScheme['a:dk1']),
    lt1: extractColor(clrScheme['a:lt1']),
    dk2: extractColor(clrScheme['a:dk2']),
    lt2: extractColor(clrScheme['a:lt2']),
    accent1: extractColor(clrScheme['a:accent1']),
    accent2: extractColor(clrScheme['a:accent2']),
    accent3: extractColor(clrScheme['a:accent3']),
    accent4: extractColor(clrScheme['a:accent4']),
    accent5: extractColor(clrScheme['a:accent5']),
    accent6: extractColor(clrScheme['a:accent6']),
    hlink: extractColor(clrScheme['a:hlink']),
    folHlink: extractColor(clrScheme['a:folHlink']),
  }
}

function parseThemeFonts(fontScheme: any): ThemeFonts {
  const majorFont = fontScheme['a:majorFont']?.['a:latin']?.['@_typeface'] || 'Calibri'
  const minorFont = fontScheme['a:minorFont']?.['a:latin']?.['@_typeface'] || 'Calibri'
  return { majorFont, minorFont }
}

function getDefaultThemeColors(): ThemeColors {
  return {
    dk1: '#000000',
    lt1: '#FFFFFF',
    dk2: '#44546A',
    lt2: '#E7E6E6',
    accent1: '#4472C4',
    accent2: '#ED7D31',
    accent3: '#A5A5A5',
    accent4: '#FFC000',
    accent5: '#5B9BD5',
    accent6: '#70AD47',
    hlink: '#0563C1',
    folHlink: '#954F72',
  }
}

function parseSlideDimensions(presentationData: any): { width: number; height: number } {
  const presentation = presentationData['p:presentation']
  const sldSz = presentation['p:sldSz']

  if (!sldSz) {
    // Default PowerPoint dimensions (10" x 7.5" at 914400 EMU per inch)
    return { width: 9144000, height: 6858000 }
  }

  return {
    width: parseInt(sldSz['@_cx'] || '9144000'),
    height: parseInt(sldSz['@_cy'] || '6858000'),
  }
}

async function parseMetadata(zip: JSZip): Promise<{ author: string; title: string; created: Date; modified: Date }> {
  const coreXml = await zip.file('docProps/core.xml')?.async('string')

  const defaultMetadata = {
    author: '',
    title: '',
    created: new Date(),
    modified: new Date(),
  }

  if (!coreXml) return defaultMetadata

  const coreData = xmlParser.parse(coreXml)
  const coreProps = coreData['cp:coreProperties']
  if (!coreProps) return defaultMetadata

  return {
    author: coreProps['dc:creator'] || '',
    title: coreProps['dc:title'] || '',
    created: coreProps['dcterms:created'] ? new Date(coreProps['dcterms:created']) : new Date(),
    modified: coreProps['dcterms:modified'] ? new Date(coreProps['dcterms:modified']) : new Date(),
  }
}
