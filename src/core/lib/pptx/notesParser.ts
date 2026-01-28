import { XMLParser } from 'fast-xml-parser'
import { ensureArray } from '@core/lib/utils/xmlUtils'

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
})

/**
 * Parse speaker notes from a notesSlide XML file.
 * Notes are stored in ppt/notesSlides/notesSlideN.xml
 */
export function parseNotesSlide(notesXml: string): string {
  try {
    const data = xmlParser.parse(notesXml)
    const notesSld = data['p:notes']
    if (!notesSld) return ''

    const cSld = notesSld['p:cSld']
    if (!cSld) return ''

    const spTree = cSld['p:spTree']
    if (!spTree) return ''

    // Find the notes body placeholder (type="body")
    const shapes = ensureArray(spTree['p:sp'])
    const textParts: string[] = []

    for (const shape of shapes) {
      const nvSpPr = shape['p:nvSpPr']
      if (!nvSpPr) continue

      const nvPr = nvSpPr['p:nvPr']
      const placeholder = nvPr?.['p:ph']
      const placeholderType = placeholder?.['@_type']

      // Notes body is typically the placeholder with type="body"
      if (placeholderType === 'body') {
        const txBody = shape['p:txBody']
        if (txBody) {
          const text = extractTextFromTxBody(txBody)
          if (text) {
            textParts.push(text)
          }
        }
      }
    }

    return textParts.join('\n').trim()
  } catch {
    return ''
  }
}

/**
 * Extract all text content from a txBody element
 */
function extractTextFromTxBody(txBody: any): string {
  const paragraphs = ensureArray(txBody['a:p'])
  const lines: string[] = []

  for (const para of paragraphs) {
    const runs = ensureArray(para['a:r'])
    const paraText: string[] = []

    for (const run of runs) {
      const text = run['a:t']
      if (text) {
        // Handle both string and object with #text
        const textContent = typeof text === 'string' ? text : text['#text'] || ''
        paraText.push(textContent)
      }
    }

    // Also check for field text (like auto-generated slide numbers in notes)
    const fields = ensureArray(para['a:fld'])
    for (const field of fields) {
      const text = field['a:t']
      if (text) {
        const textContent = typeof text === 'string' ? text : text['#text'] || ''
        paraText.push(textContent)
      }
    }

    if (paraText.length > 0) {
      lines.push(paraText.join(''))
    }
  }

  return lines.join('\n')
}
