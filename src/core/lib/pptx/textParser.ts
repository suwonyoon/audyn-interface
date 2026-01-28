import type { TextContent, Paragraph, TextRun, TextAlignment, BulletType } from '@core/types'
import type { ThemeColors } from '@core/types'
import { parseColor } from '@core/lib/utils/colorConversion'
import { ensureArray, getTextContent } from '@core/lib/utils/xmlUtils'

export function parseTextBody(txBody: any, themeColors?: ThemeColors): TextContent[] {
  if (!txBody) return []

  const paragraphs: Paragraph[] = []
  const pNodes = ensureArray(txBody['a:p'])

  for (const pNode of pNodes) {
    const paragraph = parseParagraph(pNode, themeColors)
    paragraphs.push(paragraph)
  }

  return [{ paragraphs }]
}

function parseParagraph(pNode: any, themeColors?: ThemeColors): Paragraph {
  const runs: TextRun[] = []
  const pPr = pNode['a:pPr'] || {}

  // Parse text runs
  const rNodes = ensureArray(pNode['a:r'])
  for (const rNode of rNodes) {
    const run = parseTextRun(rNode, themeColors)
    runs.push(run)
  }

  // If no runs but has end paragraph properties, add empty run
  if (runs.length === 0) {
    const endParaRPr = pNode['a:endParaRPr']
    runs.push({
      text: '',
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      fontFamily: endParaRPr?.['a:latin']?.['@_typeface'] || 'Arial',
      fontSize: endParaRPr?.['@_sz'] ? parseInt(endParaRPr['@_sz']) / 100 : 18,
      color: '#000000',
    })
  }

  // Parse alignment
  const algn = pPr['@_algn'] || 'l'
  const alignment = parseAlignment(algn)

  // Parse bullet
  const bulletType = parseBulletType(pPr)

  // Parse indent level
  const lvl = parseInt(pPr['@_lvl'] || '0')

  return {
    runs,
    alignment,
    lineHeight: 1.2,
    spaceBefore: pPr['a:spcBef'] ? parseSpacing(pPr['a:spcBef']) : 0,
    spaceAfter: pPr['a:spcAft'] ? parseSpacing(pPr['a:spcAft']) : 0,
    bulletType,
    indentLevel: lvl,
  }
}

function parseTextRun(rNode: any, themeColors?: ThemeColors): TextRun {
  const rPr = rNode['a:rPr'] || {}
  const text = getTextContent(rNode['a:t'])

  // Parse font size (in hundredths of a point)
  const sz = rPr['@_sz']
  const fontSize = sz ? parseInt(sz) / 100 : 18

  // Parse font family
  const latin = rPr['a:latin']
  const fontFamily = latin?.['@_typeface'] || 'Arial'

  // Parse color
  let color = '#000000'
  if (rPr['a:solidFill']) {
    color = parseColor(rPr['a:solidFill'], themeColors)
  }

  // Parse formatting
  const bold = rPr['@_b'] === '1' || rPr['@_b'] === 'true'
  const italic = rPr['@_i'] === '1' || rPr['@_i'] === 'true'
  const underline = rPr['@_u'] !== undefined && rPr['@_u'] !== 'none'
  const strikethrough = rPr['@_strike'] === 'sngStrike' || rPr['@_strike'] === 'dblStrike'

  // Parse hyperlink
  const hlinkClick = rPr['a:hlinkClick']
  const link = hlinkClick?.['@_r:id'] // Will need to resolve from rels

  return {
    text,
    bold,
    italic,
    underline,
    strikethrough,
    fontFamily,
    fontSize,
    color,
    link,
  }
}

function parseAlignment(algn: string): TextAlignment {
  const map: Record<string, TextAlignment> = {
    l: 'left',
    ctr: 'center',
    r: 'right',
    just: 'justify',
  }
  return map[algn] || 'left'
}

function parseBulletType(pPr: any): BulletType {
  if (pPr['a:buNone']) return 'none'
  if (pPr['a:buChar']) return 'bullet'
  if (pPr['a:buAutoNum']) return 'number'
  return 'none'
}

function parseSpacing(spcNode: any): number {
  if (spcNode['a:spcPts']) {
    return parseInt(spcNode['a:spcPts']['@_val'] || '0') / 100
  }
  return 0
}
