import { cryptoRng, shuffle, type Rng } from '../random'

export const MIN_HORSES = 3
export const MAX_HORSES = 8
/** Kazanan atın bitiş süresi (saniye); sonrakiler biraz daha geç gelir. */
const BASE = 5
const GAP = 0.32
const SEGMENTS = 6

export interface HorsePath {
  /** 0..1 arası ilerleme anahtar kareleri. */
  x: number[]
  /** 0..1 arası zaman anahtar kareleri (x ile aynı uzunlukta). */
  times: number[]
}

export interface RacePlan {
  /** Bitiş sırası: order[0] kazanan attır (0 tabanlı at numarası). */
  order: number[]
  /** Her atın bitiş süresi (sn). */
  durations: number[]
  paths: HorsePath[]
}

/**
 * Sonuç önce belirlenir: atların sırası rastgele karıştırılır. Animasyon yolları
 * bu sıraya göre üretilir; ara sıralamalar değişebilir ama bitiş sırası değişmez.
 */
export function planRace(n: number, rng: Rng = cryptoRng): RacePlan {
  if (!Number.isInteger(n) || n < MIN_HORSES || n > MAX_HORSES) throw new RangeError(`At sayısı ${MIN_HORSES}–${MAX_HORSES} olmalı`)
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rng)
  const durations = new Array<number>(n)
  order.forEach((horse, rank) => {
    durations[horse] = BASE + rank * GAP
  })
  const unit = () => (rng.int(1000) + 1) / 1001
  const paths: HorsePath[] = durations.map(() => {
    const w = Array.from({ length: SEGMENTS }, () => 0.45 + unit() * 1.1)
    const total = w.reduce((a, b) => a + b, 0)
    const x = [0]
    w.forEach((v) => x.push(x[x.length - 1] + v / total))
    x[SEGMENTS] = 1
    const tw = Array.from({ length: SEGMENTS }, () => 0.7 + unit() * 0.6)
    const tt = tw.reduce((a, b) => a + b, 0)
    const times = [0]
    tw.forEach((v) => times.push(times[times.length - 1] + v / tt))
    times[SEGMENTS] = 1
    return { x, times }
  })
  return { order, durations, paths }
}
