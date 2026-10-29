import { cryptoRng, sample, type Rng } from '../random'

export type RepeatMode = 'tekrarli' | 'tekrarsiz'

export interface DrawCheck {
  ok: boolean
  error?: string
}

export function checkDraw(poolSize: number, count: number): DrawCheck {
  if (poolSize === 0) return { ok: false, error: 'Çekiliş için listede en az bir kayıt olmalı.' }
  if (!Number.isInteger(count) || count < 1) return { ok: false, error: 'En az bir kazanan seçilmeli.' }
  if (count > poolSize) {
    return { ok: false, error: `Çekilişte ${poolSize} kayıt var; ${count} kazanan seçilemez.` }
  }
  return { ok: true }
}

/** Tek çekilişte aynı kayıt iki kez seçilmez. */
export function drawWinners<T>(pool: readonly T[], count: number, rng: Rng = cryptoRng): T[] {
  const c = checkDraw(pool.length, count)
  if (!c.ok) throw new RangeError(c.error)
  return sample(pool, count, rng)
}

/** Sonraki turun havuzu: tekrarsız modda kazananlar çıkarılır. */
export function nextPool<T extends { id: string }>(pool: readonly T[], winners: readonly T[], mode: RepeatMode): T[] {
  if (mode === 'tekrarli') return pool.slice()
  const out = new Set(winners.map((w) => w.id))
  return pool.filter((p) => !out.has(p.id))
}
