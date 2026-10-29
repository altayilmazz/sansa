import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from './store'

const reduceQuery = '(prefers-reduced-motion: reduce)'

function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(reduceQuery)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** Sistem tercihi ile uygulama ayarını birleştirir. */
export function useReducedMotion(): boolean {
  const { settings } = useStore()
  const system = useSyncExternalStore(subscribeReduce, () => window.matchMedia(reduceQuery).matches, () => false)
  if (settings.motion === 'azalt') return true
  if (settings.motion === 'tam') return false
  return system
}

export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Animasyon sürerken ikinci bir tıklamanın yeni sonuç üretmesini engeller.
 * run() kilit açıkken çalışır, iş bitene dek yeni çağrıları yok sayar.
 */
export function useBusy() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (task: () => Promise<void> | void) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try {
      await task()
    } finally {
      lock.current = false
      setBusy(false)
    }
  }, [])
  return { busy, run }
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Bileşen kaldırıldığında bekleyen setState çağrılarını yok saymak için. */
export function useMounted() {
  const m = useRef(true)
  useEffect(() => {
    m.current = true
    return () => {
      m.current = false
    }
  }, [])
  return m
}
