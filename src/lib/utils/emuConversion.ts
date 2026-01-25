// EMU (English Metric Units) conversion utilities
// 1 inch = 914400 EMU
// 1 point = 12700 EMU
// Display uses 96 DPI

const EMU_PER_INCH = 914400
const DPI = 96
const EMU_PER_PIXEL = EMU_PER_INCH / DPI // ~9525

export function emuToPixels(emu: number): number {
  return Math.round(emu / EMU_PER_PIXEL)
}

export function pixelsToEmu(pixels: number): number {
  return Math.round(pixels * EMU_PER_PIXEL)
}

export function emuToPoints(emu: number): number {
  return emu / 12700
}

export function pointsToEmu(points: number): number {
  return points * 12700
}

export function pointsToPixels(points: number): number {
  return (points * DPI) / 72
}

export function pixelsToPoints(pixels: number): number {
  return (pixels * 72) / DPI
}

export function pixelsToInches(pixels: number): number {
  return pixels / DPI
}

export function inchesToPixels(inches: number): number {
  return inches * DPI
}

// Parse rotation from PPTX (in 60,000ths of a degree)
export function parseRotation(rot: string | undefined): number {
  if (!rot) return 0
  return parseInt(rot) / 60000
}

// Convert hundredths of a point to pixels
export function centiPointsToPixels(centiPoints: number): number {
  const points = centiPoints / 100
  return pointsToPixels(points)
}
