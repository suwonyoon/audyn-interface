import type { Slide, APIKeyConfig, TextElement, ShapeElement, ImageElement } from '@core/types'

/**
 * Render a slide to a base64 PNG image using a temporary canvas
 */
export async function renderSlideToImage(
  slide: Slide,
  slideWidth: number,
  slideHeight: number,
  scale: number = 0.5 // Scale down for API efficiency
): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  const width = slideWidth * scale
  const height = slideHeight * scale
  canvas.width = width
  canvas.height = height

  // Draw background
  ctx.fillStyle = slide.background?.color || '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Sort elements by z-order (or just render in order)
  const elements = [...slide.elements]

  // Draw each element
  for (const element of elements) {
    const x = element.x * scale
    const y = element.y * scale
    const w = element.width * scale
    const h = element.height * scale

    ctx.save()

    // Apply rotation if present
    if (element.rotation) {
      ctx.translate(x + w / 2, y + h / 2)
      ctx.rotate((element.rotation * Math.PI) / 180)
      ctx.translate(-(x + w / 2), -(y + h / 2))
    }

    if (element.type === 'text') {
      const textEl = element as TextElement
      // Draw text box background (light gray to show text area)
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(x, y, w, h)

      // Draw text content
      ctx.fillStyle = '#333333'
      ctx.font = `${14 * scale}px Arial`

      const textContent = textEl.content
        .flatMap(c => c.paragraphs)
        .flatMap(p => p.runs)
        .map(r => r.text)
        .join(' ')
        .trim()

      // Simple text wrapping
      const words = textContent.split(' ')
      let line = ''
      let lineY = y + 16 * scale
      const maxWidth = w - 8 * scale

      for (const word of words) {
        const testLine = line + word + ' '
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, x + 4 * scale, lineY)
          line = word + ' '
          lineY += 18 * scale
          if (lineY > y + h - 4 * scale) break
        } else {
          line = testLine
        }
      }
      if (lineY <= y + h - 4 * scale) {
        ctx.fillText(line, x + 4 * scale, lineY)
      }
    } else if (element.type === 'shape') {
      const shapeEl = element as ShapeElement
      ctx.fillStyle = shapeEl.fill?.color || '#cccccc'
      ctx.strokeStyle = shapeEl.stroke?.color || '#999999'
      ctx.lineWidth = (shapeEl.stroke?.width || 1) * scale

      // Draw shape based on type
      switch (shapeEl.shapeType) {
        case 'ellipse':
          ctx.beginPath()
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          break
        case 'triangle':
          ctx.beginPath()
          ctx.moveTo(x + w / 2, y)
          ctx.lineTo(x + w, y + h)
          ctx.lineTo(x, y + h)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          break
        case 'line':
          ctx.beginPath()
          ctx.moveTo(x, y + h / 2)
          ctx.lineTo(x + w, y + h / 2)
          ctx.stroke()
          break
        case 'arrow':
          ctx.beginPath()
          ctx.moveTo(x, y + h / 2)
          ctx.lineTo(x + w - 10 * scale, y + h / 2)
          ctx.lineTo(x + w - 10 * scale, y + h / 4)
          ctx.lineTo(x + w, y + h / 2)
          ctx.lineTo(x + w - 10 * scale, y + 3 * h / 4)
          ctx.lineTo(x + w - 10 * scale, y + h / 2)
          ctx.stroke()
          break
        default: // rectangle
          ctx.fillRect(x, y, w, h)
          ctx.strokeRect(x, y, w, h)
      }

      // Draw shape text if present
      if (shapeEl.text) {
        const shapeText = shapeEl.text
          .flatMap(c => c.paragraphs)
          .flatMap(p => p.runs)
          .map(r => r.text)
          .join(' ')
          .trim()

        if (shapeText) {
          ctx.fillStyle = '#333333'
          ctx.font = `${12 * scale}px Arial`
          ctx.textAlign = 'center'
          ctx.fillText(shapeText, x + w / 2, y + h / 2 + 4 * scale, w - 8 * scale)
          ctx.textAlign = 'left'
        }
      }
    } else if (element.type === 'image') {
      const imgEl = element as ImageElement
      // Draw placeholder for image
      ctx.fillStyle = '#e0e0e0'
      ctx.fillRect(x, y, w, h)

      // Try to draw the actual image
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, x, y, w, h)
            resolve()
          }
          img.onerror = () => {
            // Draw placeholder text on error
            ctx.fillStyle = '#999999'
            ctx.font = `${10 * scale}px Arial`
            ctx.textAlign = 'center'
            ctx.fillText('[Image]', x + w / 2, y + h / 2)
            ctx.textAlign = 'left'
            resolve() // Don't reject, just use placeholder
          }
          img.src = imgEl.src
        })
      } catch {
        // Silently handle image load errors
      }
    }

    ctx.restore()
  }

  // Return as base64 PNG (without the data URL prefix for API)
  const dataUrl = canvas.toDataURL('image/png', 0.8)
  return dataUrl.split(',')[1] // Return just the base64 part
}

/**
 * Generate a visual description of a slide using OpenAI's vision API
 */
export async function generateVisualDescription(
  slideImageBase64: string,
  apiConfig: APIKeyConfig,
  existingText?: string
): Promise<string> {
  if (apiConfig.provider !== 'openai') {
    throw new Error('Visual description generation requires OpenAI API. Please configure an OpenAI API key.')
  }

  const prompt = `Analyze this presentation slide image and describe ONLY the visual elements (not the text content, which is already known).

Focus on:
- Images: What do they show? What's their purpose?
- Charts/Graphs: What type? What data do they represent?
- Diagrams: What do they illustrate? How are they structured?
- Icons: What do they represent?
- Shapes: What visual role do they play in the layout?
- Visual hierarchy and design elements

${existingText ? `\nFor context, the text on this slide says: "${existingText.substring(0, 500)}"` : ''}

Provide a concise description (2-4 sentences) focusing on what the visuals communicate that the text alone cannot convey. If the slide has no meaningful visual elements beyond text, say "No significant visual elements."
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Vision-capable model
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${slideImageBase64}`,
                detail: 'low', // Use low detail for faster/cheaper processing
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API request failed: ${response.status}`)
  }

  const data = await response.json()

  // Extract content from response
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No content in API response')
  }

  return content.trim()
}
