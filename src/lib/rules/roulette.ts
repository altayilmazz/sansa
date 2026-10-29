import { cryptoRng, sample, type Rng } from '../random'

export const CHAMBERS = 6
export const MIN_BULLETS = 1
export const MAX_BULLETS = 5

export interface Revolver {
  /** true: o yuvada mermi var. */
  chambers: boolean[]
  /** Namlunun karşısındaki yuva. */
  pos: number
  /** Kaç kez tetik çekildi. */
  pulls: number
  state: 'play' | 'bang'
}

/** Mermiler rastgele yuvalara konur ve tambur rastgele bir konuma döndürülür. */
export function load(bullets: number, rng: Rng = cryptoRng): Revolver {
  const b = Math.max(MIN_BULLETS, Math.min(MAX_BULLETS, Math.round(bullets)))
  const at = new Set(sample(Array.from({ length: CHAMBERS }, (_, i) => i), b, rng))
  return { chambers: Array.from({ length: CHAMBERS }, (_, i) => at.has(i)), pos: rng.int(CHAMBERS), pulls: 0, state: 'play' }
}

/** Tetiği çeker: mermi varsa oyun biter, yoksa tambur bir yuva ilerler. */
export function pull(g: Revolver): Revolver {
  if (g.state !== 'play') return g
  const pulls = g.pulls + 1
  if (g.chambers[g.pos]) return { ...g, pulls, state: 'bang' }
  return { ...g, pulls, pos: (g.pos + 1) % CHAMBERS }
}
