/**
 * Cihazda saklama. localStorage erişilemez, dolu ya da bozuksa uygulama
 * çökmez; varsayılan değerle devam eder. Capacitor'a geçişte yalnızca bu
 * dosyanın arka ucu (ör. @capacitor/preferences) değiştirilebilir.
 */
const PREFIX = 'sansa:v1:'

export type Validator<T> = (value: unknown) => value is T

function backend(): Storage | null {
  try {
    const s = globalThis.localStorage
    if (!s) return null
    const probe = PREFIX + '__probe'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

let cached: Storage | null | undefined
const store = () => (cached === undefined ? (cached = backend()) : cached)

export function load<T>(key: string, fallback: T, valid: Validator<T>): T {
  try {
    const raw = store()?.getItem(PREFIX + key)
    if (raw == null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return valid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): boolean {
  try {
    const s = store()
    if (!s) return false
    s.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function storageAvailable(): boolean {
  return store() !== null
}

// Küçük doğrulayıcılar
export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const isStr = (v: unknown): v is string => typeof v === 'string'
export const isEntry = (v: unknown): v is { id: string; name: string } => isObj(v) && isStr(v.id) && isStr(v.name)
export const isEntryList = (v: unknown): v is { id: string; name: string }[] => Array.isArray(v) && v.every(isEntry)
