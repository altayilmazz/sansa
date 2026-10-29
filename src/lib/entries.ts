import { uid } from './random'

export interface Entry {
  id: string
  name: string
}

/** Satır satır veya virgülle yazılmış metni temiz isimlere ayırır. */
export function parseNames(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0)
}

export function normalize(name: string): string {
  return name.trim().toLocaleLowerCase('tr-TR')
}

export function makeEntries(names: readonly string[]): Entry[] {
  return names.map((name) => ({ id: uid(), name }))
}

/** Listede birden fazla geçen isimlerin normalize hâllerini döndürür. */
export function duplicateKeys(entries: readonly Entry[]): Set<string> {
  const seen = new Map<string, number>()
  for (const e of entries) {
    const k = normalize(e.name)
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k))
}

export interface AddResult {
  entries: Entry[]
  added: number
  /** Eklenen ve listede zaten bulunan isimler (görünen hâliyle). */
  duplicates: string[]
}

/** Yeni isimleri ekler; aynı isimleri silmez, yalnızca raporlar. */
export function addNames(current: readonly Entry[], text: string): AddResult {
  const names = parseNames(text)
  const existing = new Set(current.map((e) => normalize(e.name)))
  const duplicates: string[] = []
  for (const n of names) {
    const k = normalize(n)
    if (existing.has(k)) duplicates.push(n)
    existing.add(k)
  }
  return { entries: [...current, ...makeEntries(names)], added: names.length, duplicates }
}
