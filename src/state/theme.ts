export type ThemePref = 'sistem' | 'acik' | 'koyu' | 'ozel'
export type Theme = 'light' | 'dark' | 'special'

export const THEME_PREFS: ThemePref[] = ['sistem', 'acik', 'koyu', 'ozel']

/** Tarayıcı çubuğu rengi (Android / masaüstü); iOS ana ekran uygulamasında yok sayılır. */
export const THEME_COLOR: Record<Theme, string> = { light: '#f5f5f7', dark: '#000000', special: '#262624' }

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'acik') return 'light'
  if (pref === 'koyu') return 'dark'
  if (pref === 'ozel') return 'special'
  return systemDark ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme === 'light' ? 'light' : 'dark')
}
