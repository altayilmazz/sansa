import { useMedia } from './hooks'
import { useStore } from './store'
import { resolveTheme, type Theme } from './theme'

/** Uygulamanın o an kullandığı tema (sistem tercihi çözülmüş hâliyle). */
export function useTheme(): Theme {
  const { settings } = useStore()
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  return resolveTheme(settings.theme, systemDark)
}
