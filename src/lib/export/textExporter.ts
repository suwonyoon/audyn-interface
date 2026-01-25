import pptxgen from 'pptxgenjs'
import type { TextElement } from '@/types'
import { pixelsToInches } from '@/lib/utils/emuConversion'

// Sanitize color to ensure it's a valid 6-digit hex
function sanitizeColor(color: string): string {
  if (!color) return '000000'
  const cleaned = color.replace('#', '').toUpperCase()
  // Ensure it's 6 hex digits
  if (/^[0-9A-F]{6}$/.test(cleaned)) {
    return cleaned
  }
  // Try to expand 3-digit hex
  if (/^[0-9A-F]{3}$/.test(cleaned)) {
    return cleaned.split('').map(c => c + c).join('')
  }
  return '000000' // Default to black
}

// Sanitize text to remove invalid XML characters
function sanitizeText(text: string): string {
  if (!text) return ''
  // Remove control characters except tab, newline, carriage return
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

export function exportTextElement(slide: pptxgen.Slide, element: TextElement) {
  // Skip elements with no content or zero dimensions
  if (!element.content || element.content.length === 0) return
  if (element.width <= 0 || element.height <= 0) return

  // Check if there's any actual text content
  const hasText = element.content.some(c =>
    c.paragraphs.some(p =>
      p.runs.some(r => r.text && r.text.trim().length > 0)
    )
  )
  if (!hasText) return

  // Convert content to pptxgenjs format
  const textProps: pptxgen.TextProps[] = []

  for (const content of element.content) {
    for (let pIdx = 0; pIdx < content.paragraphs.length; pIdx++) {
      const paragraph = content.paragraphs[pIdx]

      for (const run of paragraph.runs) {
        const sanitizedText = sanitizeText(run.text)
        if (!sanitizedText) continue // Skip empty runs

        const fontSize = run.fontSize > 0 ? run.fontSize : 12 // Default font size

        const textOptions: pptxgen.TextPropsOptions = {
          bold: run.bold || false,
          italic: run.italic || false,
          fontFace: run.fontFamily || 'Arial',
          fontSize: fontSize,
          color: sanitizeColor(run.color),
        }

        // Only add underline if true
        if (run.underline) {
          textOptions.underline = { style: 'sng' }
        }

        // Only add strikethrough if true
        if (run.strikethrough) {
          textOptions.strike = 'sngStrike'
        }

        if (run.link && run.link.startsWith('http')) {
          textOptions.hyperlink = { url: run.link }
        }

        textProps.push({
          text: sanitizedText,
          options: textOptions,
        })
      }

      // Add paragraph break between paragraphs (not after the last one)
      if (pIdx < content.paragraphs.length - 1) {
        textProps.push({ text: '\n', options: {} })
      }
    }
  }

  // If no valid text content after sanitization, skip
  if (textProps.length === 0) return

  const alignment = element.content[0]?.paragraphs[0]?.alignment || 'left'
  const alignMap: Record<string, pptxgen.TextPropsOptions['align']> = {
    left: 'left',
    center: 'center',
    right: 'right',
    justify: 'justify',
  }

  const x = pixelsToInches(element.x)
  const y = pixelsToInches(element.y)
  const w = pixelsToInches(element.width)
  const h = pixelsToInches(element.height)

  // Ensure dimensions are valid
  if (w <= 0 || h <= 0) return

  slide.addText(textProps, {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: Math.max(0.1, w),
    h: Math.max(0.1, h),
    rotate: element.rotation || 0,
    align: alignMap[alignment] || 'left',
    valign: element.textBoxProps?.verticalAlign === 'middle' ? 'middle' :
            element.textBoxProps?.verticalAlign === 'bottom' ? 'bottom' : 'top',
    wrap: element.textBoxProps?.wordWrap !== false,
  })
}
