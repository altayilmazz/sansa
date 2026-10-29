/**
 * Rastgelelik kaynağı. Tüm kurallar bu arayüz üzerinden çalışır;
 * uygulamada Web Crypto, testlerde deterministik bir kaynak verilebilir.
 */
export interface Rng {
  /** [0, max) aralığında, her değeri eşit olasılıkla döndürür. */
  int(max: number): number
}

const UINT32 = 0x1_0000_0000

/**
 * Web Crypto tabanlı, modulo yanlılığı olmayan tam sayı üretici.
 * 2^32'yi max'a tam bölünebilen en büyük sınırın üstündeki değerler reddedilir
 * ve yeniden çekilir (rejection sampling).
 */
export function cryptoInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > UINT32) {
    throw new RangeError(`Geçersiz üst sınır: ${max}`)
  }
  if (max === 1) return 0
  const limit = UINT32 - (UINT32 % max)
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    const x = buf[0]
    if (x < limit) return x % max
  }
}

export const cryptoRng: Rng = { int: cryptoInt }

/** Yerinde olmayan, doğru Fisher–Yates karıştırma. */
export function shuffle<T>(items: readonly T[], rng: Rng = cryptoRng): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

/** Listeden tekrarsız k öğe seçer (kısmi Fisher–Yates). */
export function sample<T>(items: readonly T[], k: number, rng: Rng = cryptoRng): T[] {
  if (!Number.isInteger(k) || k < 0 || k > items.length) {
    throw new RangeError(`Seçilecek sayı 0 ile ${items.length} arasında olmalı.`)
  }
  const a = items.slice()
  for (let i = 0; i < k; i++) {
    const j = i + rng.int(a.length - i)
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a.slice(0, k)
}

export function pick<T>(items: readonly T[], rng: Rng = cryptoRng): T {
  if (items.length === 0) throw new RangeError('Boş listeden seçim yapılamaz.')
  return items[rng.int(items.length)]
}

/** [0, 1) aralığında, 2^32 çözünürlüklü kesir; animasyon sapmaları için. */
export function fraction(rng: Rng = cryptoRng): number {
  return rng.int(UINT32) / UINT32
}

export function uid(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${cryptoInt(UINT32).toString(36)}`
}
