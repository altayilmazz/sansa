import { cryptoRng, sample, type Rng } from '../random'

/** Bu sınırın dışındaki değerler reddedilir (taşma ve okunamaz uzunluk için). */
export const LIMIT = 1_000_000_000
export const MAX_COUNT = 20
const UINT32 = 0x1_0000_0000

export type RangeCheck = { ok: true } | { ok: false; error: string }

export function checkRange(min: number, max: number, count: number, unique: boolean): RangeCheck {
  if (!Number.isInteger(min) || !Number.isInteger(max)) return { ok: false, error: 'En az ve en çok değerleri tam sayı olmalı.' }
  if (Math.abs(min) > LIMIT || Math.abs(max) > LIMIT) return { ok: false, error: 'Sayılar en fazla 1 milyar olabilir.' }
  if (min > max) return { ok: false, error: '“En az” değeri “en çok” değerinden büyük olamaz.' }
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) return { ok: false, error: `Kaç sayı üretileceği 1 ile ${MAX_COUNT} arasında olmalı.` }
  const size = max - min + 1
  if (size > UINT32) return { ok: false, error: 'Aralık çok geniş.' }
  if (unique && count > size) return { ok: false, error: `Bu aralıkta tekrarsız en fazla ${size} sayı üretilebilir.` }
  return { ok: true }
}

/** [min, max] aralığında eşit olasılıkla tam sayılar; unique ise hiçbiri tekrar etmez. */
export function generate(min: number, max: number, count: number, unique: boolean, rng: Rng = cryptoRng): number[] {
  const check = checkRange(min, max, count, unique)
  if (!check.ok) throw new RangeError(check.error)
  const size = max - min + 1
  if (!unique) return Array.from({ length: count }, () => min + rng.int(size))
  if (size <= 100_000) {
    const all = Array.from({ length: size }, (_, i) => min + i)
    return sample(all, count, rng)
  }
  const seen = new Set<number>()
  while (seen.size < count) seen.add(min + rng.int(size))
  return [...seen]
}
