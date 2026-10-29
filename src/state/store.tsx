import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Entry } from '../lib/entries'
import { uid } from '../lib/random'
import { isEntryList, isObj, isStr, load, save } from '../lib/storage'
import { THEME_PREFS, type ThemePref } from './theme'
import { isLang, type Lang } from './i18n'
import { isToolId, type ToolId } from './tools'

export type MotionPref = 'sistem' | 'azalt' | 'tam'

export interface Settings {
  sound: boolean
  motion: MotionPref
  theme: ThemePref
  lang: Lang
}

export const DEFAULT_SETTINGS: Settings = { sound: false, motion: 'sistem', theme: 'sistem', lang: 'tr' }

const isSettings = (v: unknown): v is Settings =>
  isObj(v) &&
  typeof v.sound === 'boolean' &&
  ['sistem', 'azalt', 'tam'].includes(v.motion as string) &&
  (v.theme === undefined || THEME_PREFS.includes(v.theme as ThemePref)) &&
  (v.lang === undefined || isLang(v.lang))

/** Eski kayıtlarda artık kullanılmayan alanlar (ada, sincap) olabilir; yalnızca bilinenler alınır. */
function loadSettings(): Settings {
  const s = load('settings', DEFAULT_SETTINGS, isSettings)
  return { sound: s.sound, motion: s.motion, theme: s.theme ?? DEFAULT_SETTINGS.theme, lang: s.lang ?? DEFAULT_SETTINGS.lang }
}

export interface SavedList {
  id: string
  name: string
  entries: Entry[]
  at: number
}
const isSavedLists = (v: unknown): v is SavedList[] =>
  Array.isArray(v) && v.every((x) => isObj(x) && isStr(x.id) && isStr(x.name) && isEntryList(x.entries) && typeof x.at === 'number')

export interface HistoryItem {
  id: string
  tool: ToolId
  title: string
  detail: string
  at: number
}
const isHistoryItem = (x: unknown): x is HistoryItem => isObj(x) && isStr(x.id) && isToolId(x.tool) && isStr(x.title) && isStr(x.detail) && typeof x.at === 'number'
/** Kaldırılan araçların eski kayıtları süzülür; geçmişin geri kalanı korunur. */
const isHistory = (v: unknown): v is HistoryItem[] => Array.isArray(v) && v.every((x) => isHistoryItem(x) || (isObj(x) && isStr(x.id) && isStr(x.tool)))

export const HISTORY_LIMIT = 40
export const SAVED_LIST_LIMIT = 20

interface Store {
  settings: Settings
  setSettings: (patch: Partial<Settings>) => void
  savedLists: SavedList[]
  saveList: (name: string, entries: Entry[]) => void
  deleteList: (id: string) => void
  history: HistoryItem[]
  /** Tur tamamlandığında bir kez çağrılır. Aynı roundKey ikinci kez kaydedilmez. */
  record: (roundKey: string, item: Omit<HistoryItem, 'id' | 'at'>) => void
  clearHistory: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState(loadSettings)
  const [savedLists, setSavedLists] = useState(() => load('lists', [] as SavedList[], isSavedLists))
  const [history, setHistory] = useState(() => load('history', [] as HistoryItem[], isHistory).filter(isHistoryItem))
  const recorded = useRef(new Set<string>())

  useEffect(() => void save('settings', settings), [settings])
  useEffect(() => void save('lists', savedLists), [savedLists])
  useEffect(() => void save('history', history), [history])

  const setSettings = useCallback((patch: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...patch })), [])

  const saveList = useCallback((name: string, entries: Entry[]) => {
    const clean = name.trim()
    setSavedLists((lists) => {
      const rest = lists.filter((l) => l.name.toLocaleLowerCase('tr-TR') !== clean.toLocaleLowerCase('tr-TR'))
      return [{ id: uid(), name: clean, entries: entries.map((e) => ({ ...e })), at: Date.now() }, ...rest].slice(0, SAVED_LIST_LIMIT)
    })
  }, [])
  const deleteList = useCallback((id: string) => setSavedLists((l) => l.filter((x) => x.id !== id)), [])

  const record = useCallback((roundKey: string, item: Omit<HistoryItem, 'id' | 'at'>) => {
    if (recorded.current.has(roundKey)) return
    recorded.current.add(roundKey)
    setHistory((h) => [{ ...item, id: uid(), at: Date.now() }, ...h].slice(0, HISTORY_LIMIT))
  }, [])
  const clearHistory = useCallback(() => setHistory([]), [])

  const value = useMemo(
    () => ({ settings, setSettings, savedLists, saveList, deleteList, history, record, clearHistory }),
    [settings, setSettings, savedLists, saveList, deleteList, history, record, clearHistory],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider eksik')
  return s
}

/** Araç içi çalışma verisini (ör. son girilen liste) cihazda tutar. */
export function usePersistent<T>(key: string, fallback: T, valid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => load(key, fallback, valid))
  useEffect(() => void save(key, value), [key, value])
  return [value, setValue] as const
}
