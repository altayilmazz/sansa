import { cryptoRng, type Rng } from '../random'

/* ───────── Sıcak patates ───────── */

export const MIN_FUSE = 10
export const MAX_FUSE = 60

/** Patlama süresi (ms): 3 sn ile seçilen üst sınır arasında eşit olasılıkla. */
export function fuseMs(maxSec: number, rng: Rng = cryptoRng): number {
  const top = Math.max(MIN_FUSE, Math.min(MAX_FUSE, Math.round(maxSec))) * 1000
  return 3000 + rng.int(top - 3000 + 1)
}
