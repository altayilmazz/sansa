import { useSyncExternalStore } from 'react'
import { isAvailableTool, type ToolId } from './tools'

/**
 * Hash tabanlı yönlendirme: sunucu yapılandırması gerektirmez ve
 * Capacitor kabuğunda dosya şemasıyla da çalışır.
 */
export type Route = { name: 'home' } | { name: 'tool'; tool: ToolId } | { name: 'history' } | { name: 'settings' }

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'arac' && isAvailableTool(parts[1])) return { name: 'tool', tool: parts[1] }
  if (parts[0] === 'gecmis') return { name: 'history' }
  if (parts[0] === 'ayarlar') return { name: 'settings' }
  return { name: 'home' }
}

export function href(route: Route): string {
  switch (route.name) {
    case 'tool':
      return `#/arac/${route.tool}`
    case 'history':
      return '#/gecmis'
    case 'settings':
      return '#/ayarlar'
    default:
      return '#/'
  }
}

export function navigate(route: Route) {
  const h = href(route)
  if (location.hash !== h) location.hash = h
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => location.hash, () => '')
}
