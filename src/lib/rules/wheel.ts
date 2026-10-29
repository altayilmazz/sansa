import { cryptoRng, fraction, type Rng } from '../random'

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 24

/** Dilim i, tepeden saat yönünde [i·a, (i+1)·a) açısını kaplar. */
export function sliceAngle(n: number): number {
  return 360 / n
}

const mod = (x: number, m: number) => ((x % m) + m) % m

/** Verilen dönüş açısında tepedeki işaretçinin gösterdiği dilim. */
export function indexAtPointer(rotation: number, n: number): number {
  // Çark R kadar saat yönünde döndüğünde işaretçinin altındaki çark açısı -R'dir.
  return Math.floor(mod(-rotation, 360) / sliceAngle(n)) % n
}

export interface SpinPlan {
  index: number
  target: number
}

/**
 * Önce kazanan dilimi seçer, ardından çarkın tam o dilimde duracağı hedef açıyı
 * hesaplar. Durma noktası dilimin kenarlarından uzak, orta bölgede rastgele
 * kaydırılır; böylece işaretçi her zaman seçilen dilimi gösterir.
 */
export function planSpin(current: number, n: number, rng: Rng = cryptoRng, turns = 5): SpinPlan {
  if (n < MIN_OPTIONS) throw new RangeError('En az iki seçenek gerekir.')
  const index = rng.int(n)
  const a = sliceAngle(n)
  const offset = (0.15 + 0.7 * fraction(rng)) * a
  const landing = index * a + offset // işaretçinin altına gelecek çark açısı
  const delta = mod(mod(-landing, 360) - current, 360)
  return { index, target: current + turns * 360 + delta }
}

export function shortLabel(label: string, max: number): string {
  const chars = [...label]
  return chars.length <= max ? label : chars.slice(0, Math.max(1, max - 1)).join('') + '…'
}
