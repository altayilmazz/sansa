import { cryptoRng, type Rng } from '../random'
import type { RoundOutcome } from './match'

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6

export function rollDie(rng: Rng = cryptoRng): DieValue {
  return (rng.int(6) + 1) as DieValue
}

export function rollDice(count: number, rng: Rng = cryptoRng): DieValue[] {
  if (count !== 1 && count !== 2) throw new RangeError('Bir veya iki zar atılabilir.')
  return Array.from({ length: count }, () => rollDie(rng))
}

export const total = (values: readonly number[]) => values.reduce((s, v) => s + v, 0)

/** Her oyuncu eşit sayıda zar atar; yüksek toplam kazanır. */
export function diceOutcome(a: readonly DieValue[], b: readonly DieValue[]): RoundOutcome {
  if (a.length !== b.length) throw new RangeError('Oyuncular eşit sayıda zar atmalı.')
  const ta = total(a)
  const tb = total(b)
  return ta === tb ? 'berabere' : ta > tb ? 'a' : 'b'
}
