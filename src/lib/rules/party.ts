import { cryptoRng, pick, shuffle, type Rng } from '../random'

/* ───────── Kısa çöp uzun çöp ───────── */

export const MIN_STRAWS = 2
export const MAX_STRAWS = 10

export interface Straws {
  n: number
  /** Kısa çöpün sırası; oyun başında belirlenir. */
  short: number
  pulled: number[]
  state: 'play' | 'short'
}

export function newStraws(n: number, rng: Rng = cryptoRng): Straws {
  const c = Math.max(MIN_STRAWS, Math.min(MAX_STRAWS, Math.round(n)))
  return { n: c, short: rng.int(c), pulled: [], state: 'play' }
}

/** Bir çöp çekilir; kısa çıkarsa oyun biter. Çekilmiş ya da geçersiz çöp değişmez. */
export function pullStraw(g: Straws, i: number): Straws {
  if (g.state !== 'play' || !Number.isInteger(i) || i < 0 || i >= g.n || g.pulled.includes(i)) return g
  return { ...g, pulled: [...g.pulled, i], state: i === g.short ? 'short' : 'play' }
}

/* ───────── Bardak altı ───────── */

export const MIN_CUPS = 3
export const MAX_CUPS = 6

export interface Cup {
  id: number
  /** Altında "kaybeden" işareti olan bardak. */
  bad: boolean
}

export interface Cups {
  /** Soldan sağa dizilim; işaretli bardak rastgele bir yerdedir. */
  order: Cup[]
  lifted: number[]
  state: 'play' | 'over'
}

export function newCups(n: number, rng: Rng = cryptoRng): Cups {
  const c = Math.max(MIN_CUPS, Math.min(MAX_CUPS, Math.round(n)))
  const bad = rng.int(c)
  return { order: shuffle(Array.from({ length: c }, (_, id) => ({ id, bad: id === bad })), rng), lifted: [], state: 'play' }
}

export function liftCup(g: Cups, id: number): Cups {
  if (g.state !== 'play' || g.lifted.includes(id) || !g.order.some((c) => c.id === id)) return g
  const hit = g.order.find((c) => c.id === id)?.bad ?? false
  return { ...g, lifted: [...g.lifted, id], state: hit ? 'over' : 'play' }
}

/* ───────── Sıcak patates ───────── */

export const MIN_FUSE = 10
export const MAX_FUSE = 60

/** Patlama süresi (ms): 3 sn ile seçilen üst sınır arasında eşit olasılıkla. */
export function fuseMs(maxSec: number, rng: Rng = cryptoRng): number {
  const top = Math.max(MIN_FUSE, Math.min(MAX_FUSE, Math.round(maxSec))) * 1000
  return 3000 + rng.int(top - 3000 + 1)
}

/* ───────── Sihirli 8 top ───────── */

export const EIGHT_ANSWERS = {
  yes: ['Kesinlikle evet', 'Hiç şüphen olmasın', 'Bence evet', 'Evet', 'Görünüşe göre evet', 'İşaretler olumlu', 'Büyük ihtimalle'],
  maybe: ['Tekrar sor', 'Şimdi söylemesem daha iyi', 'Şimdi tahmin edemem', 'Odaklan ve tekrar sor', 'Sonra sor'],
  no: ['Hayır', 'Pek sanmam', 'Cevabım hayır', 'Çok şüpheli', 'Buna güvenme'],
} as const

export type EightKind = keyof typeof EIGHT_ANSWERS

/** Her cevap eşit olasılıkla seçilir. */
export function ask(rng: Rng = cryptoRng): { text: string; kind: EightKind } {
  const all = (Object.keys(EIGHT_ANSWERS) as EightKind[]).flatMap((kind) => EIGHT_ANSWERS[kind].map((text) => ({ text, kind })))
  return pick(all, rng)
}
