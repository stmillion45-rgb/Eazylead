export const PDF_THEMES = {
  classic: {
    label: 'Classico scuro',
    header: [15, 23, 42],
    accent: [34, 211, 238],
    swatch: 'bg-slate-900 ring-cyan-400',
  },
  emerald: {
    label: 'Verde business',
    header: [6, 78, 59],
    accent: [52, 211, 153],
    swatch: 'bg-emerald-900 ring-emerald-400',
  },
  violet: {
    label: 'Viola moderno',
    header: [46, 16, 101],
    accent: [167, 139, 250],
    swatch: 'bg-violet-950 ring-violet-400',
  },
  navy: {
    label: 'Blu corporate',
    header: [30, 58, 95],
    accent: [96, 165, 250],
    swatch: 'bg-blue-950 ring-blue-400',
  },
  slate: {
    label: 'Grigio minimal',
    header: [51, 65, 85],
    accent: [148, 163, 184],
    swatch: 'bg-slate-700 ring-slate-300',
  },
}

export function buildPdfPalette(themeId) {
  const theme = PDF_THEMES[themeId] || PDF_THEMES.classic
  return {
    dark:    theme.header,
    accent:  theme.accent,
    mid:     [30, 41, 59],
    subtle:  [71, 85, 105],
    light:   [148, 163, 184],
    white:   [248, 250, 252],
    emerald: [52, 211, 153],
    border:  [51, 65, 85],
  }
}
