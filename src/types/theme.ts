export interface Theme {
  name: string
  colors: ThemeColors
  fonts: ThemeFonts
}

export interface ThemeColors {
  dk1: string
  lt1: string
  dk2: string
  lt2: string
  accent1: string
  accent2: string
  accent3: string
  accent4: string
  accent5: string
  accent6: string
  hlink: string
  folHlink: string
}

export interface ThemeFonts {
  majorFont: string
  minorFont: string
}
