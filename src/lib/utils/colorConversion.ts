import type { ThemeColors } from '@/types'

// Convert various PPTX color formats to hex
export function parseColor(colorNode: any, theme?: ThemeColors): string {
  if (!colorNode) return '#000000'

  // Solid RGB color (a:srgbClr)
  if (colorNode['a:srgbClr']) {
    const val = colorNode['a:srgbClr']['@_val']
    return `#${val}`
  }

  // Scheme color (a:schemeClr)
  if (colorNode['a:schemeClr'] && theme) {
    const schemeKey = colorNode['a:schemeClr']['@_val'] as keyof ThemeColors
    const themeColor = theme[schemeKey]
    if (themeColor) {
      return themeColor.startsWith('#') ? themeColor : `#${themeColor}`
    }
  }

  // System color (a:sysClr)
  if (colorNode['a:sysClr']) {
    const lastClr = colorNode['a:sysClr']['@_lastClr']
    if (lastClr) return `#${lastClr}`
  }

  // Preset color (a:prstClr)
  if (colorNode['a:prstClr']) {
    const val = colorNode['a:prstClr']['@_val']
    return presetColorToHex(val)
  }

  return '#000000'
}

// Map preset color names to hex values
function presetColorToHex(preset: string): string {
  const colors: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF',
    yellow: '#FFFF00',
    cyan: '#00FFFF',
    magenta: '#FF00FF',
    gray: '#808080',
    grey: '#808080',
    darkGray: '#A9A9A9',
    darkGrey: '#A9A9A9',
    lightGray: '#D3D3D3',
    lightGrey: '#D3D3D3',
    orange: '#FFA500',
    pink: '#FFC0CB',
    purple: '#800080',
    brown: '#A52A2A',
  }
  return colors[preset] || '#000000'
}

// Extract color from fill node
export function parseFillColor(fillNode: any, theme?: ThemeColors): string | undefined {
  if (!fillNode) return undefined

  // Solid fill
  if (fillNode['a:solidFill']) {
    return parseColor(fillNode['a:solidFill'], theme)
  }

  return undefined
}
