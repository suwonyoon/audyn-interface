import pptxgen from 'pptxgenjs'
import type { Presentation } from '@core/types'
import { exportSlide } from './slideExporter'
import { pixelsToInches } from '@core/lib/utils/emuConversion'

export async function exportToPPTX(presentation: Presentation): Promise<Blob> {
  const pptx = new pptxgen()

  // Set presentation properties
  pptx.author = presentation.metadata.author || 'PowerPoint Editor'
  pptx.title = presentation.metadata.title || presentation.name
  pptx.subject = presentation.name

  // Set slide dimensions (pptxgenjs uses inches)
  pptx.defineLayout({
    name: 'CUSTOM',
    width: pixelsToInches(presentation.slideWidth),
    height: pixelsToInches(presentation.slideHeight),
  })
  pptx.layout = 'CUSTOM'

  // Export each slide
  for (const slide of presentation.slides) {
    const pptxSlide = pptx.addSlide()
    await exportSlide(pptxSlide, slide)
  }

  // Generate file
  const data = await pptx.write({ outputType: 'blob' })
  return data as Blob
}

export function downloadPPTX(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.pptx') ? fileName : `${fileName}.pptx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
